-- 010_adicionar_nome_usuarios.sql - adiciona o nome exibido no perfil do usuario.

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS nome TEXT NOT NULL DEFAULT '';
