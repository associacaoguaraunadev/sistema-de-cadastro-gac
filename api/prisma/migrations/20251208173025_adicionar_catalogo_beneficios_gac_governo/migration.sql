-- CreateTable
CREATE TABLE "BeneficioGAC" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BeneficioGAC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeneficioGoverno" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BeneficioGoverno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BeneficioGAC_tipo_key" ON "BeneficioGAC"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "BeneficioGoverno_nome_key" ON "BeneficioGoverno"("nome");
