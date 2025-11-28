/*
  Warnings:

  - You are about to drop the column `comunidadeId` on the `Pessoa` table. All the data in the column will be lost.
  - You are about to drop the `Comunidade` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Comunidade" DROP CONSTRAINT "Comunidade_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Pessoa" DROP CONSTRAINT "Pessoa_comunidadeId_fkey";

-- DropIndex
DROP INDEX "Pessoa_comunidadeId_idx";

-- AlterTable
ALTER TABLE "Pessoa" DROP COLUMN "comunidadeId",
ADD COLUMN     "comunidade" TEXT;

-- DropTable
DROP TABLE "Comunidade";

-- CreateIndex
CREATE INDEX "Pessoa_comunidade_idx" ON "Pessoa"("comunidade");
