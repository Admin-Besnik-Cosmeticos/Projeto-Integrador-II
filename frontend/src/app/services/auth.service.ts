import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface AuthUser {
  id: string;
  nome?: string;
  email: string;
  admin: boolean;
}

export interface AuthLoginResponse {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

const TOKEN_KEY = 'auth_token';
const EXPIRES_AT_KEY = 'auth_expires_at';
const USER_KEY = 'auth_user';

export type AuthErrorCode = 'invalid_credentials' | 'network_error' | 'unexpected_error';

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: AuthErrorCode,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export type RecuperacaoTipo = 'recuperacao' | 'alteracao';

export type RecuperacaoErrorCode =
  'invalid_email' | 'invalid_code' | 'weak_password' | 'network_error' | 'unexpected_error';

export class RecuperacaoError extends Error {
  constructor(
    message: string,
    readonly code: RecuperacaoErrorCode,
  ) {
    super(message);
    this.name = 'RecuperacaoError';
  }
}

export interface RecuperacaoResponse {
  message: string;
}

export interface PerfilResponse {
  user: AuthUser;
}

export type PerfilErrorCode = 'invalid_profile' | 'network_error' | 'unexpected_error';

export class PerfilError extends Error {
  constructor(
    message: string,
    readonly code: PerfilErrorCode,
  ) {
    super(message);
    this.name = 'PerfilError';
  }
}

const RECUPERACAO_ENDPOINT = '/api/auth/recuperacao';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  async login(email: string, senha: string, lembrar = false): Promise<AuthLoginResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthLoginResponse>('/api/auth/login', { email, senha }),
      );
      this.persistSession(response, lembrar);
      return response;
    } catch (error) {
      throw this.toAuthError(error);
    }
  }

  async logout(): Promise<void> {
    const token = this.getToken();
    try {
      if (token) {
        await firstValueFrom(
          this.http.delete<{ message: string }>('/api/auth/login', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        );
      }
    } finally {
      this.clearSession();
    }
  }

  async solicitarRecuperacao(
    email: string,
    tipo: RecuperacaoTipo = 'recuperacao',
  ): Promise<RecuperacaoResponse> {
    try {
      const options =
        tipo === 'alteracao' ? { headers: this.authHeaders() } : undefined;
      return await firstValueFrom(
        this.http.post<RecuperacaoResponse>(
          RECUPERACAO_ENDPOINT,
          { email, tipo },
          options,
        ),
      );
    } catch (error) {
      throw this.toRecuperacaoError(error, 'invalid_email');
    }
  }

  async redefinirSenha(
    email: string,
    chave: string,
    novaSenha: string,
    tipo: RecuperacaoTipo = 'recuperacao',
    senhaAtual?: string,
  ): Promise<RecuperacaoResponse> {
    try {
      const body: {
        email: string;
        tipo: RecuperacaoTipo;
        chave: string;
        novaSenha: string;
        senhaAtual?: string;
      } = { email, tipo, chave, novaSenha };
      if (senhaAtual !== undefined) {
        body.senhaAtual = senhaAtual;
      }
      return await firstValueFrom(
        this.http.put<RecuperacaoResponse>(RECUPERACAO_ENDPOINT, body),
      );
    } catch (error) {
      throw this.toRecuperacaoError(error, 'invalid_code');
    }
  }

  async obterPerfil(): Promise<AuthUser> {
    try {
      const response = await firstValueFrom(
        this.http.get<PerfilResponse>('/api/auth/perfil', { headers: this.authHeaders() }),
      );
      this.persistUser(response.user);
      return response.user;
    } catch (error) {
      throw this.toPerfilError(error);
    }
  }

  async atualizarPerfil(nome: string, email: string): Promise<AuthUser> {
    try {
      const response = await firstValueFrom(
        this.http.put<PerfilResponse>(
          '/api/auth/perfil',
          { nome, email },
          { headers: this.authHeaders() },
        ),
      );
      this.persistUser(response.user);
      return response.user;
    } catch (error) {
      throw this.toPerfilError(error);
    }
  }

  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  getExpiresAt(): string | null {
    try {
      return localStorage.getItem(EXPIRES_AT_KEY) ?? sessionStorage.getItem(EXPIRES_AT_KEY);
    } catch {
      return null;
    }
  }

  getUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const expiresAt = this.getExpiresAt();

    if (!token || !expiresAt) {
      return false;
    }

    const expirationTime = Date.parse(expiresAt);
    return Number.isFinite(expirationTime) && expirationTime > Date.now();
  }

  isAdmin(): boolean {
    return this.getUser()?.admin === true;
  }

  private persistSession(response: AuthLoginResponse, lembrar: boolean): void {
    this.clearSession();
    const storage = lembrar ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, response.token);
    storage.setItem(EXPIRES_AT_KEY, response.expiresAt);
    storage.setItem(USER_KEY, JSON.stringify(response.user));
  }

  private persistUser(user: AuthUser): void {
    const storage = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
    storage.setItem(USER_KEY, JSON.stringify(user));
  }

  private authHeaders(): { Authorization: string } {
    const token = this.getToken();
    return { Authorization: `Bearer ${token ?? ''}` };
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXPIRES_AT_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  private toAuthError(error: unknown): AuthError {
    if (error instanceof AuthError) {
      return error;
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return new AuthError('Credenciais invalidas.', 'invalid_credentials');
      }

      if (error.status === 0) {
        return new AuthError('Nao foi possivel conectar ao servidor.', 'network_error');
      }
    }

    return new AuthError('Nao foi possivel realizar o login.', 'unexpected_error');
  }

  private toRecuperacaoError(error: unknown, fallbackCode: RecuperacaoErrorCode): RecuperacaoError {
    if (error instanceof RecuperacaoError) {
      return error;
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return new RecuperacaoError('Nao foi possivel conectar ao servidor.', 'network_error');
      }

      const body = error.error as { erro?: unknown } | null;
      const message =
        body && typeof body.erro === 'string' ? body.erro : 'Nao foi possivel concluir a operacao.';

      if (message.toLowerCase().includes('senha')) {
        return new RecuperacaoError(message, 'weak_password');
      }

      return new RecuperacaoError(message, fallbackCode);
    }

    return new RecuperacaoError('Nao foi possivel concluir a operacao.', 'unexpected_error');
  }

  private toPerfilError(error: unknown): PerfilError {
    if (error instanceof PerfilError) {
      return error;
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return new PerfilError('Nao foi possivel conectar ao servidor.', 'network_error');
      }

      const body = error.error as { erro?: unknown } | null;
      const message =
        body && typeof body.erro === 'string' ? body.erro : 'Nao foi possivel atualizar o perfil.';
      return new PerfilError(message, 'invalid_profile');
    }

    return new PerfilError('Nao foi possivel atualizar o perfil.', 'unexpected_error');
  }
}
