import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface PedidoItem {
  id?: string;
  id_produto: string;
  produto?: string;
  quantidade: number;
  preco_unitario: number;
}

export interface Pedido {
  id: string;
  id_cliente: string;
  cliente?: string;
  data_pedido: string;
  itens: PedidoItem[];
  total: number;
  status?: string;
}

export interface PedidoItemSalvar {
  id_produto: string;
  quantidade: number;
}

export interface PedidoSalvar {
  id_cliente: string;
  itens: PedidoItemSalvar[];
}

export type PedidosErrorCode =
  | 'invalid_data'
  | 'not_found'
  | 'network_error'
  | 'unexpected_error';

export class PedidosError extends Error {
  constructor(
    message: string,
    readonly code: PedidosErrorCode,
  ) {
    super(message);
    this.name = 'PedidosError';
  }
}

const PEDIDOS_ENDPOINT = '/api/pedidos';

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private readonly http = inject(HttpClient);

  async listar(): Promise<Pedido[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ pedidos?: Pedido[] }>(PEDIDOS_ENDPOINT),
      );
      return response.pedidos ?? [];
    } catch (error) {
      throw this.toPedidosError(error);
    }
  }

  async cadastrar(dados: PedidoSalvar): Promise<Pedido> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ pedido?: Pedido }>(PEDIDOS_ENDPOINT, dados),
      );
      return this.obterPedido(response);
    } catch (error) {
      throw this.toPedidosError(error);
    }
  }

  async atualizar(id: string, dados: PedidoSalvar): Promise<Pedido> {
    try {
      const response = await firstValueFrom(
        this.http.put<{ pedido?: Pedido }>(
          `${PEDIDOS_ENDPOINT}?id=${encodeURIComponent(id)}`,
          dados,
        ),
      );
      return this.obterPedido(response);
    } catch (error) {
      throw this.toPedidosError(error);
    }
  }

  async remover(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${PEDIDOS_ENDPOINT}?id=${encodeURIComponent(id)}`),
      );
    } catch (error) {
      throw this.toPedidosError(error);
    }
  }

  private obterPedido(response: { pedido?: Pedido }): Pedido {
    if (!response.pedido) {
      throw new PedidosError('Resposta inesperada da API.', 'unexpected_error');
    }
    return response.pedido;
  }

  private toPedidosError(error: unknown): PedidosError {
    if (error instanceof PedidosError) {
      return error;
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return new PedidosError('Nao foi possivel conectar ao servidor.', 'network_error');
      }

      if (error.status === 404) {
        return new PedidosError('Pedido nao encontrado.', 'not_found');
      }

      const body = error.error as { erro?: unknown } | null;
      const message =
        body && typeof body.erro === 'string' && body.erro.trim() !== ''
          ? body.erro
          : 'Nao foi possivel concluir a operacao.';
      return new PedidosError(
        message,
        error.status === 400 ? 'invalid_data' : 'unexpected_error',
      );
    }

    return new PedidosError('Nao foi possivel concluir a operacao.', 'unexpected_error');
  }
}
