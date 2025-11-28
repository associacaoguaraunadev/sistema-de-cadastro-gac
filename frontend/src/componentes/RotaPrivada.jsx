import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';

export const RotaPrivada = ({ children }) => {
  const { autenticado } = useAuth();
  const navegar = useNavigate();

  React.useEffect(() => {
    if (!autenticado) {
      navegar('/entrar');
    }
  }, [autenticado, navegar]);

  if (!autenticado) {
    return null;
  }

  return children;
};
