import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Settings } from 'lucide-react';
import GerenciadorComunidades from './GerenciadorComunidades';
import './CampoComunidade.css';

const CampoComunidade = ({ 
  value, 
  onChange, 
  error, 
  disabled = false,
  required = false,
  label = "Comunidade",
  placeholder = "Selecione uma comunidade"
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isGerenciadorOpen, setIsGerenciadorOpen] = useState(false);
  const [comunidades, setComunidades] = useState([]);
  const containerRef = useRef(null);

  // Todas as comunidades são editáveis agora

  useEffect(() => {
    carregarComunidades();
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Recarregar comunidades quando são atualizadas
  useEffect(() => {
    const handleComunidadesAtualizadas = () => {
      carregarComunidades();
    };

    window.addEventListener('comunidadesAtualizadas', handleComunidadesAtualizadas);
    return () => window.removeEventListener('comunidadesAtualizadas', handleComunidadesAtualizadas);
  }, []);

  const carregarComunidades = () => {
    let todasComunidades = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
    
    // Se não houver comunidades, criar algumas iniciais
    if (todasComunidades.length === 0) {
      todasComunidades = [
        'Jardim Guarauna',
        'Vila Novo Eldorado',
        'Jardim Apura',
        'Vila Cheba',
        'Morro da Vila',
        'Barragem',
        'Parque Centenario'
      ];
      localStorage.setItem('comunidadesCustomizadas', JSON.stringify(todasComunidades));
    }
    
    setComunidades(todasComunidades.sort());
  };

  const selecionarComunidade = (comunidade) => {
    onChange(comunidade);
    setIsDropdownOpen(false);
  };

  const abrirGerenciador = (e) => {
    e.stopPropagation();
    setIsDropdownOpen(false);
    setIsGerenciadorOpen(true);
  };

  const handleGerenciadorChange = (novaComunidade) => {
    if (novaComunidade) {
      onChange(novaComunidade);
    }
    carregarComunidades(); // Recarregar para atualizar a lista
    
    // Também notificar outros componentes para recarregar
    window.dispatchEvent(new CustomEvent('comunidadesAtualizadas'));
  };

  return (
    <div className="campo-comunidade" ref={containerRef}>
      <label className={`campo-comunidade-label ${error ? 'error' : ''}`}>
        {label} {required && '*'}
      </label>
      
      <div className={`campo-comunidade-container ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}>
        <div 
          className="campo-comunidade-input"
          onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
        >
          <span className={value ? 'selected' : 'placeholder'}>
            {value || placeholder}
          </span>
          <ChevronDown 
            size={16} 
            className={`chevron ${isDropdownOpen ? 'rotated' : ''}`}
          />
        </div>

        {isDropdownOpen && (
          <div className="campo-comunidade-dropdown">
              <div className="dropdown-header">
                <span>Selecionar Comunidade</span>
                <button
                  type="button"
                  className="btn-gerenciar"
                  onClick={abrirGerenciador}
                  title="Gerenciar comunidades"
                >
                  <Settings size={14} />
                  Gerenciar
                </button>
              </div>

              <div className="dropdown-list">
                {value && (
                  <div 
                    className="dropdown-item limpar"
                    onClick={() => selecionarComunidade('')}
                  >
                    <span>Limpar seleção</span>
                  </div>
                )}
                
                {comunidades.length === 0 ? (
                  <div className="dropdown-empty">
                    <span>Nenhuma comunidade encontrada</span>
                    <button
                      type="button"
                      className="btn-adicionar-primeira"
                      onClick={abrirGerenciador}
                    >
                      Adicionar primeira comunidade
                    </button>
                  </div>
                ) : (
                  comunidades.map((comunidade, index) => {
                    const isFixa = comunidadesFixas.includes(comunidade);
                    const isSelected = value === comunidade;
                    
                    return (
                      <div
                        key={index}
                        className={`dropdown-item ${isSelected ? 'selected' : ''} ${isFixa ? 'fixa' : 'customizada'}`}
                        onClick={() => selecionarComunidade(comunidade)}
                      >
                        <span className="comunidade-nome">{comunidade}</span>
                        {isFixa && <span className="badge-tipo">Padrão</span>}
                        {!isFixa && <span className="badge-tipo custom">Personalizada</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
        )}
      </div>

      {error && (
        <span className="campo-comunidade-error">{error}</span>
      )}

      <GerenciadorComunidades
        isOpen={isGerenciadorOpen}
        onClose={() => setIsGerenciadorOpen(false)}
        onComunidadeChange={handleGerenciadorChange}
        valorSelecionado={value}
      />
    </div>
  );
};

export default CampoComunidade;