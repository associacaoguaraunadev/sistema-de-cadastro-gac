import axios from 'axios';

// Usage:
// TEST_BASE_URL=http://localhost:3001/api TEST_USER_EMAIL=admin@example.com TEST_USER_SENHA=senha node api/scripts/test-matriculas.js

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001/api';
const EMAIL = process.env.TEST_USER_EMAIL;
const SENHA = process.env.TEST_USER_SENHA;
const TOKEN = process.env.TEST_TOKEN;
const TEST_ANO = process.env.TEST_ANO ? Number(process.env.TEST_ANO) : null;

const log = (...args) => console.log('[TEST]', ...args);

async function obterToken() {
  if (TOKEN) return TOKEN;
  if (!EMAIL || !SENHA) {
    log('Nenhum token ou credenciais fornecidas. Exporte TEST_TOKEN ou TEST_USER_EMAIL & TEST_USER_SENHA');
    return null;
  }
  try {
    const res = await axios.post(`${BASE_URL}/autenticacao/entrar`, { email: EMAIL, senha: SENHA });
    return res.data.token;
  } catch (err) {
    log('Erro ao autenticar:', err.response?.data || err.message);
    return null;
  }
}

async function run() {
  const token = await obterToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    log('Listando matrículas existentes...');
    const list = await axios.get(`${BASE_URL}/guarauna/matriculas`, { headers });
    log('Matriculas listadas:', (list.data.matriculas || []).length);

    log('Buscando alunos para criar matrícula...');
    const alunosRes = await axios.get(`${BASE_URL}/guarauna/alunos?limite=10&incluirPessoa=true`, { headers });
    const alunos = alunosRes.data.alunos || alunosRes.data || [];
    if (!alunos.length) {
      log('Nenhum aluno encontrado para testar. Pare o script e crie um aluno antes de rodar o teste.');
      return;
    }

    const aluno = alunos[0];
    log('Usando aluno:', aluno.id, aluno.pessoa?.nome || aluno.nome);

    // Criar matrícula de teste
    const payload = {
      alunoId: aluno.id,
      ano: TEST_ANO || new Date().getFullYear(),
      tipo: 'MATRICULA',
      nomeEscola: 'Escola Teste',
      horarioEstudo: 'Manhã',
      horaEntrada: '07:30',
      horaSaida: '12:00'
    };

    log('Criando matrícula de teste...');
    const criar = await axios.post(`${BASE_URL}/guarauna/matriculas`, payload, { headers });
    log('Criado com status:', criar.status);
    const matricula = criar.data;
    log('Matrícula criada id:', matricula.id);

    // Obter criada
    log('Obtendo matrícula criada...');
    const obter = await axios.get(`${BASE_URL}/guarauna/matriculas/${matricula.id}`, { headers });
    log('Obtido:', obter.data.id);

    // Atualizar
    log('Atualizando matrícula (nomeEscola)...');
    const atualizar = await axios.put(`${BASE_URL}/guarauna/matriculas/${matricula.id}`, { nomeEscola: 'Escola Alterada' }, { headers });
    log('Atualizado, nomeEscola agora:', atualizar.data.nomeEscola);

    // Excluir
    log('Excluindo matrícula de teste...');
    const excl = await axios.delete(`${BASE_URL}/guarauna/matriculas/${matricula.id}`, { headers });
    log('Delete status:', excl.status);

    log('Teste completo com sucesso.');
  } catch (err) {
    log('Erro durante o teste:', err.response?.data || err.message);
  }
}

run();
