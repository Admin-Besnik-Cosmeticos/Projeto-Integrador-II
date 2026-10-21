import { Component, signal } from '@angular/core';
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
  imports: [TabelaComponent],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss',
})
export class ClientesComponent {
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

  protected registrarAcao(evento: TabelaAcaoEvento<Cliente>): void {
    this.acaoRegistrada.set(`${evento.acao} — ${evento.registro.nome}`);
  }
}
