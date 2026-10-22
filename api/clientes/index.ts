import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ClienteInvalidoError,
  ClienteNaoEncontradoError,
  createCliente,
  getClienteById,
  listClientes,
  removeCliente,
  updateCliente,
} from '../../services/clientes.service.js';

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
          const cliente = await getClienteById(id);
          return res.status(200).json({ message: 'Cliente encontrado.', cliente });
        }
        const clientes = await listClientes();
        return res.status(200).json({ message: 'Clientes listados.', clientes });
      }
      case 'POST': {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const cliente = await createCliente(body);
        return res.status(201).json({ message: 'Cliente cadastrado.', cliente });
      }
      case 'PUT': {
        const id = lerId(req);
        if (!id) {
          return res.status(400).json({ erro: 'Id do cliente obrigatorio.' });
        }
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const cliente = await updateCliente(id, body);
        return res.status(200).json({ message: 'Cliente atualizado.', cliente });
      }
      case 'DELETE': {
        const id = lerId(req);
        if (!id) {
          return res.status(400).json({ erro: 'Id do cliente obrigatorio.' });
        }
        await removeCliente(id);
        return res.status(200).json({ message: 'Cliente removido.' });
      }
      default:
        res.setHeader('Allow', 'GET, POST, PUT, DELETE');
        return res.status(405).json({ erro: 'Metodo nao permitido' });
    }
  } catch (err) {
    if (err instanceof ClienteInvalidoError) {
      return res.status(400).json({ erro: err.message });
    }
    if (err instanceof ClienteNaoEncontradoError) {
      return res.status(404).json({ erro: err.message });
    }
    if (err instanceof SyntaxError) {
      return res.status(400).json({ erro: 'Corpo da requisicao invalido.' });
    }
    console.error('[api/clientes] erro:', err);
    return res.status(500).json({ erro: 'Erro interno na API.' });
  }
}
