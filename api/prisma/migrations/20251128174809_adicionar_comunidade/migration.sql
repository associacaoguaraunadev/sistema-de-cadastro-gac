-- CreateTable
CREATE TABLE "Comunidade" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'Building2',
    "cor" TEXT NOT NULL DEFAULT '#16a34a',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "usuarioId" INTEGER NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comunidade_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Pessoa" ADD COLUMN "comunidadeId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Comunidade_nome_usuarioId_key" ON "Comunidade"("nome", "usuarioId");

-- CreateIndex
CREATE INDEX "Comunidade_usuarioId_idx" ON "Comunidade"("usuarioId");

-- CreateIndex
CREATE INDEX "Pessoa_comunidadeId_idx" ON "Pessoa"("comunidadeId");

-- AddForeignKey
ALTER TABLE "Comunidade" ADD CONSTRAINT "Comunidade_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pessoa" ADD CONSTRAINT "Pessoa_comunidadeId_fkey" FOREIGN KEY ("comunidadeId") REFERENCES "Comunidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
