import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ClientesComponent } from './clientes.component';
import { ToastService } from '../../services/toast.service';

const API_URL = '/api/clientes';

const ANA = {
  id: '11111111-1111-1111-1111-111111111111',
  nome: 'Ana Ribeiro',
  telefone: '11999998888',
  endereco: { cidade: 'Sao Paulo', estado: 'SP', endereco_entrega: 'Rua das Flores, 45' },
};

const BRUNA = {
  id: '22222222-2222-2222-2222-222222222222',
  nome: 'Bruna Costa',
  telefone: '21988887777',
  endereco: { cidade: 'Rio de Janeiro', estado: 'RJ', endereco_entrega: 'Av Atlantica, 100' },
};

type Vista = {
  erroListagem(): string;
  clientesLista(): (typeof ANA)[];
  linhas(): unknown[];
  modalAberto(): boolean;
  modalExclusaoAberto(): boolean;
  editandoId(): string | null;
  tituloModal(): string;
  form: {
    setValue(valores: Record<string, string>): void;
    getRawValue(): Record<string, string>;
  };
  nomeInvalid: boolean;
  telefoneInvalid: boolean;
  cidadeInvalid: boolean;
  abrirModal(): void;
  salvarCliente(): Promise<void>;
  registrarAcao(evento: unknown): void;
  confirmarExclusao(): Promise<void>;
};

const vistas = (componente: ClientesComponent): Vista => componente as unknown as Vista;

const toasts = () => TestBed.inject(ToastService).toasts();

describe('ClientesComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ClientesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(ToastService).limpar();
    TestBed.inject(HttpTestingController).verify();
  });

  async function drenarMicrotasks(): Promise<void> {
    for (let i = 0; i < 20; i++) {
      await Promise.resolve();
    }
  }

  async function criarComponente(clientes: (typeof ANA)[] = [ANA, BRUNA]): Promise<{
    fixture: ComponentFixture<ClientesComponent>;
    vista: Vista;
    http: HttpTestingController;
    native: HTMLElement;
  }> {
    const fixture = TestBed.createComponent(ClientesComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const requisicao = http.expectOne(API_URL);
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({ clientes });
    await drenarMicrotasks();
    fixture.detectChanges();
    return {
      fixture,
      vista: vistas(fixture.componentInstance),
      http,
      native: fixture.nativeElement as HTMLElement,
    };
  }

  it('carrega e exibe a listagem de clientes', async () => {
    const { vista } = await criarComponente();

    expect(vista.linhas().length).toBe(2);
    expect(vista.linhas()[0]).toEqual({
      id: ANA.id,
      nome: ANA.nome,
      telefone: ANA.telefone,
      cidade: ANA.endereco.cidade,
      estado: ANA.endereco.estado,
      endereco_entrega: ANA.endereco.endereco_entrega,
    });
    expect(vista.erroListagem()).toBe('');
  });

  it('nao exibe paginacao com dez clientes ou menos', async () => {
    const { native } = await criarComponente();

    expect(native.querySelectorAll('tbody .tabela__linha').length).toBe(2);
    expect(native.querySelector('.tabela__rodape')).toBeNull();
  });

  it('pagina a listagem quando houver mais de dez clientes', async () => {
    const clientes = Array.from({ length: 15 }, (_, indice) => ({
      id: `cliente-${indice + 1}`,
      nome: `Cliente ${indice + 1}`,
      telefone: '11999998888',
      endereco: {
        cidade: 'Sao Paulo',
        estado: 'SP',
        endereco_entrega: `Rua ${indice + 1}, 10`,
      },
    }));

    const { fixture, native } = await criarComponente(clientes);

    expect(native.querySelectorAll('tbody .tabela__linha').length).toBe(10);
    expect(native.querySelector('.tabela__resumo')?.textContent?.trim()).toBe(
      'Mostrando 1–10 de 15 registros',
    );

    native.querySelector<HTMLButtonElement>('.tabela__pagina[aria-label="Página 2"]')!.click();
    fixture.detectChanges();

    expect(native.querySelectorAll('tbody .tabela__linha').length).toBe(5);
    expect(native.querySelector('.tabela__resumo')?.textContent?.trim()).toBe(
      'Mostrando 11–15 de 15 registros',
    );
  });

  it('exibe mensagem de erro com botao para tentar novamente', async () => {
    const fixture = TestBed.createComponent(ClientesComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne(API_URL)
      .flush(
        { erro: 'Erro interno na API.' },
        { status: 500, statusText: 'Internal Server Error' },
      );
    await drenarMicrotasks();
    fixture.detectChanges();

    const vista = vistas(fixture.componentInstance);
    expect(vista.erroListagem()).toContain('Erro interno na API.');
    expect(fixture.nativeElement.querySelector('.mensagem-erro button')).not.toBeNull();
  });

  it('cadastra cliente a partir do modal', async () => {
    const { vista, http } = await criarComponente();

    vista.abrirModal();
    vista.form.setValue({
      nome: 'Carla Menezes',
      telefone: '31966665555',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      enderecoEntrega: 'Rua Principal, 10',
    });

    const salvamento = vista.salvarCliente();

    const req = http.expectOne(API_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nome: 'Carla Menezes',
      telefone: '31966665555',
      endereco: {
        cidade: 'Belo Horizonte',
        estado: 'MG',
        endereco_entrega: 'Rua Principal, 10',
      },
    });
    req.flush(
      { cliente: { id: '33333333-3333-3333-3333-333333333333', ...req.request.body } },
      { status: 201, statusText: 'Created' },
    );

    await salvamento;
    expect(vista.modalAberto()).toBe(false);
    expect(vista.clientesLista().length).toBe(3);
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0].tipo).toBe('sucesso');
    expect(toasts()[0].mensagem).toContain('cadastrada');
  });

  it('formata telefone no padrao de celular brasileiro', async () => {
    const { fixture, vista, native } = await criarComponente();

    vista.abrirModal();
    fixture.detectChanges();
    const telefone = native.querySelector<HTMLInputElement>('#campo-telefone');
    expect(telefone).not.toBeNull();

    telefone!.value = '11999998888';
    telefone!.dispatchEvent(new Event('input'));

    expect(telefone!.value).toBe('(11)99999-8888');
    expect(vista.form.getRawValue()['telefone']).toBe('(11)99999-8888');
  });

  it('bloqueia cadastro sem campos obrigatorios', async () => {
    const { vista } = await criarComponente();

    vista.abrirModal();
    await vista.salvarCliente();

    expect(vista.modalAberto()).toBe(true);
    expect(vista.nomeInvalid).toBe(true);
    expect(vista.telefoneInvalid).toBe(true);
    expect(vista.cidadeInvalid).toBe(true);
  });

  it('edita cliente preenchendo o formulario', async () => {
    const { vista, http } = await criarComponente();

    vista.registrarAcao({
      acao: 'editar',
      registro: {
        id: ANA.id,
        nome: ANA.nome,
        telefone: ANA.telefone,
        cidade: ANA.endereco.cidade,
        estado: ANA.endereco.estado,
        endereco_entrega: ANA.endereco.endereco_entrega,
      },
    });

    expect(vista.editandoId()).toBe(ANA.id);
    expect(vista.tituloModal()).toBe('Editar Cliente');
    expect(vista.form.getRawValue()['nome']).toBe(ANA.nome);

    vista.form.setValue({
      nome: 'Ana Ribeiro Atualizada',
      telefone: '11999998888',
      cidade: 'Sao Paulo',
      estado: 'SP',
      enderecoEntrega: 'Rua das Flores, 45',
    });
    const salvamento = vista.salvarCliente();

    const req = http.expectOne(`${API_URL}?id=${ANA.id}`);
    expect(req.request.method).toBe('PUT');
    req.flush({ cliente: { ...ANA, nome: 'Ana Ribeiro Atualizada' } });

    await salvamento;
    expect(vista.clientesLista()[0]['nome']).toBe('Ana Ribeiro Atualizada');
    expect(vista.modalAberto()).toBe(false);
  });

  it('exclui cliente apos confirmacao', async () => {
    const { vista, http } = await criarComponente();

    vista.registrarAcao({
      acao: 'excluir',
      registro: {
        id: ANA.id,
        nome: ANA.nome,
        telefone: ANA.telefone,
        cidade: ANA.endereco.cidade,
        estado: ANA.endereco.estado,
        endereco_entrega: ANA.endereco.endereco_entrega,
      },
    });
    expect(vista.modalExclusaoAberto()).toBe(true);

    const exclusao = vista.confirmarExclusao();
    const req = http.expectOne(`${API_URL}?id=${ANA.id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Cliente removido.' });

    await exclusao;
    expect(vista.clientesLista().length).toBe(1);
    expect(vista.modalExclusaoAberto()).toBe(false);
    expect(toasts()[0].mensagem).toContain('removida');
  });

  it('mostra erro da API ao falhar exclusao', async () => {
    const { vista, http } = await criarComponente();

    vista.registrarAcao({
      acao: 'excluir',
      registro: {
        id: ANA.id,
        nome: ANA.nome,
        telefone: ANA.telefone,
        cidade: ANA.endereco.cidade,
        estado: ANA.endereco.estado,
        endereco_entrega: ANA.endereco.endereco_entrega,
      },
    });

    const exclusao = vista.confirmarExclusao();
    http
      .expectOne(`${API_URL}?id=${ANA.id}`)
      .flush({ erro: 'Cliente nao encontrado.' }, { status: 404, statusText: 'Not Found' });

    await exclusao;
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0].tipo).toBe('erro');
    expect(toasts()[0].mensagem).toContain('Cliente nao encontrado.');
    expect(vista.modalExclusaoAberto()).toBe(false);
  });
});
