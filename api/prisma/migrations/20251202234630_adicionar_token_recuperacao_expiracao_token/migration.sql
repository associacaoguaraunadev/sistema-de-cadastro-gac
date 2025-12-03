/*
  Warnings:

  - You are about to drop the column `dataBeneficio` on the `Pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `tipoBeneficio` on the `Pessoa` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Pessoa" DROP COLUMN "dataBeneficio",
DROP COLUMN "tipoBeneficio",
ADD COLUMN     "beneficiosGAC" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "beneficiosGoverno" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "comunidade" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "expiracaoToken" TIMESTAMP(3),
ADD COLUMN     "tokenRecuperacao" TEXT;

-- CreateIndex
CREATE INDEX "InviteToken_token_idx" ON "InviteToken"("token");

-- CreateIndex
CREATE INDEX "Pessoa_comunidade_idx" ON "Pessoa"("comunidade");
