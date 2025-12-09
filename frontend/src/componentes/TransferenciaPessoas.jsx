import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './Toast';
import './TransferenciaPessoas.css';

// Detectar ambiente automaticamente
const API_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api');

const TransferenciaPessoas = () => {
  const { usuario, token } = useAuth();
  const { toasts, removerToast, sucesso, erro: erroToast } = useToast();
  const navegar = useNavigate();

  // Estados principais
  const [pessoas, setPessoas] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [carregando, setCarregando] = useState(false);
  const [carregandoTransferencia, setCarregandoTransferencia] = useState(false);

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroComunidade, setFiltroComunidade] = useState('');
  const [filtroBeneficioGAC, setFiltroBeneficioGAC] = useState('');
  const [filtroBeneficioGoverno, setFiltroBeneficioGoverno] = useState('');

  // Transferência
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState([]);
  const [usuarioDestino, setUsuarioDestino] = useState('');

  // Feedback
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  // Cliente axios configurado
  const cliente = useMemo(() => axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }), [token]);

  // Carregar pessoas do backend
  const carregarPessoas = async () => {
    setCarregando(true);
    setErro('');
    try {
      const res = await cliente.get('/pessoas', {
        params: { limite: 1000 }
      });
      // O endpoint retorna { pessoas, total, ... }
      const listaPessoas = res.data.pessoas || res.data || [];
      setPessoas(listaPessoas);
      console.log(`✅ [Transferência] Carregadas ${listaPessoas.length} pessoas`);
    } catch (err) {
      console.error('Erro ao carregar pessoas:', err);
      setErro('Erro ao carregar pessoas. Tente novamente.');
      erroToast('Erro', 'Não foi possível carregar as pessoas');
    } finally {
      setCarregando(false);
    }
  };

  // Carregar usuários disponíveis
  const carregarUsuarios = async () => {
    try {
      const res = await cliente.get('/autenticacao/listar');
      const usuariosFiltrados = res.data.filter(u => u.id !== usuario.id);
      setUsuariosDisponiveis(usuariosFiltrados);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      erroToast('Erro', 'Não foi possível carregar os usuários');
    }
  };

  // Carregar dados ao montar
  useEffect(() => {
    carregarPessoas();
    carregarUsuarios();
  }, []);

  // Extrair opções únicas para filtros (das pessoas carregadas)
  const opcoesFiltros = useMemo(() => {
    const comunidades = new Set();
    const beneficiosGAC = new Set();
    const beneficiosGoverno = new Set();

    pessoas.forEach(p => {
      if (p.comunidade) comunidades.add(p.comunidade);
      if (p.beneficiosGAC && Array.isArray(p.beneficiosGAC)) {
        p.beneficiosGAC.forEach(b => {
          if (b.tipo) beneficiosGAC.add(b.tipo);
        });
      }
      if (p.beneficiosGoverno && Array.isArray(p.beneficiosGoverno)) {
        p.beneficiosGoverno.forEach(b => {
          if (b.nome) beneficiosGoverno.add(b.nome);
        });
      }
    });

    return {
      comunidades: Array.from(comunidades).sort(),
      beneficiosGAC: Array.from(beneficiosGAC).sort(),
      beneficiosGoverno: Array.from(beneficiosGoverno).sort()
    };
  }, [pessoas]);

  // Filtrar pessoas com base nos filtros selecionados
  const pessoasFiltradas = useMemo(() => {
    return pessoas.filter(p => {
      // Filtro de busca (nome, CPF, email)
      const buscaLower = busca.toLowerCase().trim();
      const matchBusca = !buscaLower || 
        p.nome?.toLowerCase().includes(buscaLower) ||
        p.cpf?.includes(buscaLower) ||
        p.email?.toLowerCase().includes(buscaLower);

      // Filtro de comunidade
      const matchComunidade = !filtroComunidade || p.comunidade === filtroComunidade;

      // Filtro de benefício GAC
      const matchBeneficioGAC = !filtroBeneficioGAC || 
        (p.beneficiosGAC && p.beneficiosGAC.some(b => b.tipo === filtroBeneficioGAC));

      // Filtro de benefício Governo
      const matchBeneficioGoverno = !filtroBeneficioGoverno || 
        (p.beneficiosGoverno && p.beneficiosGoverno.some(b => b.nome === filtroBeneficioGoverno));

      return matchBusca && matchComunidade && matchBeneficioGAC && matchBeneficioGoverno;
    });
  }, [pessoas, busca, filtroComunidade, filtroBeneficioGAC, filtroBeneficioGoverno]);

  // Alternar seleção de pessoa
  const alternarSelecao = (id) => {
    setSelecionados(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) {
        novo.delete(id);
      } else {
        novo.add(id);
      }
      return novo;
    });
  };

  // Selecionar/Desselecionar todos da lista filtrada
  const alternarTodos = () => {
    if (selecionados.size === pessoasFiltradas.length && pessoasFiltradas.length > 0) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(pessoasFiltradas.map(p => p.id)));
    }
  };

  // Limpar seleção
  const limparSelecao = () => {
    setSelecionados(new Set());
    setMensagem('');
  };

  // Limpar filtros
  const limparFiltros = () => {
    setBusca('');
    setFiltroComunidade('');
    setFiltroBeneficioGAC('');
    setFiltroBeneficioGoverno('');
  };

  // Executar transferência
  const executarTransferencia = async () => {
    if (selecionados.size === 0) {
      setErro('Selecione pelo menos uma pessoa para transferir');
      return;
    }

    if (!usuarioDestino) {
      setErro('Selecione um usuário de destino');
      return;
    }

    const confirmacao = window.confirm(
      `Você está prestes a transferir ${selecionados.size} pessoa(s) para outro usuário.\n\nEsta ação não pode ser desfeita. Deseja continuar?`
    );

    if (!confirmacao) return;

    setCarregandoTransferencia(true);
    setErro('');
    setMensagem('');

    try {
      const res = await cliente.post('/pessoas/transferir', {
        pessoaIds: Array.from(selecionados),
        usuarioDestinoId: parseInt(usuarioDestino)
      });

      const qtd = res.data.quantidade || selecionados.size;
      setMensagem(`✅ ${qtd} pessoa(s) transferida(s) com sucesso!`);
      sucesso('Transferência concluída', `${qtd} pessoa(s) transferida(s)`);
      
      setSelecionados(new Set());
      setUsuarioDestino('');
      
      // Recarregar pessoas após transferência
      setTimeout(() => carregarPessoas(), 500);
    } catch (err) {
      const msgErro = err.response?.data?.erro || 'Erro ao transferir pessoas';
      setErro(msgErro);
      erroToast('Erro na transferência', msgErro);
      console.error('Erro na transferência:', err);
    } finally {
      setCarregandoTransferencia(false);
    }
  };

  // Verificar se todos estão selecionados
  const todosSelcionados = pessoasFiltradas.length > 0 && selecionados.size === pessoasFiltradas.length;

  return (
    <div className="transferencia-container">
      <div className="transferencia-card">
        {/* Cabeçalho */}
        <div className="transferencia-header">
          <button className="btn-voltar" onClick={() => navegar('/')}>
            ← Voltar
          </button>
          <div className="transferencia-titulo">
            <h2>🔄 Transferência de Pessoas</h2>
            <p>Transfira pessoas entre usuários do sistema</p>
          </div>
        </div>

        {/* Mensagens de feedback */}
        {erro && <div className="alerta alerta-erro">{erro}</div>}
        {mensagem && <div className="alerta alerta-sucesso">{mensagem}</div>}

        {/* Área principal com grid de 2 colunas */}
        <div className="transferencia-content">
          {/* Coluna esquerda: Filtros e Lista */}
          <div className="transferencia-lista-area">
            {/* Filtros */}
            <div className="filtros-card">
              <h3>🔍 Filtros</h3>
              <div className="filtros-grid">
                <div className="filtro-item filtro-busca">
                  <input
                    type="text"
                    placeholder="Buscar por nome, CPF ou email..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="input-busca"
                  />
                </div>

                <div className="filtro-item">
                  <select
                    value={filtroComunidade}
                    onChange={(e) => setFiltroComunidade(e.target.value)}
                    className="select-filtro"
                  >
                    <option value="">🏘️ Todas Comunidades</option>
                    {opcoesFiltros.comunidades.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="filtro-item">
                  <select
                    value={filtroBeneficioGAC}
                    onChange={(e) => setFiltroBeneficioGAC(e.target.value)}
                    className="select-filtro"
                  >
                    <option value="">🎁 GAC: Todos</option>
                    {opcoesFiltros.beneficiosGAC.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="filtro-item">
                  <select
                    value={filtroBeneficioGoverno}
                    onChange={(e) => setFiltroBeneficioGoverno(e.target.value)}
                    className="select-filtro"
                  >
                    <option value="">🏛️ Governo: Todos</option>
                    {opcoesFiltros.beneficiosGoverno.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="filtros-acoes">
                <button onClick={limparFiltros} className="btn-secundario btn-sm">
                  🗑️ Limpar Filtros
                </button>
                <span className="contador-resultados">
                  {pessoasFiltradas.length} de {pessoas.length} pessoas
                </span>
              </div>
            </div>

            {/* Contador de seleção */}
            <div className="selecao-acoes">
              <span className="contador-selecao">
                <strong>{selecionados.size}</strong> selecionado(s)
              </span>
            </div>

            {/* Lista de pessoas */}
            <div className="lista-pessoas">
              {carregando ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Carregando pessoas...</p>
                </div>
              ) : pessoasFiltradas.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📭</span>
                  <p>Nenhuma pessoa encontrada</p>
                  {(busca || filtroComunidade || filtroBeneficioGAC || filtroBeneficioGoverno) && (
                    <button onClick={limparFiltros} className="btn-link">
                      Limpar filtros
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="lista-header">
                    <div className="col-check">
                      <input
                        type="checkbox"
                        checked={todosSelcionados}
                        onChange={alternarTodos}
                        title="Selecionar todos"
                      />
                    </div>
                    <div className="col-nome">Nome</div>
                    <div className="col-cpf">CPF</div>
                    <div className="col-comunidade">Comunidade</div>
                    <div className="col-beneficios">Benefícios</div>
                  </div>
                  <div className="lista-body">
                    {pessoasFiltradas.map(pessoa => {
                      const beneficiosGAC = pessoa.beneficiosGAC?.filter(b => b.tipo) || [];
                      const beneficiosGov = pessoa.beneficiosGoverno?.filter(b => b.nome) || [];
                      const isSelected = selecionados.has(pessoa.id);

                      return (
                        <div 
                          key={pessoa.id} 
                          className={`lista-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => alternarSelecao(pessoa.id)}
                        >
                          <div className="col-check">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => alternarSelecao(pessoa.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="col-nome">
                            <span className="nome-pessoa">{pessoa.nome}</span>
                          </div>
                          <div className="col-cpf">
                            <span className="cpf-pessoa">{pessoa.cpf || '-'}</span>
                          </div>
                          <div className="col-comunidade">
                            <span className="tag-comunidade">{pessoa.comunidade || '-'}</span>
                          </div>
                          <div className="col-beneficios">
                            {beneficiosGAC.length > 0 && (
                              <span className="badge badge-gac" title={beneficiosGAC.map(b => b.tipo).join(', ')}>
                                🎁 GAC ({beneficiosGAC.length})
                              </span>
                            )}
                            {beneficiosGov.length > 0 && (
                              <span className="badge badge-gov" title={beneficiosGov.map(b => b.nome).join(', ')}>
                                🏛️ Gov ({beneficiosGov.length})
                              </span>
                            )}
                            {beneficiosGAC.length === 0 && beneficiosGov.length === 0 && (
                              <span className="sem-beneficio">Nenhum</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Coluna direita: Transferência */}
          <div className="transferencia-acao-area">
            <div className="transferencia-painel">
              <h3>📤 Transferir Para</h3>
              
              <div className="resumo-selecao">
                <div className="resumo-numero">{selecionados.size}</div>
                <div className="resumo-texto">pessoa(s) selecionada(s)</div>
              </div>

              <div className="campo-destino">
                <label htmlFor="usuario-destino">Usuário de destino:</label>
                <select
                  id="usuario-destino"
                  value={usuarioDestino}
                  onChange={(e) => setUsuarioDestino(e.target.value)}
                  className="select-destino"
                  disabled={usuariosDisponiveis.length === 0}
                >
                  <option value="">-- Selecione um usuário --</option>
                  {usuariosDisponiveis.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.email}) - {u.funcao}
                    </option>
                  ))}
                </select>
                {usuariosDisponiveis.length === 0 && (
                  <p className="aviso-usuarios">Nenhum outro usuário disponível</p>
                )}
              </div>

              <button
                onClick={executarTransferencia}
                className="btn-transferir"
                disabled={carregandoTransferencia || selecionados.size === 0 || !usuarioDestino}
              >
                {carregandoTransferencia ? (
                  <>
                    <span className="spinner-sm"></span>
                    Transferindo...
                  </>
                ) : (
                  <>🔄 Transferir Pessoas</>
                )}
              </button>

              <p className="aviso-transferencia">
                ⚠️ Esta ação não pode ser desfeita
              </p>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={removerToast} />
    </div>
  );
};

export default TransferenciaPessoas;
