import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const sql = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aceitetipo') THEN
    CREATE TYPE "AceiteTipo" AS ENUM ('MATRICULA','REMATRICULA','LGPD','RESPONSABILIDADE','QUESTIONARIO_SAUDE');
  END IF;
END$$;`;
async function main(){ await prisma.$executeRawUnsafe(sql); console.log('Enum AceiteTipo criado (ou já existia).'); await prisma.$disconnect(); }
main().catch(e=>{ console.error(e); process.exit(1); });
