BEGIN;

-- Create enum type AceiteTipo if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AceiteTipo') THEN
    CREATE TYPE "AceiteTipo" AS ENUM ('MATRICULA','REMATRICULA','LGPD','RESPONSABILIDADE','QUESTIONARIO_SAUDE');
  END IF;
END$$;

-- If the column exists and is not already of type AceiteTipo, alter it safely
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AceiteDigital' AND column_name='tipo') THEN
    -- Only alter if the current data type is not the enum
    IF NOT EXISTS (
      SELECT 1 FROM pg_type t JOIN pg_attribute a ON a.atttypid = t.oid
      JOIN pg_class c ON a.attrelid = c.oid
      WHERE c.relname = 'AceiteDigital' AND a.attname = 'tipo' AND t.typname = 'AceiteTipo'
    ) THEN
      -- Try to alter using safe cast via USING clause (text -> enum)
      EXECUTE 'ALTER TABLE "AceiteDigital" ALTER COLUMN "tipo" TYPE "AceiteTipo" USING ("tipo"::text::"AceiteTipo")';
    END IF;
  END IF;
END$$;

COMMIT;
