import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexto/AuthContext';
import { ToastContainer } from './Toast';

const GerenciadorBeneficiosGAC = ({ isOpen, onClose }) => {
  const [beneficios, setBeneficios] = useState([]);
  const [novoBeneficio, setNovoBeneficio] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { toasts, removerToast, sucesso, erro: erroToast } = useToast();
  const { token } = useAuth();

  useEffect(() => {
    if (isOpen) {
      const salvo = localStorage.getItem('beneficiosGACTipos');
      if (salvo) {
        setBeneficios(JSON.parse(salvo));
      } else {
        const defaults = [
          'Cesta Básica',
          'Auxílio Alimentação',
          'Auxílio Financeiro',
          'Bolsa Cultura',
          'Outro'
        ];
        setBeneficios(defaults);
        localStorage.setItem('beneficiosGACTipos', JSON.stringify(defaults));
      }
    }
  }, [isOpen]);

  const adicionarBeneficio = () => {
    const beneficioTrimmed = novoBeneficio.trim();
    
    if (!beneficioTrimmed) {
      erroToast('Campo Vazio', 'Digite o nome do benefício');
      return;
    }

    if (beneficios.includes(beneficioTrimmed)) {
      erroToast('Benefício Duplicado', 'Este benefício já existe');
      return;
    }

    setBeneficios([...beneficios, beneficioTrimmed]);
    setNovoBeneficio('');
    sucesso('Benefício Adicionado', `${beneficioTrimmed} foi adicionado`);
  };

  const removerBeneficio = (index) => {
    const beneficioARemover = beneficios[index];
    const novosBeneficios = beneficios.filter((_, i) => i !== index);
    setBeneficios(novosBeneficios);
    sucesso('Benefício Removido', `${beneficioARemover} foi removido`);
  };

  const salvarAlteracoes = () => {
    try {
      setCarregando(true);
      localStorage.setItem('beneficiosGACTipos', JSON.stringify(beneficios));
      sucesso('Alterações Salvas', 'Tipos de benefícios atualizados com sucesso');
      
      window.dispatchEvent(new CustomEvent('beneficiosGACAtualizados', { detail: beneficios }));
      
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (erro) {
      erroToast('Erro', 'Não foi possível salvar as alterações');
    } finally {
      setCarregando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-edicao-overlay" onClick={onClose}>
      <div className="modal-edicao-container gerenciador-beneficios-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-edicao-header">
          <h2 className="modal-edicao-titulo">⚙️ Gerenciar Tipos de Benefícios GAC</h2>
          <button className="modal-edicao-close" onClick={onClose} type="button" disabled={carregando}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-edicao-content">
          <div className="gerenciador-beneficios-content">
            {/* Seção: Lista de benefícios */}
            <div className="gerenciador-secao">
              <h3 className="gerenciador-secao-titulo">
                ✓ Tipos de Benefícios Disponíveis
              </h3>
              <p className="gerenciador-secao-descricao">
                Gerencie os tipos de benefícios que estarão disponíveis no formulário
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                {beneficios.length > 0 ? (
                  beneficios.map((beneficio, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '11px 13px',
                        border: '1px solid #c8e6c9',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        fontSize: '13px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#2e7d32';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(46, 125, 50, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#c8e6c9';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                      }}
                    >
                      <span style={{ fontWeight: '500', color: '#1b5e20' }}>{beneficio}</span>
                      <button
                        type="button"
                        onClick={() => removerBeneficio(index)}
                        style={{
                          background: '#ff6b6b',
                          color: 'white',
                          border: 'none',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          transition: 'all 0.2s ease',
                          fontSize: '16px',
                          fontWeight: 'bold'
                        }}
                        disabled={carregando}
                        title="Remover benefício"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#ff5252';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ff6b6b';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        −
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '20px 15px',
                    color: '#999',
                    fontSize: '12px',
                    fontStyle: 'italic'
                  }}>
                    Nenhum benefício adicionado
                  </div>
                )}
              </div>
            </div>

            {/* Divisória */}
            <div style={{ borderTop: '2px solid #e8f5e9' }} />

            {/* Seção: Adicionar novo benefício */}
            <div>
              <h4 style={{ 
                margin: '0 0 14px 0', 
                fontSize: '13px', 
                fontWeight: '700', 
                color: '#1b5e20', 
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                + Adicionar Novo Benefício
              </h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={novoBeneficio}
                  onChange={(e) => setNovoBeneficio(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && adicionarBeneficio()}
                  placeholder="Ex: Auxílio Emergencial"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2e7d32';
                    e.target.style.boxShadow = '0 0 0 3px rgba(46, 125, 50, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e0e0e0';
                    e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                  }}
                  disabled={carregando}
                />
                <button
                  type="button"
                  onClick={adicionarBeneficio}
                  style={{
                    background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(46, 125, 50, 0.15)'
                  }}
                  disabled={carregando}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(46, 125, 50, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(46, 125, 50, 0.15)';
                  }}
                >
                  <Plus size={16} /> Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-edicao-footer">
          <div className="gerenciador-footer-info">
            <span className="gerenciador-contador">
              {beneficios.length} tipo{beneficios.length !== 1 ? 's' : ''} de benefício{beneficios.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="gerenciador-footer-acoes">
            <button
              type="button"
              className="gerenciador-botao-secundario"
              onClick={onClose}
              disabled={carregando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="gerenciador-botao-primario"
              onClick={salvarAlteracoes}
              disabled={carregando}
            >
              {carregando ? (
                <>
                  <span className="gerenciador-spinner"></span>
                  Salvando...
                </>
              ) : (
                <>
                  ✓ Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
        <ToastContainer toasts={toasts} onClose={removerToast} />
      </div>
    </div>
  );
};

export default GerenciadorBeneficiosGAC;
