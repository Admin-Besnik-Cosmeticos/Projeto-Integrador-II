import { Component, computed, input, output } from '@angular/core';

export type TabelaTipoColuna = 'texto' | 'destaque' | 'data' | 'moeda' | 'tag';
export type TabelaAlinhamento = 'esquerda' | 'centro' | 'direita';
export type TabelaTonalidadeTag = 'neutro' | 'sucesso' | 'informacao' | 'atencao' | 'erro';
export type TabelaIconeAcao = 'visualizar' | 'editar' | 'excluir';

export interface TabelaColuna<T> {
  titulo: string;
  campo: Extract<keyof T, string>;
  tipo?: TabelaTipoColuna;
  alinhamento?: TabelaAlinhamento;
  tons?: Partial<Record<string, TabelaTonalidadeTag>>;
}

export interface TabelaAcao<T> {
  id: string;
  rotulo: string;
  icone: TabelaIconeAcao;
}

export interface TabelaAcaoEvento<T> {
  acao: string;
  registro: T;
}

const MESES_ABREVIADOS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

@Component({
  selector: 'app-tabela',
  templateUrl: './tabela.component.html',
  styleUrl: './tabela.component.scss',
})
export class TabelaComponent<T> {
  readonly colunas = input.required<TabelaColuna<T>[]>();
  readonly dados = input<T[]>([]);
  readonly acoes = input<TabelaAcao<T>[]>([]);
  readonly carregando = input(false);
  readonly linhasCarregando = input(4);
  readonly mensagemVazio = input('Nenhum registro encontrado');
  readonly descricaoVazio = input('');
  readonly moeda = input('BRL');

  readonly acaoSelecionada = output<TabelaAcaoEvento<T>>();

  protected readonly linhasEsqueleto = computed(() =>
    Array.from({ length: this.linhasCarregando() }, (_, indice) => indice),
  );

  protected readonly totalColunas = computed(
    () => this.colunas().length + (this.acoes().length > 0 ? 1 : 0),
  );

  protected texto(registro: T, coluna: TabelaColuna<T>): string {
    const valor: unknown = registro[coluna.campo];

    if (
      valor === null ||
      valor === undefined ||
      (typeof valor === 'string' && valor.trim() === '')
    ) {
      return '—';
    }

    switch (coluna.tipo) {
      case 'data':
        return this.formatarData(valor);
      case 'moeda':
        return this.formatarMoeda(valor);
      default:
        return String(valor);
    }
  }

  protected tonalidade(registro: T, coluna: TabelaColuna<T>): TabelaTonalidadeTag {
    return coluna.tons?.[String(registro[coluna.campo])] ?? 'neutro';
  }

  protected classeAlinhamento(alinhamento?: TabelaAlinhamento): string {
    switch (alinhamento) {
      case 'centro':
        return 'tabela__celula--centro';
      case 'direita':
        return 'tabela__celula--direita';
      default:
        return '';
    }
  }

  protected selecionarAcao(acao: TabelaAcao<T>, registro: T): void {
    this.acaoSelecionada.emit({ acao: acao.id, registro });
  }

  private formatarData(valor: unknown): string {
    const data = valor instanceof Date ? valor : new Date(String(valor));

    if (Number.isNaN(data.getTime())) {
      return String(valor);
    }

    const dia = String(data.getDate()).padStart(2, '0');
    const mes = MESES_ABREVIADOS[data.getMonth()];
    return `${dia} ${mes} ${data.getFullYear()}`;
  }

  private formatarMoeda(valor: unknown): string {
    const numero = typeof valor === 'number' ? valor : Number(String(valor));

    if (Number.isNaN(numero)) {
      return String(valor);
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: this.moeda(),
    }).format(numero);
  }
}
