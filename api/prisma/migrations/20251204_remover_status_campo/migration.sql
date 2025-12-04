-- Remover campo status da tabela Pessoa
-- Migração para deleção física ao invés de lógica
ALTER TABLE "Pessoa" DROP COLUMN "status";