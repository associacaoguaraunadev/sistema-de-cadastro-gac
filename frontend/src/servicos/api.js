import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export const criarClienteAPI = (token) => {
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  });
};

export const obterPessoas = async (token, { pagina = 1, limite = 10, busca = '', status = 'ativo' } = {}) => {
  const cliente = criarClienteAPI(token);
  const resposta = await cliente.get('/pessoas', {
    params: { pagina, limite, busca, status }
  });
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
