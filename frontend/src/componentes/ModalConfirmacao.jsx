import React from 'react';
import { AlertCircle, LogOut, Trash2 } from 'lucide-react';
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
    delete: <Trash2 size={32} />
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onCancelar}></div>
      <div className={`modal-confirmacao modal-${tipo}`}>
        <div className="modal-conteudo">
          <div className={`modal-icone modal-icone-${tipo}`}>
            {icones[tipo]}
          </div>
          <h2 className="modal-titulo">{titulo}</h2>
          <p className="modal-mensagem">{mensagem}</p>
          
          <div className="modal-botoes">
            <button
              className="botao-modal botao-cancelar"
              onClick={onCancelar}
              disabled={carregando}
            >
              {botaoCancelarTexto}
            </button>
            <button
              className={`botao-modal botao-confirmar botao-confirmar-${tipo}`}
              onClick={onConfirmar}
              disabled={carregando}
            >
              {carregando ? '⏳ Processando...' : botaoPrincipalTexto}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
