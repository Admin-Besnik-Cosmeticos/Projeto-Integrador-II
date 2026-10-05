import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
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
  user: AuthUser;
}

export class InvalidCredentialsError extends Error {
  constructor(message = 'Credenciais invalidas.') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
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

  return {
    token,
    user: {
      id: usuario.id,
      email: usuario.email,
      admin: usuario.admin,
    },
  };
}
