import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const criarClienteAPI = (token) => {
  const cliente = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  });

  // Interceptador para renovação automática de sessão
  cliente.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expirado - redirecionar para login
        console.log('🔄 Token expirado detectado, redirecionando para login...');
        
        // Limpar localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('usuario');
        
        // Redirecionar para login
        window.location.href = '/entrar';
      }
      return Promise.reject(error);
    }
  );

  return cliente;
};

export const obterPessoas = async (token, { pagina = 1, limite = 10, busca = '', filtrosAvancados = null } = {}) => {
  const cliente = criarClienteAPI(token);
  const params = { pagina, limite };
  
  if (busca) params.busca = busca;
  if (filtrosAvancados) params.filtros = JSON.stringify(filtrosAvancados);
  
  const resposta = await cliente.get('/pessoas', { params });
  return resposta.data;
};

export const obterTotaisPorComunidade = async (token) => {
  const cliente = criarClienteAPI(token);
  const resposta = await cliente.get('/pessoas/totais/por-comunidade');
  return resposta.data;
};

export const validarCPF = async (token, cpf, idPessoaExcluir = null) => {
  const cliente = criarClienteAPI(token);
  const params = { cpf };
  if (idPessoaExcluir) params.excluir = idPessoaExcluir;
  
  const resposta = await cliente.get('/pessoas/validar-cpf', { params });
  return resposta.data;
};

export const obterPessoa = async (token, id) => {
  const cliente = criarClienteAPI(token);
  const resposta = await cliente.get(`/pessoas/${id}`);
  return resposta.data;
};

export const criarPessoa = async (token, dados) => {
  const cliente = criarClienteAPI(token);
  const resposta = await cliente.post('/pessoas', dados);
  return resposta.data;
};

export const atualizarPessoa = async (token, id, dados) => {
  const cliente = criarClienteAPI(token);
  const resposta = await cliente.patch(`/pessoas/${id}`, dados);
  return resposta.data;
};

export const deletarPessoa = async (token, id) => {
  const cliente = criarClienteAPI(token);
  await cliente.delete(`/pessoas/${id}`);
};

export const atualizarComunidadeEmLote = async (token, nomeAntigo, nomeNovo) => {
  const cliente = criarClienteAPI(token);
  const resposta = await cliente.patch('/pessoas/comunidade/atualizar', {
    nomeAntigo,
    nomeNovo
  });
  return resposta.data;
};

// ========== COMUNIDADES ==========

export const obterComunidades = async (token) => {
  const cliente = criarClienteAPI(token);
  const resposta = await cliente.get('/comunidades');
  return resposta.data;
};

export const criarComunidade = async (token, dados) => {
  const cliente = criarClienteAPI(token);
  const resposta = await cliente.post('/comunidades', dados);
  return resposta.data;
};

export const atualizarComunidade = async (token, id, dados) => {
  const cliente = criarClienteAPI(token);
  const resposta = await cliente.patch(`/comunidades/${id}`, dados);
  return resposta.data;
};

export const deletarComunidade = async (token, id) => {
  const cliente = criarClienteAPI(token);
  await cliente.delete(`/comunidades/${id}`);
};
