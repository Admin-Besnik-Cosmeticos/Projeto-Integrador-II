import { sql } from '../database/db.js';

export interface ClienteEndereco {
  cidade: string;
  estado: string;
  endereco_entrega: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  endereco: ClienteEndereco;
}

interface ClienteRow {
  id: string;
  nome: string;
  telefone: string;
  endereco: unknown;
}

export class ClienteInvalidoError extends Error {
  constructor(message = 'Dados invalidos.') {
    super(message);
    this.name = 'ClienteInvalidoError';
  }
}

export class ClienteNaoEncontradoError extends Error {
  constructor(message = 'Cliente nao encontrado.') {
    super(message);
    this.name = 'ClienteNaoEncontradoError';
  }
}

const LIMITE_NOME = 255;
const LIMITE_TELEFONE = 20;
const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizarId(idInput: unknown): string {
  const id = typeof idInput === 'string' ? idInput.trim() : '';
  if (!id || !REGEX_UUID.test(id)) {
    throw new ClienteInvalidoError('Id de cliente invalido.');
  }
  return id;
}

function normalizarTexto(
  valorInput: unknown,
  campo: string,
  limite: number,
): string {
  const valor = typeof valorInput === 'string' ? valorInput.trim() : '';
  if (!valor) {
    throw new ClienteInvalidoError(`${campo} obrigatorio.`);
  }
  if (valor.length > limite) {
    throw new ClienteInvalidoError(`${campo} deve ter no maximo ${limite} caracteres.`);
  }
  return valor;
}

function normalizarTelefone(telefoneInput: unknown): string {
  return normalizarTexto(telefoneInput, 'Telefone', LIMITE_TELEFONE);
}

function normalizarEndereco(enderecoInput: unknown): ClienteEndereco {
  const endereco =
    typeof enderecoInput === 'object' && enderecoInput !== null
      ? (enderecoInput as Record<string, unknown>)
      : undefined;

  if (!endereco) {
    throw new ClienteInvalidoError('Endereco obrigatorio.');
  }

  const cidade =
    typeof endereco.cidade === 'string' ? endereco.cidade.trim() : '';
  const estado =
    typeof endereco.estado === 'string' ? endereco.estado.trim().toUpperCase() : '';
  const enderecoEntrega =
    typeof endereco.endereco_entrega === 'string'
      ? endereco.endereco_entrega.trim()
      : '';

  if (!cidade || !estado || !enderecoEntrega) {
    throw new ClienteInvalidoError(
      'Endereco deve conter cidade, estado e endereco_entrega.',
    );
  }

  return {
    cidade,
    estado,
    endereco_entrega: enderecoEntrega,
  };
}

function paraCliente(row: ClienteRow): Cliente {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone,
    endereco: row.endereco as ClienteEndereco,
  };
}

export async function listClientes(): Promise<Cliente[]> {
  const rows = (await sql`
    SELECT id, nome, telefone, endereco
    FROM clientes
    ORDER BY nome
  `) as unknown as ClienteRow[];
  return rows.map(paraCliente);
}

export async function getClienteById(idInput: unknown): Promise<Cliente> {
  const id = normalizarId(idInput);

  const rows = (await sql`
    SELECT id, nome, telefone, endereco
    FROM clientes
    WHERE id = ${id}
    LIMIT 1
  `) as unknown as ClienteRow[];

  const row = rows[0];
  if (!row) {
    throw new ClienteNaoEncontradoError();
  }
  return paraCliente(row);
}

export async function createCliente(input: unknown): Promise<Cliente> {
  const body =
    typeof input === 'object' && input !== null
      ? (input as Record<string, unknown>)
      : undefined;

  if (!body) {
    throw new ClienteInvalidoError();
  }

  const nome = normalizarTexto(body.nome, 'Nome', LIMITE_NOME);
  const telefone = normalizarTelefone(body.telefone);
  const endereco = normalizarEndereco(body.endereco);

  const rows = (await sql`
    INSERT INTO clientes (nome, telefone, endereco)
    VALUES (${nome}, ${telefone}, ${JSON.stringify(endereco)}::jsonb)
    RETURNING id, nome, telefone, endereco
  `) as unknown as ClienteRow[];

  const row = rows[0];
  if (!row) {
    throw new Error('Falha ao cadastrar cliente.');
  }
  return paraCliente(row);
}

export async function updateCliente(
  idInput: unknown,
  input: unknown,
): Promise<Cliente> {
  const id = normalizarId(idInput);

  const body =
    typeof input === 'object' && input !== null
      ? (input as Record<string, unknown>)
      : undefined;

  if (!body) {
    throw new ClienteInvalidoError();
  }

  const nome = normalizarTexto(body.nome, 'Nome', LIMITE_NOME);
  const telefone = normalizarTelefone(body.telefone);
  const endereco = normalizarEndereco(body.endereco);

  const rows = (await sql`
    UPDATE clientes
    SET nome = ${nome},
        telefone = ${telefone},
        endereco = ${JSON.stringify(endereco)}::jsonb
    WHERE id = ${id}
    RETURNING id, nome, telefone, endereco
  `) as unknown as ClienteRow[];

  const row = rows[0];
  if (!row) {
    throw new ClienteNaoEncontradoError();
  }
  return paraCliente(row);
}

export async function removeCliente(idInput: unknown): Promise<void> {
  const id = normalizarId(idInput);

  const rows = (await sql`
    DELETE FROM clientes
    WHERE id = ${id}
    RETURNING id
  `) as unknown as Array<{ id: string }>;

  if (!rows[0]) {
    throw new ClienteNaoEncontradoError();
  }
}
