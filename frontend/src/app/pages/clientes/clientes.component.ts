import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalComponent } from '../../components/modal/modal.component';
import {
  TabelaAcao,
  TabelaAcaoEvento,
  TabelaColuna,
  TabelaComponent,
} from '../../components/tabela/tabela.component';

export interface Cliente {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cadastro: string;
  status: 'Ativa' | 'Inativa';
}

@Component({
  selector: 'app-clientes',
  imports: [TabelaComponent, ModalComponent, ReactiveFormsModule],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss',
})
export class ClientesComponent {
  private readonly fb = inject(FormBuilder);

  protected readonly colunas: TabelaColuna<Cliente>[] = [
    { titulo: 'Nome', campo: 'nome', tipo: 'destaque' },
    { titulo: 'E-mail', campo: 'email' },
    { titulo: 'Telefone', campo: 'telefone' },
    { titulo: 'Cadastro', campo: 'cadastro', tipo: 'data' },
    {
      titulo: 'Status',
      campo: 'status',
      tipo: 'tag',
      tons: { Ativa: 'sucesso', Inativa: 'neutro' },
    },
  ];

  protected readonly acoes: TabelaAcao<Cliente>[] = [
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

  protected readonly clientes: Cliente[] = [
    {
      id: 1,
      nome: 'Ana Ribeiro',
      email: 'ana.ribeiro@email.com',
      telefone: '(11) 98888-1234',
      cadastro: '2024-08-12T12:00',
      status: 'Ativa',
    },
    {
      id: 2,
      nome: 'Bruna Costa',
      email: 'bruna.costa@email.com',
      telefone: '(21) 97777-4321',
      cadastro: '2024-09-03T12:00',
      status: 'Inativa',
    },
    {
      id: 3,
      nome: 'Carla Menezes',
      email: 'carla.menezes@email.com',
      telefone: '(31) 96666-9876',
      cadastro: '2024-09-20T12:00',
      status: 'Ativa',
    },
    {
      id: 4,
      nome: 'Daniela Souza',
      email: 'daniela.souza@email.com',
      telefone: '(41) 95555-6789',
      cadastro: '2024-10-08T12:00',
      status: 'Ativa',
    },
  ];

  protected readonly acaoRegistrada = signal('');
  protected readonly modalAberto = signal(false);
  protected readonly salvando = signal(false);
  protected readonly enviado = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    telefone: [''],
    cpf: [''],
    endereco: [''],
    cidade: [''],
    estado: [''],
  });

  protected get nomeInvalid(): boolean {
    const campo = this.form.controls.nome;
    return campo.invalid && (campo.touched || this.enviado());
  }

  protected get emailInvalid(): boolean {
    const campo = this.form.controls.email;
    return campo.invalid && (campo.touched || this.enviado());
  }

  protected abrirModal(): void {
    this.enviado.set(false);
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

    this.enviado.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const { nome } = this.form.getRawValue();
    this.salvando.set(false);
    this.modalAberto.set(false);
    this.acaoRegistrada.set(`Cliente cadastrada (simulação): ${nome}`);
    this.form.reset();
    this.enviado.set(false);
  }

  protected registrarAcao(evento: TabelaAcaoEvento<Cliente>): void {
    this.acaoRegistrada.set(`${evento.acao} — ${evento.registro.nome}`);
  }
}
