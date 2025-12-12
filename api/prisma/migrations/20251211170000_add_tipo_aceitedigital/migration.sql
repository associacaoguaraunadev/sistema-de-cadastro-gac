BEGIN;

-- 1) Adiciona a coluna 'tipo' com valor padrão 'MATRICULA' (não destrutivo)
ALTER TABLE "AceiteDigital" ADD COLUMN IF NOT EXISTS "tipo" TEXT NOT NULL DEFAULT 'MATRICULA';

-- 2) Tenta remover a constraint única antiga sobre (matriculaId, responsavelId)
--    Tentamos nomes comuns para evitar falha em ambientes diferentes.
ALTER TABLE "AceiteDigital" DROP CONSTRAINT IF EXISTS "AceiteDigital_matriculaId_responsavelId_key";
ALTER TABLE "AceiteDigital" DROP CONSTRAINT IF EXISTS "matriculaId_responsavelId_key";
ALTER TABLE "AceiteDigital" DROP CONSTRAINT IF EXISTS "aceitedigital_matriculaid_responsavelid_key";

-- 3) Criar índice único novo por (matriculaId, responsavelId, tipo)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_aceitedigital_matricula_responsavel_tipo"
  ON "AceiteDigital" ("matriculaId", "responsavelId", "tipo");

COMMIT;
