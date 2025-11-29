import React, { createContext, useState, useCallback } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

  const registrar = useCallback(async (email, senha, nome, codigoConvite) => {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await axios.post(`${API_URL}/autenticacao/registrar`, {
        email,
        senha,
        nome,
        codigoConvite
      });
      
      localStorage.setItem('token', resposta.data.token);
      localStorage.setItem('usuario', JSON.stringify(resposta.data.usuario));
      
      setToken(resposta.data.token);
      setUsuario(resposta.data.usuario);
      
      return resposta.data;
    } catch (erro) {
      const mensagem = erro.response?.data?.erros?.[0] || erro.response?.data?.erro || 'Erro ao registrar';
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
      const resposta = await axios.post(`${API_URL}/autenticacao/entrar`, {
        email,
        senha
      });
      
      localStorage.setItem('token', resposta.data.token);
      localStorage.setItem('usuario', JSON.stringify(resposta.data.usuario));
      
      setToken(resposta.data.token);
      setUsuario(resposta.data.usuario);
      
      return resposta.data;
    } catch (erro) {
      const mensagem = erro.response?.data?.erro || 'Erro ao entrar';
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
  }, []);

  const valor = {
    usuario,
    token,
    carregando,
    erro,
    registrar,
    entrar,
    sair,
    autenticado: !!token
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
