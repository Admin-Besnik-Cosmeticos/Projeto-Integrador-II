-- 002_criar_usuarios.sql — cria a tabela usuarios para autenticacao e recuperacao de senha.

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  chave_recuperacao CHAR(8),
  expiracao_chave_recuperacao TIMESTAMPTZ,
  admin BOOLEAN NOT NULL DEFAULT false
);
