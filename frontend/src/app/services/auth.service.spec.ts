import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('logs in and persists session without storing password', async () => {
    const service = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.login('admin@exemplo.com', 'senha-forte', true);
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'admin@exemplo.com', senha: 'senha-forte' });

    req.flush({
      token: 'jwt-token',
      expiresAt: '2026-10-05T23:00:00.000Z',
      user: { id: '1', email: 'admin@exemplo.com', admin: true },
    });

    await promise;
    expect(service.getToken()).toBe('jwt-token');
    expect(service.getExpiresAt()).toBe('2026-10-05T23:00:00.000Z');
    expect(service.getUser()?.admin).toBe(true);
    expect(localStorage.getItem('auth_user')).toContain('"admin":true');
    expect(localStorage.getItem('auth_token')).toBe('jwt-token');
    expect(localStorage.getItem('senha')).toBeNull();
  });

  it('maps 401 to invalid credentials', async () => {
    const service = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.login('admin@exemplo.com', 'errada');
    const req = http.expectOne('/api/auth/login');
    req.flush({ erro: 'Credenciais invalidas.' }, { status: 401, statusText: 'Unauthorized' });

    await expect(promise).rejects.toMatchObject({
      message: 'Credenciais invalidas.',
      code: 'invalid_credentials',
    });
    expect(service.getToken()).toBeNull();
  });

  it('uses sessionStorage when remember me is false', async () => {
    const service = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.login('admin@exemplo.com', 'senha-forte', false);
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');

    req.flush({
      token: 'jwt-token-session',
      expiresAt: '2026-10-05T23:00:00.000Z',
      user: { id: '1', email: 'admin@exemplo.com', admin: false },
    });

    await promise;
    expect(sessionStorage.getItem('auth_token')).toBe('jwt-token-session');
    expect(sessionStorage.getItem('auth_user')).toBe(
      '{"id":"1","email":"admin@exemplo.com","admin":false}',
    );
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
    expect(service.getToken()).toBe('jwt-token-session');
    expect(service.isAdmin()).toBe(false);
  });

  it('logout clears local session even if backend call fails', async () => {
    const service = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);

    localStorage.setItem('auth_token', 'jwt-token');
    localStorage.setItem('auth_expires_at', '2026-10-05T23:00:00.000Z');
    localStorage.setItem('auth_user', JSON.stringify({ id: '1', email: 'a@b.com', admin: false }));

    const promise = service.logout();
    const req = TestBed.inject(HttpTestingController).expectOne('/api/auth/login');
    expect(req.request.method).toBe('DELETE');
    req.error(new ProgressEvent('error'));

    await promise.catch(() => undefined);
    expect(service.getToken()).toBeNull();
    expect(service.getUser()).toBeNull();
  });
});
