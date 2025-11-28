import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  try {
    // Criar ou obter usuário de teste
    let usuario = await prisma.usuario.findUnique({
      where: { email: 'admin@test.com' }
    });

    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: {
          email: 'admin@test.com',
          senha: await bcrypt.hash('Senha@123', 10),
          nome: 'Admin Teste',
          funcao: 'gerente'
        }
      });
      console.log('✅ Usuário criado:', usuario.email);
    } else {
      console.log('✅ Usuário existente:', usuario.email);
    }

    // Limpar pessoas anteriores para teste limpo
    await prisma.pessoa.deleteMany({});
    console.log('🗑️  Banco limpo');

    // Criar pessoas com idades diferentes
    const pessoasData = [
      {
        nome: 'Gabriel Lima',
        cpf: '03055740013',
        email: 'gabriel@test.com',
        telefone: '(11) 98765-4321',
        endereco: 'Rua Jamel galindo',
        bairro: 'Interlagos',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '03875-550',
        idade: 8,
        tipoBeneficio: 'Cesta Básica',
        usuarioId: usuario.id
      },
      {
        nome: 'Mauricio Lima',
        cpf: '97070583412',
        email: 'mauricio@test.com',
        telefone: '(88) 22985-9598',
        endereco: 'Rua Moteiro Lobato, 40',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '04815-200',
        idade: 15,
        tipoBeneficio: 'Cesta Básica',
        usuarioId: usuario.id
      },
      {
        nome: 'João Silva',
        cpf: '12345678901',
        endereco: 'Rua das Flores, 123',
        idade: 32,
        tipoBeneficio: 'Auxílio Alimentação',
        usuarioId: usuario.id
      },
      {
        nome: 'Maria Santos',
        cpf: '98765432100',
        endereco: 'Avenida Principal, 456',
        idade: 45,
        tipoBeneficio: 'Auxílio Financeiro',
        usuarioId: usuario.id
      },
      {
        nome: 'José da Silva',
        cpf: '55544433322',
        endereco: 'Rua da Paz, 789',
        idade: 72,
        tipoBeneficio: 'Cesta Básica',
        usuarioId: usuario.id
      },
      {
        nome: 'Rosa Maria',
        cpf: '11122233344',
        endereco: 'Avenida Central, 999',
        idade: 68,
        tipoBeneficio: 'Auxílio Financeiro',
        usuarioId: usuario.id
      }
    ];

    const pessoas = await prisma.pessoa.createMany({
      data: pessoasData
    });

    console.log(`✅ ${pessoas.count} pessoas criadas com idades variadas!`);
    console.log('\n📊 Distribuição por faixa etária:');
    console.log('👶 Crianças (0-17): 2 pessoas');
    console.log('👤 Adultos (18-59): 2 pessoas');
    console.log('❤️ Idosos (60+): 2 pessoas');

  } catch (erro) {
    console.error('❌ Erro:', erro.message);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
