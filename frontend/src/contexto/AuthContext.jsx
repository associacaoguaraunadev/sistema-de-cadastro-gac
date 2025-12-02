import React, { createContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { criarInterceptor } from '../servicos/interceptorHttp';

export const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Instância axios customizada com configurações
const instanciaAxios = axios.create({
  baseURL: API_URL
});

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(() => {
    const usuarioSalvo = localStorage.getItem('usuario');
    return usuarioSalvo ? JSON.parse(usuarioSalvo) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('token');
  });

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sessaoExpirada, setSessaoExpirada] = useState(false);

  const registrar = useCallback(async (email, senha, nome, codigoConvite) => {
    setCarregando(true);
    setErro(null);
    try {
      console.log(`📝 [FRONTEND] Registrando novo usuário: ${email}`);
      console.log(`📝 [FRONTEND] Código/Token: ${codigoConvite?.substring(0, 20)}...`);
      console.log(`📝 [FRONTEND] URL da API: ${API_URL}`);

      const resposta = await axios.post(`${API_URL}/autenticacao/registrar`, {
        email,
        senha,
        nome,
        codigoConvite
      });
      
      console.log(`✅ [FRONTEND] Registro sucesso - Status:`, resposta.status);
      console.log(`✅ [FRONTEND] Token recebido:`, resposta.data.token ? 'SIM' : 'NÃO');
      console.log(`✅ [FRONTEND] Usuário criado:`, resposta.data.usuario);

      localStorage.setItem('token', resposta.data.token);
      localStorage.setItem('usuario', JSON.stringify(resposta.data.usuario));
      
      setToken(resposta.data.token);
      setUsuario(resposta.data.usuario);
      
      console.log(`✅ [FRONTEND] Registro completo!`);
      return resposta.data;
    } catch (erro) {
      console.error(`❌ [FRONTEND] Erro no registro:`, erro);
      console.error(`❌ [FRONTEND] Status HTTP:`, erro.response?.status);
      console.error(`❌ [FRONTEND] Dados de erro:`, erro.response?.data);
      
      const mensagem = erro.response?.data?.erros?.[0] || erro.response?.data?.erro || erro.message || 'Erro ao registrar';
      setErro(mensagem);
      throw new Error(mensagem);
    } finally {
      setCarregando(false);
    }
  }, []);

  const entrar = useCallback(async (email, senha) => {
    setCarregando(true);
    setErro(null);
    try {
      console.log(`🔐 [FRONTEND] Tentando entrar com email: ${email}`);
      console.log(`🔐 [FRONTEND] URL da API: ${API_URL}`);
      console.log(`🔐 [FRONTEND] Enviando POST para: ${API_URL}/autenticacao/entrar`);

      const resposta = await axios.post(`${API_URL}/autenticacao/entrar`, {
        email,
        senha
      });
      
      console.log(`✅ [FRONTEND] Resposta recebida:`, resposta.status);
      console.log(`✅ [FRONTEND] Token recebido:`, resposta.data.token ? 'SIM (caracteres: ' + resposta.data.token.length + ')' : 'NÃO');
      console.log(`✅ [FRONTEND] Usuário:`, resposta.data.usuario);

      localStorage.setItem('token', resposta.data.token);
      localStorage.setItem('usuario', JSON.stringify(resposta.data.usuario));
      
      console.log(`💾 [FRONTEND] Dados salvos no localStorage`);
      
      setToken(resposta.data.token);
      setUsuario(resposta.data.usuario);
      
      console.log(`✅ [FRONTEND] Estado atualizado com sucesso`);
      return resposta.data;
    } catch (erro) {
      console.error(`❌ [FRONTEND] Erro na requisição:`, erro);
      console.error(`❌ [FRONTEND] Status HTTP:`, erro.response?.status);
      console.error(`❌ [FRONTEND] Dados de erro:`, erro.response?.data);
      console.error(`❌ [FRONTEND] Mensagem:`, erro.message);
      
      const mensagem = erro.response?.data?.erro || erro.message || 'Erro ao entrar';
      setErro(mensagem);
      throw new Error(mensagem);
    } finally {
      setCarregando(false);
    }
  }, []);

  const sair = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
    setErro(null);
    setSessaoExpirada(false);
  }, []);

  // Configurar interceptor HTTP quando sair mudar
  useEffect(() => {
    const notificarSessaoExpirada = () => {
      setSessaoExpirada(true);
    };

    criarInterceptor(instanciaAxios, sair, notificarSessaoExpirada);
  }, [sair]);

  const valor = {
    usuario,
    token,
    carregando,
    erro,
    sessaoExpirada,
    setSessaoExpirada,
    registrar,
    entrar,
    sair,
    autenticado: !!token,
    axios: instanciaAxios
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const contexto = React.useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return contexto;
};
