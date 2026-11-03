import {
  Component,
  ElementRef,
  OnInit,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

export type FiltroTipoCampo = 'texto' | 'select' | 'data';

export interface FiltroOpcao {
  valor: string;
  rotulo: string;
}

export interface FiltroCampo {
  /** Identificador do campo, usado como chave no objeto emitido. */
  id: string;
  rotulo: string;
  tipo: FiltroTipoCampo;
  placeholder?: string;
  /** Opcoes exibidas quando o tipo e `select`. */
  opcoes?: FiltroOpcao[];
  /** Valor preenchido na primeira renderizacao. */
  valorInicial?: string;
}

export type FiltroValores = Record<string, string>;

@Component({
  selector: 'app-filtro',
  imports: [],
  templateUrl: './filtro.component.html',
  styleUrl: './filtro.component.scss',
})
export class FiltroComponent implements OnInit {
  readonly campos = input.required<FiltroCampo[]>();
  readonly buscando = input(false);
  readonly rotuloBuscar = input('Buscar');

  readonly buscar = output<FiltroValores>();
  readonly limpar = output<void>();

  protected readonly valores = signal<FiltroValores>({});

  private readonly formulario = viewChild<ElementRef<HTMLFormElement>>('formulario');

  ngOnInit(): void {
    const iniciais: FiltroValores = {};
    for (const campo of this.campos()) {
      if (campo.valorInicial !== undefined) {
        iniciais[campo.id] = campo.valorInicial;
      }
    }
    this.valores.set(iniciais);
  }

  protected valor(id: string): string {
    return this.valores()[id] ?? '';
  }

  protected atualizar(id: string, evento: Event): void {
    const valor = (evento.target as HTMLInputElement | HTMLSelectElement).value;
    this.valores.update((atuais) => ({ ...atuais, [id]: valor }));
  }

  protected enviar(evento: Event): void {
    evento.preventDefault();
    this.buscar.emit({ ...this.valores() });
  }

  protected limparCampos(): void {
    this.valores.set({});
    this.formulario()?.nativeElement.reset();
    this.limpar.emit();
  }
}
