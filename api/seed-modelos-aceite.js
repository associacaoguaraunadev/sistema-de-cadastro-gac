import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const modelos = [
  {
    tipo: 'MATRICULA',
    titulo: 'Termo de Matrícula - Associação GAC',
    conteudoHTML: `
      <h2>Termo de Matrícula</h2>
      <p>Eu, <strong>{{nomeResponsavel}}</strong>, responsável pelo(a) aluno(a) <strong>{{nomeAluno}}</strong>, matrícula nº <strong>{{matriculaId}}</strong> (ano {{ano}}), declaro que autorizo a participação do menor nas atividades da Associação Guaraúna de Arte e Cultura (GAC).</p>
      <p>Declaro que as informações prestadas na ficha de matrícula estão corretas e me responsabilizo pela veracidade dos dados.</p>
      <p>Autorizo o uso de imagem para divulgação institucional, sem ônus, conforme regulamento da instituição.</p>
      <p>Local: <strong>{{cidade}}</strong> — Data: <strong>{{data}}</strong></p>
      <p>Assinatura do responsável: ________________________________</p>
    `
  },
  {
    tipo: 'LGPD',
    titulo: 'Termo de Consentimento LGPD - Associação GAC',
    conteudoHTML: `
      <h2>Termo de Consentimento para Tratamento de Dados Pessoais (LGPD)</h2>
      <p>Titular: <strong>{{nomeAluno}}</strong></p>
      <p>Ao assinar este termo, o Titular ou seu representante legal consente com o tratamento dos seus dados pessoais pela <strong>Associação Guaraúna de Arte e Cultura - GAC</strong>, CNPJ: 26.674.554/0001-68, para as finalidades relacionadas às atividades e à gestão do projeto socioeducativo.</p>
      <h3>Dados autorizados</h3>
      <ul>
        <li>Nome completo</li>
        <li>Data de nascimento</li>
        <li>RG, CPF e CNH (quando exigido)</li>
        <li>Endereço, telefone, e-mail e contatos</li>
      </ul>
      <h3>Finalidade</h3>
      <p>Contato, comunicação sobre atividades, encaminhamento a parceiros e execução de rotina administrativa do projeto.</p>
      <p>Declaro que fui informado(a) sobre meus direitos e que posso revogar este consentimento a qualquer tempo, observadas as bases legais que permitem a conservação de dados para fins legais.</p>
      <p>Local: <strong>{{cidade}}</strong> — Data: <strong>{{data}}</strong></p>
      <p>Assinatura do titular/responsável: ________________________________</p>
    `
  },
  {
    tipo: 'QUESTIONARIO_SAUDE',
    titulo: 'Questionário de Saúde - Associação GAC',
    conteudoHTML: `
      <h2>Questionário de Saúde</h2>
      <p><strong>Unidade Básica de Saúde – UBS de Referência:</strong> ____________________________</p>
      <p><strong>Tem ou já teve alguma doença respiratória (asma/bronquite)?</strong> ____________________________</p>
      <p><strong>Faz algum tratamento de saúde atual? Qual?</strong> ____________________________</p>
      <p><strong>Tem alergia a medicamentos? Qual?</strong> ____________________________</p>
      <p><strong>Toma algum medicamento regularmente?</strong> ____________________________</p>
      <p><strong>Número SUS:</strong> ____________________________</p>
      <p><strong>O aluno necessita de alguma atenção especial?</strong> (HIPERATIVIDADE, AUTISMO, TRANSTORNO, ETC): ____________________________</p>
      <p><strong>Observações adicionais:</strong></p>
      <p>______________________________________________________________________________________</p>
      <p>______________________________________________________________________________________</p>
      <p>Autorizo que o menor citado participe das atividades da Associação Guaraúna de Arte e Cultura (GAC).</p>
      <p>Local: <strong>{{cidade}}</strong> — Data: <strong>{{data}}</strong></p>
      <p>Assinatura do responsável: ________________________________</p>
    `
  }
];

async function main() {
  try {
    for (const m of modelos) {
      const existente = await prisma.modeloTermoAceite.findFirst({ where: { tipo: m.tipo } });
      if (existente) {
        await prisma.modeloTermoAceite.update({ where: { id: existente.id }, data: { titulo: m.titulo, conteudoHTML: m.conteudoHTML, ativo: true } });
        console.log(`Atualizado modelo: ${m.tipo}`);
      } else {
        await prisma.modeloTermoAceite.create({ data: { tipo: m.tipo, titulo: m.titulo, conteudoHTML: m.conteudoHTML, ativo: true, criadoPorId: null } });
        console.log(`Criado modelo: ${m.tipo}`);
      }
    }

    console.log('Seed de modelos de termo concluída.');
  } catch (err) {
    console.error('Erro no seed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
