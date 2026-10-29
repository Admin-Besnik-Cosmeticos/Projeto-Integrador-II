import { Component, inject, signal } from '@angular/core';
import {
  DashboardError,
  DashboardPedidoRecente,
  DashboardProdutoMaisVendido,
  DashboardResposta,
  DashboardService,
} from '../../services/dashboard.service';
import {
  TabelaAcao,
  TabelaAcaoEvento,
  TabelaColuna,
  TabelaComponent,
} from '../../components/tabela/tabela.component';

@Component({
  selector: 'app-dashboard',
  imports: [TabelaComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly dashboardService = inject(DashboardService);

  protected readonly carregando = signal(true);
  protected readonly erro = signal('');
  protected readonly dados = signal<DashboardResposta | null>(null);

  protected readonly produtosColunas: TabelaColuna<DashboardProdutoMaisVendido>[] = [
    { titulo: 'Produto', campo: 'produto', tipo: 'destaque' },
    { titulo: 'Categoria', campo: 'categoria' },
    { titulo: 'Preço', campo: 'preco', tipo: 'moeda', alinhamento: 'direita' },
    { titulo: 'Vendidos', campo: 'vendidos', alinhamento: 'centro' },
    { titulo: 'Faturamento', campo: 'faturamento', tipo: 'moeda', alinhamento: 'direita' },
  ];

  protected readonly produtosAcoes: TabelaAcao<DashboardProdutoMaisVendido>[] = [
    { id: 'visualizar', rotulo: 'Visualizar produto', icone: 'visualizar' },
    { id: 'editar', rotulo: 'Editar produto', icone: 'editar' },
  ];

  protected readonly pedidosColunas: TabelaColuna<DashboardPedidoRecente>[] = [
    { titulo: 'Pedido', campo: 'id', tipo: 'destaque' },
    { titulo: 'Cliente', campo: 'cliente' },
    { titulo: 'Data', campo: 'data_pedido', tipo: 'data' },
    { titulo: 'Itens', campo: 'itens', alinhamento: 'centro' },
    { titulo: 'Total', campo: 'total', tipo: 'moeda', alinhamento: 'direita' },
    {
      titulo: 'Status',
      campo: 'status',
      tipo: 'tag',
      alinhamento: 'centro',
      tons: {
        Pendente: 'atencao',
        Pago: 'informacao',
        Enviado: 'informacao',
        Entregue: 'sucesso',
        Cancelado: 'erro',
      },
    },
  ];

  protected readonly pedidosAcoes: TabelaAcao<DashboardPedidoRecente>[] = [
    { id: 'visualizar', rotulo: 'Visualizar pedido', icone: 'visualizar' },
    { id: 'editar', rotulo: 'Editar pedido', icone: 'editar' },
  ];

  constructor() {
    void this.carregar();
  }

  protected async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set('');

    try {
      this.dados.set(await this.dashboardService.obter());
    } catch (error) {
      this.erro.set(this.mensagemDeErro(error));
      this.dados.set(null);
    } finally {
      this.carregando.set(false);
    }
  }

  protected valor(indicador: keyof DashboardResposta): number {
    const valor = this.dados()?.[indicador];
    return typeof valor === 'number' ? valor : 0;
  }

  protected formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }

  protected classeVariacao(): string {
    const variacao = this.valor('variacao_mes_anterior');
    return variacao > 0 ? 'positiva' : variacao < 0 ? 'negativa' : 'neutra';
  }

  protected textoVariacao(): string {
    const variacao = this.valor('variacao_mes_anterior');
    return `${variacao > 0 ? '+' : ''}${variacao.toFixed(1).replace('.', ',')}%`;
  }

  protected produtos(): DashboardProdutoMaisVendido[] {
    return this.dados()?.produtos_mais_vendidos ?? [];
  }

  protected pedidos(): DashboardPedidoRecente[] {
    return this.dados()?.pedidos_recentes ?? [];
  }

  protected registrarAcao(_evento: TabelaAcaoEvento<DashboardProdutoMaisVendido | DashboardPedidoRecente>): void {
    // As ações serão conectadas às telas de detalhe quando elas forem disponibilizadas.
  }

  private mensagemDeErro(error: unknown): string {
    if (error instanceof DashboardError) {
      return error.message;
    }
    return 'Nao foi possivel carregar os dados do dashboard.';
  }
}
