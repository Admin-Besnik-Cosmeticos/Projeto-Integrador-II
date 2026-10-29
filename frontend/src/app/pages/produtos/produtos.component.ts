import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalAcoesDirective, ModalComponent } from '../../components/modal/modal.component';
import {
  TabelaAcao,
  TabelaAcaoEvento,
  TabelaColuna,
  TabelaComponent,
} from '../../components/tabela/tabela.component';
import { Produto, ProdutosError, ProdutosService } from '../../services/produtos.service';

type StatusEstoque = 'Esgotado' | 'Baixo Estoque' | 'Em Estoque';

interface ProdutoLinha {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  estoque: number;
  status: StatusEstoque;
}

const ITENS_POR_PAGINA = 8;
const LIMITE_ESTOQUE_BAIXO = 20;
const MAXIMO_PAGINAS_VISIVEIS = 5;

@Component({
  selector: 'app-produtos',
  imports: [TabelaComponent, ModalComponent, ModalAcoesDirective, ReactiveFormsModule],
  templateUrl: './produtos.component.html',
  styleUrl: './produtos.component.scss',
})
export class ProdutosComponent {
  private readonly fb = inject(FormBuilder);
  private readonly produtosService = inject(ProdutosService);

  protected readonly colunas: TabelaColuna<ProdutoLinha>[] = [
    { titulo: 'Nome', campo: 'nome', tipo: 'destaque' },
    { titulo: 'Categoria', campo: 'categoria' },
    { titulo: 'Preço', campo: 'preco', tipo: 'moeda', alinhamento: 'direita' },
    { titulo: 'Estoque', campo: 'estoque', alinhamento: 'centro' },
    {
      titulo: 'Status',
      campo: 'status',
      tipo: 'tag',
      alinhamento: 'centro',
      tons: { Esgotado: 'erro', 'Baixo Estoque': 'atencao', 'Em Estoque': 'sucesso' },
    },
  ];

  protected readonly acoes: TabelaAcao<ProdutoLinha>[] = [
    { id: 'editar', rotulo: 'Editar produto', icone: 'editar' },
    { id: 'excluir', rotulo: 'Excluir produto', icone: 'excluir' },
  ];

  protected readonly carregandoListagem = signal(true);
  protected readonly erroListagem = signal('');
  protected readonly produtosLista = signal<Produto[]>([]);
  protected readonly mensagem = signal('');
  protected readonly mensagemErro = signal('');

  protected readonly termoBusca = signal('');
  protected readonly paginaAtual = signal(1);

  protected readonly modalAberto = signal(false);
  protected readonly salvando = signal(false);
  protected readonly editandoId = signal<string | null>(null);

  protected readonly modalExclusaoAberto = signal(false);
  protected readonly excluindo = signal(false);
  protected readonly produtoParaExcluir = signal<Produto | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(255)]],
    preco: ['', [Validators.required, Validators.pattern(/^\d+([.,]\d{1,2})?$/)]],
    quantidadeEstoque: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
  });

  protected readonly linhas = computed<ProdutoLinha[]>(() =>
    this.produtosLista().map((produto) => ({
      id: produto.id,
      nome: produto.nome,
      categoria: produto.categoria?.trim() ?? '',
      preco: produto.preco,
      estoque: produto.quantidade_estoque,
      status: this.statusEstoque(produto.quantidade_estoque),
    })),
  );

  protected readonly linhasFiltradas = computed<ProdutoLinha[]>(() => {
    const termo = this.termoBusca().trim().toLowerCase();
    if (!termo) {
      return this.linhas();
    }
    return this.linhas().filter((linha) => linha.nome.toLowerCase().includes(termo));
  });

  protected readonly totalRegistros = computed(() => this.linhasFiltradas().length);

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalRegistros() / ITENS_POR_PAGINA)),
  );

  protected readonly paginaEfetiva = computed(() =>
    Math.min(this.paginaAtual(), this.totalPaginas()),
  );

  protected readonly linhasPaginadas = computed<ProdutoLinha[]>(() => {
    const inicio = (this.paginaEfetiva() - 1) * ITENS_POR_PAGINA;
    return this.linhasFiltradas().slice(inicio, inicio + ITENS_POR_PAGINA);
  });

  protected readonly intervaloInicio = computed(() =>
    this.totalRegistros() === 0 ? 0 : (this.paginaEfetiva() - 1) * ITENS_POR_PAGINA + 1,
  );

  protected readonly intervaloFim = computed(() =>
    Math.min(this.paginaEfetiva() * ITENS_POR_PAGINA, this.totalRegistros()),
  );

  protected readonly paginas = computed<number[]>(() => {
    const total = this.totalPaginas();
    if (total <= MAXIMO_PAGINAS_VISIVEIS) {
      return Array.from({ length: total }, (_, indice) => indice + 1);
    }

    let inicio = Math.max(1, this.paginaEfetiva() - 2);
    const fim = Math.min(total, inicio + MAXIMO_PAGINAS_VISIVEIS - 1);
    inicio = Math.max(1, fim - MAXIMO_PAGINAS_VISIVEIS + 1);

    return Array.from({ length: fim - inicio + 1 }, (_, indice) => inicio + indice);
  });

  protected readonly mensagemVazio = computed(() =>
    this.termoBusca().trim() ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado',
  );

  protected readonly descricaoVazio = computed(() =>
    this.termoBusca().trim()
      ? 'Ajuste a busca para encontrar outros produtos.'
      : 'Cadastre o primeiro produto para vê-lo aqui.',
  );

  protected readonly tituloModal = computed(() =>
    this.editandoId() === null ? 'Novo Produto' : 'Editar Produto',
  );

  constructor() {
    void this.carregarProdutos();
  }

  protected get nomeErro(): string {
    return this.mensagemCampo(
      'nome',
      'Informe o nome do produto.',
      'O nome deve ter até 255 caracteres.',
    );
  }

  protected get precoErro(): string {
    return this.mensagemCampo('preco', 'Informe o preço.', 'Informe um preço válido.');
  }

  protected get quantidadeErro(): string {
    return this.mensagemCampo(
      'quantidadeEstoque',
      'Informe a quantidade em estoque.',
      'Informe um número inteiro.',
    );
  }

  protected async carregarProdutos(): Promise<void> {
    this.carregandoListagem.set(true);
    this.erroListagem.set('');
    this.mensagem.set('');
    this.mensagemErro.set('');

    try {
      const produtos = await this.produtosService.listar();
      this.produtosLista.set(produtos);
    } catch (error) {
      this.erroListagem.set(this.mensagemDeErro(error));
    } finally {
      this.carregandoListagem.set(false);
    }
  }

  protected atualizarBusca(evento: Event): void {
    const alvo = evento.target;
    if (!(alvo instanceof HTMLInputElement)) {
      return;
    }

    this.termoBusca.set(alvo.value);
    this.paginaAtual.set(1);
  }

  protected irParaPagina(pagina: number): void {
    const destino = Math.min(Math.max(1, pagina), this.totalPaginas());
    if (destino === this.paginaEfetiva()) {
      return;
    }
    this.paginaAtual.set(destino);
  }

  protected abrirModal(): void {
    this.mensagem.set('');
    this.mensagemErro.set('');
    this.editandoId.set(null);
    this.form.reset();
    this.modalAberto.set(true);
  }

  protected fecharModal(): void {
    if (this.salvando()) {
      return;
    }
    this.modalAberto.set(false);
  }

  protected async salvarProduto(): Promise<void> {
    if (this.salvando()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const dados = {
      nome: valores.nome.trim(),
      preco: this.paraNumero(valores.preco),
      quantidade_estoque: Number(valores.quantidadeEstoque),
    };

    const idEditando = this.editandoId();

    this.salvando.set(true);
    this.mensagem.set('');
    this.mensagemErro.set('');

    try {
      if (idEditando === null) {
        const criado = await this.produtosService.cadastrar(dados);
        this.produtosLista.set([...this.produtosLista(), criado]);
        this.mensagem.set(`Produto ${criado.nome} cadastrado.`);
      } else {
        const atualizado = await this.produtosService.atualizar(idEditando, dados);
        this.produtosLista.set(
          this.produtosLista().map((produto) =>
            produto.id === atualizado.id ? atualizado : produto,
          ),
        );
        this.mensagem.set(`Produto ${atualizado.nome} atualizado.`);
      }
      this.modalAberto.set(false);
    } catch (error) {
      this.mensagemErro.set(this.mensagemDeErro(error));
    } finally {
      this.salvando.set(false);
    }
  }

  protected registrarAcao(evento: TabelaAcaoEvento<ProdutoLinha>): void {
    if (evento.acao === 'editar') {
      this.editandoId.set(evento.registro.id);
      this.form.reset({
        nome: evento.registro.nome,
        preco: this.formatarPrecoEntrada(evento.registro.preco),
        quantidadeEstoque: String(evento.registro.estoque),
      });
      this.mensagem.set('');
      this.mensagemErro.set('');
      this.modalAberto.set(true);
      return;
    }

    if (evento.acao === 'excluir') {
      const produto = this.produtosLista().find((item) => item.id === evento.registro.id);
      if (produto) {
        this.produtoParaExcluir.set(produto);
        this.mensagem.set('');
        this.mensagemErro.set('');
        this.modalExclusaoAberto.set(true);
      }
    }
  }

  protected fecharModalExclusao(): void {
    if (this.excluindo()) {
      return;
    }
    this.modalExclusaoAberto.set(false);
  }

  protected async confirmarExclusao(): Promise<void> {
    const produto = this.produtoParaExcluir();
    if (!produto || this.excluindo()) {
      return;
    }

    this.excluindo.set(true);
    this.mensagem.set('');
    this.mensagemErro.set('');

    try {
      await this.produtosService.remover(produto.id);
      this.produtosLista.set(this.produtosLista().filter((item) => item.id !== produto.id));
      this.mensagem.set(`Produto ${produto.nome} removido.`);
      this.modalExclusaoAberto.set(false);
      this.produtoParaExcluir.set(null);
    } catch (error) {
      this.mensagemErro.set(this.mensagemDeErro(error));
      this.modalExclusaoAberto.set(false);
      this.produtoParaExcluir.set(null);
    } finally {
      this.excluindo.set(false);
    }
  }

  private statusEstoque(quantidade: number): StatusEstoque {
    if (quantidade <= 0) {
      return 'Esgotado';
    }
    if (quantidade <= LIMITE_ESTOQUE_BAIXO) {
      return 'Baixo Estoque';
    }
    return 'Em Estoque';
  }

  private mensagemCampo(
    campo: 'nome' | 'preco' | 'quantidadeEstoque',
    mensagemObrigatorio: string,
    mensagemPadrao: string,
  ): string {
    const controle = this.form.controls[campo];
    if (!controle.invalid || !(controle.touched || controle.dirty)) {
      return '';
    }
    return controle.hasError('required') ? mensagemObrigatorio : mensagemPadrao;
  }

  private formatarPrecoEntrada(preco: number): string {
    return preco.toFixed(2).replace('.', ',');
  }

  private paraNumero(valor: string): number {
    return Math.round(Number(valor.trim().replace(',', '.')) * 100) / 100;
  }

  private mensagemDeErro(error: unknown): string {
    if (error instanceof ProdutosError) {
      return error.message;
    }
    return 'Nao foi possivel concluir a operacao.';
  }
}
