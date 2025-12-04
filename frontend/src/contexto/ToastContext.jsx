import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const adicionarToast = useCallback((config) => {
    const id = Math.random().toString(36).substr(2, 9);
    const novoToast = {
      id,
      tipo: 'info',
      duracao: 6000,
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
      mensagem,
      duracao: 6000
    });
  }, [adicionarToast]);

  const erro = useCallback((titulo, mensagem) => {

    return adicionarToast({
      tipo: 'erro',
      titulo,
      mensagem,
      duracao: 7000
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
      mensagem,
      duracao: 6000
    });
  }, [adicionarToast]);

  const value = {
    toasts,
    removerToast,
    sucesso,
    erro,
    aviso,
    info,
    adicionarToast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

export const useGlobalToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useGlobalToast deve ser usado dentro de ToastProvider');
  }
  return context;
};
