CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    preco NUMERIC(10, 2) NOT NULL
        CHECK (preco >= 0),
    quantidade_estoque INTEGER NOT NULL DEFAULT 0
        CHECK (quantidade_estoque >= 0)
);
