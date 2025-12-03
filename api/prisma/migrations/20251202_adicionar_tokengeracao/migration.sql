-- CreateTable
CREATE TABLE "TokenGeracao" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataExpiracao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenGeracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenGeracao_token_key" ON "TokenGeracao"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TokenGeracao_email_key" ON "TokenGeracao"("email");

-- CreateIndex
CREATE INDEX "TokenGeracao_email_idx" ON "TokenGeracao"("email");

-- CreateIndex
CREATE INDEX "TokenGeracao_token_idx" ON "TokenGeracao"("token");
