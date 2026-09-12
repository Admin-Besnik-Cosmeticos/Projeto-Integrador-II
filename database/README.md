# Database — Postgres (Neon): client, migrações e scripts

Esta pasta concentra **tudo que diz respeito ao banco de dados**:
o client compartilhado, o histórico de esquema (migrações) e o script que as aplica.
Ver também: `../Readme.md`, `../api/README.md`, `../services/README.md`.

```
database/
├── db.ts               # client SQL compartilhado (usado por services/ e api/)
├── migrations/         # histórico do esquema: 001_init.sql, 002_....sql, ...
├── scripts/
│   └── migrate.mjs     # aplica as migrações em ordem no banco configurado
└── package.json
```

## `db.ts` — o client compartilhado

Exporta `sql`, o tagged template do `@neondatabase/serverless`:

```ts
import { sql } from '../database/db.js';

const posts = await sql`SELECT id, title FROM posts`;
```

- Funciona em Vercel Functions **sem manter pool aberto** (HTTP, não TCP).
- Exige `DATABASE_URL` no ambiente — sem ela, a importação lança erro na largada.
- É o **único ponto de acesso ao banco** que `services/` e `api/` devem usar.

## `migrations/` — como funciona

Cada arquivo `NNN_descricao.sql` é **uma mudança de esquema**, aplicada **uma vez,
em ordem alfabética/numérica**. O `migrate.mjs`:

1. Lê `.env.development` (e depois `.env.local`, sem sobrescrever) na raiz do repo.
2. Lista `migrations/*.sql` em ordem e executa cada arquivo inteiro via `Pool`.
3. Falha no primeiro erro (não marca nada como "aplicado" — o SQL deve ser idempotente).

```bash
# na raiz do repo (usa o DATABASE_URL do .env.development)
npm run db:migrate
```

> As migrações **não rodam sozinhas**: nem o `vercel dev`, nem o deploy executam
> o migrate. Rode manualmente após criar/editar uma migração e antes de usar a API.

## Como criar uma migração

1. Crie `migrations/NNN_descricao_snake_case.sql` com o **próximo número**
   (ex.: `002_cria_tabela_estoque.sql`).
2. Escreva SQL **idempotente** — rode quantas vezes for, o resultado é o mesmo.
   Prefira `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, etc.
3. **Nunca edite uma migração já aplicada** em ambiente compartilhado:
   crie uma nova corrigindo (ex.: `003_...sql`).
4. Rode `npm run db:migrate` e confira a saída (`Aplicando ... / OK`).
5. Commite o arquivo `.sql` junto com o código que depende dele.

### Esquema padrão

```sql
-- 002_cria_tabela_estoque.sql — o que esta migração faz, em uma linha.

CREATE TABLE IF NOT EXISTS estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Variáveis de ambiente

Copie `.env.example` (raiz) para `.env.development` e preencha:

```
DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require
```

`JWT_SECRET`, `JWT_EXPIRES_IN` e `BCRYPT_SALT_ROUNDS` estão previstas para a
futura autenticação e ainda não são consumidas pelo código.
