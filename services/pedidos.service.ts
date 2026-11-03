import { randomUUID } from 'node:crypto';
import { sql } from '../database/db.js';

export interface ItemPedido {
  id: string;
  id_produto: string;
  produto: string;
  quantidade: number;
  preco_unitario: number;
}

export const STATUS_PEDIDO = [
  'Pendente',
  'Em Preparo',
  'Pago',
  'Enviado',
  'Entregue',
  'Cancelado',
] as const;

export type StatusPedido = (typeof STATUS_PEDIDO)[number];

export interface Pedido {
  id: string;
  id_cliente: string;
  cliente: string;
  data_pedido: string;
  status: StatusPedido;
  itens: ItemPedido[];
  total: number;
}

export interface ItemPedidoInput {
  id_produto: string;
  quantidade: number;
  // Opcional: quando ausente, usa o preco atual do produto (ou o preco ja
  // praticado no pedido, em atualizacoes).
  preco_unitario?: number;
}

export interface PedidoInput {
  id_cliente: string;
  // Opcional: no cadastro assume a data atual; na atualizacao mantem a atual.
  data_pedido?: string;
  // Opcional: no cadastro assume "Pendente"; na atualizacao mantem o atual.
  status?: string;
  itens: ItemPedidoInput[];
}

interface PedidoRow {
  id: string;
  id_cliente: string;
  cliente: string;
  data_pedido: Date | string;
  status: StatusPedido;
}

interface ItemPedidoRow {
  id: string;
  id_pedido: string;
  id_produto: string;
  produto: string;
  quantidade: number;
  preco_unitario: string | number;
}

interface ItemNormalizado {
  id_produto: string;
  quantidade: number;
  preco_unitario: number | null;
}

interface PedidoNormalizado {
  id_cliente: string;
  data_pedido: string | null;
  status: StatusPedido | null;
  itens: ItemNormalizado[];
}

export class PedidoInvalidoError extends Error {
  constructor(message = 'Dados invalidos.') {
    super(message);
    this.name = 'PedidoInvalidoError';
  }
}

export class PedidoNaoEncontradoError extends Error {
  constructor(message = 'Pedido nao encontrado.') {
    super(message);
    this.name = 'PedidoNaoEncontradoError';
  }
}

// NUMERIC(10, 2): ate 8 digitos inteiros e 2 decimais.
const PRECO_MAXIMO = 99999999.99;
const QUANTIDADE_MAXIMA = 2147483647;
const LIMITE_ITENS = 100;
const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODIGO_FK_VIOLADA = '23503';

function normalizarUuid(idInput: unknown, mensagem: string): string {
  const id = typeof idInput === 'string' ? idInput.trim().toLowerCase() : '';
  if (!id || !REGEX_UUID.test(id)) {
    throw new PedidoInvalidoError(mensagem);
  }
  return id;
}

function normalizarId(idInput: unknown): string {
  return normalizarUuid(idInput, 'Id de pedido invalido.');
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

function normalizarDataPedido(dataInput: unknown): string | null {
  if (dataInput === undefined || dataInput === null || dataInput === '') {
    return null;
  }
  if (typeof dataInput !== 'string') {
    throw new PedidoInvalidoError('Data do pedido deve ser um texto no formato ISO 8601.');
  }
  const data = new Date(dataInput.trim());
  if (Number.isNaN(data.getTime())) {
    throw new PedidoInvalidoError('Data do pedido invalida.');
  }
  return data.toISOString();
}

function normalizarStatus(statusInput: unknown): StatusPedido | null {
  if (statusInput === undefined || statusInput === null || statusInput === '') {
    return null;
  }
  if (typeof statusInput !== 'string') {
    throw new PedidoInvalidoError('Status do pedido invalido.');
  }
  const status = STATUS_PEDIDO.find(
    (valor) => valor.toLowerCase() === statusInput.trim().toLowerCase(),
  );
  if (!status) {
    throw new PedidoInvalidoError(
      `Status do pedido deve ser um de: ${STATUS_PEDIDO.join(', ')}.`,
    );
  }
  return status;
}

function normalizarQuantidade(quantidadeInput: unknown, posicao: number): number {
  const quantidade = paraNumero(quantidadeInput);
  if (!Number.isInteger(quantidade)) {
    throw new PedidoInvalidoError(`Item ${posicao}: quantidade deve ser um numero inteiro.`);
  }
  if (quantidade <= 0 || quantidade > QUANTIDADE_MAXIMA) {
    throw new PedidoInvalidoError(`Item ${posicao}: quantidade deve ser maior que 0.`);
  }
  return quantidade;
}

function normalizarPrecoUnitario(precoInput: unknown, posicao: number): number | null {
  if (precoInput === undefined || precoInput === null) {
    return null;
  }
  const preco = paraNumero(precoInput);
  if (!Number.isFinite(preco)) {
    throw new PedidoInvalidoError(`Item ${posicao}: preco unitario deve ser numerico.`);
  }
  if (preco < 0 || preco > PRECO_MAXIMO) {
    throw new PedidoInvalidoError(
      `Item ${posicao}: preco unitario deve estar entre 0 e ${PRECO_MAXIMO}.`,
    );
  }
  if (Math.abs(preco * 100 - Math.round(preco * 100)) > 1e-6) {
    throw new PedidoInvalidoError(
      `Item ${posicao}: preco unitario deve ter no maximo 2 casas decimais.`,
    );
  }
  return Math.round(preco * 100) / 100;
}

function normalizarItens(itensInput: unknown): ItemNormalizado[] {
  if (!Array.isArray(itensInput) || itensInput.length === 0) {
    throw new PedidoInvalidoError('O pedido deve possuir ao menos um item.');
  }
  if (itensInput.length > LIMITE_ITENS) {
    throw new PedidoInvalidoError(`O pedido deve ter no maximo ${LIMITE_ITENS} itens.`);
  }

  // Itens repetidos do mesmo produto sao consolidados em uma unica linha.
  const porProduto = new Map<string, ItemNormalizado>();

  itensInput.forEach((itemInput: unknown, indice) => {
    const posicao = indice + 1;
    if (typeof itemInput !== 'object' || itemInput === null) {
      throw new PedidoInvalidoError(`Item ${posicao} invalido.`);
    }
    const item = itemInput as Record<string, unknown>;
    const idProduto = normalizarUuid(item.id_produto, `Item ${posicao}: id de produto invalido.`);
    const quantidade = normalizarQuantidade(item.quantidade, posicao);
    const precoUnitario = normalizarPrecoUnitario(item.preco_unitario, posicao);

    const existente = porProduto.get(idProduto);
    if (!existente) {
      porProduto.set(idProduto, {
        id_produto: idProduto,
        quantidade,
        preco_unitario: precoUnitario,
      });
      return;
    }

    if (
      existente.preco_unitario !== null &&
      precoUnitario !== null &&
      existente.preco_unitario !== precoUnitario
    ) {
      throw new PedidoInvalidoError(
        `Item ${posicao}: produto repetido com preco unitario diferente.`,
      );
    }
    existente.quantidade += quantidade;
    if (existente.quantidade > QUANTIDADE_MAXIMA) {
      throw new PedidoInvalidoError(`Item ${posicao}: quantidade excede o limite permitido.`);
    }
    existente.preco_unitario ??= precoUnitario;
  });

  return [...porProduto.values()];
}

function normalizarPedido(input: unknown): PedidoNormalizado {
  if (typeof input !== 'object' || input === null) {
    throw new PedidoInvalidoError();
  }
  const body = input as Record<string, unknown>;
  return {
    id_cliente: normalizarUuid(body.id_cliente, 'Id de cliente invalido.'),
    data_pedido: normalizarDataPedido(body.data_pedido),
    status: normalizarStatus(body.status),
    itens: normalizarItens(body.itens),
  };
}

async function validarCliente(idCliente: string): Promise<void> {
  const rows = (await sql`
    SELECT id FROM clientes WHERE id = ${idCliente} LIMIT 1
  `) as unknown as Array<{ id: string }>;
  if (!rows[0]) {
    throw new PedidoInvalidoError('Cliente informado nao encontrado.');
  }
}

// Valida a existencia dos produtos e define o preco unitario dos itens que
// nao informaram preco: preco ja praticado no pedido (atualizacao) ou preco
// atual do produto.
async function resolverItens(
  itens: ItemNormalizado[],
  precosPraticados: Map<string, number> = new Map(),
): Promise<Array<ItemNormalizado & { preco_unitario: number }>> {
  const ids = itens.map((item) => item.id_produto);
  const rows = (await sql`
    SELECT id, preco FROM produtos WHERE id = ANY(${ids}::uuid[])
  `) as unknown as Array<{ id: string; preco: string | number }>;

  const precosAtuais = new Map(rows.map((row) => [row.id, Number(row.preco)]));

  return itens.map((item) => {
    const precoAtual = precosAtuais.get(item.id_produto);
    if (precoAtual === undefined) {
      throw new PedidoInvalidoError(`Produto ${item.id_produto} nao encontrado.`);
    }
    return {
      ...item,
      preco_unitario:
        item.preco_unitario ?? precosPraticados.get(item.id_produto) ?? precoAtual,
    };
  });
}

function paraDataIso(valor: Date | string): string {
  return (valor instanceof Date ? valor : new Date(valor)).toISOString();
}

function montarPedidos(pedidoRows: PedidoRow[], itemRows: ItemPedidoRow[]): Pedido[] {
  const itensPorPedido = new Map<string, ItemPedido[]>();
  for (const row of itemRows) {
    const itens = itensPorPedido.get(row.id_pedido) ?? [];
    itens.push({
      id: row.id,
      id_produto: row.id_produto,
      produto: row.produto,
      quantidade: row.quantidade,
      // O driver devolve NUMERIC como string para nao perder precisao.
      preco_unitario: Number(row.preco_unitario),
    });
    itensPorPedido.set(row.id_pedido, itens);
  }

  return pedidoRows.map((row) => {
    const itens = itensPorPedido.get(row.id) ?? [];
    // Soma em centavos para evitar erro de ponto flutuante.
    const totalCentavos = itens.reduce(
      (soma, item) => soma + Math.round(item.preco_unitario * 100) * item.quantidade,
      0,
    );
    return {
      id: row.id,
      id_cliente: row.id_cliente,
      cliente: row.cliente,
      data_pedido: paraDataIso(row.data_pedido),
      status: row.status,
      itens,
      total: totalCentavos / 100,
    };
  });
}

function tratarFkViolada(err: unknown): never {
  if ((err as { code?: unknown } | null)?.code === CODIGO_FK_VIOLADA) {
    throw new PedidoInvalidoError('Cliente ou produto informado nao encontrado.');
  }
  throw err;
}

export async function listPedidos(): Promise<Pedido[]> {
  const pedidoRows = (await sql`
    SELECT p.id, p.id_cliente, c.nome AS cliente, p.data_pedido, p.status
    FROM pedidos p
    JOIN clientes c ON c.id = p.id_cliente
    ORDER BY p.data_pedido DESC, p.id
  `) as unknown as PedidoRow[];

  if (pedidoRows.length === 0) {
    return [];
  }

  const itemRows = (await sql`
    SELECT i.id, i.id_pedido, i.id_produto, pr.nome AS produto,
           i.quantidade, i.preco_unitario
    FROM itens_pedido i
    JOIN produtos pr ON pr.id = i.id_produto
    ORDER BY pr.nome, i.id
  `) as unknown as ItemPedidoRow[];

  return montarPedidos(pedidoRows, itemRows);
}

export async function getPedidoById(idInput: unknown): Promise<Pedido> {
  const id = normalizarId(idInput);

  const [pedidoRows, itemRows] = (await sql.transaction([
    sql`
      SELECT p.id, p.id_cliente, c.nome AS cliente, p.data_pedido, p.status
      FROM pedidos p
      JOIN clientes c ON c.id = p.id_cliente
      WHERE p.id = ${id}
      LIMIT 1
    `,
    sql`
      SELECT i.id, i.id_pedido, i.id_produto, pr.nome AS produto,
             i.quantidade, i.preco_unitario
      FROM itens_pedido i
      JOIN produtos pr ON pr.id = i.id_produto
      WHERE i.id_pedido = ${id}
      ORDER BY pr.nome, i.id
    `,
  ])) as unknown as [PedidoRow[], ItemPedidoRow[]];

  const pedido = montarPedidos(pedidoRows, itemRows)[0];
  if (!pedido) {
    throw new PedidoNaoEncontradoError();
  }
  return pedido;
}

export async function createPedido(input: unknown): Promise<Pedido> {
  const dados = normalizarPedido(input);

  await validarCliente(dados.id_cliente);
  const itens = await resolverItens(dados.itens);

  const id = randomUUID();
  const dataPedido = dados.data_pedido ?? new Date().toISOString();
  const status = dados.status ?? 'Pendente';

  try {
    // Pedido e itens gravados na mesma transacao: ou tudo ou nada.
    await sql.transaction([
      sql`
        INSERT INTO pedidos (id, id_cliente, data_pedido, status)
        VALUES (${id}, ${dados.id_cliente}, ${dataPedido}, ${status})
      `,
      sql`
        INSERT INTO itens_pedido (id_pedido, id_produto, quantidade, preco_unitario)
        SELECT ${id}, t.id_produto, t.quantidade, t.preco_unitario
        FROM unnest(
          ${itens.map((item) => item.id_produto)}::uuid[],
          ${itens.map((item) => item.quantidade)}::int[],
          ${itens.map((item) => item.preco_unitario)}::numeric[]
        ) AS t(id_produto, quantidade, preco_unitario)
      `,
    ]);
  } catch (err) {
    tratarFkViolada(err);
  }

  return getPedidoById(id);
}

export async function updatePedido(idInput: unknown, input: unknown): Promise<Pedido> {
  const id = normalizarId(idInput);
  const dados = normalizarPedido(input);

  const existeRows = (await sql`
    SELECT id FROM pedidos WHERE id = ${id} LIMIT 1
  `) as unknown as Array<{ id: string }>;
  if (!existeRows[0]) {
    throw new PedidoNaoEncontradoError();
  }

  await validarCliente(dados.id_cliente);

  const precoRows = (await sql`
    SELECT id_produto, preco_unitario FROM itens_pedido WHERE id_pedido = ${id}
  `) as unknown as Array<{ id_produto: string; preco_unitario: string | number }>;
  const precosPraticados = new Map(
    precoRows.map((row) => [row.id_produto, Number(row.preco_unitario)]),
  );
  const itens = await resolverItens(dados.itens, precosPraticados);

  let resultados: unknown[];
  try {
    // Atualiza o pedido e substitui os itens na mesma transacao.
    resultados = await sql.transaction([
      sql`
        UPDATE pedidos
        SET id_cliente = ${dados.id_cliente},
            data_pedido = COALESCE(${dados.data_pedido}::timestamptz, data_pedido),
            status = COALESCE(${dados.status}::varchar, status)
        WHERE id = ${id}
        RETURNING id
      `,
      sql`DELETE FROM itens_pedido WHERE id_pedido = ${id}`,
      sql`
        INSERT INTO itens_pedido (id_pedido, id_produto, quantidade, preco_unitario)
        SELECT p.id, t.id_produto, t.quantidade, t.preco_unitario
        FROM pedidos p
        CROSS JOIN unnest(
          ${itens.map((item) => item.id_produto)}::uuid[],
          ${itens.map((item) => item.quantidade)}::int[],
          ${itens.map((item) => item.preco_unitario)}::numeric[]
        ) AS t(id_produto, quantidade, preco_unitario)
        WHERE p.id = ${id}
      `,
    ]);
  } catch (err) {
    tratarFkViolada(err);
  }

  const atualizados = resultados[0] as unknown as Array<{ id: string }>;
  if (!atualizados[0]) {
    // Pedido removido entre a verificacao e a atualizacao.
    throw new PedidoNaoEncontradoError();
  }

  return getPedidoById(id);
}

export async function removePedido(idInput: unknown): Promise<void> {
  const id = normalizarId(idInput);

  // Itens primeiro (FK), pedido em seguida, na mesma transacao.
  const [, pedidoRows] = (await sql.transaction([
    sql`DELETE FROM itens_pedido WHERE id_pedido = ${id}`,
    sql`DELETE FROM pedidos WHERE id = ${id} RETURNING id`,
  ])) as unknown as [unknown, Array<{ id: string }>];

  if (!pedidoRows[0]) {
    throw new PedidoNaoEncontradoError();
  }
}
