import { sql } from '../database/db.js';

export interface Produto {
  id: string;
  nome: string;
  preco: number;
  quantidade_estoque: number;
}

interface ProdutoRow {
  id: string;
  nome: string;
  preco: string | number;
  quantidade_estoque: number;
}

export class ProdutoInvalidoError extends Error {
  constructor(message = 'Dados invalidos.') {
    super(message);
    this.name = 'ProdutoInvalidoError';
  }
}

export class ProdutoNaoEncontradoError extends Error {
  constructor(message = 'Produto nao encontrado.') {
    super(message);
    this.name = 'ProdutoNaoEncontradoError';
  }
}

export class ProdutoEmUsoError extends Error {
  constructor(message = 'Produto vinculado a pedidos nao pode ser removido.') {
    super(message);
    this.name = 'ProdutoEmUsoError';
  }
}

const LIMITE_NOME = 255;
// NUMERIC(10, 2): ate 8 digitos inteiros e 2 decimais.
const PRECO_MAXIMO = 99999999.99;
const ESTOQUE_MAXIMO = 2147483647;
const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODIGO_FK_VIOLADA = '23503';

function normalizarId(idInput: unknown): string {
  const id = typeof idInput === 'string' ? idInput.trim() : '';
  if (!id || !REGEX_UUID.test(id)) {
    throw new ProdutoInvalidoError('Id de produto invalido.');
  }
  return id;
}

function normalizarNome(nomeInput: unknown): string {
  const nome = typeof nomeInput === 'string' ? nomeInput.trim() : '';
  if (!nome) {
    throw new ProdutoInvalidoError('Nome obrigatorio.');
  }
  if (nome.length > LIMITE_NOME) {
    throw new ProdutoInvalidoError(`Nome deve ter no maximo ${LIMITE_NOME} caracteres.`);
  }
  return nome;
}

function paraNumero(valorInput: unknown): number {
  if (typeof valorInput === 'number') {
    return valorInput;
  }
  if (typeof valorInput === 'string' && valorInput.trim() !== '') {
    return Number(valorInput.trim().replace(',', '.'));
  }
  return Number.NaN;
}

function normalizarPreco(precoInput: unknown): number {
  const preco = paraNumero(precoInput);
  if (!Number.isFinite(preco)) {
    throw new ProdutoInvalidoError('Preco obrigatorio e deve ser numerico.');
  }
  if (preco < 0 || preco > PRECO_MAXIMO) {
    throw new ProdutoInvalidoError(`Preco deve estar entre 0 e ${PRECO_MAXIMO}.`);
  }
  if (Math.abs(preco * 100 - Math.round(preco * 100)) > 1e-6) {
    throw new ProdutoInvalidoError('Preco deve ter no maximo 2 casas decimais.');
  }
  return Math.round(preco * 100) / 100;
}

function normalizarQuantidade(quantidadeInput: unknown): number {
  if (quantidadeInput === undefined || quantidadeInput === null) {
    return 0;
  }
  const quantidade = paraNumero(quantidadeInput);
  if (!Number.isInteger(quantidade)) {
    throw new ProdutoInvalidoError('Quantidade em estoque deve ser um numero inteiro.');
  }
  if (quantidade < 0 || quantidade > ESTOQUE_MAXIMO) {
    throw new ProdutoInvalidoError('Quantidade em estoque deve ser maior ou igual a 0.');
  }
  return quantidade;
}

function normalizarBody(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null) {
    throw new ProdutoInvalidoError();
  }
  return input as Record<string, unknown>;
}

function paraProduto(row: ProdutoRow): Produto {
  return {
    id: row.id,
    nome: row.nome,
    // O driver devolve NUMERIC como string para nao perder precisao.
    preco: Number(row.preco),
    quantidade_estoque: row.quantidade_estoque,
  };
}

export async function listProdutos(): Promise<Produto[]> {
  const rows = (await sql`
    SELECT id, nome, preco, quantidade_estoque
    FROM produtos
    ORDER BY nome
  `) as unknown as ProdutoRow[];
  return rows.map(paraProduto);
}

export async function getProdutoById(idInput: unknown): Promise<Produto> {
  const id = normalizarId(idInput);

  const rows = (await sql`
    SELECT id, nome, preco, quantidade_estoque
    FROM produtos
    WHERE id = ${id}
    LIMIT 1
  `) as unknown as ProdutoRow[];

  const row = rows[0];
  if (!row) {
    throw new ProdutoNaoEncontradoError();
  }
  return paraProduto(row);
}

export async function createProduto(input: unknown): Promise<Produto> {
  const body = normalizarBody(input);

  const nome = normalizarNome(body.nome);
  const preco = normalizarPreco(body.preco);
  const quantidadeEstoque = normalizarQuantidade(body.quantidade_estoque);

  const rows = (await sql`
    INSERT INTO produtos (nome, preco, quantidade_estoque)
    VALUES (${nome}, ${preco}, ${quantidadeEstoque})
    RETURNING id, nome, preco, quantidade_estoque
  `) as unknown as ProdutoRow[];

  const row = rows[0];
  if (!row) {
    throw new Error('Falha ao cadastrar produto.');
  }
  return paraProduto(row);
}

export async function updateProduto(
  idInput: unknown,
  input: unknown,
): Promise<Produto> {
  const id = normalizarId(idInput);
  const body = normalizarBody(input);

  const nome = normalizarNome(body.nome);
  const preco = normalizarPreco(body.preco);
  const quantidadeEstoque = normalizarQuantidade(body.quantidade_estoque);

  const rows = (await sql`
    UPDATE produtos
    SET nome = ${nome},
        preco = ${preco},
        quantidade_estoque = ${quantidadeEstoque}
    WHERE id = ${id}
    RETURNING id, nome, preco, quantidade_estoque
  `) as unknown as ProdutoRow[];

  const row = rows[0];
  if (!row) {
    throw new ProdutoNaoEncontradoError();
  }
  return paraProduto(row);
}

export async function removeProduto(idInput: unknown): Promise<void> {
  const id = normalizarId(idInput);

  let rows: Array<{ id: string }>;
  try {
    rows = (await sql`
      DELETE FROM produtos
      WHERE id = ${id}
      RETURNING id
    `) as unknown as Array<{ id: string }>;
  } catch (err) {
    if ((err as { code?: unknown } | null)?.code === CODIGO_FK_VIOLADA) {
      throw new ProdutoEmUsoError();
    }
    throw err;
  }

  if (!rows[0]) {
    throw new ProdutoNaoEncontradoError();
  }
}
