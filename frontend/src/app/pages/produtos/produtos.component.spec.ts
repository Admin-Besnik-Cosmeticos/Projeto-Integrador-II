import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProdutosComponent } from './produtos.component';

const API_URL = '/api/produtos';

interface ProdutoApi {
  id: string;
  nome: string;
  preco: number;
  quantidade_estoque: number;
  categoria?: string | null;
}

const PRODUTOS: ProdutoApi[] = [
  {
    id: 'p-1',
    nome: 'Base Líquida Matte',
    categoria: 'Maquiagem',
    preco: 129.9,
    quantidade_estoque: 0,
  },
  {
    id: 'p-2',
    nome: 'Batom Cremoso',
    categoria: 'Maquiagem',
    preco: 49.9,
    quantidade_estoque: 8,
  },
  {
    id: 'p-3',
    nome: 'Sérum Facial Vitamina C',
    categoria: 'Skincare',
    preco: 189.9,
    quantidade_estoque: 45,
  },
  {
    id: 'p-4',
    nome: 'Máscara de Cílios',
    categoria: 'Maquiagem',
    preco: 79.9,
    quantidade_estoque: 21,
  },
  {
    id: 'p-5',
    nome: 'Protetor Solar FPS 60',
    categoria: 'Skincare',
    preco: 99.9,
    quantidade_estoque: 3,
  },
  {
    id: 'p-6',
    nome: 'Delineador Líquido',
    categoria: 'Maquiagem',
    preco: 39.9,
    quantidade_estoque: 20,
  },
  {
    id: 'p-7',
    nome: 'Hidratante Facial',
    categoria: 'Skincare',
    preco: 89.9,
    quantidade_estoque: 60,
  },
  {
    id: 'p-8',
    nome: 'Gloss Labial',
    categoria: null,
    preco: 29.9,
    quantidade_estoque: 12,
  },
  {
    id: 'p-9',
    nome: 'Pó Compacto',
    categoria: 'Maquiagem',
    preco: 59.9,
    quantidade_estoque: 30,
  },
  {
    id: 'p-10',
    nome: 'Água Micelar',
    categoria: 'Skincare',
    preco: 44.9,
    quantidade_estoque: 18,
  },
];

type Vista = {
  carregandoListagem(): boolean;
  erroListagem(): string;
  produtosLista(): ProdutoApi[];
  linhas(): Array<{
    id: string;
    nome: string;
    categoria: string;
    preco: number;
    estoque: number;
    status: string;
  }>;
  linhasPaginadas(): Array<{ id: string; nome: string }>;
  totalRegistros(): number;
  totalPaginas(): number;
  paginaEfetiva(): number;
  paginas(): number[];
  intervaloInicio(): number;
  intervaloFim(): number;
  termoBusca(): string;
  irParaPagina(pagina: number): void;
  modalAberto(): boolean;
  modalExclusaoAberto(): boolean;
  editandoId(): string | null;
  tituloModal(): string;
  mensagem(): string;
  mensagemErro(): string;
  nomeErro: string;
  precoErro: string;
  quantidadeErro: string;
  form: {
    setValue(valores: Record<string, string>): void;
    getRawValue(): Record<string, string>;
  };
  abrirModal(): void;
  salvarProduto(): Promise<void>;
  registrarAcao(evento: unknown): void;
  confirmarExclusao(): Promise<void>;
};

const vistas = (componente: ProdutosComponent): Vista => componente as unknown as Vista;

async function drenarMicrotasks(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
}

describe('ProdutosComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProdutosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  async function criarComponente(resposta: ProdutoApi[] = PRODUTOS): Promise<{
    fixture: ComponentFixture<ProdutosComponent>;
    vista: Vista;
    http: HttpTestingController;
    native: HTMLElement;
  }> {
    const fixture = TestBed.createComponent(ProdutosComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const requisicao = http.expectOne(API_URL);
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({ produtos: resposta });
    await drenarMicrotasks();
    fixture.detectChanges();
    return {
      fixture,
      vista: vistas(fixture.componentInstance),
      http,
      native: fixture.nativeElement as HTMLElement,
    };
  }

  it('carrega a listagem com status de estoque e primeira pagina', async () => {
    const { vista } = await criarComponente();

    expect(vista.erroListagem()).toBe('');
    expect(vista.linhas().length).toBe(10);
    expect(vista.linhasPaginadas().length).toBe(8);
    expect(vista.totalPaginas()).toBe(2);
    expect(vista.intervaloInicio()).toBe(1);
    expect(vista.intervaloFim()).toBe(8);
    expect(vista.linhas()[0].status).toBe('Esgotado');
    expect(vista.linhas()[1].status).toBe('Baixo Estoque');
    expect(vista.linhas()[2].status).toBe('Em Estoque');
    expect(vista.linhas()[7].categoria).toBe('');
  });

  it('navega entre as paginas do rodape', async () => {
    const { vista } = await criarComponente();

    expect(vista.paginas()).toEqual([1, 2]);

    vista.irParaPagina(2);

    expect(vista.paginaEfetiva()).toBe(2);
    expect(vista.linhasPaginadas().length).toBe(2);
    expect(vista.intervaloInicio()).toBe(9);
    expect(vista.intervaloFim()).toBe(10);
  });

  it('filtra por nome e volta para a primeira pagina', async () => {
    const { fixture, vista, native } = await criarComponente();

    vista.irParaPagina(2);
    fixture.detectChanges();
    expect(vista.paginaEfetiva()).toBe(2);

    const entrada = native.querySelector<HTMLInputElement>('#busca-produtos');
    expect(entrada).not.toBeNull();

    entrada!.value = 'a';
    entrada!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(vista.termoBusca()).toBe('a');
    expect(vista.paginaEfetiva()).toBe(1);

    entrada!.value = 'batom';
    entrada!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(vista.totalRegistros()).toBe(1);
    expect(vista.linhasPaginadas()[0].nome).toBe('Batom Cremoso');
  });

  it('exibe mensagem de erro com botao para tentar novamente', async () => {
    const fixture = TestBed.createComponent(ProdutosComponent);
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
    expect(fixture.nativeElement.querySelector('.produtos__tentar')).not.toBeNull();
  });

  it('cadastra produto a partir do modal', async () => {
    const { vista, http } = await criarComponente();

    vista.abrirModal();
    vista.form.setValue({
      nome: 'Delineador Preto',
      preco: '39,90',
      quantidadeEstoque: '15',
    });
    const salvamento = vista.salvarProduto();

    const req = http.expectOne(API_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nome: 'Delineador Preto',
      preco: 39.9,
      quantidade_estoque: 15,
    });
    req.flush(
      {
        produto: {
          id: 'novo-produto',
          nome: 'Delineador Preto',
          preco: 39.9,
          quantidade_estoque: 15,
        },
      },
      { status: 201, statusText: 'Created' },
    );

    await salvamento;
    expect(vista.modalAberto()).toBe(false);
    expect(vista.produtosLista().length).toBe(11);
    expect(vista.mensagem()).toContain('cadastrado');
  });

  it('bloqueia cadastro com campos obrigatorios vazios', async () => {
    const { vista } = await criarComponente();

    vista.abrirModal();
    await vista.salvarProduto();

    expect(vista.modalAberto()).toBe(true);
    expect(vista.nomeErro).toBeTruthy();
    expect(vista.precoErro).toBeTruthy();
    expect(vista.quantidadeErro).toBeTruthy();
  });

  it('bloqueia cadastro com preco e estoque invalidos', async () => {
    const { vista } = await criarComponente();

    vista.abrirModal();
    vista.form.setValue({
      nome: 'Delineador Preto',
      preco: 'abc',
      quantidadeEstoque: '2,5',
    });
    await vista.salvarProduto();

    expect(vista.modalAberto()).toBe(true);
    expect(vista.precoErro).toContain('válido');
    expect(vista.quantidadeErro).toContain('inteiro');
  });

  it('edita produto preenchendo o formulario', async () => {
    const { vista, http } = await criarComponente();

    vista.registrarAcao({ acao: 'editar', registro: vista.linhas()[0] });

    expect(vista.editandoId()).toBe('p-1');
    expect(vista.tituloModal()).toBe('Editar Produto');
    expect(vista.form.getRawValue()['preco']).toBe('129,90');
    expect(vista.form.getRawValue()['quantidadeEstoque']).toBe('0');

    vista.form.setValue({
      nome: 'Base Líquida Matte 30ml',
      preco: '139,90',
      quantidadeEstoque: '25',
    });
    const salvamento = vista.salvarProduto();

    const req = http.expectOne(`${API_URL}?id=p-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      nome: 'Base Líquida Matte 30ml',
      preco: 139.9,
      quantidade_estoque: 25,
    });
    req.flush({
      produto: {
        id: 'p-1',
        nome: 'Base Líquida Matte 30ml',
        preco: 139.9,
        quantidade_estoque: 25,
        categoria: 'Maquiagem',
      },
    });

    await salvamento;
    expect(vista.produtosLista()[0].nome).toBe('Base Líquida Matte 30ml');
    expect(vista.modalAberto()).toBe(false);
    expect(vista.mensagem()).toContain('atualizado');
  });

  it('exclui produto apos confirmacao', async () => {
    const { vista, http } = await criarComponente();

    vista.registrarAcao({ acao: 'excluir', registro: vista.linhas()[0] });
    expect(vista.modalExclusaoAberto()).toBe(true);

    const exclusao = vista.confirmarExclusao();
    const req = http.expectOne(`${API_URL}?id=p-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Produto removido.' });

    await exclusao;
    expect(vista.produtosLista().length).toBe(9);
    expect(vista.modalExclusaoAberto()).toBe(false);
    expect(vista.mensagem()).toContain('removido');
  });

  it('mostra erro da API ao falhar exclusao de produto em uso', async () => {
    const { vista, http } = await criarComponente();

    vista.registrarAcao({ acao: 'excluir', registro: vista.linhas()[0] });

    const exclusao = vista.confirmarExclusao();
    http
      .expectOne(`${API_URL}?id=p-1`)
      .flush(
        { erro: 'Produto vinculado a pedidos nao pode ser removido.' },
        { status: 409, statusText: 'Conflict' },
      );

    await exclusao;
    expect(vista.mensagemErro()).toContain('vinculado a pedidos');
    expect(vista.produtosLista().length).toBe(10);
    expect(vista.modalExclusaoAberto()).toBe(false);
  });
});
