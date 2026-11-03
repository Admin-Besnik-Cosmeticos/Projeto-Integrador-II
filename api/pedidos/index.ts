import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  PedidoInvalidoError,
  PedidoNaoEncontradoError,
  createPedido,
  getPedidoById,
  listPedidos,
  removePedido,
  updatePedido,
} from '../../services/pedidos.service.js';

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
          const pedido = await getPedidoById(id);
          return res.status(200).json({ message: 'Pedido encontrado.', pedido });
        }
        const pedidos = await listPedidos();
        return res.status(200).json({ message: 'Pedidos listados.', pedidos });
      }
      case 'POST': {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const pedido = await createPedido(body);
        return res.status(201).json({ message: 'Pedido cadastrado.', pedido });
      }
      case 'PUT': {
        const id = lerId(req);
        if (!id) {
          return res.status(400).json({ erro: 'Id do pedido obrigatorio.' });
        }
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const pedido = await updatePedido(id, body);
        return res.status(200).json({ message: 'Pedido atualizado.', pedido });
      }
      case 'DELETE': {
        const id = lerId(req);
        if (!id) {
          return res.status(400).json({ erro: 'Id do pedido obrigatorio.' });
        }
        await removePedido(id);
        return res.status(200).json({ message: 'Pedido removido.' });
      }
      default:
        res.setHeader('Allow', 'GET, POST, PUT, DELETE');
        return res.status(405).json({ erro: 'Metodo nao permitido' });
    }
  } catch (err) {
    if (err instanceof PedidoInvalidoError) {
      return res.status(400).json({ erro: err.message });
    }
    if (err instanceof PedidoNaoEncontradoError) {
      return res.status(404).json({ erro: err.message });
    }
    if (err instanceof SyntaxError) {
      return res.status(400).json({ erro: 'Corpo da requisicao invalido.' });
    }
    console.error('[api/pedidos] erro:', err);
    return res.status(500).json({ erro: 'Erro interno na API.' });
  }
}
