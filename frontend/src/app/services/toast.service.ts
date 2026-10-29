import { Injectable, signal } from '@angular/core';

export type ToastTipo = 'sucesso' | 'erro';

export interface Toast {
  id: number;
  mensagem: string;
  tipo: ToastTipo;
}

export const DURACAO_TOAST_MS = 10_000;
const MAXIMO_TOASTS = 4;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private static proximoId = 0;

  private readonly temporizadores = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly toastsInternos = signal<Toast[]>([]);

  readonly toasts = this.toastsInternos.asReadonly();

  sucesso(mensagem: string): number | null {
    return this.mostrar(mensagem, 'sucesso');
  }

  erro(mensagem: string): number | null {
    return this.mostrar(mensagem, 'erro');
  }

  mostrar(mensagem: string, tipo: ToastTipo, duracao = DURACAO_TOAST_MS): number | null {
    const texto = mensagem.trim();
    if (!texto) {
      return null;
    }

    const id = ++ToastService.proximoId;
    this.toastsInternos.update((toasts) => [...toasts, { id, mensagem: texto, tipo }]);

    const excedentes = this.toasts().slice(0, -MAXIMO_TOASTS);
    excedentes.forEach((toast) => this.fechar(toast.id));

    if (duracao > 0) {
      this.temporizadores.set(
        id,
        setTimeout(() => this.fechar(id), duracao),
      );
    }

    return id;
  }

  fechar(id: number): void {
    this.cancelarTemporizador(id);
    this.toastsInternos.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  limpar(): void {
    this.temporizadores.forEach((temporizador) => clearTimeout(temporizador));
    this.temporizadores.clear();
    this.toastsInternos.set([]);
  }

  private cancelarTemporizador(id: number): void {
    const temporizador = this.temporizadores.get(id);
    if (temporizador === undefined) {
      return;
    }
    clearTimeout(temporizador);
    this.temporizadores.delete(id);
  }
}
