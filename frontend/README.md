# Frontend

Aplicação web do Smart Beauty, desenvolvida com Angular 21, TypeScript e SCSS.
O frontend fornece a interface de autenticação, dashboard, clientes, produtos,
pedidos e configurações do sistema.

## Pré-requisitos

- Node.js 22.x
- npm 11.x
- API local disponível em `http://localhost:3000` quando forem necessárias
  operações que dependem do backend

As versões recomendadas estão definidas no [`package.json`](package.json).

## Instalação

Na raiz do repositório, a forma recomendada de instalar todas as dependências é:

```bash
npm run install-all
```

Para instalar somente as dependências do frontend:

```bash
cd frontend
npm install
```

## Desenvolvimento

Para iniciar o servidor com o proxy configurado para a API:

```bash
cd frontend
npm run start:proxy
```

A aplicação ficará disponível em `http://localhost:4200`. O proxy definido em
[`proxy.conf.json`](proxy.conf.json) encaminha as requisições `/api/*` para
`http://localhost:3000`.

Também é possível iniciar o frontend junto com a API a partir da raiz:

```bash
npm run dev:all
```

O Angular recarrega automaticamente a aplicação após alterações nos arquivos
de código.

## Estrutura principal

```text
src/
├── app/
│   ├── components/   # Componentes reutilizáveis
│   ├── layouts/      # Estruturas de layout da aplicação
│   ├── pages/        # Telas e páginas
│   └── services/     # Comunicação com a API e regras do frontend
├── index.html
├── main.ts
└── styles.scss
public/
├── assets/            # Imagens e recursos estáticos
└── favicon.ico        # Ícone exibido pelo navegador
```

Novos componentes devem seguir a convenção do Angular e usar SCSS:

```bash
npx ng generate component components/nome-do-componente
```

## Build

Para gerar a versão de produção:

```bash
cd frontend
npm run build
```

Os artefatos são gerados em `dist/frontend/browser`.

## Testes e verificação de tipos

Para executar os testes unitários:

```bash
cd frontend
npm test -- --watch=false
```

Para verificar os tipos TypeScript:

```bash
npm run type-check
```

## Recursos estáticos

Arquivos colocados em [`public/`](public/) são copiados para o build sem
processamento. O favicon usado pelo navegador é
[`public/favicon.ico`](public/favicon.ico), referenciado em
[`src/index.html`](src/index.html).

## Documentação relacionada

- [`../README.md`](../README.md) — visão geral do projeto e execução do workspace
- [`../api/README.md`](../api/README.md) — rotas e funcionamento da API
- [`../services/README.md`](../services/README.md) — regras de negócio
- [`../database/README.md`](../database/README.md) — banco de dados e migrações
