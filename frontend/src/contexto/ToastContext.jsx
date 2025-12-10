import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const adicionarToast = useCallback((configOuMensagem, tipoParam) => {
    const id = Math.random().toString(36).substr(2, 9);
    
    // Suportar chamadas no formato antigo: adicionarToast('mensagem', 'tipo')
    // E no formato novo: adicionarToast({ titulo, mensagem, tipo })
    let novoToast;
    
    if (typeof configOuMensagem === 'string') {
      // Formato antigo: adicionarToast('mensagem', 'tipo')
      novoToast = {
        id,
        tipo: tipoParam || 'info',
        titulo: configOuMensagem,
        mensagem: '',
        duracao: tipoParam === 'erro' ? 7000 : 6000
      };
    } else {
      // Formato novo: objeto de configuração
      novoToast = {
        id,
        tipo: 'info',
        duracao: 6000,
        ...configOuMensagem
      };
    }

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
