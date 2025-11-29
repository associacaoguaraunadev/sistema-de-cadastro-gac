-- Adicionar campos para recuperação de senha à tabela Usuario
ALTER TABLE "Usuario" ADD COLUMN "tokenRecuperacao" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "expiracaoToken" TIMESTAMP(3);
