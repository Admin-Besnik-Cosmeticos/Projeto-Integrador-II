import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ProdutoEmUsoError,
  ProdutoInvalidoError,
  ProdutoNaoEncontradoError,
  createProduto,
  getProdutoById,
  listProdutos,
  removeProduto,
  updateProduto,
} from '../../services/produtos.service.js';

function lerId(req: VercelRequest): string | undefined {
  const id = req.query?.id;
  if (typeof id === 'string') {
    return id;
  }
  return Array.isArray(id) ? String(id[0]) : undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'GET': {
        const id = lerId(req);
        if (id) {
          const produto = await getProdutoById(id);
          return res.status(200).json({ message: 'Produto encontrado.', produto });
        }
        const produtos = await listProdutos();
        return res.status(200).json({ message: 'Produtos listados.', produtos });
      }
      case 'POST': {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const produto = await createProduto(body);
        return res.status(201).json({ message: 'Produto cadastrado.', produto });
      }
      case 'PUT': {
        const id = lerId(req);
        if (!id) {
          return res.status(400).json({ erro: 'Id do produto obrigatorio.' });
        }
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const produto = await updateProduto(id, body);
        return res.status(200).json({ message: 'Produto atualizado.', produto });
      }
      case 'DELETE': {
        const id = lerId(req);
        if (!id) {
          return res.status(400).json({ erro: 'Id do produto obrigatorio.' });
        }
        await removeProduto(id);
        return res.status(200).json({ message: 'Produto removido.' });
      }
      default:
        res.setHeader('Allow', 'GET, POST, PUT, DELETE');
        return res.status(405).json({ erro: 'Metodo nao permitido' });
    }
  } catch (err) {
    if (err instanceof ProdutoInvalidoError) {
      return res.status(400).json({ erro: err.message });
    }
    if (err instanceof ProdutoNaoEncontradoError) {
      return res.status(404).json({ erro: err.message });
    }
    if (err instanceof ProdutoEmUsoError) {
      return res.status(409).json({ erro: err.message });
    }
    if (err instanceof SyntaxError) {
      return res.status(400).json({ erro: 'Corpo da requisicao invalido.' });
    }
    console.error('[api/produtos] erro:', err);
    return res.status(500).json({ erro: 'Erro interno na API.' });
  }
}
