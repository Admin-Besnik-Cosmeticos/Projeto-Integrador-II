# Services — regras de negócio

A pasta `services/` concentra **toda a regra de negócio do backend**, isolada do
transporte HTTP. As rotas em `api/` apenas recebem a requisição, chamam um service
e devolvem a resposta. Ver também: `../Readme.md`, `../api/README.md`, `../database/README.md`.

## Regra de ouro

> **Service nunca importa nada de HTTP.** Nada de `@vercel/node`, `req`, `res`,
> `status()` ou `json()` aqui dentro. Service recebe **dados simples**, devolve
> **dados simples** e sinaliza erro com `throw`. Quem fala HTTP é a rota em `api/`.

```
api/teste/index.ts          → entende HTTP (req.method, req.body, res.status().json())
services/teste.service.ts   → entende negócio (listar posts, criar post)
database/db.ts              → entende banco (client SQL compartilhado)
```

## Como construir um service

1. **Um arquivo por recurso**, nomeado `<recurso>.service.ts`
   (ex.: `services/estoque.service.ts`, `services/usuarios.service.ts`).
2. **Defina a interface da linha** que a função retorna (ex.: `PostRow`).
3. **Funções exportadas com verbos em inglês**: `list`, `get`, `create`, `update`, `remove`.
4. **Valide a entrada** na borda do service (ex.: título vazio vira valor padrão ou `throw`).
5. **Acesse o banco** apenas via `sql` de `../database/db.js` (tagged template do Neon).
6. **Nunca retorne `res` nem receba `req`** — em caso de falha, `throw new Error(...)`;
   a rota converte em `500`.

### Esquema padrão

```ts
import { sql } from '../database/db.js';

export interface RecursoRow {
  id: string;
  // ... colunas da tabela
}

export async function listRecursos(): Promise<RecursoRow[]> {
  const rows = (await sql`SELECT ... FROM recursos ORDER BY ...`) as unknown as RecursoRow[];
  return rows;
}

export async function createRecurso(input: unknown): Promise<RecursoRow> {
  // 1. validar / normalizar a entrada aqui
  const inserted = (await sql`
    INSERT INTO recursos (...)
    VALUES (...)
    RETURNING ...
  `) as unknown as RecursoRow[];

  const row = inserted[0];
  if (!row) {
    throw new Error('Falha ao criar recurso.');
  }
  return row;
}
```

> Por que `as unknown as X[]`? O driver `@neondatabase/serverless` não aceita
> genérico no template (`sql<X[]>` não compila). O cast é o jeito oficial de tipar
> o retorno nesse projeto.

### Como a rota usa o service

```ts
// api/recurso/index.ts
import { createRecurso, listRecursos } from '../../services/recurso.service.js';

case 'GET': {
  const rows = await listRecursos();
  return res.status(200).json({ message: '...', rows });
}
case 'POST': {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const row = await createRecurso((body as { campo?: unknown } | null)?.campo);
  return res.status(201).json({ message: '...', row });
}
```

## Verificação

```bash
# na raiz do repo
npm run type-check        # valida api/ + services/ + database/
npm --prefix api run type-check
```
