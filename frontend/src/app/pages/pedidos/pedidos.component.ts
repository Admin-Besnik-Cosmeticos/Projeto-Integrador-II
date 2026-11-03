import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalAcoesDirective, ModalComponent } from '../../components/modal/modal.component';
import { ErrorMessageComponent } from '../../components/error-message/error-message.component';
import {
  DropdownComponent,
  DropdownOpcao,
} from '../../components/dropdown/dropdown.component';
import {
  FiltroCampo,
  FiltroComponent,
  FiltroValores,
} from '../../components/filtro/filtro.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import {
  TabelaAcao,
  TabelaAcaoEvento,
  TabelaColuna,
  TabelaComponent,
} from '../../components/tabela/tabela.component';
import { Cliente, ClientesService } from '../../services/clientes.service';
import {
  Pedido,
  PedidosError,
  PedidosService,
  STATUS_PEDIDO,
  StatusPedido,
} from '../../services/pedidos.service';
import { Produto, ProdutosService } from '../../services/produtos.service';
import { ToastService } from '../../services/toast.service';

interface PedidoLinha {
  /** Codigo exibido na tabela (ex.: #A1B2C3D4). */
  id: string;
  /** Id completo, usado na busca por codigo. */
  idOriginal: string;
  cliente: string;
  data: string;
  itens: number;
  total: number;
  status: StatusPedido;
}

interface IndicadoresPedidos {
  faturamento: number;
  totalPedidos: number;
  ticketMedio: number;
}

interface Periodo {
  inicio: string;
  fim: string;
}

const STATUS_FATURAVEIS: StatusPedido[] = ['Pago', 'Enviado', 'Entregue'];

const MESES = [
  'janeiro',
  'fevereiro',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatarDataInput(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function ultimoDiaDoMes(data: Date): number {
  return new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
}

function trimestreAtual(referencia = new Date()): Periodo {
  const primeiroMes = Math.floor(referencia.getMonth() / 3) * 3;
  return {
    inicio: formatarDataInput(new Date(referencia.getFullYear(), primeiroMes, 1)),
    fim: formatarDataInput(new Date(referencia.getFullYear(), primeiroMes + 3, 0)),
  };
}

function dataLocal(data: string): string {
  const valor = new Date(data);
  return Number.isNaN(valor.getTime()) ? '' : formatarDataInput(valor);
}

function dentroDoPeriodo(data: string, inicio: string, fim: string): boolean {
  const dia = dataLocal(data);
  if (!dia) {
    return false;
  }
  if (inicio && dia < inicio) {
    return false;
  }
  if (fim && dia > fim) {
    return false;
  }
  return true;
}

function formatarDataCurta(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${data.getFullYear()}`;
}

function mesmoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function descreverPeriodo(
  inicio: string,
  fim: string,
  referencia = new Date(),
): string {
  if (!inicio && !fim) {
    return 'Valores de todos os pedidos.';
  }

  const dataInicio = inicio ? new Date(`${inicio}T00:00:00`) : null;
  const dataFim = fim ? new Date(`${fim}T00:00:00`) : null;

  if (!dataInicio) {
    return `Valores até ${formatarDataCurta(dataFim as Date)}.`;
  }

  if (!dataFim) {
    return `Valores a partir de ${formatarDataCurta(dataInicio)}.`;
  }

  const mesInteiro =
    dataInicio.getFullYear() === dataFim.getFullYear() &&
    dataInicio.getMonth() === dataFim.getMonth() &&
    dataInicio.getDate() === 1 &&
    dataFim.getDate() === ultimoDiaDoMes(dataFim);

  if (mesInteiro) {
    const mes = MESES[dataInicio.getMonth()];
    const mesAtual =
      dataInicio.getFullYear() === referencia.getFullYear() &&
      dataInicio.getMonth() === referencia.getMonth();
    return mesAtual
      ? `Valores do mês atual (${mes} de ${dataInicio.getFullYear()}).`
      : `Valores de ${mes} de ${dataInicio.getFullYear()}.`;
  }

  const primeiroMesTrimestre = Math.floor(dataInicio.getMonth() / 3) * 3;
  const inicioTrimestre = new Date(
    dataInicio.getFullYear(),
    primeiroMesTrimestre,
    1,
  );
  const fimTrimestre = new Date(
    dataInicio.getFullYear(),
    primeiroMesTrimestre + 3,
    0,
  );
  const trimestreInteiro =
    mesmoDia(dataInicio, inicioTrimestre) && mesmoDia(dataFim, fimTrimestre);

  if (trimestreInteiro) {
    const trimestre = Math.floor(dataInicio.getMonth() / 3) + 1;
    const trimestreAtual =
      trimestre === Math.floor(referencia.getMonth() / 3) + 1 &&
      dataInicio.getFullYear() === referencia.getFullYear();
    return trimestreAtual
      ? `Valores do trimestre atual (${formatarDataCurta(dataInicio)} a ${formatarDataCurta(dataFim)}).`
      : `Valores do ${trimestre}º trimestre de ${dataInicio.getFullYear()}.`;
  }

  return `Valores de ${formatarDataCurta(dataInicio)} a ${formatarDataCurta(dataFim)}.`;
}

@Component({
  selector: 'app-pedidos',
  imports: [
    TabelaComponent,
    ModalComponent,
    ModalAcoesDirective,
    ReactiveFormsModule,
    ErrorMessageComponent,
    DropdownComponent,
    FiltroComponent,
    PageHeaderComponent,
  ],
  templateUrl: './pedidos.component.html',
  styleUrl: './pedidos.component.scss',
})
export class PedidosComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pedidosService = inject(PedidosService);
  private readonly clientesService = inject(ClientesService);
  private readonly produtosService = inject(ProdutosService);
  private readonly toast = inject(ToastService);

  protected readonly colunas: TabelaColuna<PedidoLinha>[] = [
    { titulo: 'Pedido', campo: 'id', tipo: 'destaque' },
    { titulo: 'Cliente', campo: 'cliente' },
    { titulo: 'Data', campo: 'data', tipo: 'data' },
    { titulo: 'Itens', campo: 'itens', alinhamento: 'centro' },
    { titulo: 'Total', campo: 'total', tipo: 'moeda', alinhamento: 'direita' },
    {
      titulo: 'Status',
      campo: 'status',
      tipo: 'tag',
      alinhamento: 'centro',
      tons: {
        Pendente: 'atencao',
        'Em Preparo': 'informacao',
        Pago: 'informacao',
        Enviado: 'informacao',
        Entregue: 'sucesso',
        Cancelado: 'erro',
      },
    },
  ];

  protected readonly acoes: TabelaAcao<PedidoLinha>[] = [
    { id: 'visualizar', rotulo: 'Visualizar pedido', icone: 'visualizar' },
    { id: 'editar', rotulo: 'Editar pedido', icone: 'editar' },
    { id: 'excluir', rotulo: 'Excluir pedido', icone: 'excluir' },
  ];

  protected readonly carregandoListagem = signal(true);
  protected readonly erroListagem = signal('');
  protected readonly pedidosLista = signal<Pedido[]>([]);
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly produtos = signal<Produto[]>([]);
  protected readonly carregandoOpcoes = signal(false);

  protected readonly modalAberto = signal(false);
  protected readonly modalVisualizacaoAberto = signal(false);
  protected readonly modalExclusaoAberto = signal(false);
  protected readonly salvando = signal(false);
  protected readonly excluindo = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly pedidoSelecionado = signal<Pedido | null>(null);
  protected readonly pedidoParaExcluir = signal<Pedido | null>(null);
  protected readonly valoresAtualizados = signal(0);

  protected readonly form = this.fb.nonNullable.group({
    idCliente: ['', Validators.required],
    status: ['Pendente' as StatusPedido, Validators.required],
    itens: this.fb.array([this.criarItem()]),
  });

  protected readonly statusOpcoes: DropdownOpcao[] = STATUS_PEDIDO.map((status) => ({
    valor: status,
    rotulo: status,
  }));

  private readonly periodoInicial = trimestreAtual();

  protected readonly camposFiltro: FiltroCampo[] = [
    {
      id: 'codigo',
      rotulo: 'Código do pedido',
      tipo: 'texto',
      placeholder: 'Ex.: #A1B2C3D4',
    },
    {
      id: 'cliente',
      rotulo: 'Cliente',
      tipo: 'texto',
      placeholder: 'Nome do cliente',
    },
    {
      id: 'dataInicial',
      rotulo: 'Data inicial',
      tipo: 'data',
      valorInicial: this.periodoInicial.inicio,
    },
    {
      id: 'dataFinal',
      rotulo: 'Data final',
      tipo: 'data',
      valorInicial: this.periodoInicial.fim,
    },
    {
      id: 'status',
      rotulo: 'Status',
      tipo: 'select',
      placeholder: 'Todos os status',
      opcoes: this.statusOpcoes,
    },
  ];

  // Filtros so sao aplicados apos o clique em Buscar; a listagem e carregada
  // uma unica vez na primeira renderizacao. O periodo padrao e o trimestre atual.
  private readonly filtrosAplicados = signal<FiltroValores>({
    dataInicial: this.periodoInicial.inicio,
    dataFinal: this.periodoInicial.fim,
  });

  protected readonly linhas = computed<PedidoLinha[]>(() =>
    this.pedidosLista().map((pedido) => ({
      id: this.identificador(pedido.id),
      idOriginal: pedido.id,
      cliente: pedido.cliente ?? this.nomeCliente(pedido.id_cliente),
      data: pedido.data_pedido,
      itens: pedido.itens.length,
      total: pedido.total,
      status: this.statusValido(pedido.status),
    })),
  );

  protected readonly linhasFiltradas = computed<PedidoLinha[]>(() => {
    const filtros = this.filtrosAplicados();
    const codigo = normalizarTexto(filtros['codigo'] ?? '').replace(/^#/, '');
    const cliente = normalizarTexto(filtros['cliente'] ?? '');
    const dataInicial = filtros['dataInicial'] ?? '';
    const dataFinal = filtros['dataFinal'] ?? '';
    const status = filtros['status'] ?? '';

    return this.linhas().filter((linha) => {
      if (codigo && !normalizarTexto(linha.idOriginal).includes(codigo)) {
        return false;
      }
      if (cliente && !normalizarTexto(linha.cliente).includes(cliente)) {
        return false;
      }
      if (!dentroDoPeriodo(linha.data, dataInicial, dataFinal)) {
        return false;
      }
      if (status && linha.status !== status) {
        return false;
      }
      return true;
    });
  });

  protected readonly descricaoPeriodo = computed(() => {
    const filtros = this.filtrosAplicados();
    return descreverPeriodo(filtros['dataInicial'] ?? '', filtros['dataFinal'] ?? '');
  });

  protected readonly indicadores = computed<IndicadoresPedidos>(() => {
    const linhas = this.linhasFiltradas();
    const faturaveis = linhas.filter((linha) =>
      STATUS_FATURAVEIS.includes(linha.status),
    );
    const faturamento = faturaveis.reduce((soma, linha) => soma + linha.total, 0);

    return {
      faturamento,
      totalPedidos: linhas.length,
      ticketMedio: faturaveis.length > 0 ? faturamento / faturaveis.length : 0,
    };
  });

  protected readonly tituloModal = computed(() =>
    this.editandoId() === null ? 'Novo Pedido' : 'Editar Pedido',
  );

  protected get itens(): FormArray {
    return this.form.controls.itens;
  }

  constructor() {
    // A listagem e buscada apenas na primeira renderizacao. Mudancas nos
    // filtros nao disparam novas requisicoes: a busca roda ao clicar em Buscar.
    void this.carregar();
  }

  protected buscarFiltros(valores: FiltroValores): void {
    this.filtrosAplicados.set(valores);
  }

  protected limparFiltros(): void {
    this.filtrosAplicados.set({});
  }

  protected async carregar(): Promise<void> {
    this.carregandoListagem.set(true);
    this.erroListagem.set('');

    try {
      this.pedidosLista.set(await this.pedidosService.listar());
    } catch (error) {
      this.erroListagem.set(this.mensagemDeErro(error));
    }

    try {
      await this.carregarOpcoes();
    } catch (error) {
      this.erroListagem.set(this.mensagemDeErro(error));
    }

    this.carregandoListagem.set(false);

    const params = this.route.snapshot.queryParamMap;
    const novo = params.get('novo') === 'true';
    const clienteId = params.get('cliente');
    const editarId = params.get('editar');
    const visualizarId = params.get('visualizar');

    if (novo) {
      await this.abrirModal(clienteId ?? undefined);
    } else if (editarId) {
      const pedido = this.pedidosLista().find((item) => item.id === editarId);
      if (pedido) {
        await this.editar(pedido);
      }
    } else if (visualizarId) {
      const pedido = this.pedidosLista().find((item) => item.id === visualizarId);
      if (pedido) {
        this.pedidoSelecionado.set(pedido);
        this.modalVisualizacaoAberto.set(true);
      }
    }

    if (
      novo ||
      clienteId !== null ||
      editarId !== null ||
      visualizarId !== null
    ) {
      await this.limparQueryParams();
    }
  }

  protected async abrirModal(clienteId?: string): Promise<void> {
    this.editandoId.set(null);
    this.form.reset({ idCliente: '', status: 'Pendente' });
    this.limparItens();
    this.modalAberto.set(true);

    try {
      await this.carregarOpcoes();
      if (clienteId) {
        this.form.controls.idCliente.setValue(clienteId);
      }
    } catch (error) {
      this.toast.erro(this.mensagemDeErro(error));
    }
  }

  protected fecharModal(): void {
    if (!this.salvando()) {
      this.modalAberto.set(false);
    }
  }

  protected adicionarItem(): void {
    this.itens.push(this.criarItem());
  }

  protected opcoesProdutos(indice: number): DropdownOpcao[] {
    return this.produtos().map((produto) => ({
      valor: produto.id,
      rotulo: produto.nome,
      desabilitada: this.produtoSelecionadoEmOutro(indice, produto.id),
    }));
  }

  protected readonly opcoesClientes = computed<DropdownOpcao[]>(() =>
    this.clientes().map((cliente) => ({
      valor: cliente.id,
      rotulo: cliente.nome,
    })),
  );

  protected selecionarProduto(indice: number, selecao: string | Event): void {
    if (typeof selecao === 'string') {
      this.itens.at(indice).get('idProduto')?.setValue(selecao);
    } else {
      const entrada = selecao.target;
      if (entrada instanceof HTMLSelectElement) {
        this.itens.at(indice).get('idProduto')?.setValue(entrada.value);
      }
    }

    if (this.produtoDuplicado(indice)) {
      this.itens.at(indice).get('idProduto')?.setValue('');
      this.toast.erro('Este produto ja foi adicionado ao pedido.');
      this.atualizarValores();
      return;
    }

    const controle = this.itens.at(indice).get('quantidade');
    if (controle && (!controle.value || Number(controle.value) < 1)) {
      controle.setValue('1');
    }
    this.limitarQuantidade(indice);
    this.atualizarValores();
  }

  protected atualizarQuantidade(indice: number): void {
    this.limitarQuantidade(indice);
    this.atualizarValores();
  }

  protected produtoSelecionadoEmOutro(indice: number, idProduto: string): boolean {
    return this.itens.controls.some(
      (item, outroIndice) =>
        outroIndice !== indice && item.get('idProduto')?.value === idProduto,
    );
  }

  protected produtoDuplicado(indice: number): boolean {
    const idProduto = this.itens.at(indice).get('idProduto')?.value;
    return Boolean(idProduto) && this.produtoSelecionadoEmOutro(indice, String(idProduto));
  }

  protected atualizarValores(): void {
    this.valoresAtualizados.update((valor) => valor + 1);
  }

  protected removerItem(indice: number): void {
    if (this.itens.length > 1) {
      this.itens.removeAt(indice);
    }
  }

  protected precoProduto(indice: number): number {
    this.valoresAtualizados();
    const id = this.itens.at(indice).get('idProduto')?.value;
    const preco = this.produtos().find(
      (produto) => String(produto.id) === String(id),
    )?.preco;
    return typeof preco === 'number' ? preco : Number(preco ?? 0);
  }

  protected estoqueProduto(indice: number): number {
    const id = this.itens.at(indice).get('idProduto')?.value;
    return this.produtos().find((produto) => String(produto.id) === String(id))
      ?.quantidade_estoque ?? 0;
  }

  protected quantidadeExcedente(indice: number): boolean {
    const quantidade = Number(this.itens.at(indice).get('quantidade')?.value ?? 0);
    const estoque = this.estoqueProduto(indice);
    return Boolean(this.itens.at(indice).get('idProduto')?.value) &&
      quantidade > estoque;
  }

  protected totalItem(indice: number): number {
    this.valoresAtualizados();
    const quantidade = Number(this.itens.at(indice).get('quantidade')?.value ?? 0);
    return quantidade * this.precoProduto(indice);
  }

  protected totalFormulario(): number {
    return this.itens.controls.reduce((total, _, indice) => total + this.totalItem(indice), 0);
  }

  protected async salvarPedido(): Promise<void> {
    if (this.salvando()) {
      return;
    }
    if (this.form.invalid || !this.itensValidos()) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const dados = {
      id_cliente: valores.idCliente,
      status: valores.status,
      itens: valores.itens.map((item) => ({
        id_produto: item.idProduto,
        quantidade: Number(item.quantidade),
      })),
    };
    const id = this.editandoId();
    this.salvando.set(true);

    try {
      const pedido = id === null
        ? await this.pedidosService.cadastrar(dados)
        : await this.pedidosService.atualizar(id, dados);
      this.pedidosLista.update((pedidos) =>
        id === null ? [...pedidos, pedido] : pedidos.map((item) => item.id === pedido.id ? pedido : item),
      );
      this.toast.sucesso(`Pedido ${this.identificador(pedido.id)} salvo.`);
      this.modalAberto.set(false);
    } catch (error) {
      this.toast.erro(this.mensagemDeErro(error));
    } finally {
      this.salvando.set(false);
    }
  }

  protected registrarAcao(evento: TabelaAcaoEvento<PedidoLinha>): void {
    const pedido = this.pedidosLista().find((item) => this.identificador(item.id) === evento.registro.id);
    if (!pedido) {
      return;
    }
    if (evento.acao === 'visualizar') {
      this.pedidoSelecionado.set(pedido);
      this.modalVisualizacaoAberto.set(true);
    } else if (evento.acao === 'editar') {
      void this.editar(pedido);
    } else if (evento.acao === 'excluir') {
      this.pedidoParaExcluir.set(pedido);
      this.modalExclusaoAberto.set(true);
    }
  }

  protected fecharVisualizacao(): void {
    this.modalVisualizacaoAberto.set(false);
  }

  protected fecharExclusao(): void {
    if (!this.excluindo()) {
      this.modalExclusaoAberto.set(false);
    }
  }

  protected async confirmarExclusao(): Promise<void> {
    const pedido = this.pedidoParaExcluir();
    if (!pedido || this.excluindo()) {
      return;
    }
    this.excluindo.set(true);
    try {
      await this.pedidosService.remover(pedido.id);
      this.pedidosLista.update((pedidos) => pedidos.filter((item) => item.id !== pedido.id));
      this.toast.sucesso(`Pedido ${this.identificador(pedido.id)} excluido.`);
      this.modalExclusaoAberto.set(false);
    } catch (error) {
      this.toast.erro(this.mensagemDeErro(error));
    } finally {
      this.excluindo.set(false);
    }
  }

  protected formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }

  protected nomeProduto(id: string): string {
    return this.produtos().find((produto) => produto.id === id)?.nome ?? 'Produto não encontrado';
  }

  protected nomeCliente(id: string): string {
    return this.clientes().find((cliente) => cliente.id === id)?.nome ?? 'Cliente não encontrado';
  }

  private async editar(pedido: Pedido): Promise<void> {
    await this.carregarOpcoes();
    this.editandoId.set(pedido.id);
    this.form.controls.idCliente.setValue(pedido.id_cliente);
    this.form.controls.status.setValue(this.statusValido(pedido.status));
    this.definirItens(pedido.itens);
    this.modalAberto.set(true);
  }

  private definirItens(itens: Pedido['itens']): void {
    while (this.itens.length > 0) {
      this.itens.removeAt(0);
    }
    itens.forEach((item) =>
      this.itens.push(this.fb.nonNullable.group({
        idProduto: [item.id_produto, Validators.required],
        quantidade: [String(item.quantidade), [Validators.required, Validators.pattern(/^[1-9]\d*$/)]],
      })),
    );
    if (this.itens.length === 0) {
      this.itens.push(this.criarItem());
    }
  }

  private statusValido(status?: string): StatusPedido {
    return STATUS_PEDIDO.includes(status as StatusPedido)
      ? (status as StatusPedido)
      : 'Pendente';
  }

  private async limparQueryParams(): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
  }

  private criarItem() {
    return this.fb.nonNullable.group({
      idProduto: ['', Validators.required],
      quantidade: ['1', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]],
    });
  }

  private limparItens(): void {
    while (this.itens.length > 0) {
      this.itens.removeAt(0);
    }
    this.itens.push(this.criarItem());
  }

  private itensValidos(): boolean {
    const valores = this.form.getRawValue().itens;
    const produtos = valores.map((item) => item.idProduto).filter((id) => id.trim() !== '');
    const possuiProdutosDuplicados = new Set(produtos).size !== produtos.length;

    return valores.length > 0 &&
      !possuiProdutosDuplicados &&
      valores.every((item, indice) =>
        item.idProduto.trim() !== '' &&
        Number(item.quantidade) > 0 &&
        Number(item.quantidade) <= this.estoqueProduto(indice),
      );
  }

  private limitarQuantidade(indice: number): void {
    const controle = this.itens.at(indice).get('quantidade');
    const estoque = this.estoqueProduto(indice);
    if (!controle || estoque <= 0) {
      return;
    }

    const quantidade = Number(controle.value);
    if (Number.isFinite(quantidade) && quantidade > estoque) {
      controle.setValue(String(estoque));
    }
  }

  private async carregarOpcoes(): Promise<void> {
    if (this.carregandoOpcoes() || (this.clientes().length > 0 && this.produtos().length > 0)) {
      return;
    }
    this.carregandoOpcoes.set(true);
    try {
      const [clientes, produtos] = await Promise.all([
        this.clientesService.listar(),
        this.produtosService.listar(),
      ]);
      this.clientes.set(clientes);
      this.produtos.set(produtos);
    } finally {
      this.carregandoOpcoes.set(false);
    }
  }

  protected identificador(id: string): string {
    return id.length > 8 ? `#${id.slice(0, 8).toUpperCase()}` : `#${id}`;
  }

  private mensagemDeErro(error: unknown): string {
    return error instanceof PedidosError ? error.message : 'Nao foi possivel concluir a operacao.';
  }
}
