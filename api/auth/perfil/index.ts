import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getProfile,
  InvalidProfileError,
  InvalidTokenError,
  updateProfile,
} from '../../../services/auth.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'GET': {
        const user = await getProfile(req.headers.authorization);
        return res.status(200).json({ user });
      }
      case 'PUT': {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const nome = (body as { nome?: unknown } | null)?.nome;
        const email = (body as { email?: unknown } | null)?.email;
        const user = await updateProfile(req.headers.authorization, nome, email);
        return res.status(200).json({ message: 'Perfil atualizado com sucesso.', user });
      }
      default:
        res.setHeader('Allow', 'GET, PUT');
        return res.status(405).json({ erro: 'Metodo nao permitido' });
    }
  } catch (err) {
    if (err instanceof InvalidTokenError) {
      return res.status(401).json({ erro: err.message });
    }
    if (err instanceof InvalidProfileError) {
      return res.status(400).json({ erro: err.message });
    }
    console.error('[api/auth/perfil] erro:', err);
    return res.status(500).json({ erro: 'Erro interno na API.' });
  }
}
