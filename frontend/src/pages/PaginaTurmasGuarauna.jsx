import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useGlobalToast } from '../contexto/ToastContext';
import Navbar from '../componentes/Navbar';
import Breadcrumb from '../componentes/Breadcrumb';
import { ModalConfirmacao } from '../componentes/ModalConfirmacao';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MapPin,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  User,
  GraduationCap,
  Check
} from 'lucide-react';
import { getGraduacaoNome } from '../utils/graduacoesCapoeira';
import './PaginaTurmasGuarauna.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PaginaTurmasGuarauna = () => {
  const { token } = useAuth();
  const { adicionarToast } = useGlobalToast();
  const navegar = useNavigate();

  // Estados principais
  const [turmas, setTurmas] = useState([]);
  const [comunidades, setComunidades] = useState([]);
  const [educadores, setEducadores] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [comunidadeFiltro, setComunidadeFiltro] = useState('');
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear().toString());

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const itensPorPagina = 12;

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [turmaEditando, setTurmaEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('dados');
  const [formData, setFormData] = useState({
    nome: '',
    comunidadeId: '',
    educadorId: '',
    ano: new Date().getFullYear(),
    diasSemana: [],
    horarioInicio: '',
    horarioFim: '',
    alunoIds: []
  });

  // Modal de confirmação
  const [modalConfirmacao, setModalConfirmacao] = useState({ aberto: false, turma: null });

  // Busca de alunos na aba
  const [buscaAluno, setBuscaAluno] = useState('');

  const diasSemana = [
    { valor: 'segunda', label: 'Segunda-feira' },
    { valor: 'terca', label: 'Terça-feira' },
    { valor: 'quarta', label: 'Quarta-feira' },
    { valor: 'quinta', label: 'Quinta-feira' },
    { valor: 'sexta', label: 'Sexta-feira' },
    { valor: 'sabado', label: 'Sábado' }
  ];

  const anosDisponiveis = [];
  const anoAtual = new Date().getFullYear();
  for (let i = anoAtual - 2; i <= 2045; i++) {
    anosDisponiveis.push(i);
  }

  // Opções de horário com intervalos de 30 minutos (06:00 até 22:30)
  const horasDisponiveis = [];
  for (let hora = 6; hora <= 22; hora++) {
    horasDisponiveis.push({ 
      valor: `${hora.toString().padStart(2, '0')}:00`, 
      label: `${hora.toString().padStart(2, '0')}:00` 
    });
    horasDisponiveis.push({ 
      valor: `${hora.toString().padStart(2, '0')}:30`, 
      label: `${hora.toString().padStart(2, '0')}:30` 
    });
  }

  // Carregar dados auxiliares
  const carregarDadosAuxiliares = useCallback(async () => {
    try {
      const [resComunidades, resEducadores, resAlunos] = await Promise.all([
        fetch(`${API_URL}/api/comunidades`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/guarauna/educadores?limite=1000`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/guarauna/alunos?limite=1000`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (resComunidades.ok) {
        const data = await resComunidades.json();
        setComunidades(data);
      }

      if (resEducadores.ok) {
        const data = await resEducadores.json();
        // A API retorna array direto, não { educadores: [...] }
        setEducadores(Array.isArray(data) ? data : (data.educadores || []));
      }

      if (resAlunos.ok) {
        const data = await resAlunos.json();
        setAlunos(data.alunos || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados auxiliares:', error);
    }
  }, [token]);

  // Carregar turmas
  const carregarTurmas = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({
        pagina: paginaAtual.toString(),
        limite: itensPorPagina.toString()
      });

      if (busca) params.append('busca', busca);
      if (comunidadeFiltro) params.append('comunidadeId', comunidadeFiltro);
      if (anoFiltro) params.append('ano', anoFiltro);

      const response = await fetch(`${API_URL}/api/guarauna/turmas?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTurmas(data.turmas || []);
        setTotalPaginas(data.totalPaginas || 1);
        setTotalItens(data.total || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
      adicionarToast('Erro ao carregar turmas', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [token, paginaAtual, busca, comunidadeFiltro, anoFiltro, adicionarToast]);

  useEffect(() => {
    carregarDadosAuxiliares();
  }, [carregarDadosAuxiliares]);

  useEffect(() => {
    carregarTurmas();
  }, [carregarTurmas]);

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setPaginaAtual(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [busca]);

  // Reset form
  const resetForm = () => {
    setFormData({
      nome: '',
      comunidadeId: '',
      educadorId: '',
      ano: new Date().getFullYear(),
      diasSemana: [],
      horarioInicio: '',
      horarioFim: '',
      alunoIds: []
    });
    setTurmaEditando(null);
    setAbaAtiva('dados');
    setBuscaAluno('');
  };

  // Abrir modal
  const abrirModal = (turma = null) => {
    if (turma) {
      setTurmaEditando(turma);
      // Suporte para diaSemana antigo (string) ou novo diasSemana (array)
      let diasArray = [];
      if (turma.diasSemana && Array.isArray(turma.diasSemana)) {
        diasArray = turma.diasSemana;
      } else if (turma.diaSemana) {
        diasArray = [turma.diaSemana];
      }
      setFormData({
        nome: turma.nome || '',
        comunidadeId: turma.comunidade || '', // O campo é 'comunidade', não 'comunidadeId'
        educadorId: turma.educadorId || '',
        ano: turma.ano || new Date().getFullYear(),
        diasSemana: diasArray,
        horarioInicio: turma.horarioInicio || '',
        horarioFim: turma.horarioFim || '',
        alunoIds: turma.alunos?.map(at => at.alunoId) || []
      });
    } else {
      resetForm();
    }
    setModalAberto(true);
  };

  // Fechar modal
  const fecharModal = () => {
    setModalAberto(false);
    resetForm();
  };

  // Salvar turma
  const salvarTurma = async () => {
    if (!formData.nome.trim()) {
      adicionarToast('Nome é obrigatório', 'erro');
      return;
    }

    if (!formData.comunidadeId) {
      adicionarToast('Comunidade é obrigatória', 'erro');
      return;
    }

    setSalvando(true);
    try {
      const url = turmaEditando 
        ? `${API_URL}/api/guarauna/turmas/${turmaEditando.id}`
        : `${API_URL}/api/guarauna/turmas`;

      const response = await fetch(url, {
        method: turmaEditando ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        adicionarToast(
          turmaEditando ? 'Turma atualizada com sucesso!' : 'Turma criada com sucesso!',
          'sucesso'
        );
        fecharModal();
        carregarTurmas();
      } else {
        const erro = await response.json();
        adicionarToast(erro.erro || 'Erro ao salvar turma', 'erro');
      }
    } catch (error) {
      console.error('Erro ao salvar turma:', error);
      adicionarToast('Erro ao salvar turma', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  // Excluir turma
  const excluirTurma = async () => {
    const { turma } = modalConfirmacao;
    try {
      const response = await fetch(`${API_URL}/api/guarauna/turmas/${turma.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        adicionarToast('Turma excluída com sucesso!', 'sucesso');
        carregarTurmas();
      } else {
        const erro = await response.json();
        adicionarToast(erro.erro || 'Erro ao excluir turma', 'erro');
      }
    } catch (error) {
      console.error('Erro ao excluir turma:', error);
      adicionarToast('Erro ao excluir turma', 'erro');
    } finally {
      setModalConfirmacao({ aberto: false, turma: null });
    }
  };

  // Toggle aluno no form
  const toggleAluno = (alunoId) => {
    setFormData(prev => ({
      ...prev,
      alunoIds: prev.alunoIds.includes(alunoId)
        ? prev.alunoIds.filter(id => id !== alunoId)
        : [...prev.alunoIds, alunoId]
    }));
  };

  // O comunidadeId JÁ É o nome da comunidade (a API retorna id=nome para comunidades)
  const nomeComunidadeSelecionada = formData.comunidadeId || '';

  // Filtrar alunos da mesma comunidade (por nome da comunidade) E por busca
  const alunosFiltrados = alunos
    .filter(a => {
      if (!nomeComunidadeSelecionada) return false;
      // Comparar pelo nome da comunidade (pessoa.comunidade ou comunidade direta)
      const comunidadeAluno = a.pessoa?.comunidade || a.comunidade || '';
      return comunidadeAluno === nomeComunidadeSelecionada;
    })
    .filter(a => {
      if (!buscaAluno) return true;
      const nome = (a.pessoa?.nome || a.nome || '').toLowerCase();
      return nome.includes(buscaAluno.toLowerCase());
    });

  // Educadores da comunidade selecionada (eles têm comunidades[].comunidade = nome)
  const educadoresFiltrados = educadores.filter(p => {
    if (!nomeComunidadeSelecionada) return true; // Mostra todos se não tiver comunidade selecionada
    // Filtrar pelo nome da comunidade (o campo é 'comunidade', não 'comunidadeId')
    return p.comunidades?.some(pc => pc.comunidade === nomeComunidadeSelecionada);
  });

  const breadcrumbItems = [
    { label: 'Guaraúna', path: '/guarauna' },
    { label: 'Turmas', path: '/guarauna/turmas' }
  ];

  return (
    <div className="pagina-turmas">
      <Navbar />
      <Breadcrumb items={breadcrumbItems} />

      <div className="turmas-container">
        <div className="turmas-header">
          <div className="header-info">
            <h1><Users size={28} /> Turmas</h1>
            <p>{totalItens} turma{totalItens !== 1 ? 's' : ''} cadastrada{totalItens !== 1 ? 's' : ''}</p>
          </div>

          <button className="btn-novo" onClick={() => abrirModal()}>
            <Plus size={18} />
            <span>Nova Turma</span>
          </button>
        </div>

        {/* Filtros */}
        <div className="turmas-filtros">
          <div className="filtro-busca">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por nome..."
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
            value={anoFiltro}
            onChange={(e) => {
              setAnoFiltro(e.target.value);
              setPaginaAtual(1);
            }}
          >
            <option value="">Todos os anos</option>
            {anosDisponiveis.map(ano => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
        </div>

        {/* Cards de Turmas */}
        <div className="turmas-grid">
          {carregando ? (
            <div className="carregando-container">
              <div className="spinner"></div>
              <p>Carregando turmas...</p>
            </div>
          ) : turmas.length === 0 ? (
            <div className="sem-dados">
              <Users size={48} />
              <p>Nenhuma turma encontrada</p>
              <button className="btn-novo" onClick={() => abrirModal()}>
                <Plus size={18} />
                Criar primeira turma
              </button>
            </div>
          ) : (
            turmas.map(turma => (
              <div key={turma.id} className="turma-card">
                <div className="turma-card-header">
                  <h3>{turma.nome}</h3>
                  <span className="badge-ano">{turma.ano}</span>
                </div>

                <div className="turma-card-body">
                  <div className="turma-info">
                    <MapPin size={16} />
                    <span>{turma.comunidade || 'Sem comunidade'}</span>
                  </div>

                  {turma.educador && (
                    <div className="turma-info">
                      <GraduationCap size={16} />
                      <span>{turma.educador.pessoa?.nome || turma.educador.nome}</span>
                    </div>
                  )}

                  {/* Suporte para diasSemana (array) ou diaSemana (string legado) */}
                  {(turma.diasSemana?.length > 0 || turma.diaSemana) && (
                    <div className="turma-info">
                      <Calendar size={16} />
                      <span>
                        {turma.diasSemana?.length > 0
                          ? turma.diasSemana.map(d => 
                              diasSemana.find(ds => ds.valor === d)?.label.replace('-feira', '') || d
                            ).join(', ')
                          : diasSemana.find(d => d.valor === turma.diaSemana)?.label || turma.diaSemana
                        }
                      </span>
                    </div>
                  )}

                  {turma.horarioInicio && (
                    <div className="turma-info">
                      <Clock size={16} />
                      <span>{turma.horarioInicio} - {turma.horarioFim || '?'}</span>
                    </div>
                  )}

                  <div className="turma-alunos">
                    <User size={16} />
                    <span>{turma.alunos?.length || 0} aluno{(turma.alunos?.length || 0) !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="turma-card-footer">
                  <button 
                    className="btn-acao editar" 
                    onClick={() => abrirModal(turma)}
                  >
                    <Edit2 size={16} />
                    Editar
                  </button>
                  <button 
                    className="btn-acao excluir" 
                    onClick={() => setModalConfirmacao({ aberto: true, turma })}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
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

      {/* Modal de Formulário */}
      {modalAberto && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-conteudo modal-grande" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {turmaEditando ? 'Editar Turma' : 'Nova Turma'}
              </h2>
              <button className="btn-fechar" onClick={fecharModal}>
                <X size={20} />
              </button>
            </div>

            {/* Abas */}
            <div className="modal-abas">
              <button 
                className={`aba ${abaAtiva === 'dados' ? 'ativa' : ''}`}
                onClick={() => setAbaAtiva('dados')}
              >
                Dados da Turma
              </button>
              <button 
                className={`aba ${abaAtiva === 'alunos' ? 'ativa' : ''}`}
                onClick={() => setAbaAtiva('alunos')}
              >
                Alunos ({formData.alunoIds.length})
              </button>
            </div>

            <div className="modal-body">
              {abaAtiva === 'dados' && (
                <>
                  <div className="form-row">
                    <div className="form-grupo">
                      <label>Nome da Turma *</label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Ex: Alunos Infantil Vila Cheba"
                      />
                    </div>

                    <div className="form-grupo">
                      <label>Ano</label>
                      <select
                        value={formData.ano}
                        onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })}
                      >
                        {anosDisponiveis.map(ano => (
                          <option key={ano} value={ano}>{ano}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-grupo">
                      <label>Comunidade *</label>
                      <select
                        value={formData.comunidadeId}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          comunidadeId: e.target.value,
                          educadorId: '' // Reset educador ao mudar comunidade
                        })}
                      >
                        <option value="">Selecione</option>
                        {comunidades.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-grupo">
                    <label>Educador</label>
                    <select
                      value={formData.educadorId}
                      onChange={(e) => setFormData({ ...formData, educadorId: e.target.value })}
                      disabled={!formData.comunidadeId}
                    >
                      <option value="">Selecione um educador</option>
                      {educadoresFiltrados.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.pessoa?.nome || p.nome} - {getGraduacaoNome(p.graduacao || p.instrumento)}
                        </option>
                      ))}
                    </select>
                    {!formData.comunidadeId && (
                      <small className="form-hint">Selecione uma comunidade primeiro</small>
                    )}
                  </div>

                  <div className="form-grupo">
                    <label>Dias da Semana</label>
                    <div className="dias-semana-chips">
                      {diasSemana.map(d => {
                        const selecionado = formData.diasSemana.includes(d.valor);
                        return (
                          <button
                            key={d.valor}
                            type="button"
                            className={`dia-chip ${selecionado ? 'selecionado' : ''}`}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                diasSemana: selecionado
                                  ? prev.diasSemana.filter(dia => dia !== d.valor)
                                  : [...prev.diasSemana, d.valor]
                              }));
                            }}
                          >
                            {selecionado && <Check size={14} />}
                            {d.label.replace('-feira', '')}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-row duas-colunas">
                    <div className="form-grupo">
                      <label>Horário Início</label>
                      <select
                        value={formData.horarioInicio}
                        onChange={(e) => setFormData({ ...formData, horarioInicio: e.target.value })}
                      >
                        <option value="">Selecione</option>
                        {horasDisponiveis.map(h => (
                          <option key={h.valor} value={h.valor}>{h.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-grupo">
                      <label>Horário Fim</label>
                      <select
                        value={formData.horarioFim}
                        onChange={(e) => setFormData({ ...formData, horarioFim: e.target.value })}
                      >
                        <option value="">Selecione</option>
                        {horasDisponiveis.map(h => (
                          <option key={h.valor} value={h.valor}>{h.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {abaAtiva === 'alunos' && (
                <div className="alunos-selecao">
                  {!formData.comunidadeId ? (
                    <div className="aviso-comunidade">
                      <MapPin size={24} />
                      <p>Selecione uma comunidade na aba "Dados da Turma" para ver os alunos disponíveis.</p>
                    </div>
                  ) : (
                    <>
                      {/* Busca de alunos */}
                      <div className="alunos-busca-container">
                        <Search size={18} />
                        <input
                          type="text"
                          placeholder="Buscar aluno por nome..."
                          value={buscaAluno}
                          onChange={(e) => setBuscaAluno(e.target.value)}
                        />
                      </div>

                      {/* Tags dos alunos selecionados */}
                      {formData.alunoIds.length > 0 && (
                        <div className="alunos-selecionados-tags">
                          <span className="tags-label">
                            {formData.alunoIds.length} aluno{formData.alunoIds.length > 1 ? 's' : ''} selecionado{formData.alunoIds.length > 1 ? 's' : ''}:
                          </span>
                          <div className="tags-container">
                            {formData.alunoIds.map(alunoId => {
                              const aluno = alunos.find(a => a.id === alunoId);
                              const nome = aluno?.pessoa?.nome || aluno?.nome || 'Aluno';
                              return (
                                <span key={alunoId} className="aluno-tag">
                                  {nome}
                                  <button 
                                    type="button"
                                    onClick={() => toggleAluno(alunoId)}
                                    className="remover-aluno"
                                  >
                                    <X size={14} />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Lista de alunos como chips */}
                      {alunosFiltrados.length === 0 ? (
                        <div className="sem-alunos">
                          <User size={24} />
                          <p>{buscaAluno ? 'Nenhum aluno encontrado com este nome.' : 'Nenhum aluno cadastrado nesta comunidade.'}</p>
                        </div>
                      ) : (
                        <div className="alunos-chips-container">
                          <p className="alunos-instrucao">
                            Clique para selecionar os alunos da turma:
                          </p>
                          <div className="alunos-chips">
                            {alunosFiltrados.map(aluno => {
                              const selecionado = formData.alunoIds.includes(aluno.id);
                              return (
                                <button
                                  key={aluno.id}
                                  type="button"
                                  className={`aluno-chip ${selecionado ? 'selecionado' : ''}`}
                                  onClick={() => toggleAluno(aluno.id)}
                                >
                                  {selecionado && <Check size={14} />}
                                  <span>{aluno.pessoa?.nome || aluno.nome}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancelar" onClick={fecharModal}>
                Cancelar
              </button>
              <button 
                className="btn-salvar" 
                onClick={salvarTurma}
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

      {/* Modal de Confirmação */}
      <ModalConfirmacao
        aberto={modalConfirmacao.aberto}
        onCancelar={() => setModalConfirmacao({ aberto: false, turma: null })}
        onConfirmar={excluirTurma}
        titulo="Confirmar Exclusão"
        mensagem={`Deseja realmente excluir a turma ${modalConfirmacao.turma?.nome || ''}?`}
        tipo="deletar"
        botaoPrincipalTexto="Excluir"
        botaoCancelarTexto="Cancelar"
      />
    </div>
  );
};

export default PaginaTurmasGuarauna;
