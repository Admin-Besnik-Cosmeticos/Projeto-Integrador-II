-- 006_criar_clientes.sql — cria a tabela clientes com contato e endereco JSONB.

CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    endereco JSONB NOT NULL
);
