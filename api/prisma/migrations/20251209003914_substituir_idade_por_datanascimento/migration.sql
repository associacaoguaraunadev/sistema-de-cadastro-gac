/*
  Warnings:

  - You are about to drop the column `idade` on the `Pessoa` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Pessoa" DROP COLUMN "idade",
ADD COLUMN     "dataNascimento" TIMESTAMP(3);
