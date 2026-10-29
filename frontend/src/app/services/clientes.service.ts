import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface ClienteEndereco {
  cidade: string;
  estado: string;
  endereco_entrega: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  endereco: ClienteEndereco;
}

export interface ClienteSalvar {
  nome: string;
  telefone: string;
  endereco: ClienteEndereco;
}

export type ClientesErrorCode = 'invalid_data' | 'not_found' | 'network_error' | 'unexpected_error';

export class ClientesError extends Error {
  constructor(
    message: string,
    readonly code: ClientesErrorCode,
  ) {
    super(message);
    this.name = 'ClientesError';
  }
}

const CLIENTES_ENDPOINT = '/api/clientes';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);

  async obter(id: string): Promise<Cliente> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ cliente?: Cliente }>(
          `${CLIENTES_ENDPOINT}?id=${encodeURIComponent(id)}`,
        ),
      );
      return this.obterCliente(response);
    } catch (error) {
      throw this.toClientesError(error);
    }
  }

  async listar(): Promise<Cliente[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ clientes?: Cliente[] }>(CLIENTES_ENDPOINT),
      );
      return response.clientes ?? [];
    } catch (error) {
      throw this.toClientesError(error);
    }
  }

  async cadastrar(dados: ClienteSalvar): Promise<Cliente> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ cliente?: Cliente }>(CLIENTES_ENDPOINT, dados),
      );
      return this.obterCliente(response);
    } catch (error) {
      throw this.toClientesError(error);
    }
  }

  async atualizar(id: string, dados: ClienteSalvar): Promise<Cliente> {
    try {
      const response = await firstValueFrom(
        this.http.put<{ cliente?: Cliente }>(
          `${CLIENTES_ENDPOINT}?id=${encodeURIComponent(id)}`,
          dados,
        ),
      );
      return this.obterCliente(response);
    } catch (error) {
      throw this.toClientesError(error);
    }
  }

  async remover(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${CLIENTES_ENDPOINT}?id=${encodeURIComponent(id)}`),
      );
    } catch (error) {
      throw this.toClientesError(error);
    }
  }

  private obterCliente(response: { cliente?: Cliente }): Cliente {
    if (!response.cliente) {
      throw new ClientesError('Resposta inesperada da API.', 'unexpected_error');
    }
    return response.cliente;
  }

  private toClientesError(error: unknown): ClientesError {
    if (error instanceof ClientesError) {
      return error;
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return new ClientesError('Nao foi possivel conectar ao servidor.', 'network_error');
      }

      if (error.status === 404) {
        return new ClientesError('Cliente nao encontrado.', 'not_found');
      }

      const body = error.error as { erro?: unknown } | null;
      const message =
        body && typeof body.erro === 'string' && body.erro.trim() !== ''
          ? body.erro
          : 'Nao foi possivel concluir a operacao.';

      const code = error.status === 400 ? 'invalid_data' : 'unexpected_error';
      return new ClientesError(message, code);
    }

    return new ClientesError('Nao foi possivel concluir a operacao.', 'unexpected_error');
  }
}
