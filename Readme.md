# Nome do Projeto   

Sistema de gerenciamento de estoque desenvolvido como Projeto Integrador II — UNIVESP, Turma 4, Grupo 9.

## Status do projeto

- Versao atual: `0.0.1`
- Status: Em desenvolvimento

## Tecnologias

| Camada       | Tecnologia                          |
|--------------|-------------------------------------|
| Frontend     | Angular 21 + TypeScript + SCSS       |
| Backend      | Node.js + Vercel Serverless Functions |
| Banco de dados | PostgreSQL                          |
| Deploy       | Vercel                              |
| Controle de versão | GitHub                        |

## Estrutura do repositório

```
/api/            # Vercel Serverless Functions (camada HTTP) — ver api/README.md
├── teste/       #   rota /api/teste (GET, POST via switch em req.method)
/database/       # Banco Postgres/Neon: client, migrações e scripts — ver database/README.md
├── db.ts        #   client SQL compartilhado (services/ e api/ importam daqui)
├── migrations/  #   histórico do esquema (001_init.sql, 002_....sql, ...)
├── scripts/     #   migrate.mjs (aplica as migrações em ordem)
/docs/           # Documentação do projeto
/frontend/       # Aplicação Angular
/services/       # Regras de negócio puras (sem HTTP) — ver services/README.md
├── vercel.json  # Configuração de build, funções e roteamento
└── .env.example # Modelo das variáveis de ambiente (copie para .env.development)
```

## Documentação por camada

- [`api/README.md`](api/README.md) — como funcionam as rotas (Vercel Functions) e o
  esquema de 1 arquivo = até 4 operações (GET, POST, PUT, DELETE), que amplia o
  limite gratuito de 12 funções para até 48 operações.
- [`services/README.md`](services/README.md) — como construir services
  (funções puras, sem HTTP, com validação e acesso via `database/db.ts`).
- [`database/README.md`](database/README.md) — como funciona o banco
  (client, migrações) e como criar novas migrações.

## Como executar localmente

### Pré-requisitos

- Node.js 22.x (definido em `.nvmrc` — use `nvm use` para ativar)
- npm >= 11 (versao testada: `11.19.1`; o npm 10 falha ao instalar o `frontend` no Node 24 com erro `edgesOut`)

Observacao: em Windows, se o `vercel dev` apresentar erro de runtime (`UV_HANDLE_CLOSING`), faca fallback para Node 22.x apenas para rodar a API local.

### Workspace (recomendado)

```bash
npm run install-all

# copiar o modelo de ambiente e preencher com os valores reais (não commitar .env*)
cp .env.example .env.development

# aplicar o esquema no banco
npm run db:migrate

npm run dev:all
```

Fluxo esperado:

- Frontend: `http://localhost:4200`
- API local: `http://localhost:3000`
- Frontend consumindo backend por `/api/*` via proxy Angular.

### Frontend

```bash
cd frontend
npm install
npm run start:proxy -- --port 4200
```

Acesse `http://localhost:4200`.

### Backend (Vercel Functions)

```bash
cd api
npm install

# Instalar dependências do banco de dados (scripts de migração)
cd ../database
npm install
cd ../api

# Iniciar servidor local (porta 3000)
vercel dev --listen 3000
```

As funções ficam disponíveis em `http://localhost:3000/api/*`.

## Scripts da raiz

- `npm run install-all`: instala dependencias da raiz, `api`, `database` e `frontend`.
- `npm run dev:all`: sobe API e frontend em paralelo.
- `npm run dev:api`: sobe Vercel local em `3000` com `.env.development`.
- `npm run dev:web`: sobe Angular em `4200` com proxy.
- `npm run db:migrate`: aplica `database/migrations/*.sql` em ordem (ver `database/README.md`).
- `npm run type-check`: valida tipos de `api/`, `services/` e `database/`.

### Qualidade do frontend

```bash
cd frontend
npm test -- --watch=false
npm run type-check
```

### Qualidade da API

```bash
cd api
npm run type-check
```

## Deploy na Vercel

O arquivo `vercel.json` na raiz ja define o fluxo de deploy para o monorepo:

- instala dependencias da raiz, de `frontend` e de `api`
- faz build do Angular em `frontend`
- publica os arquivos estaticos de `frontend/dist/frontend/browser`
- expoe as funções serverless de `api/**` (ver `api/README.md`)

## Rotas de API

Cada arquivo em `api/` atende **até 4 métodos** (`GET, POST, PUT, DELETE`) via
`switch` em `req.method` — detalhe em [`api/README.md`](api/README.md).
Com o limite gratuito de 12 funções, o projeto comporta até 48 operações.

- `GET /api/teste`: lista posts, retorna `{ "message": "API funcionando", "posts": [...] }`.
- `POST /api/teste`: cria post (`{ "title": "..." }`), retorna `201` com o post criado.

No painel da Vercel, configure o projeto com:

- Root Directory: `.`
- Framework Preset: `Other`
- Build and Output Settings: usar os valores do `vercel.json`

Variaveis de ambiente obrigatorias para producao:

- `DATABASE_URL`
- `JWT_SECRET`

## Equipe

Projeto Integrador II — UNIVESP | Turma 4 | Grupo 9