import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { sql } from '../database/db.js';
import { sendPasswordRecoveryEmail } from './email.service.js';

interface UsuarioAuthRow {
  id: string;
  email: string;
  senha: string;
  admin: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  admin: boolean;
}

export interface AuthResult {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export class InvalidCredentialsError extends Error {
  constructor(message = 'Credenciais invalidas.') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

export class InvalidTokenError extends Error {
  constructor(message = 'Token ausente ou invalido.') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export class InvalidRecoveryRequestError extends Error {
  constructor(message = 'Dados invalidos.') {
    super(message);
    this.name = 'InvalidRecoveryRequestError';
  }
}

export class InvalidRecoveryKeyError extends Error {
  constructor(message = 'Chave invalida ou expirada.') {
    super(message);
    this.name = 'InvalidRecoveryKeyError';
  }
}

type RecoveryTipo = 'recuperacao' | 'alteracao';

function normalizeTipo(tipoInput: unknown): RecoveryTipo {
  const tipo = typeof tipoInput === 'string' ? tipoInput.trim().toLowerCase() : '';
  if (tipo === 'recuperacao' || tipo === 'alteracao') {
    return tipo;
  }
  throw new InvalidRecoveryRequestError('Tipo invalido.');
}

function normalizeEmail(emailInput: unknown): string {
  const email = typeof emailInput === 'string' ? emailInput.trim().toLowerCase() : '';
  if (!email || !email.includes('@')) {
    throw new InvalidRecoveryRequestError('Email invalido.');
  }
  return email;
}

function createRecoveryKey(): string {
  return randomInt(0, 100000000).toString().padStart(8, '0');
}

export async function requestPasswordRecovery(
  emailInput: unknown,
  tipoInput: unknown,
  tokenInput: unknown
): Promise<{ message: string }> {
  const email = normalizeEmail(emailInput);
  const tipo = normalizeTipo(tipoInput);

  if (tipo === 'alteracao') {
    const token = typeof tokenInput === 'string' ? tokenInput.replace(/^Bearer\s+/i, '').trim() : '';
    if (!token) {
      throw new InvalidTokenError();
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET nao definido.');
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    } catch {
      throw new InvalidTokenError();
    }

    const userId = typeof decoded.id === 'string' ? decoded.id : '';
    const rows = (await sql`
      SELECT id, email
      FROM usuarios
      WHERE id = ${userId}
        AND bearer_token = ${token}
        AND bearer_token_expires_at > NOW()
      LIMIT 1
    `) as unknown as Array<{ id: string; email: string }>;

    const usuario = rows[0];
    if (!usuario) {
      throw new InvalidTokenError();
    }
    if (usuario.email !== email) {
      throw new InvalidCredentialsError();
    }

    const chave = createRecoveryKey();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await sql`
      UPDATE usuarios
      SET chave_recuperacao = ${chave},
          expiracao_chave_recuperacao = ${expiresAt}
      WHERE id = ${usuario.id}
    `;

    await sendPasswordRecoveryEmail({ email, chave, tipo });
    return { message: 'Chave de confirmacao enviada.' };
  }

  const rows = (await sql`
    SELECT id, email
    FROM usuarios
    WHERE email = ${email}
    LIMIT 1
  `) as unknown as Array<{ id: string; email: string }>;

  const usuario = rows[0];
  if (usuario) {
    const chave = createRecoveryKey();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await sql`
      UPDATE usuarios
      SET chave_recuperacao = ${chave},
          expiracao_chave_recuperacao = ${expiresAt}
      WHERE id = ${usuario.id}
    `;

    await sendPasswordRecoveryEmail({ email, chave, tipo });
  }

  return { message: 'Se o email existir, enviaremos as instrucoes para redefinicao de senha.' };
}

export async function resetPassword(
  emailInput: unknown,
  tipoInput: unknown,
  chaveInput: unknown,
  novaSenhaInput: unknown,
  senhaAtualInput: unknown
): Promise<{ message: string }> {
  const email = normalizeEmail(emailInput);
  const tipo = normalizeTipo(tipoInput);
  const chave = typeof chaveInput === 'string' ? chaveInput.trim() : '';
  const novaSenha = typeof novaSenhaInput === 'string' ? novaSenhaInput : '';
  const senhaAtual = typeof senhaAtualInput === 'string' ? senhaAtualInput : '';

  if (!chave || !novaSenha) {
    throw new InvalidRecoveryRequestError('Dados invalidos.');
  }
  if (chave.length !== 8) {
    throw new InvalidRecoveryKeyError();
  }
  if (novaSenha.length < 8) {
    throw new InvalidRecoveryRequestError('Nova senha deve ter pelo menos 8 caracteres.');
  }
  if (tipo === 'alteracao' && !senhaAtual) {
    throw new InvalidRecoveryRequestError('Senha atual obrigatoria.');
  }

  const rows = (await sql`
    SELECT id, email, senha, chave_recuperacao, expiracao_chave_recuperacao,
           (expiracao_chave_recuperacao IS NOT NULL AND expiracao_chave_recuperacao > NOW()) AS chave_valida
    FROM usuarios
    WHERE email = ${email}
    LIMIT 1
  `) as unknown as Array<{
    id: string;
    email: string;
    senha: string;
    chave_recuperacao: string | null;
    expiracao_chave_recuperacao: string | null;
    chave_valida: boolean;
  }>;

  const usuario = rows[0];
  if (!usuario || usuario.chave_recuperacao !== chave || !usuario.chave_valida) {
    throw new InvalidRecoveryKeyError();
  }

  if (tipo === 'alteracao') {
    const senhaAtualValida = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaAtualValida) {
      throw new InvalidCredentialsError();
    }
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
  if (!Number.isInteger(saltRounds) || saltRounds < 4 || saltRounds > 31) {
    throw new Error('BCRYPT_SALT_ROUNDS invalido.');
  }

  const senhaHash = await bcrypt.hash(novaSenha, saltRounds);

  await sql`
    UPDATE usuarios
    SET senha = ${senhaHash},
        chave_recuperacao = NULL,
        expiracao_chave_recuperacao = NULL,
        bearer_token = NULL,
        bearer_token_expires_at = NULL
    WHERE id = ${usuario.id}
  `;

  return { message: 'Senha alterada com sucesso.' };
}

export async function logout(tokenInput: unknown): Promise<void> {
  const token = typeof tokenInput === 'string' ? tokenInput.replace(/^Bearer\s+/i, '').trim() : '';

  if (!token) {
    throw new InvalidTokenError();
  }

  await sql`
    UPDATE usuarios
    SET bearer_token = NULL,
        bearer_token_expires_at = NULL
    WHERE bearer_token = ${token}
  `;
}

export async function authenticate(emailInput: unknown, senhaInput: unknown): Promise<AuthResult> {
  const email = typeof emailInput === 'string' ? emailInput.trim().toLowerCase() : '';
  const senha = typeof senhaInput === 'string' ? senhaInput : '';

  if (!email || !senha) {
    throw new InvalidCredentialsError();
  }

  const rows = (await sql`
    SELECT id, email, senha, admin
    FROM usuarios
    WHERE email = ${email}
    LIMIT 1
  `) as unknown as UsuarioAuthRow[];

  const usuario = rows[0];
  if (!usuario) {
    throw new InvalidCredentialsError();
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha);
  if (!senhaValida) {
    throw new InvalidCredentialsError();
  }

  const jwtSecret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '12h';
  if (!jwtSecret) {
    throw new Error('JWT_SECRET nao definido.');
  }

  const payload = { id: usuario.id, admin: usuario.admin };
  const options: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  const token = jwt.sign(payload, jwtSecret, options);
  const decoded = jwt.decode(token) as JwtPayload | null;
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null;

  if (!expiresAt) {
    throw new Error('Falha ao calcular expiracao do token.');
  }

  await sql`
    UPDATE usuarios
    SET bearer_token = ${token},
        bearer_token_expires_at = ${expiresAt}
    WHERE id = ${usuario.id}
  `;

  return {
    token,
    expiresAt,
    user: {
      id: usuario.id,
      email: usuario.email,
      admin: usuario.admin,
    },
  };
}
