import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  DashboardPedidoRecente,
  DashboardProdutoMaisVendido,
} from '../../services/dashboard.service';
import { DashboardComponent } from './dashboard.component';

const PRODUTOS: DashboardProdutoMaisVendido[] = [
  { produto: 'Hidratante', categoria: 'Cuidados', preco: 50, vendidos: 20, faturamento: 1000 },
  { produto: 'Batom', categoria: 'Maquiagem', preco: 30, vendidos: 30, faturamento: 900 },
  { produto: 'Gloss', categoria: 'Maquiagem', preco: 20, vendidos: 10, faturamento: 200 },
  { produto: 'Amostra', categoria: null, preco: 10, vendidos: 5, faturamento: 50 },
];

const PEDIDOS: DashboardPedidoRecente[] = [
  {
    id: 'PED-001',
    cliente: 'Ana Ribeiro',
    itens: 2,
    total: 150,
    status: 'Entregue',
    data_pedido: '2026-10-29T10:00:00Z',
  },
  {
    id: 'PED-002',
    cliente: 'Bruna Costa',
    itens: 4,
    total: 300,
    status: 'Pago',
    data_pedido: '2026-10-30T10:00:00Z',
  },
  {
    id: 'PED-003',
    cliente: 'Carla Menezes',
    itens: 1,
    total: 50,
    status: 'Cancelado',
    data_pedido: '2026-10-28T10:00:00Z',
  },
];

const RESPOSTA = {
  vendas_totais: 12500,
  pedidos_mes: 42,
  variacao_mes_anterior: 8.5,
  clientes_ativos: 120,
  ticket_medio: 297.62,
  produtos_mais_vendidos: PRODUTOS,
  pedidos_recentes: PEDIDOS,
};

type Vista = {
  categorias(): string[];
  possuiSemCategoria(): boolean;
  produtosExibidos(): DashboardProdutoMaisVendido[];
  pedidosExibidos(): DashboardPedidoRecente[];
  atualizarFiltroStatus(evento: Event): void;
  atualizarFiltroCategoria(evento: Event): void;
  atualizarOrdenacaoPedidos(evento: Event): void;
  atualizarOrdenacaoProdutos(evento: Event): void;
  registrarAcao(evento: {
    acao: string;
    registro: DashboardProdutoMaisVendido | DashboardPedidoRecente;
  }): void;
};

const vistas = (componente: DashboardComponent): Vista => componente as unknown as Vista;

const evento = (valor: string): Event =>
  ({ target: { value: valor } }) as unknown as Event;

describe('DashboardComponent', () => {
  let navegacoes: Array<{ comandos: unknown[]; extras: unknown }>;

  beforeEach(() => {
    navegacoes = [];
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: {
            navigate: async (comandos: unknown[], extras: unknown) => {
              navegacoes.push({ comandos, extras });
              return true;
            },
          },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  async function drenarMicrotasks(): Promise<void> {
    for (let i = 0; i < 20; i++) {
      await Promise.resolve();
    }
  }

  async function criarComponente(
    resposta: object = RESPOSTA,
  ): Promise<ComponentFixture<DashboardComponent>> {
    const fixture = TestBed.createComponent(DashboardComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne('/api/dashboard').flush(resposta);
    await drenarMicrotasks();
    fixture.detectChanges();

    return fixture;
  }

  it('renderiza os indicadores e as tabelas', async () => {
    const fixture = await criarComponente();
    const compilado = fixture.nativeElement as HTMLElement;

    expect(compilado.querySelector('h1')?.textContent).toContain('Dashboard');
    expect(compilado.textContent).toContain('Vendas totais');
    expect(compilado.textContent).toContain('Produtos Mais Vendidos');
    expect(compilado.textContent).toContain('Pedidos Recentes');
  });

  it('exibe a variacao formatada quando a API retorna um numero', async () => {
    const fixture = await criarComponente();
    const compilado = fixture.nativeElement as HTMLElement;

    expect(compilado.textContent).toContain('+8,5% em relação ao mês anterior');
  });

  it('exibe "Sem base de comparação" quando a variacao e nula', async () => {
    const fixture = await criarComponente({ ...RESPOSTA, variacao_mes_anterior: null });
    const compilado = fixture.nativeElement as HTMLElement;

    expect(compilado.textContent).toContain('Sem base de comparação');
    expect(compilado.textContent).not.toContain('+0,0%');
  });

  it('lista as categorias dos produtos vendidos', async () => {
    const fixture = await criarComponente();
    const vista = vistas(fixture.componentInstance);

    expect(vista.categorias()).toEqual(['Cuidados', 'Maquiagem']);
    expect(vista.possuiSemCategoria()).toBe(true);
  });

  it('filtra pedidos por status', async () => {
    const fixture = await criarComponente();
    const vista = vistas(fixture.componentInstance);

    vista.atualizarFiltroStatus(evento('Pago'));
    fixture.detectChanges();

    expect(vista.pedidosExibidos().map((pedido) => pedido.id)).toEqual(['PED-002']);
  });

  it('ordena pedidos por data e por valor', async () => {
    const fixture = await criarComponente();
    const vista = vistas(fixture.componentInstance);

    vista.atualizarOrdenacaoPedidos(evento('data-asc'));
    expect(vista.pedidosExibidos().map((pedido) => pedido.id)).toEqual([
      'PED-003',
      'PED-001',
      'PED-002',
    ]);

    vista.atualizarOrdenacaoPedidos(evento('valor-desc'));
    expect(vista.pedidosExibidos().map((pedido) => pedido.id)).toEqual([
      'PED-002',
      'PED-001',
      'PED-003',
    ]);

    vista.atualizarOrdenacaoPedidos(evento('valor-asc'));
    expect(vista.pedidosExibidos().map((pedido) => pedido.id)).toEqual([
      'PED-003',
      'PED-001',
      'PED-002',
    ]);
  });

  it('filtra produtos por categoria e por produtos sem categoria', async () => {
    const fixture = await criarComponente();
    const vista = vistas(fixture.componentInstance);

    vista.atualizarFiltroCategoria(evento('Maquiagem'));
    expect(vista.produtosExibidos().map((produto) => produto.produto)).toEqual([
      'Batom',
      'Gloss',
    ]);

    vista.atualizarFiltroCategoria(evento('__sem_categoria__'));
    expect(vista.produtosExibidos().map((produto) => produto.produto)).toEqual(['Amostra']);
  });

  it('ordena produtos por valor', async () => {
    const fixture = await criarComponente();
    const vista = vistas(fixture.componentInstance);

    vista.atualizarOrdenacaoProdutos(evento('faturamento-desc'));
    expect(vista.produtosExibidos().map((produto) => produto.produto)).toEqual([
      'Hidratante',
      'Batom',
      'Gloss',
      'Amostra',
    ]);

    vista.atualizarOrdenacaoProdutos(evento('faturamento-asc'));
    expect(vista.produtosExibidos().map((produto) => produto.produto)).toEqual([
      'Amostra',
      'Gloss',
      'Batom',
      'Hidratante',
    ]);
  });

  it('navega para visualizar e editar um pedido recente', async () => {
    const fixture = await criarComponente();
    const vista = vistas(fixture.componentInstance);

    vista.registrarAcao({ acao: 'visualizar', registro: PEDIDOS[0] });
    vista.registrarAcao({ acao: 'editar', registro: PEDIDOS[1] });

    expect(navegacoes).toEqual([
      {
        comandos: ['/pedidos'],
        extras: { queryParams: { visualizar: 'PED-001' } },
      },
      {
        comandos: ['/pedidos'],
        extras: { queryParams: { editar: 'PED-002' } },
      },
    ]);
  });
});
