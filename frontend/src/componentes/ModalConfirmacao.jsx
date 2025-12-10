import React from 'react';
import { AlertCircle, LogOut, Trash2, AlertTriangle } from 'lucide-react';
import './ModalConfirmacao.css';

export const ModalConfirmacao = ({ 
  aberto, 
  titulo = 'Confirmar',
  mensagem = 'Tem certeza?',
  botaoPrincipalTexto = 'Confirmar',
  botaoCancelarTexto = 'Cancelar',
  onConfirmar,
  onCancelar,
  tipo = 'alerta',
  carregando = false
}) => {
  if (!aberto) return null;

  const icones = {
    alerta: <AlertCircle size={32} />,
    logout: <LogOut size={32} />,
    deletar: <Trash2 size={32} />,
    delete: <Trash2 size={32} />,
    warning: <AlertTriangle size={32} />
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onCancelar}></div>
      <div className={`modal-confirmacao modal-${tipo}`}>
        <div className={`modal-icone modal-icone-${tipo}`}>
          {icones[tipo] || icones.alerta}
        </div>
        <h2 className="modal-titulo">{titulo}</h2>
        <div className="modal-mensagem">{mensagem}</div>
        
        <div className="modal-botoes">
          {botaoCancelarTexto && (
            <button
              className="botao-modal botao-cancelar"
              onClick={onCancelar}
              disabled={carregando}
            >
              {botaoCancelarTexto}
            </button>
          )}
          <button
            className={`botao-modal botao-confirmar botao-confirmar-${tipo}`}
            onClick={onConfirmar}
            disabled={carregando}
          >
{carregando ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid transparent',
                  borderTop: '2px solid currentColor',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></span>
                Processando...
              </span>
            ) : botaoPrincipalTexto}
          </button>
        </div>
      </div>
    </>
  );
};
