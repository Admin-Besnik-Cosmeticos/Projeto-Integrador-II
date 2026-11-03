import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';

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

describe('DashboardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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

  async function criarComponente(resposta: object = RESPOSTA): Promise<ComponentFixture<DashboardComponent>> {
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
});
