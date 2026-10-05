import bcrypt from 'bcryptjs';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { sql } from '../database/db.js';

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
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '8h';
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
