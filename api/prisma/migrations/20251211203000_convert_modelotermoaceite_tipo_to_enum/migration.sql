BEGIN;

-- Converter coluna ModeloTermoAceite.tipo (texto) para o enum AceiteTipo, se necessário
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ModeloTermoAceite' AND column_name='tipo') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_type t JOIN pg_attribute a ON a.atttypid = t.oid
      JOIN pg_class c ON a.attrelid = c.oid
      WHERE c.relname = 'ModeloTermoAceite' AND a.attname = 'tipo' AND t.typname = 'AceiteTipo'
    ) THEN
      -- Remove default if present to avoid cast errors
      BEGIN
        EXECUTE 'ALTER TABLE "ModeloTermoAceite" ALTER COLUMN "tipo" DROP DEFAULT';
      EXCEPTION WHEN undefined_table OR undefined_column THEN
        NULL;
      END;

      -- Alterar coluna de texto para enum usando cast
      EXECUTE 'ALTER TABLE "ModeloTermoAceite" ALTER COLUMN "tipo" TYPE "AceiteTipo" USING ("tipo"::text::"AceiteTipo")';

      -- No default expected here, but keep the step for safety
      -- EXECUTE 'ALTER TABLE "ModeloTermoAceite" ALTER COLUMN "tipo" SET DEFAULT ''MATRICULA''';
    END IF;
  END IF;
END$$;

COMMIT;
