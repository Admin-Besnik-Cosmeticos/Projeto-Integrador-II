import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DashboardService } from './dashboard.service';

const RESPOSTA = {
  vendas_totais: 12500,
  pedidos_mes: 42,
  variacao_mes_anterior: 8.5,
  clientes_ativos: 120,
  ticket_medio: 297.62,
  produtos_mais_vendidos: [
    { produto: 'Hidratante', categoria: 'Cuidados', preco: 50, vendidos: 20, faturamento: 1000 },
  ],
  pedidos_recentes: [
    {
      id: 'PED-001',
      cliente: 'Ana Ribeiro',
      itens: 2,
      total: 150,
      status: 'Entregue',
      data_pedido: '2026-10-29T10:00:00Z',
    },
  ],
};

describe('DashboardService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('obtém os dados consolidados via GET /api/dashboard', async () => {
    const service = TestBed.inject(DashboardService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.obter();
    const request = http.expectOne('/api/dashboard');

    expect(request.request.method).toBe('GET');
    request.flush(RESPOSTA);

    await expect(promise).resolves.toEqual(RESPOSTA);
  });

  it('mapeia falha de rede', async () => {
    const service = TestBed.inject(DashboardService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.obter();
    const request = http.expectOne('/api/dashboard');
    request.error(new ProgressEvent('error'), { status: 0 });

    await expect(promise).rejects.toMatchObject({ code: 'network_error' });
  });
});
