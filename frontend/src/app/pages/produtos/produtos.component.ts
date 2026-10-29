import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalAcoesDirective, ModalComponent } from '../../components/modal/modal.component';
import { ErrorMessageComponent } from '../../components/error-message/error-message.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import {
  TabelaAcao,
  TabelaAcaoEvento,
  TabelaColuna,
  TabelaComponent,
} from '../../components/tabela/tabela.component';
import { Produto, ProdutosError, ProdutosService } from '../../services/produtos.service';
import { ToastService } from '../../services/toast.service';

type StatusEstoque = 'Esgotado' | 'Baixo Estoque' | 'Em Estoque';

interface ProdutoLinha {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  estoque: number;
  status: StatusEstoque;
}

const LIMITE_ESTOQUE_BAIXO = 5;

@Component({
  selector: 'app-produtos',
  imports: [
    TabelaComponent,
    ModalComponent,
    ModalAcoesDirective,
    ReactiveFormsModule,
    ErrorMessageComponent,
    PageHeaderComponent,
  ],
  templateUrl: './produtos.component.html',
  styleUrl: './produtos.component.scss',
})
export class ProdutosComponent {
  private readonly fb = inject(FormBuilder);
  private readonly produtosService = inject(ProdutosService);
  private readonly toast = inject(ToastService);

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

  protected readonly termoBusca = signal('');

  protected readonly modalAberto = signal(false);
  protected readonly salvando = signal(false);
  protected readonly editandoId = signal<string | null>(null);

  protected readonly modalExclusaoAberto = signal(false);
  protected readonly excluindo = signal(false);
  protected readonly produtoParaExcluir = signal<Produto | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(255)]],
    categoria: ['', [Validators.required, Validators.maxLength(100)]],
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

  protected get categoriaErro(): string {
    return this.mensagemCampo(
      'categoria',
      'Informe a categoria.',
      'A categoria deve ter até 100 caracteres.',
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
  }

  protected abrirModal(): void {
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
      categoria: valores.categoria.trim(),
      preco: this.paraNumero(valores.preco),
      quantidade_estoque: Number(valores.quantidadeEstoque),
    };

    const idEditando = this.editandoId();

    this.salvando.set(true);

    try {
      if (idEditando === null) {
        const criado = await this.produtosService.cadastrar(dados);
        this.produtosLista.set([...this.produtosLista(), criado]);
        this.toast.sucesso(`Produto ${criado.nome} cadastrado.`);
      } else {
        const atualizado = await this.produtosService.atualizar(idEditando, dados);
        this.produtosLista.set(
          this.produtosLista().map((produto) =>
            produto.id === atualizado.id ? atualizado : produto,
          ),
        );
        this.toast.sucesso(`Produto ${atualizado.nome} atualizado.`);
      }
      this.modalAberto.set(false);
    } catch (error) {
      this.toast.erro(this.mensagemDeErro(error));
    } finally {
      this.salvando.set(false);
    }
  }

  protected registrarAcao(evento: TabelaAcaoEvento<ProdutoLinha>): void {
    if (evento.acao === 'editar') {
      this.editandoId.set(evento.registro.id);
      this.form.reset({
        nome: evento.registro.nome,
        categoria: evento.registro.categoria,
        preco: this.formatarPrecoEntrada(evento.registro.preco),
        quantidadeEstoque: String(evento.registro.estoque),
      });
      this.modalAberto.set(true);
      return;
    }

    if (evento.acao === 'excluir') {
      const produto = this.produtosLista().find((item) => item.id === evento.registro.id);
      if (produto) {
        this.produtoParaExcluir.set(produto);
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

    try {
      await this.produtosService.remover(produto.id);
      this.produtosLista.set(this.produtosLista().filter((item) => item.id !== produto.id));
      this.toast.sucesso(`Produto ${produto.nome} removido.`);
      this.modalExclusaoAberto.set(false);
      this.produtoParaExcluir.set(null);
    } catch (error) {
      this.toast.erro(this.mensagemDeErro(error));
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
    campo: 'nome' | 'categoria' | 'preco' | 'quantidadeEstoque',
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
