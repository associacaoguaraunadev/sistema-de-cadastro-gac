import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Listas de nomes por gênero
const nomesFemininos = [
  'Maria', 'Ana', 'Patricia', 'Francisca', 'Benedita', 'Marisa', 'Claudia', 'Jacqueline',
  'Fernanda', 'Rosalina', 'Joana', 'Carla', 'Cristiane', 'Simone', 'Fabiana', 'Juliana',
  'Camila', 'Leticia', 'Gabriela', 'Amanda', 'Sofia', 'Isabella', 'Beatriz', 'Cecilia',
  'Denise', 'Elaine', 'Evelia', 'Fatima', 'Gisele', 'Heloisa', 'Irene', 'Joelma',
  'Katia', 'Leandra', 'Marilia', 'Natalia', 'Oliva', 'Priscila', 'Querida', 'Regina',
  'Susana', 'Tatiana', 'Ursula', 'Vanessa', 'Wanda', 'Yasmin', 'Zelia', 'Adriana',
  'Bruna', 'Clarissa', 'Diamara', 'Elisete', 'Fernanda', 'Gizele', 'Helia', 'Ieda'
];

const nomesMasculinos = [
  'Jose', 'João', 'Antonio', 'Francisco', 'Paulo', 'Pedro', 'Carlos', 'João',
  'Marcos', 'Orlando', 'Renato', 'Salvador', 'Tito', 'Ubiratan', 'Valter', 'Wagner',
  'Xavier', 'Yuri', 'Zacarias', 'Alessandro', 'Bruno', 'Cristovao', 'Danilo', 'Emilio',
  'Fabricio', 'Gilmar', 'Hector', 'Igor', 'Julio', 'Kleberson', 'Leonardo', 'Mauricio',
  'Nelson', 'Osmar', 'Placido', 'Quirino', 'Rodolfo', 'Sergio', 'Tarcisio', 'Ubaldo',
  'Vicente', 'Wagner', 'Xavier', 'Yuri', 'Zaluar', 'Anderson', 'Brenno', 'Cleiton'
];

const sobrenomes = [
  'Silva', 'Santos', 'Oliveira', 'Pereira', 'Costa', 'Sousa', 'Gomes', 'Alves',
  'Martins', 'Rodrigues', 'Fernandes', 'Lopez', 'Garcia', 'Martinez', 'Carvalho',
  'Dias', 'Ferreira', 'Ribeiro', 'Rocha', 'Monteiro', 'Nunes', 'Barbosa', 'Campos',
  'Lopes', 'Pinto', 'Vieira', 'Moreira', 'Cavalcanti', 'Teixeira', 'Leite', 'Nascimento',
  'Machado', 'Baptista', 'Aquino', 'Araujo', 'Assuncao', 'Barros', 'Benevides', 'Braga',
  'Buarque', 'Caldeira', 'Camargo', 'Cardoso', 'Carneiro', 'Caruso', 'Cascais', 'Castro'
];

const beneficios = [
  'Cesta Basica', 'Bolsa Familia', 'Auxilio Alimentacao', 'Vale Refeicao',
  'Auxilio Emergencial', 'Bolsa Escola', 'Programa Social', 'Auxilio Renda'
];

const comunidadesConfig = [
  { nome: 'Vila Cheba', descricao: 'Comunidade Vila Cheba', cor: '#16a34a', icon: 'Building2' },
  { nome: 'Morro da Vila', descricao: 'Comunidade Morro da Vila', cor: '#2563eb', icon: 'Building2' },
  { nome: 'Barragem', descricao: 'Comunidade Barragem', cor: '#dc2626', icon: 'Building2' },
  { nome: 'Parque Centenario', descricao: 'Comunidade Parque Centenario', cor: '#9333ea', icon: 'Building2' },
  { nome: 'Jardim Apura', descricao: 'Comunidade Jardim Apura', cor: '#f59e0b', icon: 'Building2' }
];

function normalizarNome(nome) {
  if (!nome || typeof nome !== 'string') return nome;
  return nome
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
    .join(' ');
}

function normalizarTexto(texto) {
  if (!texto || typeof texto !== 'string') return texto;
  return texto.trim().replace(/\s+/g, ' ');
}

function normalizarCPF(cpf) {
  if (!cpf) return cpf;
  return cpf.replace(/\D/g, '');
}

function gerarCPF() {
  let cpf = '';
  for (let i = 0; i < 11; i++) {
    cpf += Math.floor(Math.random() * 10);
  }
  return cpf;
}

function gerarTelefone() {
  const areaCode = String(Math.floor(Math.random() * 90) + 10);
  const part1 = String(Math.floor(Math.random() * 90000) + 10000);
  const part2 = String(Math.floor(Math.random() * 9000) + 1000);
  return `(${areaCode}) ${part1}-${part2}`;
}

function gerarEmail(nome) {
  const nomeClean = nome.toLowerCase().replace(/\s+/g, '');
  const dominios = ['test.com', 'email.com', 'mail.com', 'example.com'];
  const dominio = dominios[Math.floor(Math.random() * dominios.length)];
  return `${nomeClean}${Math.floor(Math.random() * 1000)}@${dominio}`;
}

function gerarEndereco() {
  const ruas = ['Rua das Flores', 'Avenida Principal', 'Rua do Comercio', 'Avenida Brasil', 'Rua Central', 'Rua do Bairro', 'Avenida Paulista', 'Rua Comercial'];
  const numero = Math.floor(Math.random() * 2000) + 1;
  return `${ruas[Math.floor(Math.random() * ruas.length)]}, ${numero}`;
}

async function seed() {
  try {
    console.log('🌱 Iniciando seed do banco de dados...\n');

    // Deletar dados existentes
    await prisma.pessoa.deleteMany({});
    await prisma.comunidade.deleteMany({});
    await prisma.usuario.deleteMany({});
    console.log('🗑️  Banco de dados limpo');

    // Criar usuário admin
    const senhaHash = await bcrypt.hash('admin123', 10);
    const usuario = await prisma.usuario.create({
      data: {
        email: 'admin@test.com',
        senha: senhaHash,
        nome: 'Admin Teste',
        funcao: 'admin'
      }
    });

    console.log('✅ Usuário criado: admin@test.com / admin123\n');

    // Criar comunidades
    const comunidades = await Promise.all(
      comunidadesConfig.map((config, index) =>
        prisma.comunidade.create({
          data: {
            nome: config.nome,
            descricao: config.descricao,
            cor: config.cor,
            icon: config.icon,
            orderIndex: index,
            usuarioId: usuario.id
          }
        })
      )
    );

    console.log(`✅ ${comunidades.length} comunidades criadas:`);
    comunidades.forEach(c => console.log(`   • ${c.nome}`));
    console.log('');

    // Criar 50 pessoas: 10 adultos, 35 crianças, 20 idosos
    const pessoas = [];

    // 10 Adultos (18-59 anos)
    console.log('👤 Criando 10 adultos...');
    for (let i = 0; i < 10; i++) {
      const genero = Math.random() > 0.5 ? 'feminino' : 'masculino';
      const nome = normalizarNome(
        `${genero === 'feminino' ? nomesFemininos[i] : nomesMasculinos[i]} ${sobrenomes[i]}`
      );
      const idade = Math.floor(Math.random() * 42) + 18; // 18-59
      const comunidade = comunidades[Math.floor(Math.random() * comunidades.length)];

      pessoas.push({
        nome,
        cpf: normalizarCPF(gerarCPF()),
        email: gerarEmail(nome),
        telefone: gerarTelefone(),
        endereco: normalizarNome(gerarEndereco()),
        bairro: 'Centro',
        cidade: 'Sao Paulo',
        estado: 'SP',
        cep: String(Math.floor(Math.random() * 90000000) + 1000000),
        idade,
        tipoBeneficio: beneficios[Math.floor(Math.random() * beneficios.length)],
        dataBeneficio: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        observacoes: 'Beneficiario adulto da comunidade',
        status: 'ativo',
        comunidadeId: comunidade.id,
        usuarioId: usuario.id
      });
    }

    // 35 Crianças (0-17 anos)
    console.log('👶 Criando 35 crianças/adolescentes...');
    for (let i = 0; i < 35; i++) {
      const genero = Math.random() > 0.5 ? 'feminino' : 'masculino';
      const nomeIndex = (i + 10) % Math.max(nomesFemininos.length, nomesMasculinos.length);
      const nomeArray = genero === 'feminino' ? nomesFemininos : nomesMasculinos;
      const nome = normalizarNome(
        `${nomeArray[nomeIndex % nomeArray.length]} ${sobrenomes[(i + 10) % sobrenomes.length]}`
      );
      const idade = Math.floor(Math.random() * 18); // 0-17
      const comunidade = comunidades[Math.floor(Math.random() * comunidades.length)];

      pessoas.push({
        nome,
        cpf: normalizarCPF(gerarCPF()),
        email: gerarEmail(nome),
        telefone: gerarTelefone(),
        endereco: normalizarNome(gerarEndereco()),
        bairro: 'Centro',
        cidade: 'Sao Paulo',
        estado: 'SP',
        cep: String(Math.floor(Math.random() * 90000000) + 1000000),
        idade,
        tipoBeneficio: beneficios[Math.floor(Math.random() * beneficios.length)],
        dataBeneficio: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        observacoes: 'Crianca/adolescente da comunidade',
        status: 'ativo',
        comunidadeId: comunidade.id,
        usuarioId: usuario.id
      });
    }

    // 20 Idosos (60+ anos)
    console.log('❤️  Criando 20 idosos...\n');
    for (let i = 0; i < 20; i++) {
      const genero = Math.random() > 0.5 ? 'feminino' : 'masculino';
      const nomeIndex = (i + 45) % Math.max(nomesFemininos.length, nomesMasculinos.length);
      const nomeArray = genero === 'feminino' ? nomesFemininos : nomesMasculinos;
      const nome = normalizarNome(
        `${nomeArray[nomeIndex % nomeArray.length]} ${sobrenomes[(i + 45) % sobrenomes.length]}`
      );
      const idade = Math.floor(Math.random() * 40) + 60; // 60-99
      const comunidade = comunidades[Math.floor(Math.random() * comunidades.length)];

      pessoas.push({
        nome,
        cpf: normalizarCPF(gerarCPF()),
        email: gerarEmail(nome),
        telefone: gerarTelefone(),
        endereco: normalizarNome(gerarEndereco()),
        bairro: 'Centro',
        cidade: 'Sao Paulo',
        estado: 'SP',
        cep: String(Math.floor(Math.random() * 90000000) + 1000000),
        idade,
        tipoBeneficio: beneficios[Math.floor(Math.random() * beneficios.length)],
        dataBeneficio: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        observacoes: 'Idoso da comunidade',
        status: 'ativo',
        comunidadeId: comunidade.id,
        usuarioId: usuario.id
      });
    }

    // Inserir todas as pessoas
    const pessoasCriadas = await prisma.pessoa.createMany({
      data: pessoas
    });

    console.log(`✅ ${pessoasCriadas.count} pessoas criadas:`);
    console.log(`   👤 10 Adultos`);
    console.log(`   👶 35 Crianças/Adolescentes`);
    console.log(`   ❤️  20 Idosos`);

    console.log('\n✨ Seed concluído com sucesso!');
    console.log('\n📊 Resumo Final:');
    console.log(`   ✓ 1 Usuário admin`);
    console.log(`   ✓ ${comunidades.length} Comunidades`);
    console.log(`   ✓ ${pessoasCriadas.count} Beneficiários`);

  } catch (erro) {
    console.error('❌ Erro ao executar seed:', erro);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
