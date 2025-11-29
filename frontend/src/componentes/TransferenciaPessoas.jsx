import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './Toast';
import './TransferenciaPessoas.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const TransferenciaPessoas = () => {
  const { usuario, token } = useAuth();
  const { toasts, removerToast, sucesso, erro: erroToast, aviso } = useToast();
  const navegar = useNavigate();
  const timeoutRef = useRef(null);
  const [pessoas, setPessoas] = useState([]);
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState([]);
  const [comunidades, setComunidades] = useState([]);
  const [tiposBeneficio, setTiposBeneficio] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [carregando, setCarregando] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [limite] = useState(20);
  const [total, setTotal] = useState(0);
  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState({
    comunidade: '',
    tipoBeneficio: '',
    status: 'ativo'
  });
  const [usuarioDestino, setUsuarioDestino] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [todosNaPagina, setTodosNaPagina] = useState(false);

  // Debounce para busca - espera 800ms após parar de digitar
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

  const carregarPessoas = async () => {
    try {
      setCarregando(true);
      const cliente = criarCliente();
      const params = new URLSearchParams({
        pagina: pagina.toString(),
        limite: limite.toString(),
        status: filtros.status,
        busca: busca || ''
      });

      const resposta = await cliente.get(`/pessoas?${params}`);
      setPessoas(resposta.data.pessoas);
      setTotal(resposta.data.total);
    } catch (err) {
      setErro('Erro ao carregar pessoas');
      erroToast('Erro ao Carregar', 'Não foi possível carregar a lista de pessoas');
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

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
      // Carregar todas as pessoas para extrair comunidades e tipos únicos
      const resposta = await cliente.get('/pessoas?pagina=1&limite=10000&status=');
      const todasAsPessoas = resposta.data.pessoas;
      
      const comunidadesSet = new Set(todasAsPessoas.map(p => p.comunidade));
      const tiposSet = new Set(todasAsPessoas.map(p => p.tipoBeneficio));
      
      setComunidades(Array.from(comunidadesSet).sort());
      setTiposBeneficio(Array.from(tiposSet).sort());
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
          <button
            className="botao-voltar"
            onClick={() => navegar('/')}
            title="Voltar para lista de pessoas"
          >
            ← Voltar
          </button>
          <h2>📦 Transferência de Pessoas</h2>
        </div>
        <p className="subtitulo">Transfira múltiplas pessoas para outro usuário de forma eficiente</p>

        {erro && <div className="alerta-erro">{erro}</div>}
        {mensagem && <div className="alerta-sucesso">{mensagem}</div>}

        <div className="secao-filtros">
          <h3>Filtrar e Selecionar</h3>
          
          <div className="grupo-filtro">
            <input
              type="text"
              placeholder="🔍 Buscar por nome, CPF, email..."
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  clearTimeout(timeoutRef.current);
                  setBusca(buscaInput);
                  setPagina(1);
                }
              }}
              className="entrada-busca"
              disabled={carregando}
            />
          </div>

          <div className="grupo-filtro filtros-inline">
            <select
              value={filtros.status}
              onChange={(e) => {
                setFiltros({ ...filtros, status: e.target.value });
                setPagina(1);
              }}
              className="select-filtro"
              disabled={carregando}
            >
              <option value="ativo">Status: Ativo</option>
              <option value="inativo">Status: Inativo</option>
              <option value="">Status: Todos</option>
            </select>

            <select
              value={filtros.comunidade}
              onChange={(e) => {
                setFiltros({ ...filtros, comunidade: e.target.value });
                setPagina(1);
              }}
              className="select-filtro"
              disabled={carregando}
            >
              <option value="">Comunidade: Todas</option>
              {comunidades.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filtros.tipoBeneficio}
              onChange={(e) => {
                setFiltros({ ...filtros, tipoBeneficio: e.target.value });
                setPagina(1);
              }}
              className="select-filtro"
              disabled={carregando}
            >
              <option value="">Benefício: Todos</option>
              {tiposBeneficio.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="grupo-controle">
            <button
              onClick={selecionarTodosPagina}
              className="botao-secundario"
              disabled={carregando || pessoas.length === 0}
              title={todosNaPagina ? 'Desselecionar todos desta página' : 'Selecionar todos desta página'}
            >
              {todosNaPagina ? '☐ Desselecionar Página' : '☑ Selecionar Página'}
            </button>

            <button
              onClick={selecionarTodos}
              className="botao-secundario"
              disabled={carregando || pessoas.length === 0}
              title="Seleciona/Deseleciona usando os filtros atuais"
            >
              {selecionados.size === 0 ? '✓ Selecionar Com Filtros' : '✗ Limpar Seleção'}
            </button>

            <button
              onClick={limparSelecao}
              className="botao-secundario"
              disabled={carregando || selecionados.size === 0}
            >
              🗑 Limpar Tudo
            </button>

            <span className="contador-selecao">
              {selecionados.size} selecionado(s) de {total}
            </span>
          </div>
        </div>

        <div className="secao-transferencia">
          <h3>Configurar Transferência</h3>
          
          <div className="grupo-selecao-usuario">
            <label htmlFor="usuario-destino">Transferir para:</label>
            <select
              id="usuario-destino"
              value={usuarioDestino}
              onChange={(e) => setUsuarioDestino(e.target.value)}
              className="select-usuario"
              disabled={carregando || usuariosDisponiveis.length === 0}
            >
              <option value="">-- Selecione um usuário --</option>
              {usuariosDisponiveis.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.email}) - {u.funcao}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={executarTransferencia}
            className="botao-transferir"
            disabled={carregando || selecionados.size === 0 || !usuarioDestino}
          >
            {carregando ? '⏳ Transferindo...' : '🔄 Executar Transferência'}
          </button>
        </div>

        <div className="secao-lista">
          <h3>Pessoas ({total})</h3>
          
          {carregando && <p className="texto-carregando">⏳ Carregando...</p>}

          {pessoas.length > 0 ? (
            <>
              <div className="tabela-pessoas">
                <div className="linha-cabecalho">
                  <div className="coluna-checkbox">
                    <input
                      type="checkbox"
                      checked={todosNaPagina && pessoas.length > 0}
                      onChange={selecionarTodosPagina}
                      disabled={carregando}
                    />
                  </div>
                  <div className="coluna-nome">Nome</div>
                  <div className="coluna-cpf">CPF</div>
                  <div className="coluna-comunidade">Comunidade</div>
                  <div className="coluna-beneficio">Benefício</div>
                </div>

                {pessoas.map(pessoa => (
                  <div key={pessoa.id} className={`linha-pessoa ${selecionados.has(pessoa.id) ? 'selecionada' : ''}`}>
                    <div className="coluna-checkbox">
                      <input
                        type="checkbox"
                        checked={selecionados.has(pessoa.id)}
                        onChange={() => alternarSelecao(pessoa.id)}
                        disabled={carregando}
                      />
                    </div>
                    <div className="coluna-nome">{pessoa.nome}</div>
                    <div className="coluna-cpf">{pessoa.cpf}</div>
                    <div className="coluna-comunidade">{pessoa.comunidade}</div>
                    <div className="coluna-beneficio">{pessoa.tipoBeneficio}</div>
                  </div>
                ))}
              </div>

              <div className="paginacao">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1 || carregando}
                  className="botao-paginacao"
                >
                  ← Anterior
                </button>
                
                <span className="info-pagina">
                  Página {pagina} de {totalPages}
                </span>
                
                <button
                  onClick={() => setPagina(p => Math.min(totalPages, p + 1))}
                  disabled={pagina === totalPages || carregando}
                  className="botao-paginacao"
                >
                  Próxima →
                </button>

                <button
                  onClick={() => navegar('/')}
                  className="botao-cancelar"
                  disabled={carregando}
                >
                  ✕ Cancelar
                </button>
              </div>
            </>
          ) : (
            !carregando && <p className="sem-resultados">Nenhuma pessoa encontrada com estes filtros</p>
          )}
        </div>
      </div>
      <ToastContainer toasts={toasts} onClose={removerToast} />
    </div>
  );
};

export default TransferenciaPessoas;
