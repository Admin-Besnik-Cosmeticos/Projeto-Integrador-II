import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService, RecuperacaoError } from '../../services/auth.service';
import { RecuperacaoSenhaComponent } from './recuperacao-senha.component';

class AuthServiceStub {
  solicitacoes: string[] = [];
  redefinicoes: Array<{ email: string; chave: string; novaSenha: string }> = [];
  solicitarError: unknown = null;
  redefinirError: unknown = null;

  async solicitarRecuperacao(email: string) {
    this.solicitacoes.push(email);
    if (this.solicitarError) {
      throw this.solicitarError;
    }
    return { message: 'ok' };
  }

  async redefinirSenha(email: string, chave: string, novaSenha: string) {
    this.redefinicoes.push({ email, chave, novaSenha });
    if (this.redefinirError) {
      throw this.redefinirError;
    }
    return { message: 'ok' };
  }
}

describe('RecuperacaoSenhaComponent', () => {
  let fixture: ComponentFixture<RecuperacaoSenhaComponent>;
  let component: any;
  let authStub: AuthServiceStub;
  let router: Router;

  beforeEach(async () => {
    authStub = new AuthServiceStub();

    await TestBed.configureTestingModule({
      imports: [RecuperacaoSenhaComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(RecuperacaoSenhaComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  async function solicitarComEmailValido(): Promise<void> {
    component.emailForm.setValue({ email: 'admin@exemplo.com' });
    await component.solicitarCodigo();
    fixture.detectChanges();
  }

  it('starts on the email step', () => {
    expect(fixture.nativeElement.textContent).toContain('Esqueceu a senha?');
    expect(fixture.nativeElement.querySelector('app-codigo-input')).toBeNull();
  });

  it('does not call the service and shows validation for an invalid email', async () => {
    component.emailForm.setValue({ email: 'invalido' });

    await component.solicitarCodigo();
    fixture.detectChanges();

    expect(authStub.solicitacoes.length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Informe um e-mail válido.');
  });

  it('requests the code and moves to the code step', async () => {
    await solicitarComEmailValido();

    expect(authStub.solicitacoes).toEqual(['admin@exemplo.com']);
    expect(fixture.nativeElement.querySelector('app-codigo-input')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Confirme o código');
  });

  it('shows the invalid code state when fewer than eight characters are filled', async () => {
    await solicitarComEmailValido();

    component.atualizarCodigo('123');
    component.confirmarCodigo();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Código inválido');
    expect(fixture.nativeElement.querySelector('app-codigo-input')).toBeTruthy();
  });

  it('moves to the password step with a complete code', async () => {
    await solicitarComEmailValido();

    component.atualizarCodigo('12345678');
    component.confirmarCodigo();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Defina uma nova senha');
  });

  it('shows a validation message when the passwords differ and does not submit', async () => {
    await solicitarComEmailValido();
    component.atualizarCodigo('12345678');
    component.confirmarCodigo();
    fixture.detectChanges();

    component.senhaForm.setValue({ novaSenha: 'senha1234', confirmarSenha: 'senha4321' });
    await component.redefinirSenha();
    fixture.detectChanges();

    expect(authStub.redefinicoes.length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('As senhas informadas não são iguais.');
  });

  it('resets the password and shows the success state', async () => {
    await solicitarComEmailValido();
    component.atualizarCodigo('12345678');
    component.confirmarCodigo();
    fixture.detectChanges();

    component.senhaForm.setValue({ novaSenha: 'senha1234', confirmarSenha: 'senha1234' });
    await component.redefinirSenha();
    fixture.detectChanges();

    expect(authStub.redefinicoes).toEqual([
      { email: 'admin@exemplo.com', chave: '12345678', novaSenha: 'senha1234' },
    ]);
    expect(fixture.nativeElement.textContent).toContain('Senha redefinida!');
  });

  it('returns to the code step when the backend rejects the code', async () => {
    await solicitarComEmailValido();
    component.atualizarCodigo('12345678');
    component.confirmarCodigo();
    fixture.detectChanges();

    authStub.redefinirError = new RecuperacaoError('Chave inválida ou expirada.', 'invalid_code');
    component.senhaForm.setValue({ novaSenha: 'senha1234', confirmarSenha: 'senha1234' });
    await component.redefinirSenha();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-codigo-input')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Chave inválida ou expirada.');
  });

  it('navigates back to login from the success step', async () => {
    component.voltarAoLogin();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
