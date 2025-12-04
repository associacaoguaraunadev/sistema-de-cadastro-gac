import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, Users, X, Check } from 'lucide-react';
import { useGlobalToast } from '../contexto/ToastContext';
import { obterPessoas } from '../servicos/api';
import { useAuth } from '../contexto/AuthContext';
import './GerenciadorComunidades.css';

const GerenciadorComunidades = ({ isOpen, onClose, onComunidadeChange, valorSelecionado }) => {
  const [comunidades, setComunidades] = useState([]);
  const [comunidadeEditando, setComunidadeEditando] = useState(null);
  const [novaComunidade, setNovaComunidade] = useState('');
  const [nomeEditando, setNomeEditando] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [contadorPorComunidade, setContadorPorComunidade] = useState({});
  const { sucesso, erro } = useGlobalToast();
  const { token } = useAuth();

  // Todas as comunidades são editáveis e exclusíveis agora

  useEffect(() => {
    if (isOpen) {
      carregarComunidades();
      carregarContadores();
    }
  }, [isOpen, token]); // Adicionar token como dependência

  const carregarComunidades = () => {
    const todasComunidades = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]')
      .map(nome => ({ nome, tipo: 'editavel' }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
    
    setComunidades(todasComunidades);
  };

  const carregarContadores = async () => {
    if (!token) {
      console.log('Token não encontrado para carregar contadores');
      return;
    }
    
    try {
      setCarregando(true);
      console.log('Carregando contadores de pessoas...');
      
      // Tentar carregar diretamente todas as pessoas (método mais simples)
      console.log('Carregando pessoas com token:', token ? 'Token presente' : 'Token ausente');
      
      
      // Carregar todas as pessoas
      const resposta = await obterPessoas(token, { limite: 10000, pagina: 1 });
      console.log('Resposta completa da API:', resposta);
      
      // Verificar estrutura da resposta
      let pessoas = [];
      if (Array.isArray(resposta)) {
        pessoas = resposta;
      } else if (resposta.pessoas && Array.isArray(resposta.pessoas)) {
        pessoas = resposta.pessoas;
      } else if (resposta.data && Array.isArray(resposta.data)) {
        pessoas = resposta.data;
      }
      
      console.log('Pessoas extraídas:', pessoas.length, pessoas.length > 0 ? pessoas[0] : 'Nenhuma pessoa');
      
      const contador = {};
      
      pessoas.forEach((pessoa, index) => {
        const comunidade = pessoa.comunidade;
        if (index < 3) console.log(`Pessoa ${index}:`, { nome: pessoa.nome, comunidade });
        if (comunidade) {
          contador[comunidade] = (contador[comunidade] || 0) + 1;
        }
      });
      
      console.log('Contadores finais por comunidade:', contador);
      setContadorPorComunidade(contador);
    } catch (error) {
      console.error('Erro ao carregar contadores:', error);
      erro('Erro', 'Não foi possível carregar o número de pessoas por comunidade');
      setContadorPorComunidade({}); // Resetar em caso de erro
    } finally {
      setCarregando(false);
    }
  };

  const adicionarComunidade = () => {
    const nome = novaComunidade.trim();
    
    if (!nome) {
      erro('Campo obrigatório', 'Digite o nome da comunidade');
      return;
    }

    // Verificar se já existe
    const jaExiste = comunidades.some(c => 
      c.nome.toLowerCase() === nome.toLowerCase()
    );

    if (jaExiste) {
      erro('Comunidade duplicada', 'Esta comunidade já existe');
      return;
    }

    // Adicionar ao localStorage
    const customizadas = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
    customizadas.push(nome);
    localStorage.setItem('comunidadesCustomizadas', JSON.stringify(customizadas));
    
    // Atualizar estado
    carregarComunidades();
    carregarContadores(); // Recarregar contadores
    setNovaComunidade('');
    
    // Notificar outros componentes
    window.dispatchEvent(new CustomEvent('comunidadesAtualizadas'));
    
    sucesso('Sucesso', 'Comunidade adicionada com sucesso!');
  };

  const editarComunidade = (comunidade) => {
    setComunidadeEditando(comunidade);
    setNomeEditando(comunidade.nome);
  };

  const salvarEdicao = () => {
    const novoNome = nomeEditando.trim();
    
    if (!novoNome) {
      erro('Campo obrigatório', 'Digite o nome da comunidade');
      return;
    }

    // Verificar se já existe (exceto a atual)
    const jaExiste = comunidades.some(c => 
      c.nome.toLowerCase() === novoNome.toLowerCase() && 
      c.nome !== comunidadeEditando.nome
    );

    if (jaExiste) {
      erro('Comunidade duplicada', 'Esta comunidade já existe');
      return;
    }

    // Atualizar no localStorage
    const customizadas = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
    const index = customizadas.indexOf(comunidadeEditando.nome);
    if (index > -1) {
      customizadas[index] = novoNome;
      localStorage.setItem('comunidadesCustomizadas', JSON.stringify(customizadas));
    }

    carregarComunidades();
    carregarContadores(); // Recarregar contadores
    setComunidadeEditando(null);
    setNomeEditando('');
    
    // Notificar outros componentes
    window.dispatchEvent(new CustomEvent('comunidadesAtualizadas'));
    
    sucesso('Sucesso', 'Comunidade atualizada com sucesso!');
  };

  const cancelarEdicao = () => {
    setComunidadeEditando(null);
    setNomeEditando('');
  };

  const excluirComunidade = (comunidade) => {
    const quantidadePessoas = contadorPorComunidade[comunidade.nome] || 0;
    
    if (quantidadePessoas > 0) {
      erro('Não é possível excluir', 
        `Esta comunidade possui ${quantidadePessoas} pessoa(s) vinculada(s). Transfira as pessoas antes de excluir.`
      );
      return;
    }

    // Remover do localStorage
    const customizadas = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
    const novasCustomizadas = customizadas.filter(c => c !== comunidade.nome);
    localStorage.setItem('comunidadesCustomizadas', JSON.stringify(novasCustomizadas));

    carregarComunidades();
    carregarContadores(); // Recarregar contadores
    
    // Notificar outros componentes
    window.dispatchEvent(new CustomEvent('comunidadesAtualizadas'));
    
    sucesso('Sucesso', 'Comunidade removida com sucesso!');
  };

  const selecionarComunidade = (nomeComunidade) => {
    onComunidadeChange(nomeComunidade);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="gerenciador-comunidades-overlay">
      <div className="gerenciador-comunidades-container">
        <div className="gerenciador-header">
          <div className="gerenciador-titulo">
            <MapPin size={24} />
            <h2>Gerenciar Comunidades</h2>
          </div>
          <button className="btn-fechar" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="gerenciador-content">
          {/* Adicionar nova comunidade */}
          <div className="secao-adicionar">
            <h3>Adicionar Nova Comunidade</h3>
            <div className="campo-adicionar">
              <input
                type="text"
                value={novaComunidade}
                onChange={(e) => setNovaComunidade(e.target.value)}
                placeholder="Digite o nome da comunidade"
                onKeyPress={(e) => e.key === 'Enter' && adicionarComunidade()}
                disabled={carregando}
              />
              <button 
                onClick={adicionarComunidade}
                disabled={carregando || !novaComunidade.trim()}
                className="btn-adicionar"
              >
                <Plus size={16} />
                Adicionar
              </button>
            </div>
          </div>

          {/* Lista de comunidades */}
          <div className="lista-comunidades">
            <h3>Comunidades Cadastradas</h3>
            
            {comunidades.length === 0 ? (
              <div className="lista-vazia">
                <MapPin size={48} />
                <p>Nenhuma comunidade encontrada</p>
              </div>
            ) : (
              <div className="comunidades-grid">
                {comunidades.map((comunidade, index) => {
                  const quantidade = contadorPorComunidade[comunidade.nome] || 0;
                  const isEditando = comunidadeEditando?.nome === comunidade.nome;
                  const isFixa = comunidade.tipo === 'fixa';
                  const isSelected = valorSelecionado === comunidade.nome;

                  return (
                    <div 
                      key={index} 
                      className={`comunidade-item ${isSelected ? 'selected' : ''} editavel`}
                      onClick={() => !isEditando && selecionarComunidade(comunidade.nome)}
                    >
                      <div className="comunidade-info">
                        {isEditando ? (
                          <div className="edicao-inline">
                            <input
                              type="text"
                              value={nomeEditando}
                              onChange={(e) => setNomeEditando(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') salvarEdicao();
                                if (e.key === 'Escape') cancelarEdicao();
                              }}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="acoes-edicao">
                              <button 
                                onClick={(e) => { e.stopPropagation(); salvarEdicao(); }}
                                className="btn-salvar"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); cancelarEdicao(); }}
                                className="btn-cancelar"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="comunidade-nome">
                              <span>{comunidade.nome}</span>
                              {isSelected && <span className="badge-selecionada">Selecionada</span>}
                            </div>
                            <div className="comunidade-contador">
                              <Users size={14} />
                              <span>{quantidade} pessoa{quantidade !== 1 ? 's' : ''}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {!isEditando && (
                        <div className="comunidade-acoes">
                          <button
                            onClick={(e) => { e.stopPropagation(); editarComunidade(comunidade); }}
                            className="btn-acao editar"
                            title="Editar comunidade"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); excluirComunidade(comunidade); }}
                            className="btn-acao excluir"
                            title="Excluir comunidade"
                            disabled={quantidade > 0}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="gerenciador-footer">
          <div className="legenda">
            <div className="legenda-item">
              <span className="cor-editavel"></span>
              <span>Todas as comunidades são editáveis e excluíveis</span>
            </div>
          </div>
          <button onClick={onClose} className="btn-fechar-footer">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default GerenciadorComunidades;