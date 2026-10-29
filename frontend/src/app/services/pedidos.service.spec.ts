import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PedidosService } from './pedidos.service';

describe('PedidosService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('lista pedidos via GET /api/pedidos', async () => {
    const service = TestBed.inject(PedidosService);
    const http = TestBed.inject(HttpTestingController);
    const promise = service.listar();
    const request = http.expectOne('/api/pedidos');
    expect(request.request.method).toBe('GET');
    request.flush({ pedidos: [] });
    await expect(promise).resolves.toEqual([]);
  });

  it('cadastra pedido via POST /api/pedidos', async () => {
    const service = TestBed.inject(PedidosService);
    const http = TestBed.inject(HttpTestingController);
    const dados = { id_cliente: 'cliente-1', itens: [{ id_produto: 'produto-1', quantidade: 2 }] };
    const promise = service.cadastrar(dados);
    const request = http.expectOne('/api/pedidos');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(dados);
    request.flush({ pedido: { id: 'pedido-1', ...dados, data_pedido: '', itens: [], total: 0 } });
    await expect(promise).resolves.toMatchObject({ id: 'pedido-1' });
  });
});
