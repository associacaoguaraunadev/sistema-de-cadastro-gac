-- CreateTable
CREATE TABLE "TokenGeracao" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "usadoPor" TEXT,
    "usadoEm" TIMESTAMP(3),
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataExpiracao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenGeracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenGeracao_token_key" ON "TokenGeracao"("token");

-- CreateIndex
CREATE INDEX "TokenGeracao_token_idx" ON "TokenGeracao"("token");

-- CreateIndex
CREATE INDEX "TokenGeracao_usuarioId_idx" ON "TokenGeracao"("usuarioId");
