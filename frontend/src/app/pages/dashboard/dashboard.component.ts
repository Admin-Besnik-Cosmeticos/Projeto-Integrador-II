import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  DashboardError,
  DashboardPedidoRecente,
  DashboardProdutoMaisVendido,
  DashboardResposta,
  DashboardService,
} from '../../services/dashboard.service';
import { STATUS_PEDIDO, StatusPedido } from '../../services/pedidos.service';
import {
  TabelaAcao,
  TabelaAcaoEvento,
  TabelaColuna,
  TabelaComponent,
} from '../../components/tabela/tabela.component';
import { ErrorMessageComponent } from '../../components/error-message/error-message.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';

type OrdenacaoPedidos = 'data-desc' | 'data-asc' | 'valor-desc' | 'valor-asc';
type OrdenacaoProdutos = 'vendidos-desc' | 'faturamento-desc' | 'faturamento-asc';

const CATEGORIA_SEM_VALOR = '__sem_categoria__';

@Component({
  selector: 'app-dashboard',
  imports: [TabelaComponent, ErrorMessageComponent, PageHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);

  protected readonly carregando = signal(true);
  protected readonly erro = signal('');
  protected readonly dados = signal<DashboardResposta | null>(null);

  protected readonly filtroStatus = signal<StatusPedido | ''>('');
  protected readonly filtroCategoria = signal('');
  protected readonly ordenacaoPedidos = signal<OrdenacaoPedidos>('data-desc');
  protected readonly ordenacaoProdutos = signal<OrdenacaoProdutos>('vendidos-desc');

  protected readonly statusOpcoes: { valor: StatusPedido | ''; rotulo: string }[] = [
    { valor: '', rotulo: 'Todos os status' },
    ...STATUS_PEDIDO.map((status) => ({ valor: status, rotulo: status })),
  ];

  protected readonly ordenacaoPedidosOpcoes: { valor: OrdenacaoPedidos; rotulo: string }[] = [
    { valor: 'data-desc', rotulo: 'Data (mais recente)' },
    { valor: 'data-asc', rotulo: 'Data (mais antiga)' },
    { valor: 'valor-desc', rotulo: 'Valor (maior)' },
    { valor: 'valor-asc', rotulo: 'Valor (menor)' },
  ];

  protected readonly ordenacaoProdutosOpcoes: { valor: OrdenacaoProdutos; rotulo: string }[] = [
    { valor: 'vendidos-desc', rotulo: 'Mais vendidos' },
    { valor: 'faturamento-desc', rotulo: 'Valor (maior)' },
    { valor: 'faturamento-asc', rotulo: 'Valor (menor)' },
  ];

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
        'Em Preparo': 'informacao',
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

  protected readonly categorias = computed(() =>
    [
      ...new Set(
        this.produtos()
          .map((produto) => produto.categoria?.trim())
          .filter((categoria): categoria is string => Boolean(categoria)),
      ),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  );

  protected readonly possuiSemCategoria = computed(() =>
    this.produtos().some((produto) => !produto.categoria?.trim()),
  );

  protected readonly produtosExibidos = computed<DashboardProdutoMaisVendido[]>(() => {
    const categoria = this.filtroCategoria();
    let produtos = this.produtos();

    if (categoria === CATEGORIA_SEM_VALOR) {
      produtos = produtos.filter((produto) => !produto.categoria?.trim());
    } else if (categoria) {
      produtos = produtos.filter((produto) => produto.categoria === categoria);
    }

    const ordenacao = this.ordenacaoProdutos();
    return [...produtos].sort((a, b) => {
      switch (ordenacao) {
        case 'faturamento-desc':
          return b.faturamento - a.faturamento;
        case 'faturamento-asc':
          return a.faturamento - b.faturamento;
        default:
          return b.vendidos - a.vendidos;
      }
    });
  });

  protected readonly pedidosExibidos = computed<DashboardPedidoRecente[]>(() => {
    const status = this.filtroStatus();
    const pedidos = status
      ? this.pedidos().filter((pedido) => pedido.status === status)
      : this.pedidos();

    const ordenacao = this.ordenacaoPedidos();
    const data = (pedido: DashboardPedidoRecente): number =>
      new Date(pedido.data_pedido).getTime();

    return [...pedidos].sort((a, b) => {
      switch (ordenacao) {
        case 'data-asc':
          return data(a) - data(b);
        case 'valor-desc':
          return b.total - a.total;
        case 'valor-asc':
          return a.total - b.total;
        default:
          return data(b) - data(a);
      }
    });
  });

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

  protected novoPedido(): void {
    void this.router.navigate(['/pedidos'], { queryParams: { novo: true } });
  }

  protected atualizarFiltroStatus(evento: Event): void {
    this.filtroStatus.set((evento.target as HTMLSelectElement).value as StatusPedido | '');
  }

  protected atualizarFiltroCategoria(evento: Event): void {
    this.filtroCategoria.set((evento.target as HTMLSelectElement).value);
  }

  protected atualizarOrdenacaoPedidos(evento: Event): void {
    this.ordenacaoPedidos.set(
      (evento.target as HTMLSelectElement).value as OrdenacaoPedidos,
    );
  }

  protected atualizarOrdenacaoProdutos(evento: Event): void {
    this.ordenacaoProdutos.set(
      (evento.target as HTMLSelectElement).value as OrdenacaoProdutos,
    );
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
    const variacao = this.dados()?.variacao_mes_anterior ?? null;
    if (variacao === null) {
      return 'neutra';
    }
    return variacao > 0 ? 'positiva' : variacao < 0 ? 'negativa' : 'neutra';
  }

  protected textoVariacao(): string {
    const variacao = this.dados()?.variacao_mes_anterior ?? null;
    if (variacao === null) {
      return 'Sem base de comparação';
    }
    return `${variacao > 0 ? '+' : ''}${variacao.toFixed(1).replace('.', ',')}% em relação ao mês anterior`;
  }

  protected produtos(): DashboardProdutoMaisVendido[] {
    return this.dados()?.produtos_mais_vendidos ?? [];
  }

  protected pedidos(): DashboardPedidoRecente[] {
    return this.dados()?.pedidos_recentes ?? [];
  }

  protected registrarAcao(
    evento: TabelaAcaoEvento<
      DashboardProdutoMaisVendido | DashboardPedidoRecente
    >,
  ): void {
    if (!this.ehPedido(evento.registro)) {
      return;
    }

    if (evento.acao === 'visualizar') {
      void this.router.navigate(['/pedidos'], {
        queryParams: { visualizar: evento.registro.id },
      });
      return;
    }

    if (evento.acao === 'editar') {
      void this.router.navigate(['/pedidos'], {
        queryParams: { editar: evento.registro.id },
      });
    }
  }

  private ehPedido(
    registro: DashboardProdutoMaisVendido | DashboardPedidoRecente,
  ): registro is DashboardPedidoRecente {
    return 'cliente' in registro;
  }

  private mensagemDeErro(error: unknown): string {
    if (error instanceof DashboardError) {
      return error.message;
    }
    return 'Nao foi possivel carregar os dados do dashboard.';
  }
}
