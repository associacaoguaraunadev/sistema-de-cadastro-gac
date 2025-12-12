BEGIN;

-- Add column composicaoFamiliar to AlunoGuarauna as JSONB (nullable)
ALTER TABLE "AlunoGuarauna"
  ADD COLUMN IF NOT EXISTS "composicaoFamiliar" JSONB;

COMMIT;
