-- Safe migration: add-only changes (no DROP operations)
-- Created: 2025-12-11 16:25 (auto)

BEGIN;

-- Add new columns to Matricula if they don't already exist
ALTER TABLE "Matricula"
  ADD COLUMN IF NOT EXISTS "horaEntrada" varchar,
  ADD COLUMN IF NOT EXISTS "horaSaida" varchar,
  ADD COLUMN IF NOT EXISTS "horarioEstudo" varchar,
  ADD COLUMN IF NOT EXISTS "nomeEscola" varchar(50),
  ADD COLUMN IF NOT EXISTS "situacaoComportamentoEscolar" varchar,
  ADD COLUMN IF NOT EXISTS "tamanhoCalca" varchar;

-- Add new columns to ResponsavelLegal
ALTER TABLE "ResponsavelLegal"
  ADD COLUMN IF NOT EXISTS "estaEmpregado" boolean,
  ADD COLUMN IF NOT EXISTS "parentesco" varchar;

-- Add new columns to Turma (do not drop professorId here)
ALTER TABLE "Turma"
  ADD COLUMN IF NOT EXISTS "ano" integer,
  ADD COLUMN IF NOT EXISTS "educadorId" uuid;

-- Add non-unique indexes where Prisma expects indexes.
-- We create non-unique indexes to avoid failures if duplicates exist.
CREATE INDEX IF NOT EXISTS idx_alunoresponsavel_parentesco ON "AlunoResponsavel" ("parentesco");
CREATE INDEX IF NOT EXISTS idx_matricula_ano ON "Matricula" ("ano");
CREATE INDEX IF NOT EXISTS idx_matricula_status ON "Matricula" ("status");
CREATE INDEX IF NOT EXISTS idx_alunoguarauna_pessoaId ON "AlunoGuarauna" ("pessoaId");

COMMIT;

-- NOTES:
-- 1) This migration intentionally avoids DROP operations (no DROP INDEX, no DROP CONSTRAINT, no DROP COLUMN).
-- 2) If you want unique indexes or foreign keys added, review current data for duplicates first.
-- 3) After you review and test this migration locally, we can apply it to a non-production environment and then deploy to production with backup.
