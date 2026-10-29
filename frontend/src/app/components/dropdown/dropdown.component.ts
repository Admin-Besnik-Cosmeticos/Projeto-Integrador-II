import {
  Component,
  HostListener,
  computed,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface DropdownOpcao {
  valor: string;
  rotulo: string;
  desabilitada?: boolean;
}

@Component({
  selector: 'app-dropdown',
  imports: [],
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DropdownComponent),
      multi: true,
    },
  ],
})
export class DropdownComponent implements ControlValueAccessor {
  readonly opcoes = input<DropdownOpcao[]>([]);
  readonly placeholder = input('Selecione uma opção');
  readonly buscaPlaceholder = input('Buscar...');
  readonly ariaLabel = input('');
  readonly valorSelecionado = output<string>();

  protected readonly aberto = signal(false);
  protected readonly desabilitado = signal(false);
  protected readonly valor = signal('');
  protected readonly termoBusca = signal('');

  protected readonly opcaoSelecionada = computed(() =>
    this.opcoes().find((opcao) => opcao.valor === this.valor()),
  );

  protected readonly opcoesFiltradas = computed(() => {
    const termo = this.normalizar(this.termoBusca());
    if (!termo) {
      return this.opcoes();
    }

    return this.opcoes().filter((opcao) =>
      this.normalizar(opcao.rotulo).includes(termo),
    );
  });

  private propagarAlteracao: (valor: string) => void = () => undefined;
  private propagarToque: () => void = () => undefined;

  writeValue(valor: string | null): void {
    this.valor.set(valor ?? '');
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.propagarAlteracao = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.propagarToque = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.desabilitado.set(desabilitado);
    if (desabilitado) {
      this.fechar();
    }
  }

  protected alternar(): void {
    if (this.desabilitado()) {
      return;
    }

    if (this.aberto()) {
      this.fechar();
    } else {
      this.aberto.set(true);
      this.termoBusca.set('');
    }
  }

  protected selecionar(opcao: DropdownOpcao): void {
    if (opcao.desabilitada) {
      return;
    }

    this.valor.set(opcao.valor);
    this.propagarAlteracao(opcao.valor);
    this.valorSelecionado.emit(opcao.valor);
    this.fechar();
  }

  protected atualizarBusca(evento: Event): void {
    const entrada = evento.target;
    if (entrada instanceof HTMLInputElement) {
      this.termoBusca.set(entrada.value);
    }
  }

  protected fechar(): void {
    if (!this.aberto()) {
      return;
    }
    this.aberto.set(false);
    this.propagarToque();
  }

  @HostListener('document:click', ['$event'])
  protected aoClicarDocumento(evento: MouseEvent): void {
    const alvo = evento.target;
    if (alvo instanceof HTMLElement && !alvo.closest('app-dropdown')) {
      this.fechar();
    }
  }

  private normalizar(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
