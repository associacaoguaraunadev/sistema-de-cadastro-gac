-- ============================================
-- Script para criar usuário admin no banco
-- Copie e cole no Supabase SQL Editor
-- ============================================

-- Senha: Admin123!
-- Hash bcrypt gerado com 10 rounds
-- Você pode gerar um novo hash aqui: https://bcryptgen.com/

INSERT INTO "Usuario" (email, nome, senha, funcao, ativo, "dataCriacao", "dataAtualizacao")
VALUES (
  'admin@gac.com',
  'Administrador GAC',
  '$2b$10$VzhwpUGHmMNzVWmJ7hM5q.KX7QQ5QQ5QQ5QQ5QQ5QQ5QQ5QQ5QQ5QQ', -- SUBSTITUIR PELO HASH
  'admin',
  true,
  NOW(),
  NOW()
);

-- Se quiser verificar se foi criado:
-- SELECT id, email, nome, funcao, ativo FROM "Usuario" WHERE email = 'admin@gac.com';
