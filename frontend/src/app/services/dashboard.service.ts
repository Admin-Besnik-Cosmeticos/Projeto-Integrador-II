import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface DashboardIndicadores {
  vendas_totais: number;
  pedidos_mes: number;
  variacao_mes_anterior: number;
  clientes_ativos: number;
  ticket_medio: number;
}

export interface DashboardProdutoMaisVendido {
  produto: string;
  categoria: string;
  preco: number;
  vendidos: number;
  faturamento: number;
}

export type StatusPedido = 'Pendente' | 'Pago' | 'Enviado' | 'Entregue' | 'Cancelado';

export interface DashboardPedidoRecente {
  id: string;
  cliente: string;
  itens: number;
  total: number;
  status: StatusPedido | string;
  data_pedido: string;
}

export interface DashboardResposta extends DashboardIndicadores {
  produtos_mais_vendidos: DashboardProdutoMaisVendido[];
  pedidos_recentes: DashboardPedidoRecente[];
}

export type DashboardErrorCode = 'network_error' | 'unexpected_error';

export class DashboardError extends Error {
  constructor(
    message: string,
    readonly code: DashboardErrorCode,
  ) {
    super(message);
    this.name = 'DashboardError';
  }
}

const DASHBOARD_ENDPOINT = '/api/dashboard';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  async obter(): Promise<DashboardResposta> {
    try {
      return await firstValueFrom(this.http.get<DashboardResposta>(DASHBOARD_ENDPOINT));
    } catch (error) {
      throw this.toDashboardError(error);
    }
  }

  private toDashboardError(error: unknown): DashboardError {
    if (error instanceof DashboardError) {
      return error;
    }

    if (error instanceof HttpErrorResponse && error.status === 0) {
      return new DashboardError('Nao foi possivel conectar ao servidor.', 'network_error');
    }

    return new DashboardError('Nao foi possivel carregar o dashboard.', 'unexpected_error');
  }
}
