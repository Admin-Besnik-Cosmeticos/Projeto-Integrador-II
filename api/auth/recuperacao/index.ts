import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  InvalidCredentialsError,
  InvalidRecoveryKeyError,
  InvalidRecoveryRequestError,
  InvalidTokenError,
  requestPasswordRecovery,
  resetPassword,
} from '../../../services/auth.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'POST': {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const email = (body as { email?: unknown } | null)?.email;
        const tipo = (body as { tipo?: unknown } | null)?.tipo;
        const result = await requestPasswordRecovery(email, tipo, req.headers.authorization);
        return res.status(200).json({ message: result.message });
      }
      case 'PUT': {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const email = (body as { email?: unknown } | null)?.email;
        const tipo = (body as { tipo?: unknown } | null)?.tipo;
        const chave = (body as { chave?: unknown } | null)?.chave;
        const novaSenha = (body as { novaSenha?: unknown } | null)?.novaSenha;
        const senhaAtual = (body as { senhaAtual?: unknown } | null)?.senhaAtual;
        const result = await resetPassword(email, tipo, chave, novaSenha, senhaAtual);
        return res.status(200).json({ message: result.message });
      }
      default:
        res.setHeader('Allow', 'POST, PUT');
        return res.status(405).json({ erro: 'Metodo nao permitido' });
    }
  } catch (err) {
    if (err instanceof InvalidRecoveryRequestError) {
      return res.status(400).json({ erro: err.message });
    }
    if (err instanceof InvalidRecoveryKeyError) {
      return res.status(400).json({ erro: err.message });
    }
    if (err instanceof InvalidTokenError) {
      return res.status(401).json({ erro: 'Token ausente ou invalido.' });
    }
    if (err instanceof InvalidCredentialsError) {
      return res.status(401).json({ erro: err.message });
    }
    console.error('[api/auth/recuperacao] erro:', err);
    return res.status(500).json({ erro: 'Erro interno na API.' });
  }
}
