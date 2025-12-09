-- CreateEnum
CREATE TYPE "TipoMatricula" AS ENUM ('MATRICULA', 'REMATRICULA');

-- CreateEnum
CREATE TYPE "StatusMatricula" AS ENUM ('PENDENTE', 'ATIVA', 'DESISTENTE', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "TipoTermo" AS ENUM ('VIAGEM', 'APRESENTACAO', 'COMPETICAO', 'FILMAGEM', 'PASSEIO', 'WORKSHOP', 'OUTRO');

-- AlterTable
ALTER TABLE "Pessoa" ADD COLUMN     "celular" TEXT,
ADD COLUMN     "cor" TEXT,
ADD COLUMN     "nis" TEXT,
ADD COLUMN     "rg" TEXT,
ADD COLUMN     "telefoneRecado" TEXT;

-- CreateTable
CREATE TABLE "AlunoGuarauna" (
    "id" TEXT NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "ubs" TEXT,
    "numeroSUS" TEXT,
    "doencas" TEXT,
    "alergias" TEXT,
    "medicamentos" TEXT,
    "necessidadesEspeciais" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlunoGuarauna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponsavelLegal" (
    "id" TEXT NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "profissao" TEXT,
    "localTrabalho" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponsavelLegal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlunoResponsavel" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "parentesco" TEXT NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlunoResponsavel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Professor" (
    "id" TEXT NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "apelido" TEXT,
    "especialidade" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Professor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessorComunidade" (
    "id" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "comunidade" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFim" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProfessorComunidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermoProfessor" (
    "id" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "tipoTermo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "aceito" BOOLEAN NOT NULL DEFAULT true,
    "dispositivoInfo" TEXT,
    "ipAddress" TEXT,
    "hashVerificacao" TEXT NOT NULL,
    "aceitoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TermoProfessor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turma" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "comunidade" TEXT NOT NULL,
    "professorId" TEXT,
    "diaSemana" TEXT,
    "horarioInicio" TEXT,
    "horarioFim" TEXT,
    "faixaEtariaMin" INTEGER,
    "faixaEtariaMax" INTEGER,
    "capacidade" INTEGER,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Turma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlunoTurma" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataSaida" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AlunoTurma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matricula" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "tipo" "TipoMatricula" NOT NULL,
    "tamanhoCamiseta" TEXT,
    "tamanhoBermuda" TEXT,
    "tamanhoCalcado" TEXT,
    "composicaoFamiliar" JSONB,
    "status" "StatusMatricula" NOT NULL DEFAULT 'PENDENTE',
    "motivoDesistencia" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Matricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AceiteDigital" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "matriculaId" TEXT NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "termoLGPD" BOOLEAN NOT NULL DEFAULT false,
    "termoResponsabilidade" BOOLEAN NOT NULL DEFAULT false,
    "termoImagem" BOOLEAN NOT NULL DEFAULT false,
    "dispositivoInfo" TEXT,
    "ipAddress" TEXT,
    "hashVerificacao" TEXT NOT NULL,
    "aceitoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AceiteDigital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeloTermo" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" "TipoTermo" NOT NULL,
    "conteudoHTML" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoPorId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeloTermo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoTermo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "modeloTermoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "dataEvento" TIMESTAMP(3) NOT NULL,
    "localEvento" TEXT,
    "dataLimiteAceite" TIMESTAMP(3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoPorId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoTermo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AceiteEventoTermo" (
    "id" TEXT NOT NULL,
    "eventoTermoId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "dispositivoInfo" TEXT,
    "ipAddress" TEXT,
    "hashVerificacao" TEXT NOT NULL,
    "aceitoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AceiteEventoTermo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlunoGuarauna_pessoaId_key" ON "AlunoGuarauna"("pessoaId");

-- CreateIndex
CREATE INDEX "AlunoGuarauna_pessoaId_idx" ON "AlunoGuarauna"("pessoaId");

-- CreateIndex
CREATE UNIQUE INDEX "ResponsavelLegal_pessoaId_key" ON "ResponsavelLegal"("pessoaId");

-- CreateIndex
CREATE INDEX "ResponsavelLegal_pessoaId_idx" ON "ResponsavelLegal"("pessoaId");

-- CreateIndex
CREATE INDEX "AlunoResponsavel_alunoId_idx" ON "AlunoResponsavel"("alunoId");

-- CreateIndex
CREATE INDEX "AlunoResponsavel_responsavelId_idx" ON "AlunoResponsavel"("responsavelId");

-- CreateIndex
CREATE UNIQUE INDEX "AlunoResponsavel_alunoId_responsavelId_key" ON "AlunoResponsavel"("alunoId", "responsavelId");

-- CreateIndex
CREATE UNIQUE INDEX "Professor_pessoaId_key" ON "Professor"("pessoaId");

-- CreateIndex
CREATE INDEX "Professor_pessoaId_idx" ON "Professor"("pessoaId");

-- CreateIndex
CREATE INDEX "ProfessorComunidade_professorId_idx" ON "ProfessorComunidade"("professorId");

-- CreateIndex
CREATE INDEX "ProfessorComunidade_comunidade_idx" ON "ProfessorComunidade"("comunidade");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessorComunidade_professorId_comunidade_key" ON "ProfessorComunidade"("professorId", "comunidade");

-- CreateIndex
CREATE UNIQUE INDEX "TermoProfessor_hashVerificacao_key" ON "TermoProfessor"("hashVerificacao");

-- CreateIndex
CREATE INDEX "TermoProfessor_professorId_idx" ON "TermoProfessor"("professorId");

-- CreateIndex
CREATE INDEX "Turma_comunidade_idx" ON "Turma"("comunidade");

-- CreateIndex
CREATE INDEX "Turma_professorId_idx" ON "Turma"("professorId");

-- CreateIndex
CREATE INDEX "AlunoTurma_alunoId_idx" ON "AlunoTurma"("alunoId");

-- CreateIndex
CREATE INDEX "AlunoTurma_turmaId_idx" ON "AlunoTurma"("turmaId");

-- CreateIndex
CREATE UNIQUE INDEX "AlunoTurma_alunoId_turmaId_key" ON "AlunoTurma"("alunoId", "turmaId");

-- CreateIndex
CREATE INDEX "Matricula_alunoId_idx" ON "Matricula"("alunoId");

-- CreateIndex
CREATE INDEX "Matricula_ano_idx" ON "Matricula"("ano");

-- CreateIndex
CREATE INDEX "Matricula_status_idx" ON "Matricula"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Matricula_alunoId_ano_key" ON "Matricula"("alunoId", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "AceiteDigital_codigo_key" ON "AceiteDigital"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "AceiteDigital_hashVerificacao_key" ON "AceiteDigital"("hashVerificacao");

-- CreateIndex
CREATE INDEX "AceiteDigital_matriculaId_idx" ON "AceiteDigital"("matriculaId");

-- CreateIndex
CREATE INDEX "AceiteDigital_responsavelId_idx" ON "AceiteDigital"("responsavelId");

-- CreateIndex
CREATE INDEX "AceiteDigital_codigo_idx" ON "AceiteDigital"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "AceiteDigital_matriculaId_responsavelId_key" ON "AceiteDigital"("matriculaId", "responsavelId");

-- CreateIndex
CREATE INDEX "ModeloTermo_tipo_idx" ON "ModeloTermo"("tipo");

-- CreateIndex
CREATE INDEX "ModeloTermo_ativo_idx" ON "ModeloTermo"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "EventoTermo_codigo_key" ON "EventoTermo"("codigo");

-- CreateIndex
CREATE INDEX "EventoTermo_codigo_idx" ON "EventoTermo"("codigo");

-- CreateIndex
CREATE INDEX "EventoTermo_dataEvento_idx" ON "EventoTermo"("dataEvento");

-- CreateIndex
CREATE INDEX "EventoTermo_ativo_idx" ON "EventoTermo"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "AceiteEventoTermo_hashVerificacao_key" ON "AceiteEventoTermo"("hashVerificacao");

-- CreateIndex
CREATE INDEX "AceiteEventoTermo_eventoTermoId_idx" ON "AceiteEventoTermo"("eventoTermoId");

-- CreateIndex
CREATE INDEX "AceiteEventoTermo_alunoId_idx" ON "AceiteEventoTermo"("alunoId");

-- CreateIndex
CREATE INDEX "AceiteEventoTermo_responsavelId_idx" ON "AceiteEventoTermo"("responsavelId");

-- CreateIndex
CREATE UNIQUE INDEX "AceiteEventoTermo_eventoTermoId_alunoId_key" ON "AceiteEventoTermo"("eventoTermoId", "alunoId");

-- AddForeignKey
ALTER TABLE "AlunoGuarauna" ADD CONSTRAINT "AlunoGuarauna_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponsavelLegal" ADD CONSTRAINT "ResponsavelLegal_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlunoResponsavel" ADD CONSTRAINT "AlunoResponsavel_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "AlunoGuarauna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlunoResponsavel" ADD CONSTRAINT "AlunoResponsavel_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "ResponsavelLegal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Professor" ADD CONSTRAINT "Professor_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessorComunidade" ADD CONSTRAINT "ProfessorComunidade_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermoProfessor" ADD CONSTRAINT "TermoProfessor_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlunoTurma" ADD CONSTRAINT "AlunoTurma_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "AlunoGuarauna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlunoTurma" ADD CONSTRAINT "AlunoTurma_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "AlunoGuarauna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AceiteDigital" ADD CONSTRAINT "AceiteDigital_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AceiteDigital" ADD CONSTRAINT "AceiteDigital_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "ResponsavelLegal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeloTermo" ADD CONSTRAINT "ModeloTermo_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoTermo" ADD CONSTRAINT "EventoTermo_modeloTermoId_fkey" FOREIGN KEY ("modeloTermoId") REFERENCES "ModeloTermo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoTermo" ADD CONSTRAINT "EventoTermo_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AceiteEventoTermo" ADD CONSTRAINT "AceiteEventoTermo_eventoTermoId_fkey" FOREIGN KEY ("eventoTermoId") REFERENCES "EventoTermo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AceiteEventoTermo" ADD CONSTRAINT "AceiteEventoTermo_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "AlunoGuarauna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AceiteEventoTermo" ADD CONSTRAINT "AceiteEventoTermo_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "ResponsavelLegal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
