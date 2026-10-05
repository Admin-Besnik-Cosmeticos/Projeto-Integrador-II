import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthError, AuthService, type AuthLoginResponse } from '../../services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  const successResponse: AuthLoginResponse = {
    token: 'token',
    expiresAt: '2026-10-05T23:00:00.000Z',
    user: { id: '1', email: 'admin@exemplo.com', admin: true },
  };

  function configure(overrides: Partial<{ login: AuthService['login'] }> = {}) {
    const calls: Array<[string, string]> = [];
    const authStub = {
      login: async (email: string, senha: string) => {
        calls.push([email, senha]);
        return successResponse;
      },
      ...overrides,
    };

    return { calls, authStub };
  }

  async function setup(authStub: object) {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateCalls: unknown[][] = [];
    (router as any).navigate = (...args: unknown[]) => {
      navigateCalls.push(args);
      return Promise.resolve(true);
    };

    return { fixture, navigateCalls };
  }

  it('shows validation messages and does not call service when form is invalid', async () => {
    const { calls, authStub } = configure();
    const { fixture } = await setup(authStub);
    const component = fixture.componentInstance as any;

    component.submit();
    fixture.detectChanges();

    expect(calls.length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('E-mail é obrigatório.');
    expect(fixture.nativeElement.textContent).toContain('Senha é obrigatória.');
  });

  it('disables submit button while loading and navigates on success', async () => {
    let resolveLogin: (value: AuthLoginResponse) => void;
    const login = () =>
      new Promise<AuthLoginResponse>((resolve) => {
        resolveLogin = resolve;
      });
    const { authStub } = configure({ login: login as AuthService['login'] });
    const { fixture, navigateCalls } = await setup(authStub);
    const component = fixture.componentInstance as any;

    component.form.setValue({ email: 'admin@exemplo.com', senha: 'senha-forte', lembrar: false });
    fixture.detectChanges();

    const submit = fixture.nativeElement.querySelector('button.submit') as HTMLButtonElement;
    submit.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.login-loading')).toBeTruthy();
    expect(submit.disabled).toBe(true);

    resolveLogin!(successResponse);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(navigateCalls[0][0]).toEqual(['/dashboard']);
  });

  it('shows generic error for invalid credentials', async () => {
    const login = async () => {
      throw new AuthError('Credenciais invalidas.', 'invalid_credentials');
    };
    const { authStub } = configure({ login: login as AuthService['login'] });
    const { fixture } = await setup(authStub);
    const component = fixture.componentInstance as any;

    component.form.setValue({ email: 'admin@exemplo.com', senha: 'errada', lembrar: false });
    fixture.detectChanges();

    component.submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Credenciais invalidas.');
    expect(fixture.nativeElement.querySelector('.login-loading')).toBeNull();
  });

  it('links to password recovery route', async () => {
    const { authStub } = configure();
    const { fixture } = await setup(authStub);
    const link = fixture.nativeElement.querySelector('a[routerlink]') as HTMLAnchorElement | null;

    expect(link?.getAttribute('routerlink') || link?.getAttribute('ng-reflect-router-link')).toBe(
      '/recuperacao',
    );
  });
});
