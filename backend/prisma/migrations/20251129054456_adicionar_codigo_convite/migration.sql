-- CreateTable
CREATE TABLE "CodigoConvite" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "usadoPorId" INTEGER,
    "usadoEm" TIMESTAMP(3),
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataExpiracao" TIMESTAMP(3),

    CONSTRAINT "CodigoConvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodigoConvite_codigo_key" ON "CodigoConvite"("codigo");

-- CreateIndex
CREATE INDEX "CodigoConvite_codigo_idx" ON "CodigoConvite"("codigo");
