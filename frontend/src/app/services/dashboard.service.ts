import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { StatusPedido } from './pedidos.service';

export interface DashboardIndicadores {
  vendas_totais: number;
  pedidos_mes: number;
  variacao_mes_anterior: number | null;
  clientes_ativos: number;
  ticket_medio: number;
}

export interface DashboardProdutoMaisVendido {
  produto: string;
  categoria: string | null;
  preco: number;
  vendidos: number;
  faturamento: number;
}

export interface DashboardPedidoRecente {
  id: string;
  cliente: string;
  itens: number;
  total: number;
  status: StatusPedido;
  data_pedido: string;
}

export interface DashboardResposta extends DashboardIndicadores {
  produtos_mais_vendidos: DashboardProdutoMaisVendido[];
  pedidos_recentes: DashboardPedidoRecente[];
}

export type DashboardPeriodo = 'mes' | 'trimestre' | 'semestre' | 'ano' | 'total';

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
const CACHE_TTL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<DashboardPeriodo, { dados: DashboardResposta; atualizadoEm: number }>();
  private readonly carregamentos = new Map<DashboardPeriodo, Promise<DashboardResposta>>();

  async obter(periodo: DashboardPeriodo = 'total', ignorarCache = false): Promise<DashboardResposta> {
    const cached = this.cache.get(periodo);
    if (!ignorarCache && cached && Date.now() - cached.atualizadoEm < CACHE_TTL_MS) {
      return cached.dados;
    }
    const carregamento = this.carregamentos.get(periodo);
    if (!ignorarCache && carregamento) {
      return carregamento;
    }

    const request = this.buscar(periodo);
    this.carregamentos.set(periodo, request);
    try {
      return await request;
    } finally {
      this.carregamentos.delete(periodo);
    }
  }

  private async buscar(periodo: DashboardPeriodo): Promise<DashboardResposta> {
    try {
      const dados = await firstValueFrom(
        this.http.get<DashboardResposta>(DASHBOARD_ENDPOINT, { params: { periodo } }),
      );
      this.cache.set(periodo, { dados, atualizadoEm: Date.now() });
      return dados;
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
