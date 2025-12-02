import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useToast } from '../hooks/useToast';

export const RotaPrivada = ({ children }) => {
  const { autenticado, sessaoExpirada, setSessaoExpirada } = useAuth();
  const navegar = useNavigate();
  const { erro: erroToast } = useToast();

  React.useEffect(() => {
    // Se sessão expirou, notificar e redirecionar
    if (sessaoExpirada) {
      erroToast(
        '🔐 Sessão Expirada',
        'Sua sessão expirou. Redirecionando para login...',
        3000
      );
      setSessaoExpirada(false);
      setTimeout(() => {
        navegar('/entrar');
      }, 1500);
    }
  }, [sessaoExpirada, setSessaoExpirada, navegar, erroToast]);

  React.useEffect(() => {
    // Se não autenticado, redirecionar
    if (!autenticado) {
      navegar('/entrar');
    }
  }, [autenticado, navegar]);

  if (!autenticado) {
    return null;
  }

  return children;
};
