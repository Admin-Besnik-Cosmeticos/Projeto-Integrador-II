import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, InvalidCredentialsError } from '../../../services/auth.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'POST': {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const email = (body as { email?: unknown } | null)?.email;
        const senha = (body as { senha?: unknown } | null)?.senha;
        const result = await authenticate(email, senha);
        return res.status(200).json({
          message: 'Login realizado com sucesso.',
          token: result.token,
          user: result.user,
        });
      }
      default:
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ erro: 'Metodo nao permitido' });
    }
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return res.status(401).json({ erro: 'Credenciais invalidas.' });
    }
    console.error('[api/auth/login] erro:', err);
    return res.status(500).json({ erro: 'Erro interno na API.' });
  }
}
