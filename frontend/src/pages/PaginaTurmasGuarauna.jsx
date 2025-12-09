import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useGlobalToast } from '../contexto/ToastContext';
import Navbar from '../componentes/Navbar';
import Breadcrumb from '../componentes/Breadcrumb';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MapPin,
  Clock,
  Calendar,
  Music,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  User,
  GraduationCap
} from 'lucide-react';
import './PaginaTurmasGuarauna.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PaginaTurmasGuarauna = () => {
  const { token } = useAuth();
  const { adicionarToast } = useGlobalToast();
  const navegar = useNavigate();

  // Estados principais
  const [turmas, setTurmas] = useState([]);
  const [comunidades, setComunidades] = useState([]);
  const [professores, setProfessores] = useState([]);
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
    instrumento: '',
    comunidadeId: '',
    professorId: '',
    ano: new Date().getFullYear(),
    diaSemana: '',
    horarioInicio: '',
    horarioFim: '',
    alunoIds: []
  });

  // Modal de confirmação
  const [modalConfirmacao, setModalConfirmacao] = useState({ aberto: false, turma: null });

  const instrumentos = [
    'Violino', 'Viola', 'Violoncelo', 'Contrabaixo', 'Flauta', 'Clarinete',
    'Oboé', 'Fagote', 'Trompete', 'Trombone', 'Trompa', 'Tuba',
    'Piano', 'Percussão', 'Violão', 'Canto', 'Teoria Musical', 'Musicalização', 'Orquestra', 'Coral', 'Outro'
  ];

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
  for (let i = anoAtual - 2; i <= anoAtual + 1; i++) {
    anosDisponiveis.push(i);
  }

  // Carregar dados auxiliares
  const carregarDadosAuxiliares = useCallback(async () => {
    try {
      const [resComunidades, resProfessores, resAlunos] = await Promise.all([
        fetch(`${API_URL}/api/comunidades`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/guarauna/professores?limite=1000`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/guarauna/alunos?limite=1000`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (resComunidades.ok) {
        const data = await resComunidades.json();
        setComunidades(data);
      }

      if (resProfessores.ok) {
        const data = await resProfessores.json();
        setProfessores(data.professores || []);
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
      instrumento: '',
      comunidadeId: '',
      professorId: '',
      ano: new Date().getFullYear(),
      diaSemana: '',
      horarioInicio: '',
      horarioFim: '',
      alunoIds: []
    });
    setTurmaEditando(null);
    setAbaAtiva('dados');
  };

  // Abrir modal
  const abrirModal = (turma = null) => {
    if (turma) {
      setTurmaEditando(turma);
      setFormData({
        nome: turma.nome || '',
        instrumento: turma.instrumento || '',
        comunidadeId: turma.comunidadeId || '',
        professorId: turma.professorId || '',
        ano: turma.ano || new Date().getFullYear(),
        diaSemana: turma.diaSemana || '',
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

  // Filtrar alunos da mesma comunidade
  const alunosFiltrados = alunos.filter(a => 
    !formData.comunidadeId || a.comunidadeId === formData.comunidadeId
  );

  // Professores da comunidade selecionada
  const professoresFiltrados = professores.filter(p =>
    !formData.comunidadeId || p.comunidades?.some(pc => pc.comunidadeId === formData.comunidadeId)
  );

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
                  {turma.instrumento && (
                    <div className="turma-info">
                      <Music size={16} />
                      <span>{turma.instrumento}</span>
                    </div>
                  )}

                  <div className="turma-info">
                    <MapPin size={16} />
                    <span>{turma.comunidade?.nome || 'Sem comunidade'}</span>
                  </div>

                  {turma.professor && (
                    <div className="turma-info">
                      <GraduationCap size={16} />
                      <span>{turma.professor.nome}</span>
                    </div>
                  )}

                  {turma.diaSemana && (
                    <div className="turma-info">
                      <Calendar size={16} />
                      <span>
                        {diasSemana.find(d => d.valor === turma.diaSemana)?.label || turma.diaSemana}
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
                        placeholder="Ex: Violino Iniciante A"
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
                          professorId: '' // Reset professor ao mudar comunidade
                        })}
                      >
                        <option value="">Selecione</option>
                        {comunidades.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-grupo">
                      <label>Instrumento</label>
                      <select
                        value={formData.instrumento}
                        onChange={(e) => setFormData({ ...formData, instrumento: e.target.value })}
                      >
                        <option value="">Selecione</option>
                        {instrumentos.map(i => (
                          <option key={i} value={i}>{i}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-grupo">
                    <label>Professor</label>
                    <select
                      value={formData.professorId}
                      onChange={(e) => setFormData({ ...formData, professorId: e.target.value })}
                      disabled={!formData.comunidadeId}
                    >
                      <option value="">Selecione um professor</option>
                      {professoresFiltrados.map(p => (
                        <option key={p.id} value={p.id}>{p.nome} - {p.instrumento}</option>
                      ))}
                    </select>
                    {!formData.comunidadeId && (
                      <small className="form-hint">Selecione uma comunidade primeiro</small>
                    )}
                  </div>

                  <div className="form-row tres-colunas">
                    <div className="form-grupo">
                      <label>Dia da Semana</label>
                      <select
                        value={formData.diaSemana}
                        onChange={(e) => setFormData({ ...formData, diaSemana: e.target.value })}
                      >
                        <option value="">Selecione</option>
                        {diasSemana.map(d => (
                          <option key={d.valor} value={d.valor}>{d.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-grupo">
                      <label>Horário Início</label>
                      <input
                        type="time"
                        value={formData.horarioInicio}
                        onChange={(e) => setFormData({ ...formData, horarioInicio: e.target.value })}
                      />
                    </div>

                    <div className="form-grupo">
                      <label>Horário Fim</label>
                      <input
                        type="time"
                        value={formData.horarioFim}
                        onChange={(e) => setFormData({ ...formData, horarioFim: e.target.value })}
                      />
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
                  ) : alunosFiltrados.length === 0 ? (
                    <div className="sem-alunos">
                      <User size={24} />
                      <p>Nenhum aluno cadastrado nesta comunidade.</p>
                    </div>
                  ) : (
                    <>
                      <p className="alunos-instrucao">
                        Selecione os alunos que farão parte desta turma:
                      </p>
                      <div className="alunos-lista">
                        {alunosFiltrados.map(aluno => (
                          <label key={aluno.id} className="aluno-item">
                            <input
                              type="checkbox"
                              checked={formData.alunoIds.includes(aluno.id)}
                              onChange={() => toggleAluno(aluno.id)}
                            />
                            <div className="aluno-info">
                              <span className="aluno-nome">{aluno.pessoa?.nome || aluno.nome}</span>
                              {aluno.instrumento && (
                                <span className="aluno-instrumento">{aluno.instrumento}</span>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
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
      {modalConfirmacao.aberto && (
        <div className="modal-overlay" onClick={() => setModalConfirmacao({ aberto: false, turma: null })}>
          <div className="modal-confirmacao" onClick={e => e.stopPropagation()}>
            <h3>Confirmar Exclusão</h3>
            <p>
              Deseja realmente excluir a turma <strong>{modalConfirmacao.turma?.nome}</strong>?
            </p>
            <p className="aviso">Esta ação não pode ser desfeita.</p>
            <div className="modal-footer">
              <button 
                className="btn-cancelar" 
                onClick={() => setModalConfirmacao({ aberto: false, turma: null })}
              >
                Cancelar
              </button>
              <button className="btn-excluir" onClick={excluirTurma}>
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

export default PaginaTurmasGuarauna;
