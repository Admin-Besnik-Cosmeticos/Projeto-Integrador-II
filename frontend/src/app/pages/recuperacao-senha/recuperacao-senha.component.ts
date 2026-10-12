import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CodigoInputComponent } from '../../components/codigo-input/codigo-input.component';
import { AuthService, RecuperacaoError } from '../../services/auth.service';

type EtapaRecuperacao = 'email' | 'codigo' | 'senha' | 'sucesso';

function senhasIguais(control: AbstractControl): ValidationErrors | null {
  const novaSenha = control.get('novaSenha')?.value as string | null;
  const confirmarSenha = control.get('confirmarSenha')?.value as string | null;

  if (novaSenha && confirmarSenha && novaSenha !== confirmarSenha) {
    return { senhasDiferentes: true };
  }

  return null;
}

@Component({
  selector: 'app-recuperacao-senha',
  imports: [ReactiveFormsModule, RouterLink, CodigoInputComponent],
  templateUrl: './recuperacao-senha.component.html',
  styleUrl: './recuperacao-senha.component.scss',
})
export class RecuperacaoSenhaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly codigoTamanho = 8;
  protected readonly etapa = signal<EtapaRecuperacao>('email');
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly codigo = signal('');
  protected readonly codigoInvalido = signal(false);
  protected readonly emailSubmetido = signal(false);
  protected readonly senhaSubmetida = signal(false);
  protected readonly hideNovaSenha = signal(true);
  protected readonly hideConfirmarSenha = signal(true);

  protected readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly senhaForm = this.fb.nonNullable.group(
    {
      novaSenha: ['', [Validators.required, Validators.minLength(8)]],
      confirmarSenha: ['', [Validators.required]],
    },
    { validators: senhasIguais },
  );

  protected get emailInformado(): string {
    return this.emailForm.getRawValue().email.trim();
  }

  protected get emailInvalid(): boolean {
    const control = this.emailForm.controls.email;
    return control.invalid && (control.touched || this.emailSubmetido());
  }

  protected get novaSenhaInvalid(): boolean {
    const control = this.senhaForm.controls.novaSenha;
    return control.invalid && (control.touched || this.senhaSubmetida());
  }

  protected get confirmarSenhaInvalid(): boolean {
    const control = this.senhaForm.controls.confirmarSenha;
    return control.invalid && (control.touched || this.senhaSubmetida());
  }

  protected get senhasDiferentes(): boolean {
    return (
      this.senhaForm.hasError('senhasDiferentes') &&
      (this.senhaForm.controls.confirmarSenha.touched || this.senhaSubmetida())
    );
  }

  protected toggleNovaSenha(): void {
    this.hideNovaSenha.update((value) => !value);
  }

  protected toggleConfirmarSenha(): void {
    this.hideConfirmarSenha.update((value) => !value);
  }

  protected async solicitarCodigo(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.emailSubmetido.set(true);
    this.errorMessage.set(null);

    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    try {
      await this.authService.solicitarRecuperacao(this.emailInformado);
      this.codigo.set('');
      this.codigoInvalido.set(false);
      this.etapa.set('codigo');
    } catch (error) {
      this.errorMessage.set(this.mensagemErro(error, 'Não foi possível solicitar a recuperação.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected atualizarCodigo(valor: string): void {
    this.codigo.set(valor);
    if (valor.length > 0) {
      this.codigoInvalido.set(false);
    }
  }

  protected confirmarCodigo(): void {
    if (this.loading()) {
      return;
    }

    this.errorMessage.set(null);

    if (this.codigo().length !== this.codigoTamanho) {
      this.codigoInvalido.set(true);
      return;
    }

    this.codigoInvalido.set(false);
    this.etapa.set('senha');
  }

  protected async redefinirSenha(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.senhaSubmetida.set(true);
    this.errorMessage.set(null);

    if (this.senhaForm.invalid) {
      this.senhaForm.markAllAsTouched();
      return;
    }

    const { novaSenha } = this.senhaForm.getRawValue();
    this.loading.set(true);

    try {
      await this.authService.redefinirSenha(this.emailInformado, this.codigo(), novaSenha);
      this.etapa.set('sucesso');
    } catch (error) {
      if (error instanceof RecuperacaoError && error.code === 'invalid_code') {
        this.codigoInvalido.set(true);
        this.codigo.set('');
        this.errorMessage.set(error.message);
        this.etapa.set('codigo');
      } else {
        this.errorMessage.set(this.mensagemErro(error, 'Não foi possível redefinir a senha.'));
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected alterarEmail(): void {
    this.errorMessage.set(null);
    this.codigoInvalido.set(false);
    this.codigo.set('');
    this.etapa.set('email');
  }

  protected voltarAoLogin(): void {
    void this.router.navigate(['/login']);
  }

  private mensagemErro(error: unknown, fallback: string): string {
    if (error instanceof RecuperacaoError) {
      return error.message;
    }
    return fallback;
  }
}
