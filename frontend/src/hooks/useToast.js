import { useState, useCallback } from 'react';

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const adicionarToast = useCallback((config) => {
    const id = Math.random().toString(36).substr(2, 9);
    const novoToast = {
      id,
      tipo: 'info',
      duracao: 4000,
      ...config
    };

    setToasts(prevToasts => [...prevToasts, novoToast]);
    return id;
  }, []);

  const removerToast = useCallback((id) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const sucesso = useCallback((titulo, mensagem) => {
    return adicionarToast({
      tipo: 'sucesso',
      titulo,
      mensagem
    });
  }, [adicionarToast]);

  const erro = useCallback((titulo, mensagem) => {
    return adicionarToast({
      tipo: 'erro',
      titulo,
      mensagem,
      duracao: 5000
    });
  }, [adicionarToast]);

  const aviso = useCallback((titulo, mensagem) => {
    return adicionarToast({
      tipo: 'aviso',
      titulo,
      mensagem,
      duracao: 4000
    });
  }, [adicionarToast]);

  const info = useCallback((titulo, mensagem) => {
    return adicionarToast({
      tipo: 'info',
      titulo,
      mensagem
    });
  }, [adicionarToast]);

  return {
    toasts,
    removerToast,
    sucesso,
    erro,
    aviso,
    info,
    adicionarToast
  };
};
