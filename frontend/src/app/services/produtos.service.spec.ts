import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProdutoSalvar, ProdutosService } from './produtos.service';

const PRODUTO = {
  id: '1a0b0f88-96e8-4a01-84a4-99b0ea2d1a00',
  nome: 'Base Líquida Matte',
  categoria: 'Maquiagem',
  preco: 129.9,
  quantidade_estoque: 12,
};

function dados(): ProdutoSalvar {
  return {
    nome: 'Base Líquida Matte',
    categoria: 'Maquiagem',
    preco: 129.9,
    quantidade_estoque: 12,
  };
}

describe('ProdutosService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('lista produtos via GET /api/produtos', async () => {
    const service = TestBed.inject(ProdutosService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.listar();
    const req = http.expectOne('/api/produtos');
    expect(req.request.method).toBe('GET');
    req.flush({ produtos: [PRODUTO] });

    await expect(promise).resolves.toEqual([PRODUTO]);
  });

  it('retorna lista vazia quando a API nao envia produtos', async () => {
    const service = TestBed.inject(ProdutosService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.listar();
    http.expectOne('/api/produtos').flush({});

    await expect(promise).resolves.toEqual([]);
  });

  it('cadastra produto via POST /api/produtos', async () => {
    const service = TestBed.inject(ProdutosService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.cadastrar(dados());
    const req = http.expectOne('/api/produtos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dados());
    req.flush({ produto: PRODUTO }, { status: 201, statusText: 'Created' });

    await expect(promise).resolves.toEqual(PRODUTO);
  });

  it('atualiza produto via PUT /api/produtos com id na query', async () => {
    const service = TestBed.inject(ProdutosService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.atualizar(PRODUTO.id, dados());
    const req = http.expectOne(`/api/produtos?id=${PRODUTO.id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dados());
    req.flush({ produto: PRODUTO });

    await expect(promise).resolves.toEqual(PRODUTO);
  });

  it('remove produto via DELETE /api/produtos com id na query', async () => {
    const service = TestBed.inject(ProdutosService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.remover(PRODUTO.id);
    const req = http.expectOne(`/api/produtos?id=${PRODUTO.id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Produto removido.' });

    await expect(promise).resolves.toBeUndefined();
  });

  it('mapeia erro 400 com mensagem da API', async () => {
    const service = TestBed.inject(ProdutosService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.cadastrar(dados());
    const req = http.expectOne('/api/produtos');
    req.flush({ erro: 'Preco obrigatorio.' }, { status: 400, statusText: 'Bad Request' });

    await expect(promise).rejects.toMatchObject({
      message: 'Preco obrigatorio.',
      code: 'invalid_data',
    });
  });

  it('mapeia erro 404 para produto nao encontrado', async () => {
    const service = TestBed.inject(ProdutosService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.remover(PRODUTO.id);
    const req = http.expectOne(`/api/produtos?id=${PRODUTO.id}`);
    req.flush({ erro: 'Produto nao encontrado.' }, { status: 404, statusText: 'Not Found' });

    await expect(promise).rejects.toMatchObject({ code: 'not_found' });
  });

  it('mapeia erro 409 para produto vinculado a pedidos', async () => {
    const service = TestBed.inject(ProdutosService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.remover(PRODUTO.id);
    const req = http.expectOne(`/api/produtos?id=${PRODUTO.id}`);
    req.flush(
      { erro: 'Produto vinculado a pedidos nao pode ser removido.' },
      { status: 409, statusText: 'Conflict' },
    );

    await expect(promise).rejects.toMatchObject({ code: 'in_use' });
  });

  it('mapeia erro de rede para network_error', async () => {
    const service = TestBed.inject(ProdutosService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.listar();
    const req = http.expectOne('/api/produtos');
    req.error(new ProgressEvent('error'), { status: 0 });

    await expect(promise).rejects.toMatchObject({ code: 'network_error' });
  });
});
