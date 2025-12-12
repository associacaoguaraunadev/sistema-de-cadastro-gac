BEGIN;

-- Add-only migration: create table ModeloTermoAceite
CREATE TABLE IF NOT EXISTS "ModeloTermoAceite" (
  "id" TEXT PRIMARY KEY,
  "tipo" TEXT NOT NULL,
  "titulo" TEXT,
  "conteudoHTML" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criadoPorId" INTEGER,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes only if they don't already exist (compatível com versões antigas do Postgres)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c WHERE c.relkind = 'i' AND c.relname = 'ModeloTermoAceite_tipo_idx'
  ) THEN
    CREATE INDEX "ModeloTermoAceite_tipo_idx" ON "ModeloTermoAceite" ("tipo");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c WHERE c.relkind = 'i' AND c.relname = 'ModeloTermoAceite_ativo_idx'
  ) THEN
    CREATE INDEX "ModeloTermoAceite_ativo_idx" ON "ModeloTermoAceite" ("ativo");
  END IF;
END$$;

-- Foreign key to Usuario (optional)
-- Adiciona constraint FK apenas se não existir (Postgres não aceita IF NOT EXISTS em ADD CONSTRAINT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'ModeloTermoAceite_criadoPorId_fkey' AND tc.table_name = 'ModeloTermoAceite'
  ) THEN
    ALTER TABLE "ModeloTermoAceite" ADD CONSTRAINT "ModeloTermoAceite_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL;
  END IF;
END$$;

COMMIT;
