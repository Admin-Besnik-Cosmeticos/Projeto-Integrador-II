import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ClientesService, ClienteSalvar } from './clientes.service';

const CLIENTE = {
  id: '1a0b0f88-96e8-4a01-84a4-99b0ea2d1a00',
  nome: 'Ana Ribeiro',
  telefone: '11999998888',
  endereco: {
    cidade: 'Sao Paulo',
    estado: 'SP',
    endereco_entrega: 'Rua das Flores, 45',
  },
};

function dados(): ClienteSalvar {
  return {
    nome: 'Ana Ribeiro',
    telefone: '11999998888',
    endereco: { cidade: 'Sao Paulo', estado: 'SP', endereco_entrega: 'Rua das Flores, 45' },
  };
}

describe('ClientesService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('lista clientes via GET /api/clientes', async () => {
    const service = TestBed.inject(ClientesService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.listar();
    const req = http.expectOne('/api/clientes');
    expect(req.request.method).toBe('GET');
    req.flush({ clientes: [CLIENTE] });

    const resultado = await promise;
    expect(resultado).toEqual([CLIENTE]);
  });

  it('cadastra cliente via POST /api/clientes com endereco', async () => {
    const service = TestBed.inject(ClientesService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.cadastrar(dados());
    const req = http.expectOne('/api/clientes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dados());
    req.flush({ cliente: CLIENTE }, { status: 201, statusText: 'Created' });

    expect(await promise).toEqual(CLIENTE);
  });

  it('atualiza cliente via PUT /api/clientes com id na query', async () => {
    const service = TestBed.inject(ClientesService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.atualizar(CLIENTE.id, dados());
    const req = http.expectOne(`/api/clientes?id=${CLIENTE.id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dados());
    req.flush({ cliente: CLIENTE });

    expect(await promise).toEqual(CLIENTE);
  });

  it('remove cliente via DELETE /api/clientes com id na query', async () => {
    const service = TestBed.inject(ClientesService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.remover(CLIENTE.id);
    const req = http.expectOne(`/api/clientes?id=${CLIENTE.id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Cliente removido.' });

    await expect(promise).resolves.toBeUndefined();
  });

  it('mapeia erro 400 com mensagem da API', async () => {
    const service = TestBed.inject(ClientesService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.cadastrar(dados());
    const req = http.expectOne('/api/clientes');
    req.flush({ erro: 'Endereco obrigatorio.' }, { status: 400, statusText: 'Bad Request' });

    await expect(promise).rejects.toMatchObject({
      message: 'Endereco obrigatorio.',
      code: 'invalid_data',
    });
  });

  it('mapeia erro 404 para cliente nao encontrada', async () => {
    const service = TestBed.inject(ClientesService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.remover(CLIENTE.id);
    const req = http.expectOne(`/api/clientes?id=${CLIENTE.id}`);
    req.flush({ erro: 'Cliente nao encontrado.' }, { status: 404, statusText: 'Not Found' });

    await expect(promise).rejects.toMatchObject({ code: 'not_found' });
  });

  it('mapeia erro de rede para network_error', async () => {
    const service = TestBed.inject(ClientesService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.listar();
    const req = http.expectOne('/api/clientes');
    req.error(new ProgressEvent('error'), { status: 0 });

    await expect(promise).rejects.toMatchObject({ code: 'network_error' });
  });
});
