import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDashboard, normalizarPeriodo } from '../../services/dashboard.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ erro: 'Metodo nao permitido' });
    }

    const periodo = req.query?.periodo;
    const dashboard = await getDashboard(normalizarPeriodo(periodo));
    return res.status(200).json(dashboard);
  } catch (err) {
    console.error('[api/dashboard] erro:', err);
    return res.status(500).json({ erro: 'Erro interno na API.' });
  }
}
