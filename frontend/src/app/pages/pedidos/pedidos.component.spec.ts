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

interface Vista {
  modalAberto(): boolean;
  editandoId(): string | null;
  carregandoListagem(): boolean;
  form: FormGroup;
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

    http.expectOne('/api/pedidos').flush({ pedidos: [PEDIDO] });
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
});
