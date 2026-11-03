import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  AuthService,
  PerfilError,
  RecuperacaoError,
} from '../../services/auth.service';
import { CodigoInputComponent } from '../../components/codigo-input/codigo-input.component';

type MenuConfiguracoes = 'inicio' | 'perfil' | 'senha';
type SenhaEtapa = 'nova' | 'codigo';

function senhasIguais(control: AbstractControl): ValidationErrors | null {
  const novaSenha = control.get('novaSenha')?.value as string | null;
  const confirmarSenha = control.get('confirmarSenha')?.value as string | null;
  return novaSenha && confirmarSenha && novaSenha !== confirmarSenha
    ? { senhasDiferentes: true }
    : null;
}

@Component({
  selector: 'app-configuracoes',
  imports: [ReactiveFormsModule, CodigoInputComponent],
  templateUrl: './configuracoes.component.html',
  styleUrl: './configuracoes.component.scss',
})
export class ConfiguracoesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly menu = signal<MenuConfiguracoes>('inicio');
  protected readonly carregandoPerfil = signal(true);
  protected readonly salvandoPerfil = signal(false);
  protected readonly perfilSalvo = signal(false);
  protected readonly perfilErro = signal<string | null>(null);
  protected readonly senhaEtapa = signal<SenhaEtapa>('nova');
  protected readonly senhaLoading = signal(false);
  protected readonly senhaErro = signal<string | null>(null);
  protected readonly senhaSucesso = signal(false);
  protected readonly codigo = signal('');
  protected readonly codigoInvalido = signal(false);
  protected readonly codigoTamanho = 8;
  protected readonly perfilSubmetido = signal(false);
  protected readonly senhaSubmetida = signal(false);
  protected readonly hideNovaSenha = signal(true);
  protected readonly hideConfirmarSenha = signal(true);

  protected readonly perfilForm = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly senhaForm = this.fb.nonNullable.group(
    {
      novaSenha: ['', [Validators.required, Validators.minLength(8)]],
      confirmarSenha: ['', [Validators.required]],
    },
    { validators: senhasIguais },
  );

  constructor() {
    void this.carregarPerfil();
  }

  protected get perfilNomeInvalido(): boolean {
    const control = this.perfilForm.controls.nome;
    return control.invalid && (control.touched || this.perfilSubmetido());
  }

  protected get perfilEmailInvalido(): boolean {
    const control = this.perfilForm.controls.email;
    return control.invalid && (control.touched || this.perfilSubmetido());
  }

  protected get novaSenhaInvalida(): boolean {
    const control = this.senhaForm.controls.novaSenha;
    return control.invalid && (control.touched || this.senhaSubmetida());
  }

  protected get confirmarSenhaInvalida(): boolean {
    const control = this.senhaForm.controls.confirmarSenha;
    return control.invalid && (control.touched || this.senhaSubmetida());
  }

  protected get senhasDiferentes(): boolean {
    return (
      this.senhaForm.hasError('senhasDiferentes') &&
      (this.senhaForm.controls.confirmarSenha.touched || this.senhaSubmetida())
    );
  }

  protected async salvarPerfil(): Promise<void> {
    this.perfilSubmetido.set(true);
    this.perfilErro.set(null);
    this.perfilSalvo.set(false);
    if (this.perfilForm.invalid || this.salvandoPerfil()) {
      this.perfilForm.markAllAsTouched();
      return;
    }

    this.salvandoPerfil.set(true);
    const { nome, email } = this.perfilForm.getRawValue();
    try {
      await this.authService.atualizarPerfil(nome, email);
      this.perfilSalvo.set(true);
    } catch (error) {
      this.perfilErro.set(this.mensagemErro(error, 'Não foi possível salvar seus dados.'));
    } finally {
      this.salvandoPerfil.set(false);
    }
  }

  protected async solicitarCodigo(): Promise<void> {
    if (this.senhaLoading()) {
      return;
    }
    this.senhaErro.set(null);
    this.senhaSucesso.set(false);
    this.senhaSubmetida.set(true);
    if (this.senhaForm.invalid) {
      this.senhaForm.markAllAsTouched();
      return;
    }

    this.senhaLoading.set(true);
    try {
      await this.authService.solicitarRecuperacao(
        this.perfilForm.controls.email.value.trim(),
        'alteracao',
      );
      this.codigo.set('');
      this.codigoInvalido.set(false);
      this.senhaEtapa.set('codigo');
    } catch (error) {
      this.senhaErro.set(this.mensagemErro(error, 'Não foi possível solicitar o código.'));
    } finally {
      this.senhaLoading.set(false);
    }
  }

  protected atualizarCodigo(valor: string): void {
    this.codigo.set(valor);
    this.codigoInvalido.set(false);
  }

  protected async confirmarCodigo(): Promise<void> {
    this.senhaErro.set(null);
    if (this.codigo().length !== this.codigoTamanho) {
      this.codigoInvalido.set(true);
      return;
    }
    if (this.senhaLoading()) {
      return;
    }

    this.senhaLoading.set(true);
    const { novaSenha } = this.senhaForm.getRawValue();
    try {
      await this.authService.redefinirSenha(
        this.perfilForm.controls.email.value.trim(),
        this.codigo(),
        novaSenha,
        'alteracao',
      );
      this.senhaForm.reset();
      this.senhaEtapa.set('nova');
      this.senhaSucesso.set(true);
      setTimeout(() => {
        this.authService.clearSession();
        void this.router.navigate(['/login']);
      }, 1200);
    } catch (error) {
      if (error instanceof RecuperacaoError && error.code === 'invalid_code') {
        this.codigoInvalido.set(true);
        this.senhaEtapa.set('codigo');
      }
      this.senhaErro.set(this.mensagemErro(error, 'Não foi possível alterar a senha.'));
    } finally {
      this.senhaLoading.set(false);
    }
  }

  protected async carregarPerfil(): Promise<void> {
    try {
      const user = await this.authService.obterPerfil();
      this.perfilForm.patchValue({ nome: user.nome, email: user.email });
    } catch (error) {
      const user = this.authService.getUser();
      this.perfilForm.patchValue({ nome: user?.nome ?? '', email: user?.email ?? '' });
      this.perfilErro.set(this.mensagemErro(error, 'Não foi possível carregar seus dados.'));
    } finally {
      this.carregandoPerfil.set(false);
    }
  }

  protected abrirPerfil(): void {
    this.menu.set('perfil');
    this.perfilErro.set(null);
    this.perfilSalvo.set(false);
  }

  protected abrirSenha(): void {
    this.menu.set('senha');
    this.senhaEtapa.set('nova');
    this.senhaErro.set(null);
    this.senhaSucesso.set(false);
    this.senhaSubmetida.set(false);
  }

  protected voltarInicio(): void {
    this.menu.set('inicio');
    this.senhaErro.set(null);
    this.perfilErro.set(null);
  }

  protected toggleNovaSenha(): void {
    this.hideNovaSenha.update((value) => !value);
  }

  protected toggleConfirmarSenha(): void {
    this.hideConfirmarSenha.update((value) => !value);
  }

  private mensagemErro(error: unknown, fallback: string): string {
    if (error instanceof PerfilError || error instanceof RecuperacaoError) {
      return error.message;
    }
    return fallback;
  }
}
