import {
  Component,
  Directive,
  ElementRef,
  computed,
  contentChildren,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';

const SELETORES_FOCAVEIS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

@Directive({
  selector: '[modalAcoes]',
})
export class ModalAcoesDirective {}

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
  host: {
    '(document:keydown.escape)': 'aoPressionarEscape()',
    '(keydown.tab)': 'aoAlternarFoco($event)',
  },
})
export class ModalComponent {
  private static proximoId = 0;

  readonly titulo = input.required<string>();
  readonly aberto = input.required<boolean>();
  readonly carregando = input(false);
  readonly tamanho = input<'medio' | 'grande'>('medio');

  readonly fechar = output<void>();

  protected readonly acoesProjetadas = contentChildren(ModalAcoesDirective);
  protected readonly possuiAcoes = computed(() => this.acoesProjetadas().length > 0);

  protected readonly janela = viewChild<ElementRef<HTMLElement>>('janela');

  protected readonly idTitulo = `app-modal-titulo-${++ModalComponent.proximoId}`;

  private elementoFocadoAnterior: HTMLElement | null = null;

  constructor() {
    effect((onLimpeza) => {
      const aberto = this.aberto();

      if (!aberto) {
        this.elementoFocadoAnterior?.focus();
        this.elementoFocadoAnterior = null;
        return;
      }

      if (document.activeElement instanceof HTMLElement) {
        this.elementoFocadoAnterior = document.activeElement;
      }

      document.body.style.overflow = 'hidden';
      onLimpeza(() => {
        document.body.style.overflow = '';
      });

      setTimeout(() => this.janela()?.nativeElement.focus(), 0);
    });
  }

  protected solicitarFechamento(): void {
    if (this.carregando()) {
      return;
    }
    this.fechar.emit();
  }

  protected aoClicarOverlay(evento: MouseEvent): void {
    if (evento.target !== evento.currentTarget) {
      return;
    }
    this.solicitarFechamento();
  }

  protected aoPressionarEscape(): void {
    if (!this.aberto()) {
      return;
    }
    this.solicitarFechamento();
  }

  protected aoAlternarFoco(eventoBruto: Event): void {
    if (!this.aberto()) {
      return;
    }
    const evento = eventoBruto as KeyboardEvent;

    const janela = this.janela()?.nativeElement;
    if (!janela) {
      return;
    }

    const focaveis = Array.from(janela.querySelectorAll<HTMLElement>(SELETORES_FOCAVEIS));
    if (focaveis.length === 0) {
      evento.preventDefault();
      janela.focus();
      return;
    }

    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    const ativo = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!evento.shiftKey && (ativo === ultimo || !janela.contains(ativo))) {
      evento.preventDefault();
      primeiro.focus();
    } else if (evento.shiftKey && (ativo === primeiro || !janela.contains(ativo))) {
      evento.preventDefault();
      ultimo.focus();
    }
  }
}
