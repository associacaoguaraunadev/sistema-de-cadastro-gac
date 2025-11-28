import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: './backend/.env' });

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Iniciando seed...\n');

    // Criar ou obter usuário de teste
    let usuario = await prisma.usuario.findUnique({
      where: { email: 'admin@gac.com' }
    });

    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: {
          email: 'admin@gac.com',
          senha: await bcrypt.hash('Admin@2025', 10),
          nome: 'Admin GAC',
          funcao: 'admin'
        }
      });
      console.log('✅ Usuário ADMIN criado');
      console.log(`   Email: admin@gac.com`);
      console.log(`   Senha: Admin@2025\n`);
    } else {
      console.log('✅ Usuário ADMIN já existe\n');
    }

    // Criar segundo usuário funcionário
    let funcionario = await prisma.usuario.findUnique({
      where: { email: 'funcionario@gac.com' }
    });

    if (!funcionario) {
      funcionario = await prisma.usuario.create({
        data: {
          email: 'funcionario@gac.com',
          senha: await bcrypt.hash('Func@2025', 10),
          nome: 'João Funcionário',
          funcao: 'funcionario'
        }
      });
      console.log('✅ Usuário FUNCIONÁRIO criado');
      console.log(`   Email: funcionario@gac.com`);
      console.log(`   Senha: Func@2025\n`);
    } else {
      console.log('✅ Usuário FUNCIONÁRIO já existe\n');
    }

    // Verificar e deletar pessoas antigas do admin
    const pessoasAntiguasAdmin = await prisma.pessoa.findMany({
      where: { usuarioId: usuario.id }
    });

    if (pessoasAntiguasAdmin.length > 0) {
      await prisma.pessoa.deleteMany({
        where: { usuarioId: usuario.id }
      });
      console.log(`🗑️  ${pessoasAntiguasAdmin.length} pessoas antigas do admin removidas\n`);
    }

    // Dados de teste com idades variadas para testar segmentação
    const pessoasData = [
      // CRIANÇAS (0-17 anos)
      {
        nome: 'Gabriel Lima',
        cpf: '03055740013',
        email: 'gabriel@gac.com',
        telefone: '(11) 98765-4321',
        endereco: 'Rua Jamel Galindo, 100',
        bairro: 'Interlagos',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '03875-550',
        idade: 8,
        tipoBeneficio: 'Cesta Básica',
        observacoes: 'Criança em situação de vulnerabilidade',
        usuarioId: usuario.id
      },
      {
        nome: 'Mauricio Lima',
        cpf: '97070583412',
        email: 'mauricio@gac.com',
        telefone: '(88) 22985-9598',
        endereco: 'Rua Monteiro Lobato, 40',
        bairro: 'Centro',
        cidade: 'Fortaleza',
        estado: 'CE',
        cep: '04815-200',
        idade: 15,
        tipoBeneficio: 'Auxílio Alimentação',
        observacoes: 'Adolescente - bolsa educação',
        usuarioId: usuario.id
      },
      {
        nome: 'Beatriz Silva',
        cpf: '12345678901',
        email: 'beatriz@gac.com',
        telefone: '(11) 99876-5432',
        endereco: 'Avenida Brasil, 250',
        bairro: 'Vila Mariana',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '04101-010',
        idade: 12,
        tipoBeneficio: 'Cesta Básica',
        observacoes: 'Inscrita em programa de assistência social',
        usuarioId: usuario.id
      },

      // ADULTOS (18-59 anos)
      {
        nome: 'João da Silva',
        cpf: '98765432100',
        email: 'joao@gac.com',
        telefone: '(11) 98888-1111',
        endereco: 'Rua das Flores, 123',
        bairro: 'Pinheiros',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '05422-010',
        idade: 32,
        tipoBeneficio: 'Auxílio Alimentação',
        observacoes: 'Desempregado, busca oportunidade',
        usuarioId: usuario.id
      },
      {
        nome: 'Maria Santos',
        cpf: '55544433322',
        email: 'maria@gac.com',
        telefone: '(21) 97777-2222',
        endereco: 'Avenida Principal, 456',
        bairro: 'Copacabana',
        cidade: 'Rio de Janeiro',
        estado: 'RJ',
        cep: '20060-010',
        idade: 45,
        tipoBeneficio: 'Auxílio Financeiro',
        observacoes: 'Mãe de 2 filhos, salário mínimo',
        usuarioId: usuario.id
      },
      {
        nome: 'Carlos Alberto',
        cpf: '11122233344',
        email: 'carlos@gac.com',
        telefone: '(31) 98765-4321',
        endereco: 'Rua Getúlio Vargas, 789',
        bairro: 'Funcionários',
        cidade: 'Belo Horizonte',
        estado: 'MG',
        cep: '30150-250',
        idade: 38,
        tipoBeneficio: 'Bolsa Cultura',
        observacoes: 'Artista - projeto cultural GAC',
        usuarioId: usuario.id
      },
      {
        nome: 'Ana Paula',
        cpf: '77788899900',
        email: 'ana@gac.com',
        telefone: '(85) 98777-6666',
        endereco: 'Avenida José Bastos, 654',
        bairro: 'Aldeota',
        cidade: 'Fortaleza',
        estado: 'CE',
        cep: '60110-160',
        idade: 28,
        tipoBeneficio: 'Cesta Básica',
        observacoes: 'Mãe solo, renda baixa',
        usuarioId: usuario.id
      },

      // IDOSOS (60+)
      {
        nome: 'José da Silva',
        cpf: '66655544433',
        email: 'jose@gac.com',
        telefone: '(11) 98765-0000',
        endereco: 'Rua da Paz, 999',
        bairro: 'Vila Santa Rita',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '04157-170',
        idade: 72,
        tipoBeneficio: 'Cesta Básica',
        observacoes: 'Aposentado, vive com neta',
        usuarioId: usuario.id
      },
      {
        nome: 'Rosa Maria',
        cpf: '44433322211',
        email: 'rosa@gac.com',
        telefone: '(21) 99999-1111',
        endereco: 'Avenida Central, 321',
        bairro: 'Madureira',
        cidade: 'Rio de Janeiro',
        estado: 'RJ',
        cep: '20760-040',
        idade: 68,
        tipoBeneficio: 'Auxílio Financeiro',
        observacoes: 'Viúva, recebe ajuda familiar',
        usuarioId: usuario.id
      },
      {
        nome: 'Francisco Oliveira',
        cpf: '33322211100',
        email: 'francisco@gac.com',
        telefone: '(31) 98888-2222',
        endereco: 'Rua Oswaldo Cruz, 111',
        bairro: 'Centro-Sul',
        cidade: 'Belo Horizonte',
        estado: 'MG',
        cep: '30130-100',
        idade: 80,
        tipoBeneficio: 'Cesta Básica',
        observacoes: 'Idoso, sem renda própria',
        usuarioId: usuario.id
      },
      {
        nome: 'Francisca Pereira',
        cpf: '22211100099',
        email: 'francisca@gac.com',
        telefone: '(85) 99888-3333',
        endereco: 'Rua Demócrito Rocha, 555',
        bairro: 'José de Alencar',
        cidade: 'Fortaleza',
        estado: 'CE',
        cep: '60135-290',
        idade: 75,
        tipoBeneficio: 'Auxílio Alimentação',
        observacoes: 'Idosa, cliente de longa data',
        usuarioId: usuario.id
      }
    ];

    // Criar pessoas
    const pessoas = await prisma.pessoa.createMany({
      data: pessoasData
    });

    console.log(`✅ ${pessoas.count} pessoas de teste criadas!\n`);

    // Estatísticas
    const criancas = pessoasData.filter(p => p.idade < 18).length;
    const adultos = pessoasData.filter(p => p.idade >= 18 && p.idade < 60).length;
    const idosos = pessoasData.filter(p => p.idade >= 60).length;

    console.log('📊 DISTRIBUIÇÃO POR FAIXA ETÁRIA:');
    console.log(`   👶 Crianças (0-17): ${criancas}`);
    console.log(`   👨 Adultos (18-59): ${adultos}`);
    console.log(`   👴 Idosos (60+): ${idosos}\n`);

    // Benefícios
    const beneficiosCount = await prisma.pessoa.groupBy({
      by: ['tipoBeneficio'],
      where: { usuarioId: usuario.id },
      _count: true
    });

    console.log('🎁 DISTRIBUIÇÃO POR BENEFÍCIO:');
    beneficiosCount.forEach(b => {
      console.log(`   • ${b.tipoBeneficio}: ${b._count}`);
    });

    console.log('\n✨ SEED CONCLUÍDO COM SUCESSO!\n');

    console.log('🔐 CREDENCIAIS DE TESTE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 ADMIN:');
    console.log('   Email: admin@gac.com');
    console.log('   Senha: Admin@2025');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 FUNCIONÁRIO:');
    console.log('   Email: funcionario@gac.com');
    console.log('   Senha: Func@2025');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (erro) {
    console.error('❌ Erro no seed:', erro);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
