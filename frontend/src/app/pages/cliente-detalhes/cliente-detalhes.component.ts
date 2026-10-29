import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ErrorMessageComponent } from '../../components/error-message/error-message.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import {
  TabelaAcao,
  TabelaAcaoEvento,
  TabelaColuna,
  TabelaComponent,
} from '../../components/tabela/tabela.component';
import { Cliente, ClientesError, ClientesService } from '../../services/clientes.service';
import { Pedido, PedidosError, PedidosService } from '../../services/pedidos.service';

interface PedidoClienteLinha {
  id: string;
  data: string;
  itens: string;
  total: number;
  status: string;
}

@Component({
  selector: 'app-cliente-detalhes',
  imports: [PageHeaderComponent, ErrorMessageComponent, TabelaComponent],
  templateUrl: './cliente-detalhes.component.html',
  styleUrl: './cliente-detalhes.component.scss',
})
export class ClienteDetalhesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientesService = inject(ClientesService);
  private readonly pedidosService = inject(PedidosService);

  protected readonly carregando = signal(true);
  protected readonly erro = signal('');
  protected readonly erroPedidos = signal('');
  protected readonly cliente = signal<Cliente | null>(null);
  protected readonly pedidos = signal<Pedido[]>([]);

  protected readonly colunas: TabelaColuna<PedidoClienteLinha>[] = [
    { titulo: 'Nº Pedido', campo: 'id', tipo: 'destaque' },
    { titulo: 'Data', campo: 'data', tipo: 'data' },
    { titulo: 'Itens', campo: 'itens', alinhamento: 'centro' },
    { titulo: 'Valor Total', campo: 'total', tipo: 'moeda', alinhamento: 'direita' },
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

  protected readonly acoes: TabelaAcao<PedidoClienteLinha>[] = [
    { id: 'visualizar', rotulo: 'Visualizar pedido', icone: 'visualizar' },
    { id: 'editar', rotulo: 'Editar pedido', icone: 'editar' },
  ];

  protected readonly linhas = computed<PedidoClienteLinha[]>(() =>
    this.pedidos().map((pedido) => ({
      id: this.identificador(pedido.id),
      data: pedido.data_pedido,
      itens: pedido.itens.map((item) => item.produto ?? 'Produto').join(', '),
      total: pedido.total,
      status: pedido.status ?? 'Pendente',
    })),
  );

  constructor() {
    void this.carregar();
  }

  protected async carregar(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.erro.set('Cliente nao informado.');
      this.carregando.set(false);
      return;
    }

    this.carregando.set(true);
    this.erro.set('');

    try {
      const cliente = await this.clientesService.obter(id);
      this.cliente.set(cliente);
    } catch (error) {
      this.erro.set(this.mensagemDeErro(error));
      this.carregando.set(false);
      return;
    }

    try {
      const pedidos = await this.pedidosService.listar();
      this.pedidos.set(pedidos.filter((pedido) => pedido.id_cliente === id));
    } catch (error) {
      this.erroPedidos.set(this.mensagemDeErro(error));
    } finally {
      this.carregando.set(false);
    }
  }

  protected voltar(): void {
    void this.router.navigate(['/clientes']);
  }

  protected novoPedido(): void {
    const id = this.cliente()?.id;
    void this.router.navigate(['/pedidos'], {
      queryParams: id ? { novo: true, cliente: id } : { novo: true },
    });
  }

  protected registrarAcao(evento: TabelaAcaoEvento<PedidoClienteLinha>): void {
    const pedido = this.pedidos().find(
      (item) => this.identificador(item.id) === evento.registro.id,
    );
    if (!pedido) {
      return;
    }

    if (evento.acao === 'visualizar') {
      return;
    }

    if (evento.acao === 'editar') {
      void this.router.navigate(['/pedidos'], { queryParams: { editar: pedido.id } });
    }
  }

  protected formatarTelefone(telefone: string): string {
    const digitos = telefone.replace(/\D/g, '');
    if (digitos.length === 11) {
      return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
    }
    return telefone;
  }

  private identificador(id: string): string {
    return id.length > 8 ? `#${id.slice(0, 8).toUpperCase()}` : id;
  }

  private mensagemDeErro(error: unknown): string {
    if (error instanceof ClientesError || error instanceof PedidosError) {
      return error.message;
    }
    return 'Nao foi possivel carregar os dados do cliente.';
  }
}
