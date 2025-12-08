import React, { useState, useEffect, useRef } from 'react';
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
  const { toasts, removerToast, sucesso, erro: erroToast, aviso } = useToast();
  const navegar = useNavigate();
  const timeoutRef = useRef(null);
  const [pessoas, setPessoas] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [filtros, setFiltros] = useState({
    busca: '',
    status: '',
    comunidade: '',
    beneficio: '',
    cras: '',
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Carregar pessoas
  useEffect(() => {
    carregarPessoas();
  }, []);

  const carregarPessoas = async () => {
    setCarregando(true);
    try {
      const res = await axios.get(`${API_URL}/pessoas/listar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPessoas(res.data);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao carregar pessoas' });
    }
    setCarregando(false);
  };

  // Filtragem moderna e funcional
  const pessoasFiltradas = pessoas.filter(p => {
    const buscaMatch = filtros.busca === '' ||
      p.nome?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      p.cpf?.includes(filtros.busca) ||
      p.email?.toLowerCase().includes(filtros.busca.toLowerCase());
    const statusMatch = filtros.status === '' || p.status === filtros.status;
    const comunidadeMatch = filtros.comunidade === '' || p.comunidade === filtros.comunidade;
    const beneficioMatch = filtros.beneficio === '' || (p.beneficios && p.beneficios.includes(filtros.beneficio));
    const crasMatch = filtros.cras === '' || p.cras === filtros.cras;
    return buscaMatch && statusMatch && comunidadeMatch && beneficioMatch && crasMatch;
  });
  useEffect(() => {
    clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      setBusca(buscaInput);
      setPagina(1);
    }, 2000);

    return () => clearTimeout(timeoutRef.current);
  }, [buscaInput]);

  const criarCliente = () => {
    return axios.create({
      baseURL: API_URL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  };

  // Carregar pessoas
  useEffect(() => {
    carregarPessoas();
  }, [pagina, busca, filtros]);

  // Carregar usuários disponíveis para transferência
  useEffect(() => {
    carregarUsuarios();
    carregarFiltrosGlobais();
  }, []);

  // (Removido: função duplicada carregarPessoas com JSX e finally)

  const carregarUsuarios = async () => {
    try {
      const cliente = criarCliente();
      const resposta = await cliente.get('/autenticacao/listar');
      const usuariosFiltrados = resposta.data.filter(u => u.id !== usuario.id);
      setUsuariosDisponiveis(usuariosFiltrados);
    } catch (err) {
      erroToast('Erro ao Carregar', 'Não foi possível carregar a lista de usuários');
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const carregarFiltrosGlobais = async () => {
    try {
      const cliente = criarCliente();
      // Carregar apenas as pessoas que o usuário logado pode ver (usando mesmo filtro da listagem principal)
      const params = new URLSearchParams({
        pagina: '1',
        limite: '10000',
        status: filtros.status,
        busca: busca || ''
      });
      const resposta = await cliente.get(`/pessoas?${params}`);
      const pessoasVisiveis = resposta.data.pessoas;

      const comunidadesSet = new Set();
      const beneficiosGACSet = new Set();
      const beneficiosGovernoSet = new Set();

      pessoasVisiveis.forEach(pessoa => {
        // Comunidade
        if (pessoa.comunidade) {
          comunidadesSet.add(pessoa.comunidade);
        }
        // Benefícios GAC
        if (pessoa.beneficiosGAC && Array.isArray(pessoa.beneficiosGAC)) {
          pessoa.beneficiosGAC.forEach(b => {
            if (b.tipo) beneficiosGACSet.add(b.tipo);
          });
        }
        // Benefícios Governo
        if (pessoa.beneficiosGoverno && Array.isArray(pessoa.beneficiosGoverno)) {
          pessoa.beneficiosGoverno.forEach(b => {
            if (b.nome) beneficiosGovernoSet.add(b.nome);
          });
        }
      });

      setComunidades(Array.from(comunidadesSet).sort());
      setBeneficiosGAC(Array.from(beneficiosGACSet).sort());
      setBeneficiosGoverno(Array.from(beneficiosGovernoSet).sort());
    } catch (err) {
      erroToast('Erro ao Carregar', 'Não foi possível carregar os filtros');
      console.error('Erro ao carregar filtros globais:', err);
    }
  };

  const alternarSelecao = (id) => {
    const novo = new Set(selecionados);
    if (novo.has(id)) {
      novo.delete(id);
    } else {
      novo.add(id);
    }
    setSelecionados(novo);
    setTodosNaPagina(novo.size === pessoas.length && pessoas.length > 0);
  };

  const selecionarTodosPagina = () => {
    if (todosNaPagina) {
      setSelecionados(new Set());
      setTodosNaPagina(false);
    } else {
      const novoSet = new Set(selecionados);
      pessoas.forEach(p => novoSet.add(p.id));
      setSelecionados(novoSet);
      setTodosNaPagina(true);
    }
  };

  const selecionarTodos = () => {
    if (selecionados.size === 0) {
      // Selecionar todos aplicando filtros (isso seria feito no backend em produção)
      const novoSet = new Set(selecionados);
      pessoas.forEach(p => novoSet.add(p.id));
      setSelecionados(novoSet);
      setMensagem(`⚠️ Selecionando apenas os ${pessoas.length} da página atual. Use a busca para refinar a seleção.`);
    } else {
      setSelecionados(new Set());
      setMensagem('');
    }
  };

  const limparSelecao = () => {
    setSelecionados(new Set());
    setTodosNaPagina(false);
    setMensagem('');
  };

  const executarTransferencia = async () => {
    if (selecionados.size === 0) {
      setErro('Selecione pelo menos uma pessoa');
      return;
    }

    if (!usuarioDestino) {
      setErro('Selecione um usuário destino');
      return;
    }

    if (!window.confirm(`Transferir ${selecionados.size} pessoa(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      setCarregando(true);
      setErro('');
      setMensagem('');

      const cliente = criarCliente();
      const resposta = await cliente.post('/pessoas/transferir', {
        pessoaIds: Array.from(selecionados),
        usuarioDestinoId: parseInt(usuarioDestino)
      });

      setMensagem(`✅ ${resposta.data.quantidade} pessoa(s) transferida(s) com sucesso!`);
      sucesso('Sucesso!', `${resposta.data.quantidade} pessoa(s) transferida(s) com sucesso`);
      setSelecionados(new Set());
      setTodosNaPagina(false);
      setUsuarioDestino('');
      
      // Recarregar pessoas após transferência
      setTimeout(() => {
        carregarPessoas();
      }, 1000);
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao transferir pessoas');
      erroToast('Erro na Transferência', err.response?.data?.erro || 'Não foi possível transferir as pessoas');
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const totalPages = Math.ceil(total / limite);

  return (
    <div className="container-transferencia">
      <div className="card-transferencia">
        <div className="cabecalho-transferencia">
          <button className="botao-voltar" onClick={() => navegar('/')} title="Voltar">
            ← Voltar
          </button>
          <h2>Transferência de Pessoas</h2>
        </div>
        <div className="layout-transferencia">
          <div className="painel-filtros">
            <h3>Filtros</h3>
            <input type="text" className="entrada-busca" placeholder="Buscar por nome, CPF, email..." value={buscaInput} onChange={e => setBuscaInput(e.target.value)} disabled={carregando} />
            <div className="filtros-row">
              <select value={filtros.status} onChange={e => { setFiltros({ ...filtros, status: e.target.value }); setPagina(1); }} className="select-filtro" disabled={carregando}>
                <option value="ativo">✓ Ativo</option>
                <option value="inativo">✗ Inativo</option>
                <option value="">⚪ Todos</option>
              </select>
              <select value={filtros.comunidade} onChange={e => { setFiltros({ ...filtros, comunidade: e.target.value }); setPagina(1); }} className="select-filtro" disabled={carregando}>
                <option value="">🏘️ Todas Comunidades</option>
                {comunidades.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filtros.beneficioGAC} onChange={e => { setFiltros({ ...filtros, beneficioGAC: e.target.value }); setPagina(1); }} className="select-filtro" disabled={carregando}>
                <option value="">🎁 GAC: Todos</option>
                {beneficiosGAC.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={filtros.beneficioGoverno} onChange={e => { setFiltros({ ...filtros, beneficioGoverno: e.target.value }); setPagina(1); }} className="select-filtro" disabled={carregando}>
                <option value="">🏛️ Governo: Todos</option>
                {beneficiosGoverno.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="filtros-actions">
              <button onClick={selecionarTodosPagina} className="botao-secundario" disabled={carregando || pessoas.length === 0}>{todosNaPagina ? '☐ Desselecionar Página' : '☑ Selecionar Página'}</button>
              <button onClick={selecionarTodos} className="botao-secundario" disabled={carregando || pessoas.length === 0}>{selecionados.size === 0 ? '✓ Selecionar Filtros' : '✗ Limpar Seleção'}</button>
              <button onClick={limparSelecao} className="botao-secundario" disabled={carregando || selecionados.size === 0}>🗑 Limpar</button>
              <span className="contador-selecao">{selecionados.size} selecionado(s) de {total}</span>
            </div>
          </div>
          <div className="painel-lista">
            <h3>Pessoas ({total})</h3>
            {carregando && <p className="texto-carregando">⏳ Carregando...</p>}
            {pessoas.length > 0 ? (
              <div className="tabela-pessoas">
                <div className="linha-cabecalho">
                  <div className="coluna-checkbox"><input type="checkbox" checked={todosNaPagina && pessoas.length > 0} onChange={selecionarTodosPagina} disabled={carregando} /></div>
                  <div className="coluna-nome">Nome</div>
                  <div className="coluna-cpf">CPF</div>
                  <div className="coluna-comunidade">Comunidade</div>
                  <div className="coluna-beneficios">Benefícios</div>
                </div>
                {pessoas.map(pessoa => {
                  const beneficiosGACAtivos = pessoa.beneficiosGAC?.filter(b => b.tipo) || [];
                  const beneficiosGovernoAtivos = pessoa.beneficiosGoverno?.filter(b => b.nome) || [];
                  const totalBeneficios = beneficiosGACAtivos.length + beneficiosGovernoAtivos.length;
                  return (
                    <div key={pessoa.id} className={`linha-pessoa ${selecionados.has(pessoa.id) ? 'selecionada' : ''}`}>
                      <div className="coluna-checkbox"><input type="checkbox" checked={selecionados.has(pessoa.id)} onChange={() => alternarSelecao(pessoa.id)} disabled={carregando} /></div>
                      <div className="coluna-nome">{pessoa.nome}</div>
                      <div className="coluna-cpf">{pessoa.cpf}</div>
                      <div className="coluna-comunidade">{pessoa.comunidade}</div>
                      <div className="coluna-beneficios">
                        {totalBeneficios > 0 ? (
                          <div className="badges-beneficios">
                            {beneficiosGACAtivos.length > 0 && (<span className="badge-beneficio badge-gac" title={beneficiosGACAtivos.map(b => b.tipo).join(', ')}>🎁 GAC ({beneficiosGACAtivos.length})</span>)}
                            {beneficiosGovernoAtivos.length > 0 && (<span className="badge-beneficio badge-governo" title={beneficiosGovernoAtivos.map(b => b.nome).join(', ')}>🏛️ Governo ({beneficiosGovernoAtivos.length})</span>)}
                          </div>
                        ) : (<span className="sem-beneficios">Nenhum</span>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (!carregando && <p className="sem-resultados">Nenhuma pessoa encontrada com estes filtros</p>)}
            <div className="paginacao">
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1 || carregando} className="botao-paginacao">←</button>
              <span className="info-pagina">Página {pagina} de {totalPages}</span>
              <button onClick={() => setPagina(p => Math.min(totalPages, p + 1))} disabled={pagina === totalPages || carregando} className="botao-paginacao">→</button>
            </div>
          </div>
          <div className="painel-transferencia">
            <h3>Transferir Selecionados</h3>
            <div className="grupo-selecao-usuario">
              <label htmlFor="usuario-destino">Usuário destino:</label>
              <select id="usuario-destino" value={usuarioDestino} onChange={e => setUsuarioDestino(e.target.value)} className="select-usuario" disabled={carregando || usuariosDisponiveis.length === 0}>
                <option value="">-- Selecione um usuário --</option>
                {usuariosDisponiveis.map(u => (<option key={u.id} value={u.id}>{u.nome} ({u.email}) - {u.funcao}</option>))}
              </select>
            </div>
            <button onClick={executarTransferencia} className="botao-transferir" disabled={carregando || selecionados.size === 0 || !usuarioDestino}>{carregando ? '⏳ Transferindo...' : '🔄 Transferir'}</button>
            {erro && <div className="alerta-erro" style={{marginTop: 12}}>{erro}</div>}
            {mensagem && <div className="alerta-sucesso" style={{marginTop: 12}}>{mensagem}</div>}
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onClose={removerToast} />
    </div>
  );
};

export default TransferenciaPessoas;
