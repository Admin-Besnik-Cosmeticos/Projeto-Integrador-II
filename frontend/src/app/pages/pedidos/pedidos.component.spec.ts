import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { PedidosComponent } from './pedidos.component';
import { ToastService } from '../../services/toast.service';

const CLIENTE = {
  id: '11111111-1111-1111-1111-111111111111',
  nome: 'Ana Ribeiro',
  telefone: '11999998888',
  endereco: { cidade: 'Sao Paulo', estado: 'SP', endereco_entrega: 'Rua das Flores, 45' },
};

const PRODUTO = {
  id: '22222222-2222-2222-2222-222222222222',
  nome: 'Hidratante Facial',
  preco: 50,
  quantidade_estoque: 10,
  categoria: 'Skincare',
};

const PEDIDO = {
  id: '33333333-3333-3333-3333-333333333333',
  id_cliente: CLIENTE.id,
  cliente: CLIENTE.nome,
  data_pedido: '2026-10-29T10:00:00.000Z',
  status: 'Pago' as const,
  itens: [
    {
      id: '44444444-4444-4444-4444-444444444444',
      id_produto: PRODUTO.id,
      produto: PRODUTO.nome,
      quantidade: 2,
      preco_unitario: PRODUTO.preco,
    },
  ],
  total: 100,
};

const PEDIDO_ENTREGUE = {
  ...PEDIDO,
  id: '55555555-5555-5555-5555-555555555555',
  status: 'Entregue' as const,
  total: 60,
  data_pedido: '2026-10-30T15:00:00.000Z',
};

const PEDIDO_CANCELADO = {
  ...PEDIDO,
  id: '66666666-6666-6666-6666-666666666666',
  cliente: 'Bruna Costa',
  status: 'Cancelado' as const,
  total: 40,
  data_pedido: '2026-10-27T15:00:00.000Z',
};

interface Vista {
  modalAberto(): boolean;
  modalVisualizacaoAberto(): boolean;
  pedidoSelecionado(): typeof PEDIDO | null;
  editandoId(): string | null;
  carregandoListagem(): boolean;
  form: FormGroup;
  camposFiltro: { id: string; rotulo: string; tipo: string; valorInicial?: string }[];
  buscarFiltros(valores: Record<string, string>): void;
  limparFiltros(): void;
  linhasFiltradas(): Array<{
    id: string;
    cliente: string;
    status: string;
    total: number;
  }>;
  descricaoPeriodo(): string;
  indicadores(): {
    faturamento: number;
    totalPedidos: number;
    ticketMedio: number;
  };
  abrirModal(): Promise<void>;
  salvarPedido(): Promise<void>;
}

const vistas = (componente: PedidosComponent): Vista => componente as unknown as Vista;

const toasts = () => TestBed.inject(ToastService).toasts();

describe('PedidosComponent', () => {
  let navegacoes: unknown[];

  beforeEach(() => {
    navegacoes = [];
    TestBed.configureTestingModule({
      imports: [PedidosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: async (...args: unknown[]) => {
              navegacoes.push(args);
              return true;
            },
          },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(ToastService).limpar();
    TestBed.inject(HttpTestingController).verify();
  });

  async function drenarMicrotasks(): Promise<void> {
    for (let i = 0; i < 30; i++) {
      await Promise.resolve();
    }
  }

  async function criarComponente(
    queryParams: Record<string, string> = {},
    pedidos: unknown[] = [PEDIDO],
  ): Promise<{
    fixture: ComponentFixture<PedidosComponent>;
    vista: Vista;
    http: HttpTestingController;
  }> {
    const route = TestBed.inject(ActivatedRoute);
    (route.snapshot as { queryParamMap: unknown }).queryParamMap =
      convertToParamMap(queryParams);

    const fixture = TestBed.createComponent(PedidosComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne('/api/pedidos').flush({ pedidos });
    await drenarMicrotasks();

    http.expectOne('/api/clientes').flush({ clientes: [CLIENTE] });
    http.expectOne('/api/produtos').flush({ produtos: [PRODUTO] });
    await drenarMicrotasks();

    fixture.detectChanges();

    return {
      fixture,
      vista: vistas(fixture.componentInstance),
      http,
    };
  }

  it('pre-seleciona o cliente ao abrir por /pedidos?novo=true&cliente=<id>', async () => {
    const { vista } = await criarComponente({ novo: 'true', cliente: CLIENTE.id });

    expect(vista.modalAberto()).toBe(true);
    expect(vista.editandoId()).toBeNull();
    expect(vista.form.controls['idCliente'].value).toBe(CLIENTE.id);
    expect(vista.form.controls['status'].value).toBe('Pendente');
    expect(navegacoes).toHaveLength(1);
  });

  it('abre a edicao ao acessar /pedidos?editar=<id>', async () => {
    const { vista } = await criarComponente({ editar: PEDIDO.id });

    expect(vista.modalAberto()).toBe(true);
    expect(vista.editandoId()).toBe(PEDIDO.id);
    expect(vista.form.controls['idCliente'].value).toBe(CLIENTE.id);
    expect(vista.form.controls['status'].value).toBe('Pago');
    expect((vista.form.controls['itens'] as unknown as { length: number }).length).toBe(1);
    expect(navegacoes).toHaveLength(1);
  });

  it('abre a visualizacao ao acessar /pedidos?visualizar=<id>', async () => {
    const { vista } = await criarComponente({ visualizar: PEDIDO.id });

    expect(vista.modalVisualizacaoAberto()).toBe(true);
    expect(vista.pedidoSelecionado()?.id).toBe(PEDIDO.id);
    expect(vista.modalAberto()).toBe(false);
    expect(navegacoes).toHaveLength(1);
  });

  it('envia o status selecionado ao cadastrar pedido', async () => {
    const { vista, http } = await criarComponente();

    await vista.abrirModal();
    vista.form.setValue({
      idCliente: CLIENTE.id,
      status: 'Enviado',
      itens: [{ idProduto: PRODUTO.id, quantidade: '2' }],
    });

    const salvamento = vista.salvarPedido();
    const req = http.expectOne('/api/pedidos');

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      id_cliente: CLIENTE.id,
      status: 'Enviado',
      itens: [{ id_produto: PRODUTO.id, quantidade: 2 }],
    });

    req.flush({ pedido: { ...PEDIDO, status: 'Enviado' } }, { status: 201, statusText: 'Created' });
    await salvamento;

    expect(vista.modalAberto()).toBe(false);
    expect(toasts()[0].tipo).toBe('sucesso');
  });

  it('configura os filtros de codigo, cliente, datas e status', async () => {
    const { vista } = await criarComponente();

    expect(vista.camposFiltro.map((campo) => campo.id)).toEqual([
      'codigo',
      'cliente',
      'dataInicial',
      'dataFinal',
      'status',
    ]);
  });

  it('aplica o trimestre atual como periodo padrao', async () => {
    const { vista } = await criarComponente();
    const agora = new Date();
    const primeiroMes = Math.floor(agora.getMonth() / 3) * 3;
    const inicio = new Date(agora.getFullYear(), primeiroMes, 1);
    const fim = new Date(agora.getFullYear(), primeiroMes + 3, 0);
    const formatar = (data: Date): string =>
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;

    const campoInicial = vista.camposFiltro.find((campo) => campo.id === 'dataInicial');
    const campoFinal = vista.camposFiltro.find((campo) => campo.id === 'dataFinal');

    expect(campoInicial?.valorInicial).toBe(formatar(inicio));
    expect(campoFinal?.valorInicial).toBe(formatar(fim));
    expect(vista.descricaoPeriodo()).toContain('trimestre atual');
  });

  it('so aplica o filtro ao clicar em buscar, sem refazer a requisicao', async () => {
    const { fixture, vista, http } = await criarComponente({}, [
      PEDIDO,
      PEDIDO_ENTREGUE,
      PEDIDO_CANCELADO,
    ]);

    vista.limparFiltros();
    expect(vista.linhasFiltradas()).toHaveLength(3);

    vista.buscarFiltros({ status: 'Pago' });
    fixture.detectChanges();

    expect(vista.linhasFiltradas().map((linha) => linha.status)).toEqual(['Pago']);
    http.expectNone('/api/pedidos');
  });

  it('filtra por codigo, cliente, intervalo de datas e status', async () => {
    const { vista } = await criarComponente({}, [
      PEDIDO,
      PEDIDO_ENTREGUE,
      PEDIDO_CANCELADO,
    ]);

    vista.buscarFiltros({ codigo: '5555' });
    expect(vista.linhasFiltradas().map((linha) => linha.status)).toEqual(['Entregue']);

    vista.buscarFiltros({ cliente: 'bruna' });
    expect(vista.linhasFiltradas().map((linha) => linha.status)).toEqual(['Cancelado']);

    vista.buscarFiltros({ dataInicial: '2026-10-28', dataFinal: '2026-10-30' });
    expect(vista.linhasFiltradas().map((linha) => linha.status)).toEqual([
      'Pago',
      'Entregue',
    ]);

    vista.buscarFiltros({ dataInicial: '2026-10-31' });
    expect(vista.linhasFiltradas()).toHaveLength(0);

    vista.buscarFiltros({ dataFinal: '2026-10-27' });
    expect(vista.linhasFiltradas().map((linha) => linha.status)).toEqual(['Cancelado']);

    vista.buscarFiltros({ status: 'Pago' });
    expect(vista.linhasFiltradas().map((linha) => linha.status)).toEqual(['Pago']);
  });

  it('descreve o mes quando o intervalo cobre um mes inteiro', async () => {
    const { vista } = await criarComponente();
    const agora = new Date();
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
    const formatar = (data: Date): string =>
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;

    vista.buscarFiltros({
      dataInicial: formatar(inicio),
      dataFinal: formatar(fim),
    });

    expect(vista.descricaoPeriodo()).toContain('mês atual');
  });

  it('volta a exibir todos os pedidos ao limpar os filtros', async () => {
    const { vista } = await criarComponente({}, [PEDIDO, PEDIDO_CANCELADO]);

    vista.buscarFiltros({ status: 'Cancelado' });
    expect(vista.linhasFiltradas()).toHaveLength(1);

    vista.limparFiltros();
    expect(vista.linhasFiltradas()).toHaveLength(2);
    expect(vista.descricaoPeriodo()).toContain('todos os pedidos');
  });

  it('calcula faturamento, total de pedidos e ticket medio do periodo', async () => {
    const agora = new Date();
    const dataAtual = new Date(agora.getFullYear(), agora.getMonth(), 10, 12).toISOString();
    const dataAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 10, 12).toISOString();
    const formatar = (data: Date): string =>
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;

    const { fixture, vista } = await criarComponente({}, [
      { ...PEDIDO, data_pedido: dataAtual, status: 'Pago', total: 100 },
      { ...PEDIDO_ENTREGUE, data_pedido: dataAtual, total: 60 },
      { ...PEDIDO_CANCELADO, data_pedido: dataAtual, total: 40 },
      { ...PEDIDO, id: '77777777-7777-7777-7777-777777777777', data_pedido: dataAnterior, status: 'Pendente', total: 20 },
    ]);

    vista.buscarFiltros({
      dataInicial: formatar(new Date(agora.getFullYear(), agora.getMonth() - 1, 1)),
      dataFinal: formatar(new Date(agora.getFullYear(), agora.getMonth() + 1, 0)),
    });

    expect(vista.indicadores()).toEqual({
      faturamento: 160,
      totalPedidos: 4,
      ticketMedio: 80,
    });

    const texto = ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(
      /\u00a0/g,
      ' ',
    );
    expect(texto).toContain('Faturamento');
    expect(texto).toContain('Total de Pedidos');
    expect(texto).toContain('R$ 160,00');
    expect(texto).toContain('R$ 80,00');
  });
});
