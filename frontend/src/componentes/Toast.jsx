import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import './Toast.css';

export const Toast = ({ id, tipo = 'info', titulo, mensagem, duracao = 4000, onClose }) => {
  useEffect(() => {
    if (duracao) {
      const timer = setTimeout(() => onClose(id), duracao);
      return () => clearTimeout(timer);
    }
  }, [id, duracao, onClose]);

  const iconMap = {
    sucesso: <CheckCircle size={20} />,
    erro: <AlertCircle size={20} />,
    aviso: <AlertTriangle size={20} />,
    info: <Info size={20} />
  };

  return (
    <div className={`toast toast-${tipo}`}>
      <div className="toast-conteudo">
        <div className="toast-icone">{iconMap[tipo]}</div>
        <div className="toast-texto">
          {titulo && <strong>{titulo}</strong>}
          {mensagem && <p>{mensagem}</p>}
        </div>
      </div>
      <button className="toast-fechar" onClick={() => onClose(id)}>
        <X size={18} />
      </button>
    </div>
  );
};

export const ToastContainer = ({ toasts, onClose }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={onClose}
        />
      ))}
    </div>
  );
};
