import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface AuthUser {
  id: string;
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
    return Boolean(this.getToken() && this.getExpiresAt());
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
}
