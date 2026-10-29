-- 009_adicionar_categoria_produtos.sql - adiciona a categoria aos produtos.

ALTER TABLE produtos
    ADD COLUMN IF NOT EXISTS categoria VARCHAR(100);
