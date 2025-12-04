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
  placeholder = "Selecione uma comunidade",
  onKeyDown
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [comunidades, setComunidades] = useState([]);
  const [showGerenciador, setShowGerenciador] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    carregarComunidades();
  }, []);

  // Escutar atualizações de comunidades
  useEffect(() => {
    const handleComunidadesAtualizadas = () => {
      carregarComunidades();
    };
    
    window.addEventListener('comunidadesAtualizadas', handleComunidadesAtualizadas);
    return () => window.removeEventListener('comunidadesAtualizadas', handleComunidadesAtualizadas);
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

  const carregarComunidades = () => {
    let todasComunidades = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
    
    // Garantir que as comunidades iniciais existam se não há nenhuma comunidade
    const comunidadesIniciais = [
      'Jardim Guarauna',
      'Vila Novo Eldorado', 
      'Jardim Apura',
      'Vila Cheba',
      'Morro da Vila',
      'Barragem',
      'Parque Centenario'
    ];

    if (todasComunidades.length === 0) {
      todasComunidades = [...comunidadesIniciais];
      localStorage.setItem('comunidadesCustomizadas', JSON.stringify(todasComunidades));
    } else {
      // Verificar se faltam comunidades iniciais e adicionar se necessário
      let foiAtualizado = false;
      comunidadesIniciais.forEach(comunidade => {
        if (!todasComunidades.includes(comunidade)) {
          todasComunidades.push(comunidade);
          foiAtualizado = true;
        }
      });

      if (foiAtualizado) {
        todasComunidades.sort();
        localStorage.setItem('comunidadesCustomizadas', JSON.stringify(todasComunidades));
      }
    }
    
    setComunidades(todasComunidades.sort());
  };

  const selecionarComunidade = (comunidade) => {
    onChange(comunidade);
    setIsDropdownOpen(false);
  };

  const abrirGerenciador = () => {
    setIsDropdownOpen(false);
    setShowGerenciador(true);
  };

  return (
    <>
      <div className="campo-comunidade" ref={containerRef}>
        <label className={`campo-comunidade-label ${error ? 'error' : ''}`}>
          {label} {required && '*'}
        </label>
        
        <div className={`campo-comunidade-container ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}>
          <div 
            className="campo-comunidade-input"
            onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!disabled) setIsDropdownOpen(!isDropdownOpen);
              } else if (onKeyDown) {
                onKeyDown(e);
              }
            }}
            tabIndex={disabled ? -1 : 0}
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
                    const isSelected = value === comunidade;
                    
                    return (
                      <div
                        key={index}
                        className={`dropdown-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => selecionarComunidade(comunidade)}
                      >
                        <span className="comunidade-nome">{comunidade}</span>
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
      </div>

      <GerenciadorComunidades 
        isOpen={showGerenciador}
        onClose={() => setShowGerenciador(false)}
      />
    </>
  );
};

export default CampoComunidade;