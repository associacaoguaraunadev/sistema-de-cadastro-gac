import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Users, AlertTriangle, Check, Save } from 'lucide-react';
import { useGlobalToast } from '../contexto/ToastContext';
import { useAuth } from '../contexto/AuthContext';
import { obterTotaisPorComunidade, atualizarComunidadeEmLote } from '../servicos/api';
import './GerenciadorComunidades.css';

const GerenciadorComunidades = ({ isOpen, onClose }) => {
  const [comunidades, setComunidades] = useState([]);
  const [novaComunidade, setNovaComunidade] = useState('');
  const [editando, setEditando] = useState(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [contadorPorComunidade, setContadorPorComunidade] = useState({});
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(null);
  
  const { sucesso, erro } = useGlobalToast();
  const { token } = useAuth();

  // Todas as comunidades são editáveis e exclusíveis agora

  useEffect(() => {
    if (isOpen) {
      carregarComunidades();
      carregarContadores();
    }
  }, [isOpen, token]);

  // Atualizar contadores a cada 5 segundos quando aberto
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      carregarContadores();
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, token]);

  const carregarComunidades = () => {
    // Garantir que as comunidades iniciais existam
    let todasComunidades = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
    
    // Comunidades iniciais padrão
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
    }

    const comunidadesFormatadas = todasComunidades
      .map(nome => ({ nome, tipo: 'editavel' }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
    
    setComunidades(comunidadesFormatadas);
  };

  const carregarContadores = async () => {
    if (!token) return;
    
    try {
      const dados = await obterTotaisPorComunidade(token);
      setContadorPorComunidade(dados.totalPorComunidade || {});
    } catch (error) {
      console.error('Erro ao carregar contadores:', error);
    }
  };
      
      const contador = {};
  const notificarAtualizacao = () => {
    // Disparar evento personalizado para atualizar outros componentes
    window.dispatchEvent(new CustomEvent('comunidadesAtualizadas'));
  };

  const adicionarComunidade = () => {
    const nome = novaComunidade.trim();
    if (!nome) {
      erro('Campo obrigatório', 'Digite o nome da comunidade');
      return;
    }

    const comunidadesExistentes = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
    
    if (comunidadesExistentes.includes(nome)) {
      erro('Comunidade já existe', `A comunidade "${nome}" já está cadastrada`);
      return;
    }

    const novasComunidades = [...comunidadesExistentes, nome].sort();
    localStorage.setItem('comunidadesCustomizadas', JSON.stringify(novasComunidades));
    
    carregarComunidades();
    setNovaComunidade('');
    sucesso('Sucesso', `Comunidade "${nome}" adicionada com sucesso!`);
    notificarAtualizacao();
  };

  const iniciarEdicao = (comunidade) => {
    setEditando(comunidade.nome);
    setNomeEditado(comunidade.nome);
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setNomeEditado('');
  };

  const salvarEdicao = async () => {
    const novoNome = nomeEditado.trim();
    if (!novoNome) {
      erro('Campo obrigatório', 'Digite o nome da comunidade');
      return;
    }

    const comunidadesExistentes = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
    
    // Verificar se o novo nome já existe (exceto se for o mesmo nome atual)
    if (novoNome !== editando && comunidadesExistentes.includes(novoNome)) {
      erro('Nome já existe', `A comunidade "${novoNome}" já está cadastrada`);
      return;
    }

    try {
      // Atualizar no banco de dados (todas as pessoas com essa comunidade)
      const resultado = await atualizarComunidadeEmLote(token, editando, novoNome);
      
      // Substituir o nome antigo pelo novo no localStorage
      const comunidadesAtualizadas = comunidadesExistentes.map(nome => 
        nome === editando ? novoNome : nome
      ).sort();

      localStorage.setItem('comunidadesCustomizadas', JSON.stringify(comunidadesAtualizadas));
      
      carregarComunidades();
      carregarContadores(); // Recarregar contadores com os novos nomes
      setEditando(null);
      setNomeEditado('');
      
      if (resultado.pessoasAtualizadas > 0) {
        sucesso('Sucesso', `Comunidade renomeada para "${novoNome}" e ${resultado.pessoasAtualizadas} pessoa(s) atualizada(s) no banco`);
      } else {
        sucesso('Sucesso', `Comunidade renomeada para "${novoNome}"`);
      }
      
      notificarAtualizacao();
    } catch (error) {
      console.error('Erro ao atualizar comunidade:', error);
      erro('Erro', 'Não foi possível atualizar a comunidade no banco de dados. Tente novamente.');
    }
  };

  const confirmarExclusao = (comunidade) => {
    const count = contadorPorComunidade[comunidade.nome] || 0;
    
    if (count > 0) {
      erro(
        'Não é possível excluir', 
        `A comunidade "${comunidade.nome}" possui ${count} pessoa(s) vinculada(s).\n\nPara excluir esta comunidade:\n1. Acesse a lista de pessoas\n2. Transfira todas as pessoas desta comunidade para outra\n3. Volte aqui e tente excluir novamente`
      );
      return;
    }

    setConfirmandoExclusao(comunidade.nome);
  };

  const excluirComunidade = () => {
    if (!confirmandoExclusao) return;

    const comunidadesExistentes = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
    const comunidadesAtualizadas = comunidadesExistentes.filter(nome => nome !== confirmandoExclusao);
    
    localStorage.setItem('comunidadesCustomizadas', JSON.stringify(comunidadesAtualizadas));
    
    carregarComunidades();
    setConfirmandoExclusao(null);
    sucesso('Sucesso', `Comunidade "${confirmandoExclusao}" excluída com sucesso!`);
    notificarAtualizacao();
  };

  const cancelarExclusao = () => {
    setConfirmandoExclusao(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="gerenciador-comunidades-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-info">
            <Users size={20} />
            <h2>Gerenciar Comunidades</h2>
          </div>
          <button type="button" onClick={(e) => {
            e.stopPropagation();
            onClose();
          }} className="btn-fechar">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Formulário para adicionar nova comunidade */}
          <div className="form-adicionar">
            <h3>Adicionar Nova Comunidade</h3>
            <div className="input-group">
              <input
                type="text"
                value={novaComunidade}
                onChange={(e) => setNovaComunidade(e.target.value)}
                placeholder="Nome da comunidade..."
                maxLength={50}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    adicionarComunidade();
                  }
                }}
              />
              <button 
                type="button"
                onClick={adicionarComunidade}
                className="btn-adicionar"
                disabled={!novaComunidade.trim()}
              >
                <Plus size={16} />
                Adicionar
              </button>
            </div>
          </div>

          {/* Lista de comunidades */}
          <div className="lista-comunidades">
            <h3>
              Comunidades Cadastradas ({comunidades.length})
              {carregando && <span className="loading-indicator">Carregando...</span>}
            </h3>
            
            {comunidades.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <p>Nenhuma comunidade cadastrada</p>
                <small>Adicione a primeira comunidade usando o formulário acima</small>
              </div>
            ) : (
              <div className="comunidades-grid">
                {comunidades.map((comunidade, index) => {
                  const count = contadorPorComunidade[comunidade.nome] || 0;
                  const podeExcluir = count === 0;
                  
                  return (
                    <div key={index} className="comunidade-card">
                      <div className="card-header">
                        {editando === comunidade.nome ? (
                          <div className="edit-input">
                            <input
                              type="text"
                              value={nomeEditado}
                              onChange={(e) => setNomeEditado(e.target.value)}
                              maxLength={50}
                              autoFocus
                              onKeyPress={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  salvarEdicao();
                                }
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  cancelarEdicao();
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <h4 className="comunidade-nome">{comunidade.nome}</h4>
                        )}
                        
                        <div className="pessoas-count">
                          <Users size={14} />
                          <span className={count > 0 ? 'has-people' : 'no-people'}>
                            {count} pessoa{count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="card-actions">
                        {editando === comunidade.nome ? (
                          <>
                            <button 
                              type="button"
                              onClick={salvarEdicao}
                              className="btn-action success"
                              title="Salvar alterações"
                            >
                              <Save size={14} />
                            </button>
                            <button 
                              type="button"
                              onClick={cancelarEdicao}
                              className="btn-action cancel"
                              title="Cancelar edição"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              type="button"
                              onClick={() => iniciarEdicao(comunidade)}
                              className="btn-action edit"
                              title="Editar nome"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => confirmarExclusao(comunidade)}
                              className={`btn-action delete ${!podeExcluir ? 'disabled' : ''}`}
                              disabled={!podeExcluir}
                              title={podeExcluir ? 'Excluir comunidade' : 'Não é possível excluir - há pessoas vinculadas'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal de confirmação de exclusão */}
        {confirmandoExclusao && (
          <div className="confirmation-overlay">
            <div className="confirmation-modal">
              <div className="confirmation-header">
                <AlertTriangle size={20} />
                <h3>Confirmar Exclusão</h3>
              </div>
              <p>
                Tem certeza que deseja excluir a comunidade <strong>"{confirmandoExclusao}"</strong>?
              </p>
              <div className="confirmation-actions">
                <button type="button" onClick={cancelarExclusao} className="btn-cancel">
                  Cancelar
                </button>
                <button type="button" onClick={excluirComunidade} className="btn-confirm">
                  <Trash2 size={16} />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GerenciadorComunidades;