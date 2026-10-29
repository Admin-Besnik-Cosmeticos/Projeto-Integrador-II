import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalAcoesDirective, ModalComponent } from '../../components/modal/modal.component';
import { ErrorMessageComponent } from '../../components/error-message/error-message.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import {
  TabelaAcao,
  TabelaAcaoEvento,
  TabelaColuna,
  TabelaComponent,
} from '../../components/tabela/tabela.component';
import { Cliente, ClientesError, ClientesService } from '../../services/clientes.service';
import { ToastService } from '../../services/toast.service';

interface ClienteLinha {
  id: string;
  nome: string;
  telefone: string;
  cidade: string;
  estado: string;
  endereco_entrega: string;
}

@Component({
  selector: 'app-clientes',
  imports: [
    TabelaComponent,
    ModalComponent,
    ModalAcoesDirective,
    ReactiveFormsModule,
    ErrorMessageComponent,
    PageHeaderComponent,
  ],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss',
})
export class ClientesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly clientesService = inject(ClientesService);
  private readonly toast = inject(ToastService);

  protected readonly colunas: TabelaColuna<ClienteLinha>[] = [
    { titulo: 'Nome', campo: 'nome', tipo: 'destaque' },
    { titulo: 'Telefone', campo: 'telefone' },
    { titulo: 'Cidade', campo: 'cidade' },
    { titulo: 'Estado', campo: 'estado' },
    { titulo: 'Endereço de Entrega', campo: 'endereco_entrega' },
  ];

  protected readonly acoes: TabelaAcao<ClienteLinha>[] = [
    { id: 'visualizar', rotulo: 'Visualizar cliente', icone: 'visualizar' },
    { id: 'editar', rotulo: 'Editar cliente', icone: 'editar' },
    { id: 'excluir', rotulo: 'Excluir cliente', icone: 'excluir' },
  ];

  protected readonly estados: string[] = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO',
  ];

  protected readonly carregandoListagem = signal(true);
  protected readonly erroListagem = signal('');
  protected readonly clientesLista = signal<Cliente[]>([]);
  protected readonly termoBusca = signal('');

  protected readonly linhas = computed<ClienteLinha[]>(() =>
    this.clientesLista().map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      cidade: cliente.endereco.cidade,
      estado: cliente.endereco.estado,
      endereco_entrega: cliente.endereco.endereco_entrega,
    })),
  );

  protected readonly linhasFiltradas = computed<ClienteLinha[]>(() => {
    const termo = this.termoBusca().trim().toLowerCase();
    if (!termo) {
      return this.linhas();
    }

    return this.linhas().filter((linha) =>
      [linha.nome, linha.telefone, linha.cidade, linha.estado]
        .join(' ')
        .toLowerCase()
        .includes(termo),
    );
  });

  protected readonly mensagemVazio = computed(() =>
    this.termoBusca().trim() ? 'Nenhuma cliente encontrada' : 'Nenhuma cliente cadastrada',
  );

  protected readonly descricaoVazio = computed(() =>
    this.termoBusca().trim()
      ? 'Ajuste a busca para encontrar outras clientes.'
      : 'Cadastre a primeira cliente para vê-la aqui.',
  );

  protected readonly modalAberto = signal(false);
  protected readonly salvando = signal(false);
  protected readonly editandoId = signal<string | null>(null);

  protected readonly modalExclusaoAberto = signal(false);
  protected readonly excluindo = signal(false);
  protected readonly clienteParaExcluir = signal<Cliente | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(255)]],
    telefone: ['', [Validators.required, Validators.maxLength(20)]],
    cidade: ['', [Validators.required]],
    estado: ['', [Validators.required]],
    enderecoEntrega: ['', [Validators.required]],
  });

  protected tituloModal = computed(() =>
    this.editandoId() === null ? 'Novo Cliente' : 'Editar Cliente',
  );

  protected get nomeInvalid(): boolean {
    return this.campoInvalid('nome');
  }

  protected get telefoneInvalid(): boolean {
    return this.campoInvalid('telefone');
  }

  protected get cidadeInvalid(): boolean {
    return this.campoInvalid('cidade');
  }

  protected get estadoInvalid(): boolean {
    return this.campoInvalid('estado');
  }

  protected get enderecoEntregaInvalid(): boolean {
    return this.campoInvalid('enderecoEntrega');
  }

  constructor() {
    void this.carregarClientes();
  }

  protected async carregarClientes(): Promise<void> {
    this.carregandoListagem.set(true);
    this.erroListagem.set('');

    try {
      const clientes = await this.clientesService.listar();
      this.clientesLista.set(clientes);
    } catch (error) {
      this.erroListagem.set(this.mensagemDeErro(error));
    } finally {
      this.carregandoListagem.set(false);
    }
  }

  protected atualizarBusca(evento: Event): void {
    const alvo = evento.target;
    if (alvo instanceof HTMLInputElement) {
      this.termoBusca.set(alvo.value);
    }
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

  protected async salvarCliente(): Promise<void> {
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
      telefone: valores.telefone.replace(/\D/g, ''),
      endereco: {
        cidade: valores.cidade.trim(),
        estado: valores.estado.trim(),
        endereco_entrega: valores.enderecoEntrega.trim(),
      },
    };

    const idEditando = this.editandoId();

    this.salvando.set(true);

    try {
      if (idEditando === null) {
        const criado = await this.clientesService.cadastrar(dados);
        this.clientesLista.set([...this.clientesLista(), criado]);
        this.toast.sucesso(`Cliente ${criado.nome} cadastrada.`);
      } else {
        const atualizado = await this.clientesService.atualizar(idEditando, dados);
        this.clientesLista.set(
          this.clientesLista().map((cliente) =>
            cliente.id === atualizado.id ? atualizado : cliente,
          ),
        );
        this.toast.sucesso(`Cliente ${atualizado.nome} atualizada.`);
      }
      this.modalAberto.set(false);
    } catch (error) {
      this.toast.erro(this.mensagemDeErro(error));
    } finally {
      this.salvando.set(false);
    }
  }

  protected formatarTelefone(evento: Event): void {
    const entrada = evento.target;
    if (!(entrada instanceof HTMLInputElement)) {
      return;
    }

    const telefone = this.mascaraTelefone(entrada.value);
    entrada.value = telefone;
    this.form.controls.telefone.setValue(telefone, { emitEvent: false });
  }

  protected registrarAcao(evento: TabelaAcaoEvento<ClienteLinha>): void {
    if (evento.acao === 'visualizar') {
      void this.router.navigate(['/clientes', evento.registro.id]);
      return;
    }

    if (evento.acao === 'editar') {
      this.editandoId.set(evento.registro.id);
      this.form.reset({
        nome: evento.registro.nome,
        telefone: this.mascaraTelefone(evento.registro.telefone),
        cidade: evento.registro.cidade,
        estado: evento.registro.estado,
        enderecoEntrega: evento.registro.endereco_entrega,
      });
      this.modalAberto.set(true);
      return;
    }

    if (evento.acao === 'excluir') {
      const cliente = this.clientesLista().find((item) => item.id === evento.registro.id);
      if (cliente) {
        this.clienteParaExcluir.set(cliente);
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
    const cliente = this.clienteParaExcluir();
    if (!cliente || this.excluindo()) {
      return;
    }

    this.excluindo.set(true);

    try {
      await this.clientesService.remover(cliente.id);
      this.clientesLista.set(this.clientesLista().filter((item) => item.id !== cliente.id));
      this.toast.sucesso(`Cliente ${cliente.nome} removida.`);
      this.modalExclusaoAberto.set(false);
      this.clienteParaExcluir.set(null);
    } catch (error) {
      this.toast.erro(this.mensagemDeErro(error));
      this.modalExclusaoAberto.set(false);
      this.clienteParaExcluir.set(null);
    } finally {
      this.excluindo.set(false);
    }
  }

  private campoInvalid(
    campo: 'nome' | 'telefone' | 'cidade' | 'estado' | 'enderecoEntrega',
  ): boolean {
    const controle = this.form.controls[campo];
    return controle.invalid && (controle.touched || controle.dirty);
  }

  private mascaraTelefone(valor: string): string {
    const digitos = valor.replace(/\D/g, '').slice(0, 11);
    if (digitos.length <= 2) {
      return digitos;
    }

    const ddd = digitos.slice(0, 2);
    const numero = digitos.slice(2);
    if (numero.length <= 5) {
      return `(${ddd})${numero}`;
    }

    return `(${ddd})${numero.slice(0, 5)}-${numero.slice(5)}`;
  }

  private mensagemDeErro(error: unknown): string {
    if (error instanceof ClientesError) {
      return error.message;
    }
    return 'Nao foi possivel concluir a operacao.';
  }
}
