import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createPost, listPosts } from '../../services/teste.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'POST': {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const post = await createPost((body as { title?: unknown } | null)?.title);
        return res.status(201).json({
          message: 'Post criado com sucesso.',
          post,
        });
      }
      case 'GET': {
        const posts = await listPosts();
        return res.status(200).json({
          message: 'API funcionando',
          posts,
        });
      }
      default:
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ erro: 'Metodo nao permitido' });
    }
  } catch (err) {
    console.error('[api/teste] erro:', err);
    return res.status(500).json({ erro: 'Erro interno na API.' });
  }
}
