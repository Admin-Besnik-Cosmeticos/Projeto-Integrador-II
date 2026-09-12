-- Migração inicial mínima para a rota de teste.

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO posts (title)
SELECT 'Primeiro post de teste'
WHERE NOT EXISTS (
  SELECT 1 FROM posts
);