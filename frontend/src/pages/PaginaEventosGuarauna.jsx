import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useGlobalToast } from '../contexto/ToastContext';
import Navbar from '../componentes/Navbar';
import Breadcrumb from '../componentes/Breadcrumb';
import { 
  Calendar, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MapPin,
  Clock,
  Users,
  FileText,
  Link as LinkIcon,
  Copy,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Eye,
  Send
} from 'lucide-react';
import './PaginaEventosGuarauna.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PaginaEventosGuarauna = () => {
  const { token } = useAuth();
  const { adicionarToast } = useGlobalToast();
  const navegar = useNavigate();

  // Estados principais
  const [eventos, setEventos] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [comunidades, setComunidades] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [comunidadeFiltro, setComunidadeFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const itensPorPagina = 12;

  // Modal de evento
  const [modalAberto, setModalAberto] = useState(false);
  const [eventoEditando, setEventoEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('dados');
  const [formData, setFormData] = useState({
    modeloTermoId: '',
    titulo: '',
    descricao: '',
    dataEvento: '',
    localEvento: '',
    prazoAceite: '',
    comunidadeId: '',
    turmaId: ''
  });

  // Modal de modelos
  const [modalModelosAberto, setModalModelosAberto] = useState(false);
  const [modeloEditando, setModeloEditando] = useState(null);
  const [modeloFormData, setModeloFormData] = useState({
    nome: '',
    tipo: '',
    textoTermo: '',
    ativo: true
  });

  // Modal de visualização
  const [modalVisualizacao, setModalVisualizacao] = useState({ aberto: false, evento: null });

  // Modal de confirmação
  const [modalConfirmacao, setModalConfirmacao] = useState({ aberto: false, evento: null, tipo: 'evento' });

  const tiposEvento = [
    'Viagem',
    'Apresentação',
    'Ensaio Externo',
    'Competição',
    'Workshop',
    'Intercâmbio',
    'Outro'
  ];

  // Carregar dados auxiliares
  const carregarDadosAuxiliares = useCallback(async () => {
    try {
      const [resComunidades, resModelos, resTurmas] = await Promise.all([
        fetch(`${API_URL}/api/comunidades`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/guarauna/modelos-termo`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/guarauna/turmas?limite=1000`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (resComunidades.ok) {
        const data = await resComunidades.json();
        setComunidades(data);
      }

      if (resModelos.ok) {
        const data = await resModelos.json();
        setModelos(data.modelos || data || []);
      }

      if (resTurmas.ok) {
        const data = await resTurmas.json();
        setTurmas(data.turmas || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados auxiliares:', error);
    }
  }, [token]);

  // Carregar eventos
  const carregarEventos = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({
        pagina: paginaAtual.toString(),
        limite: itensPorPagina.toString()
      });

      if (busca) params.append('busca', busca);
      if (comunidadeFiltro) params.append('comunidadeId', comunidadeFiltro);
      if (statusFiltro) params.append('status', statusFiltro);

      const response = await fetch(`${API_URL}/api/guarauna/eventos?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEventos(data.eventos || []);
        setTotalPaginas(data.totalPaginas || 1);
        setTotalItens(data.total || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      adicionarToast('Erro ao carregar eventos', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [token, paginaAtual, busca, comunidadeFiltro, statusFiltro, adicionarToast]);

  useEffect(() => {
    carregarDadosAuxiliares();
  }, [carregarDadosAuxiliares]);

  useEffect(() => {
    carregarEventos();
  }, [carregarEventos]);

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setPaginaAtual(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [busca]);

  // Reset form evento
  const resetFormEvento = () => {
    setFormData({
      modeloTermoId: '',
      titulo: '',
      descricao: '',
      dataEvento: '',
      localEvento: '',
      prazoAceite: '',
      comunidadeId: '',
      turmaId: ''
    });
    setEventoEditando(null);
    setAbaAtiva('dados');
  };

  // Reset form modelo
  const resetFormModelo = () => {
    setModeloFormData({
      nome: '',
      tipo: '',
      textoTermo: '',
      ativo: true
    });
    setModeloEditando(null);
  };

  // Abrir modal evento
  const abrirModalEvento = (evento = null) => {
    if (evento) {
      setEventoEditando(evento);
      setFormData({
        modeloTermoId: evento.modeloTermoId || '',
        titulo: evento.titulo || '',
        descricao: evento.descricao || '',
        dataEvento: evento.dataEvento ? evento.dataEvento.split('T')[0] : '',
        localEvento: evento.localEvento || '',
        prazoAceite: evento.prazoAceite ? evento.prazoAceite.split('T')[0] : '',
        comunidadeId: evento.comunidadeId || '',
        turmaId: evento.turmaId || ''
      });
    } else {
      resetFormEvento();
    }
    setModalAberto(true);
  };

  // Abrir modal modelo
  const abrirModalModelo = (modelo = null) => {
    if (modelo) {
      setModeloEditando(modelo);
      setModeloFormData({
        nome: modelo.nome || '',
        tipo: modelo.tipo || '',
        textoTermo: modelo.textoTermo || '',
        ativo: modelo.ativo !== false
      });
    } else {
      resetFormModelo();
    }
    setModalModelosAberto(true);
  };

  // Salvar evento
  const salvarEvento = async () => {
    if (!formData.titulo.trim()) {
      adicionarToast('Título é obrigatório', 'erro');
      return;
    }

    if (!formData.modeloTermoId) {
      adicionarToast('Selecione um modelo de termo', 'erro');
      return;
    }

    if (!formData.prazoAceite) {
      adicionarToast('Prazo de aceite é obrigatório', 'erro');
      return;
    }

    setSalvando(true);
    try {
      const url = eventoEditando 
        ? `${API_URL}/api/guarauna/eventos/${eventoEditando.id}`
        : `${API_URL}/api/guarauna/eventos`;

      const response = await fetch(url, {
        method: eventoEditando ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        adicionarToast(
          eventoEditando ? 'Evento atualizado com sucesso!' : 'Evento criado com sucesso!',
          'sucesso'
        );
        setModalAberto(false);
        resetFormEvento();
        carregarEventos();
      } else {
        const erro = await response.json();
        adicionarToast(erro.erro || 'Erro ao salvar evento', 'erro');
      }
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      adicionarToast('Erro ao salvar evento', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  // Salvar modelo
  const salvarModelo = async () => {
    if (!modeloFormData.nome.trim()) {
      adicionarToast('Nome do modelo é obrigatório', 'erro');
      return;
    }

    if (!modeloFormData.tipo) {
      adicionarToast('Tipo é obrigatório', 'erro');
      return;
    }

    if (!modeloFormData.textoTermo.trim()) {
      adicionarToast('Texto do termo é obrigatório', 'erro');
      return;
    }

    setSalvando(true);
    try {
      const url = modeloEditando 
        ? `${API_URL}/api/guarauna/modelos-termo/${modeloEditando.id}`
        : `${API_URL}/api/guarauna/modelos-termo`;

      const response = await fetch(url, {
        method: modeloEditando ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(modeloFormData)
      });

      if (response.ok) {
        adicionarToast(
          modeloEditando ? 'Modelo atualizado!' : 'Modelo criado!',
          'sucesso'
        );
        setModalModelosAberto(false);
        resetFormModelo();
        carregarDadosAuxiliares();
      } else {
        const erro = await response.json();
        adicionarToast(erro.erro || 'Erro ao salvar modelo', 'erro');
      }
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      adicionarToast('Erro ao salvar modelo', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  // Excluir
  const excluir = async () => {
    const { evento, tipo } = modalConfirmacao;
    try {
      const url = tipo === 'modelo' 
        ? `${API_URL}/api/guarauna/modelos-termo/${evento.id}`
        : `${API_URL}/api/guarauna/eventos/${evento.id}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        adicionarToast(`${tipo === 'modelo' ? 'Modelo' : 'Evento'} excluído!`, 'sucesso');
        if (tipo === 'modelo') {
          carregarDadosAuxiliares();
        } else {
          carregarEventos();
        }
      } else {
        const erro = await response.json();
        adicionarToast(erro.erro || 'Erro ao excluir', 'erro');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      adicionarToast('Erro ao excluir', 'erro');
    } finally {
      setModalConfirmacao({ aberto: false, evento: null, tipo: 'evento' });
    }
  };

  // Copiar link
  const copiarLink = (codigo) => {
    const url = `${window.location.origin}/aceite/evento/${codigo}`;
    navigator.clipboard.writeText(url);
    adicionarToast('Link copiado!', 'sucesso');
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return '-';
    return new Date(dataStr).toLocaleDateString('pt-BR');
  };

  const getStatusEvento = (evento) => {
    const agora = new Date();
    const prazo = new Date(evento.prazoAceite);
    
    if (prazo < agora) {
      return { label: 'Encerrado', cor: '#64748b', icon: <AlertCircle size={14} /> };
    }
    
    const aceitesTotal = evento.aceites?.length || 0;
    if (aceitesTotal > 0) {
      return { label: 'Em andamento', cor: '#22c55e', icon: <CheckCircle size={14} /> };
    }
    
    return { label: 'Pendente', cor: '#f59e0b', icon: <Clock size={14} /> };
  };

  // Turmas filtradas por comunidade
  const turmasFiltradas = turmas.filter(t => 
    !formData.comunidadeId || t.comunidadeId === formData.comunidadeId
  );

  const breadcrumbItems = [
    { label: 'Guaraúna', path: '/guarauna' },
    { label: 'Eventos', path: '/guarauna/eventos' }
  ];

  return (
    <div className="pagina-eventos">
      <Navbar />
      <Breadcrumb items={breadcrumbItems} />

      <div className="eventos-container">
        <div className="eventos-header">
          <div className="header-info">
            <h1><Calendar size={28} /> Eventos e Autorizações</h1>
            <p>{totalItens} evento{totalItens !== 1 ? 's' : ''}</p>
          </div>

          <div className="header-acoes">
            <button className="btn-secundario" onClick={() => abrirModalModelo()}>
              <FileText size={18} />
              <span>Gerenciar Modelos</span>
            </button>
            <button className="btn-novo" onClick={() => abrirModalEvento()}>
              <Plus size={18} />
              <span>Novo Evento</span>
            </button>
          </div>
        </div>

        {/* Cards de Modelos */}
        <div className="modelos-section">
          <h3>Modelos de Termo Disponíveis</h3>
          <div className="modelos-lista">
            {modelos.length === 0 ? (
              <div className="modelo-vazio">
                <FileText size={20} />
                <span>Nenhum modelo criado</span>
                <button onClick={() => abrirModalModelo()}>Criar primeiro</button>
              </div>
            ) : (
              modelos.filter(m => m.ativo !== false).map(modelo => (
                <div key={modelo.id} className="modelo-card">
                  <span className="modelo-tipo">{modelo.tipo}</span>
                  <span className="modelo-nome">{modelo.nome}</span>
                  <button 
                    className="btn-modelo-editar"
                    onClick={() => abrirModalModelo(modelo)}
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="eventos-filtros">
          <div className="filtro-busca">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por título..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <select
            value={comunidadeFiltro}
            onChange={(e) => {
              setComunidadeFiltro(e.target.value);
              setPaginaAtual(1);
            }}
          >
            <option value="">Todas as comunidades</option>
            {comunidades.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          <select
            value={statusFiltro}
            onChange={(e) => {
              setStatusFiltro(e.target.value);
              setPaginaAtual(1);
            }}
          >
            <option value="">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="encerrado">Encerrados</option>
          </select>
        </div>

        {/* Grid de Eventos */}
        <div className="eventos-grid">
          {carregando ? (
            <div className="carregando-container">
              <div className="spinner"></div>
              <p>Carregando eventos...</p>
            </div>
          ) : eventos.length === 0 ? (
            <div className="sem-dados">
              <Calendar size={48} />
              <p>Nenhum evento encontrado</p>
              <button className="btn-novo" onClick={() => abrirModalEvento()}>
                <Plus size={18} />
                Criar primeiro evento
              </button>
            </div>
          ) : (
            eventos.map(evento => {
              const status = getStatusEvento(evento);
              return (
                <div key={evento.id} className="evento-card">
                  <div className="evento-card-header">
                    <h3>{evento.titulo}</h3>
                    <span 
                      className="badge-status"
                      style={{ '--status-color': status.cor }}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                  </div>

                  <div className="evento-card-body">
                    {evento.dataEvento && (
                      <div className="evento-info">
                        <Calendar size={16} />
                        <span>Data: {formatarData(evento.dataEvento)}</span>
                      </div>
                    )}

                    {evento.localEvento && (
                      <div className="evento-info">
                        <MapPin size={16} />
                        <span>{evento.localEvento}</span>
                      </div>
                    )}

                    <div className="evento-info">
                      <Clock size={16} />
                      <span>Prazo: {formatarData(evento.prazoAceite)}</span>
                    </div>

                    {evento.comunidade && (
                      <div className="evento-info">
                        <MapPin size={16} />
                        <span>{evento.comunidade.nome}</span>
                      </div>
                    )}

                    <div className="evento-aceites">
                      <Users size={16} />
                      <span>{evento.aceites?.length || 0} aceite{(evento.aceites?.length || 0) !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className="evento-card-footer">
                    <button 
                      className="btn-link"
                      onClick={() => copiarLink(evento.codigo)}
                      title="Copiar link de aceite"
                    >
                      <Copy size={16} />
                    </button>
                    <button 
                      className="btn-acao ver" 
                      onClick={() => setModalVisualizacao({ aberto: true, evento })}
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="btn-acao editar" 
                      onClick={() => abrirModalEvento(evento)}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      className="btn-acao excluir" 
                      onClick={() => setModalConfirmacao({ aberto: true, evento, tipo: 'evento' })}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="paginacao">
            <button 
              disabled={paginaAtual === 1}
              onClick={() => setPaginaAtual(p => p - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span>Página {paginaAtual} de {totalPaginas}</span>
            <button 
              disabled={paginaAtual === totalPaginas}
              onClick={() => setPaginaAtual(p => p + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Modal de Evento */}
      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal-conteudo modal-grande" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{eventoEditando ? 'Editar Evento' : 'Novo Evento'}</h2>
              <button className="btn-fechar" onClick={() => setModalAberto(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grupo">
                <label>Modelo de Termo *</label>
                <select
                  value={formData.modeloTermoId}
                  onChange={(e) => setFormData({ ...formData, modeloTermoId: e.target.value })}
                >
                  <option value="">Selecione um modelo</option>
                  {modelos.filter(m => m.ativo !== false).map(m => (
                    <option key={m.id} value={m.id}>{m.nome} ({m.tipo})</option>
                  ))}
                </select>
              </div>

              <div className="form-grupo">
                <label>Título do Evento *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Viagem para Festival de Música"
                />
              </div>

              <div className="form-grupo">
                <label>Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Detalhes do evento..."
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Data do Evento</label>
                  <input
                    type="date"
                    value={formData.dataEvento}
                    onChange={(e) => setFormData({ ...formData, dataEvento: e.target.value })}
                  />
                </div>

                <div className="form-grupo">
                  <label>Prazo para Aceite *</label>
                  <input
                    type="date"
                    value={formData.prazoAceite}
                    onChange={(e) => setFormData({ ...formData, prazoAceite: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grupo">
                <label>Local do Evento</label>
                <input
                  type="text"
                  value={formData.localEvento}
                  onChange={(e) => setFormData({ ...formData, localEvento: e.target.value })}
                  placeholder="Ex: Teatro Municipal"
                />
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Comunidade (opcional)</label>
                  <select
                    value={formData.comunidadeId}
                    onChange={(e) => setFormData({ ...formData, comunidadeId: e.target.value, turmaId: '' })}
                  >
                    <option value="">Todas as comunidades</option>
                    {comunidades.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="form-grupo">
                  <label>Turma (opcional)</label>
                  <select
                    value={formData.turmaId}
                    onChange={(e) => setFormData({ ...formData, turmaId: e.target.value })}
                    disabled={!formData.comunidadeId}
                  >
                    <option value="">Todas as turmas</option>
                    {turmasFiltradas.map(t => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancelar" onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button 
                className="btn-salvar" 
                onClick={salvarEvento}
                disabled={salvando}
              >
                {salvando ? (
                  <>
                    <div className="spinner-pequeno"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Modelos */}
      {modalModelosAberto && (
        <div className="modal-overlay" onClick={() => setModalModelosAberto(false)}>
          <div className="modal-conteudo modal-grande" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modeloEditando ? 'Editar Modelo' : 'Novo Modelo de Termo'}</h2>
              <button className="btn-fechar" onClick={() => setModalModelosAberto(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-row">
                <div className="form-grupo">
                  <label>Nome do Modelo *</label>
                  <input
                    type="text"
                    value={modeloFormData.nome}
                    onChange={(e) => setModeloFormData({ ...modeloFormData, nome: e.target.value })}
                    placeholder="Ex: Autorização de Viagem Padrão"
                  />
                </div>

                <div className="form-grupo">
                  <label>Tipo *</label>
                  <select
                    value={modeloFormData.tipo}
                    onChange={(e) => setModeloFormData({ ...modeloFormData, tipo: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    {tiposEvento.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grupo">
                <label>Texto do Termo *</label>
                <textarea
                  value={modeloFormData.textoTermo}
                  onChange={(e) => setModeloFormData({ ...modeloFormData, textoTermo: e.target.value })}
                  placeholder="Digite o texto completo do termo de autorização..."
                  rows={10}
                />
                <small className="form-hint">
                  Você pode usar: {'{NOME_ALUNO}'}, {'{DATA_EVENTO}'}, {'{LOCAL_EVENTO}'} como placeholders
                </small>
              </div>

              <div className="form-grupo checkbox-grupo">
                <label>
                  <input
                    type="checkbox"
                    checked={modeloFormData.ativo}
                    onChange={(e) => setModeloFormData({ ...modeloFormData, ativo: e.target.checked })}
                  />
                  <span>Modelo ativo</span>
                </label>
              </div>

              {/* Lista de modelos existentes */}
              {!modeloEditando && modelos.length > 0 && (
                <div className="modelos-existentes">
                  <h4>Modelos Existentes</h4>
                  <div className="modelos-lista-compacta">
                    {modelos.map(m => (
                      <div key={m.id} className="modelo-item">
                        <div className="modelo-item-info">
                          <span className="modelo-item-nome">{m.nome}</span>
                          <span className="modelo-item-tipo">{m.tipo}</span>
                        </div>
                        <div className="modelo-item-acoes">
                          <button onClick={() => abrirModalModelo(m)}><Edit2 size={14} /></button>
                          <button onClick={() => setModalConfirmacao({ aberto: true, evento: m, tipo: 'modelo' })}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancelar" onClick={() => setModalModelosAberto(false)}>
                {modeloEditando ? 'Cancelar' : 'Fechar'}
              </button>
              <button 
                className="btn-salvar" 
                onClick={salvarModelo}
                disabled={salvando}
              >
                {salvando ? (
                  <>
                    <div className="spinner-pequeno"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {modeloEditando ? 'Atualizar' : 'Criar Modelo'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      {modalVisualizacao.aberto && (
        <div className="modal-overlay" onClick={() => setModalVisualizacao({ aberto: false, evento: null })}>
          <div className="modal-conteudo modal-grande" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalVisualizacao.evento?.titulo}</h2>
              <button className="btn-fechar" onClick={() => setModalVisualizacao({ aberto: false, evento: null })}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body visualizacao">
              <div className="link-aceite-box">
                <label>Link para aceite:</label>
                <div className="link-container">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/aceite/evento/${modalVisualizacao.evento?.codigo}`}
                  />
                  <button onClick={() => copiarLink(modalVisualizacao.evento?.codigo)}>
                    <Copy size={16} />
                    Copiar
                  </button>
                </div>
              </div>

              <div className="detalhe-row">
                <div className="detalhe-item">
                  <label>Data do Evento</label>
                  <span>{formatarData(modalVisualizacao.evento?.dataEvento)}</span>
                </div>
                <div className="detalhe-item">
                  <label>Prazo para Aceite</label>
                  <span>{formatarData(modalVisualizacao.evento?.prazoAceite)}</span>
                </div>
              </div>

              {modalVisualizacao.evento?.localEvento && (
                <div className="detalhe-item">
                  <label>Local</label>
                  <span>{modalVisualizacao.evento.localEvento}</span>
                </div>
              )}

              {modalVisualizacao.evento?.descricao && (
                <div className="detalhe-item">
                  <label>Descrição</label>
                  <p className="descricao-texto">{modalVisualizacao.evento.descricao}</p>
                </div>
              )}

              <div className="aceites-section">
                <h4>Aceites Recebidos ({modalVisualizacao.evento?.aceites?.length || 0})</h4>
                {modalVisualizacao.evento?.aceites?.length > 0 ? (
                  <div className="aceites-lista">
                    {modalVisualizacao.evento.aceites.map(aceite => (
                      <div key={aceite.id} className="aceite-item">
                        <CheckCircle size={16} className="aceite-icon" />
                        <div className="aceite-info">
                          <span className="aceite-aluno">{aceite.aluno?.pessoa?.nome}</span>
                          <span className="aceite-data">
                            Aceito em {new Date(aceite.aceitoEm).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="sem-aceites">Nenhum aceite registrado ainda.</p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-cancelar" 
                onClick={() => setModalVisualizacao({ aberto: false, evento: null })}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      {modalConfirmacao.aberto && (
        <div className="modal-overlay" onClick={() => setModalConfirmacao({ aberto: false, evento: null, tipo: 'evento' })}>
          <div className="modal-confirmacao" onClick={e => e.stopPropagation()}>
            <h3>Confirmar Exclusão</h3>
            <p>
              Deseja realmente excluir {modalConfirmacao.tipo === 'modelo' ? 'o modelo' : 'o evento'} <strong>{modalConfirmacao.evento?.nome || modalConfirmacao.evento?.titulo}</strong>?
            </p>
            <p className="aviso">Esta ação não pode ser desfeita.</p>
            <div className="modal-footer">
              <button 
                className="btn-cancelar" 
                onClick={() => setModalConfirmacao({ aberto: false, evento: null, tipo: 'evento' })}
              >
                Cancelar
              </button>
              <button className="btn-excluir" onClick={excluir}>
                <Trash2 size={16} />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaginaEventosGuarauna;
