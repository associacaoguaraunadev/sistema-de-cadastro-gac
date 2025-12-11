-- Add-only migration: add dataMatricula to Matricula
ALTER TABLE "Matricula" ADD COLUMN IF NOT EXISTS "dataMatricula" timestamp with time zone;
