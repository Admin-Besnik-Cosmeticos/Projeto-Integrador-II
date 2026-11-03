import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface Produto {
  id: string;
  nome: string;
  preco: number;
  quantidade_estoque: number;
  categoria?: string | null;
}

export interface ProdutoSalvar {
  nome: string;
  categoria: string;
  preco: number;
  quantidade_estoque: number;
}

export type ProdutosErrorCode =
  'invalid_data' | 'not_found' | 'in_use' | 'network_error' | 'unexpected_error';

export class ProdutosError extends Error {
  constructor(
    message: string,
    readonly code: ProdutosErrorCode,
  ) {
    super(message);
    this.name = 'ProdutosError';
  }
}

const PRODUTOS_ENDPOINT = '/api/produtos';
const CACHE_TTL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class ProdutosService {
  private readonly http = inject(HttpClient);
  private produtosCache: { dados: Produto[]; atualizadoEm: number } | null = null;
  private produtosEmCarregamento: Promise<Produto[]> | null = null;

  async listar(ignorarCache = false): Promise<Produto[]> {
    if (!ignorarCache && this.produtosCache && Date.now() - this.produtosCache.atualizadoEm < CACHE_TTL_MS) {
      return this.produtosCache.dados;
    }
    if (!ignorarCache && this.produtosEmCarregamento) {
      return this.produtosEmCarregamento;
    }

    this.produtosEmCarregamento = this.buscarLista();
    try {
      return await this.produtosEmCarregamento;
    } finally {
      this.produtosEmCarregamento = null;
    }
  }

  private async buscarLista(): Promise<Produto[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ produtos?: Produto[] }>(PRODUTOS_ENDPOINT),
      );
      const produtos = response.produtos ?? [];
      this.produtosCache = { dados: produtos, atualizadoEm: Date.now() };
      return produtos;
    } catch (error) {
      throw this.toProdutosError(error);
    }
  }

  async cadastrar(dados: ProdutoSalvar): Promise<Produto> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ produto?: Produto }>(PRODUTOS_ENDPOINT, dados),
      );
      this.limparCache();
      return this.obterProduto(response);
    } catch (error) {
      throw this.toProdutosError(error);
    }
  }

  async atualizar(id: string, dados: ProdutoSalvar): Promise<Produto> {
    try {
      const response = await firstValueFrom(
        this.http.put<{ produto?: Produto }>(
          `${PRODUTOS_ENDPOINT}?id=${encodeURIComponent(id)}`,
          dados,
        ),
      );
      this.limparCache();
      return this.obterProduto(response);
    } catch (error) {
      throw this.toProdutosError(error);
    }
  }

  async remover(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${PRODUTOS_ENDPOINT}?id=${encodeURIComponent(id)}`),
      );
      this.limparCache();
    } catch (error) {
      throw this.toProdutosError(error);
    }

  }

  private limparCache(): void {
    this.produtosCache = null;
  }

  private obterProduto(response: { produto?: Produto }): Produto {
    if (!response.produto) {
      throw new ProdutosError('Resposta inesperada da API.', 'unexpected_error');
    }
    return response.produto;
  }

  private toProdutosError(error: unknown): ProdutosError {
    if (error instanceof ProdutosError) {
      return error;
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return new ProdutosError('Nao foi possivel conectar ao servidor.', 'network_error');
      }

      if (error.status === 404) {
        return new ProdutosError('Produto nao encontrado.', 'not_found');
      }

      const body = error.error as { erro?: unknown } | null;
      const message =
        body && typeof body.erro === 'string' && body.erro.trim() !== ''
          ? body.erro
          : 'Nao foi possivel concluir a operacao.';

      if (error.status === 400) {
        return new ProdutosError(message, 'invalid_data');
      }

      if (error.status === 409) {
        return new ProdutosError(message, 'in_use');
      }

      return new ProdutosError(message, 'unexpected_error');
    }

    return new ProdutosError('Nao foi possivel concluir a operacao.', 'unexpected_error');
  }
}
