# API — Vercel Serverless Functions (camada HTTP)

Esta pasta contém as **rotas HTTP** do backend. Cada rota é uma função serverless:
fina, sem SQL e sem regra de negócio — ela traduz HTTP ↔ services.
Ver também: `../Readme.md`, `../services/README.md`, `../database/README.md`.

## Como o roteamento funciona

A Vercel mapeia **arquivo → rota** automaticamente:

| Arquivo                | Rota          |
|------------------------|---------------|
| `api/teste/index.ts`   | `/api/teste`  |
| `api/estoque/index.ts` | `/api/estoque`|

- Arquivos/pastas com prefixo `_` são **ignorados no roteamento**
  (por isso utilitários nunca devem morar aqui — vão para `services/` ou `database/`).
- O `export default` do arquivo **é o handler**: `handler(req, res)`.
- As funções ativas no deploy estão declaradas no `vercel.json` (`functions: { "api/**": ... }`).

## O esquema: 1 arquivo = 1 recurso = até 4 operações

O plano gratuito da Vercel (Hobby) limita a **12 funções serverless por deployment**.
Se cada arquivo tratasse 1 método, o projeto teria no máximo 12 endpoints.
O padrão deste repo é **um `switch` em `req.method` por arquivo**, então cada
função atende até **4 operações** — o teto efetivo vai de 12 para **até 48 operações**:

| Método   | Operação típica | Status de sucesso |
|----------|-----------------|-------------------|
| `GET`    | listar / buscar | `200`             |
| `POST`   | criar           | `201`             |
| `PUT`    | atualizar       | `200`             |
| `DELETE` | remover         | `200` (ou `204`)  |

Método não tratado → `405` com header `Allow` (ver esquema abaixo).

### Esquema padrão de rota (copie e adapte)

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createX, listX, removeX, updateX } from '../../services/x.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'GET': {
        const rows = await listX();
        return res.status(200).json({ message: '...', rows });
      }
      case 'POST': {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const row = await createX((body as { campo?: unknown } | null)?.campo);
        return res.status(201).json({ message: '...', row });
      }
      case 'PUT': {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const row = await updateX(/* id + campos */);
        return res.status(200).json({ message: '...', row });
      }
      case 'DELETE': {
        await removeX(/* id */);
        return res.status(200).json({ message: '...' });
      }
      default:
        res.setHeader('Allow', 'GET, POST, PUT, DELETE');
        return res.status(405).json({ erro: 'Metodo nao permitido' });
    }
  } catch (err) {
    console.error('[api/x] erro:', err);
    return res.status(500).json({ erro: 'Erro interno na API.' });
  }
}
```

### Regras da rota

1. **Rota não acessa banco** — chama `services/`, que usa `database/db.ts`.
2. **`req.body` pode vir string ou objeto** — normalize com o `typeof` do esquema.
3. **Todo handler tem `try/catch`** — service lança `throw`, rota responde `500`
   (nunca vaze stack trace para o cliente).
4. **Nova rota = nova pasta** `api/<recurso>/index.ts` + funções no service correspondente.

## Rodando local

```bash
# na raiz do repo — sobe a API em http://localhost:3000
npm run dev:api
```

- Usa o `.env.development` da raiz (via `dotenv-cli`).
- Na primeira execução o `vercel dev` pede `vercel link` (login + vínculo do projeto).
- Com Node 22 (padrão do projeto via `.nvmrc`), o `vercel dev` não apresenta o erro
  `UV_HANDLE_CLOSING` que pode ocorrer no Windows + Node 24.

## Deploy

- `vercel.json` define `installCommand` (raiz + `frontend` + `api`), `buildCommand`
  (build do Angular) e os `rewrites` (`/api/*` → funções, resto → SPA).
- No painel da Vercel: **Root Directory `.`**, **Framework Preset `Other`**.
- Variáveis obrigatórias em produção: `DATABASE_URL` (e `JWT_SECRET` quando houver auth).
- Lembrete: o deploy **não roda as migrações** — aplique com `npm run db:migrate`
  apontando para o banco correto antes de usar a API.

## Verificação

```bash
# na raiz do repo
npm --prefix api run type-check
```
