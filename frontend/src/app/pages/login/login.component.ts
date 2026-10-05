import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthError, AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly showTransition = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly hidePassword = signal(true);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]],
    lembrar: [false],
  });

  protected get emailInvalid(): boolean {
    const control = this.form.controls.email;
    return control.invalid && (control.touched || this.submitted());
  }

  protected get senhaInvalid(): boolean {
    const control = this.form.controls.senha;
    return control.invalid && (control.touched || this.submitted());
  }

  protected togglePassword(): void {
    this.hidePassword.update((value) => !value);
  }

  protected async submit(): Promise<void> {
    if (this.loading() || this.showTransition()) {
      return;
    }

    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { email, senha, lembrar } = this.form.getRawValue();

    try {
      await this.authService.login(email.trim(), senha, lembrar);
      this.loading.set(false);
      this.showTransition.set(true);
      setTimeout(() => {
        void this.router.navigate(['/dashboard']);
      }, 800);
    } catch (error) {
      if (error instanceof AuthError && error.code === 'invalid_credentials') {
        this.errorMessage.set('Credenciais invalidas.');
      } else if (error instanceof AuthError && error.code === 'network_error') {
        this.errorMessage.set('Nao foi possivel conectar ao servidor.');
      } else {
        this.errorMessage.set('Nao foi possivel realizar o login.');
      }
      this.loading.set(false);
    }
  }
}
