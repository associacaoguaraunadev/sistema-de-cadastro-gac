import React, { useState, useRef } from 'react';
import { Filter, X, Search } from 'lucide-react';
import './FiltroAvancado.css';

export const FiltroAvancado = ({ campos, onAplicar, onLimpar }) => {
  const [aberto, setAberto] = useState(false);
  const [filtros, setFiltros] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);

  const camposDisponiveis = [
    { id: 'nome', label: 'Nome', tipo: 'texto', placeholder: 'Ex: João Silva' },
    { id: 'email', label: 'Email', tipo: 'texto', placeholder: 'Ex: joao@email.com' },
    { id: 'cpf', label: 'CPF', tipo: 'texto', placeholder: 'Ex: 123.456.789-00' },
    { id: 'telefone', label: 'Telefone', tipo: 'texto', placeholder: 'Ex: (11) 98765-4321' },
    { id: 'tipoBeneficio', label: 'Tipo de Benefício', tipo: 'texto', placeholder: 'Ex: Cesta Básica' },
    { id: 'endereco', label: 'Endereço', tipo: 'texto', placeholder: 'Ex: Rua das Flores' },
    { id: 'bairro', label: 'Bairro', tipo: 'texto', placeholder: 'Ex: Centro' },
    { id: 'cidade', label: 'Cidade', tipo: 'texto', placeholder: 'Ex: São Paulo' },
    { id: 'estado', label: 'Estado', tipo: 'texto', placeholder: 'Ex: SP' },
    { id: 'cep', label: 'CEP', tipo: 'texto', placeholder: 'Ex: 01310-100' },
  ];

  const handleAdicionar = (campoId) => {
    if (!filtros[campoId]) {
      setFiltros({
        ...filtros,
        [campoId]: ''
      });
    }
  };

  const handleAtualizar = (campoId, valor) => {
    setFiltros({
      ...filtros,
      [campoId]: valor
    });
  };

  const handleRemover = (campoId) => {
    const novosFiltros = { ...filtros };
    delete novosFiltros[campoId];
    setFiltros(novosFiltros);
  };

  const limparTodos = () => {
    setFiltros({});
    onLimpar();
  };

  const aplicarFiltros = () => {
    // Converter para formato esperado pela API (todos com AND - mais intuitivo)
    const filtrosFormatados = {};
    Object.entries(filtros).forEach(([campoId, valor]) => {
      if (valor && valor.trim()) {
        filtrosFormatados[campoId] = { valor, operador: 'contem' };
      }
    });

    if (Object.keys(filtrosFormatados).length > 0) {
      onAplicar({ filtros: filtrosFormatados, operador: 'E' });
    }
    setAberto(false);
  };

  const temFiltrosAtivos = Object.keys(filtros).length > 0;
  const temValoresPreenchidos = Object.values(filtros).some(v => v && v.trim());

  const handleMouseDown = (e) => {
    if (e.target.closest('.botao-fechar') || e.target.closest('input') || e.target.closest('button')) {
      return;
    }
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, position]);

  return (
    <div className="filtro-avancado-container">
      <button
        className={`botao-filtro ${temFiltrosAtivos ? 'ativo' : ''}`}
        onClick={() => setAberto(!aberto)}
        title="Buscar por múltiplos critérios"
      >
        <Filter size={18} />
        <span>Busca Avançada</span>
        {temValoresPreenchidos && <span className="contador-filtro">{Object.values(filtros).filter(v => v && v.trim()).length}</span>}
      </button>

      {aberto && (
        <div className="modal-filtro">
          <div 
            className="conteudo-filtro" 
            ref={modalRef}
            style={{
              transform: `translate(${position.x}px, ${position.y}px)`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
          >
            <div className="cabecalho-filtro">
              <div>
                <h3>Busca Avançada</h3>
                <p className="descricao-filtro">Digite o que procura em cada campo que desejar</p>
              </div>
              <button className="botao-fechar" onClick={() => setAberto(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="corpo-filtro">
              {temFiltrosAtivos && Object.keys(filtros).length > 0 ? (
                <div className="lista-campos-simples">
                  {Object.entries(filtros).map(([campoId, valor]) => {
                    const campo = camposDisponiveis.find((c) => c.id === campoId);
                    return (
                      <div key={campoId} className="campo-filtro-simples">
                        <div className="campo-header">
                          <label>{campo?.label}</label>
                          <button
                            className="botao-remover-x"
                            onClick={() => handleRemover(campoId)}
                            title="Remover este critério"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder={campo?.placeholder}
                          value={valor}
                          onChange={(e) => handleAtualizar(campoId, e.target.value)}
                          autoFocus
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mensagem-inicial">
                  <Search size={40} />
                  <h4>Nenhum critério adicionado</h4>
                  <p>Escolha abaixo os campos que deseja usar para buscar</p>
                </div>
              )}

              <div className="secao-adicionar-campo">
                <p className="label-adicionar">Adicionar critério:</p>
                <div className="botoes-campos-grid">
                  {camposDisponiveis.map((campo) => (
                    <button
                      key={campo.id}
                      className={`botao-adicionar-campo ${filtros.hasOwnProperty(campo.id) ? 'adicionado' : ''}`}
                      onClick={() => handleAdicionar(campo.id)}
                      disabled={filtros.hasOwnProperty(campo.id)}
                      title={filtros.hasOwnProperty(campo.id) ? 'Já adicionado' : `Adicionar ${campo.label}`}
                    >
                      <span className="icone-mais">+</span>
                      {campo.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rodape-filtro">
              {temValoresPreenchidos && (
                <button className="botao-limpar-filtro" onClick={limparTodos}>
                  Limpar Tudo
                </button>
              )}
              <button 
                className="botao-aplicar-filtro" 
                onClick={aplicarFiltros}
                disabled={!temValoresPreenchidos}
              >
                Buscar
              </button>
            </div>
          </div>

          <div className="overlay-filtro" onClick={() => setAberto(false)}></div>
        </div>
      )}
    </div>
  );
};

