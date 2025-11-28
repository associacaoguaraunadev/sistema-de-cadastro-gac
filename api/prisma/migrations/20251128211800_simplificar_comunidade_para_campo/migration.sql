-- DropForeignKey
ALTER TABLE "Pessoa" DROP CONSTRAINT "Pessoa_comunidadeId_fkey";

-- DropForeignKey
ALTER TABLE "Comunidade" DROP CONSTRAINT "Comunidade_usuarioId_fkey";

-- DropIndex
DROP INDEX "Comunidade_usuarioId_idx";

-- DropIndex
DROP INDEX "Pessoa_comunidadeId_idx";

-- DropTable
DROP TABLE "Comunidade";

-- AlterTable
ALTER TABLE "Pessoa" DROP COLUMN "comunidadeId",
ADD COLUMN "comunidade" TEXT;

-- CreateIndex
CREATE INDEX "Pessoa_comunidade_idx" ON "Pessoa"("comunidade");
