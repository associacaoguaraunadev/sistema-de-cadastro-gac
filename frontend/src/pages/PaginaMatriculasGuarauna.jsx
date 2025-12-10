import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useGlobalToast } from '../contexto/ToastContext';
import Navbar from '../componentes/Navbar';
import Breadcrumb from '../componentes/Breadcrumb';
import { 
  FileText, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MapPin,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Eye,
  Download
} from 'lucide-react';
import './PaginaMatriculasGuarauna.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PaginaMatriculasGuarauna = () => {
  const { token } = useAuth();
  const { adicionarToast } = useGlobalToast();
  const navegar = useNavigate();

  // Estados principais
  const [matriculas, setMatriculas] = useState([]);
  const [comunidades, setComunidades] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [comunidadeFiltro, setComunidadeFiltro] = useState('');
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear().toString());
  const [statusFiltro, setStatusFiltro] = useState('');

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const itensPorPagina = 20;

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [matriculaEditando, setMatriculaEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({
    alunoId: '',
    ano: new Date().getFullYear(),
    status: 'pendente',
    observacoes: ''
  });

  // Modal de visualização
  const [modalVisualizacao, setModalVisualizacao] = useState({ aberto: false, matricula: null });
  
  // Modal de confirmação
  const [modalConfirmacao, setModalConfirmacao] = useState({ aberto: false, matricula: null });

  const anosDisponiveis = [];
  const anoAtual = new Date().getFullYear();
  for (let i = anoAtual - 2; i <= 2045; i++) {
    anosDisponiveis.push(i);
  }

  const statusOptions = [
    { valor: 'pendente', label: 'Pendente', cor: '#f59e0b' },
    { valor: 'ativa', label: 'Ativa', cor: '#22c55e' },
    { valor: 'cancelada', label: 'Cancelada', cor: '#ef4444' },
    { valor: 'concluida', label: 'Concluída', cor: '#6366f1' }
  ];

  // Carregar dados auxiliares
  const carregarDadosAuxiliares = useCallback(async () => {
    try {
      const [resComunidades, resAlunos] = await Promise.all([
        fetch(`${API_URL}/comunidades`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/guarauna/alunos?limite=1000`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (resComunidades.ok) {
        const data = await resComunidades.json();
        setComunidades(data);
      }

      if (resAlunos.ok) {
        const data = await resAlunos.json();
        // API retorna array diretamente, não { alunos: [...] }
        setAlunos(Array.isArray(data) ? data : (data.alunos || []));
      }
    } catch (error) {
      console.error('Erro ao carregar dados auxiliares:', error);
    }
  }, [token]);

  // Carregar matrículas
  const carregarMatriculas = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({
        pagina: paginaAtual.toString(),
        limite: itensPorPagina.toString()
      });

      if (busca) params.append('busca', busca);
      if (comunidadeFiltro) params.append('comunidadeId', comunidadeFiltro);
      if (anoFiltro) params.append('ano', anoFiltro);
      if (statusFiltro) params.append('status', statusFiltro);

      const response = await fetch(`${API_URL}/guarauna/matriculas?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMatriculas(data.matriculas || []);
        setTotalPaginas(data.totalPaginas || 1);
        setTotalItens(data.total || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar matrículas:', error);
      adicionarToast('Erro ao carregar matrículas', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [token, paginaAtual, busca, comunidadeFiltro, anoFiltro, statusFiltro, adicionarToast]);

  useEffect(() => {
    carregarDadosAuxiliares();
  }, [carregarDadosAuxiliares]);

  useEffect(() => {
    carregarMatriculas();
  }, [carregarMatriculas]);

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
      alunoId: '',
      ano: new Date().getFullYear(),
      status: 'pendente',
      observacoes: ''
    });
    setMatriculaEditando(null);
  };

  // Abrir modal
  const abrirModal = (matricula = null) => {
    if (matricula) {
      setMatriculaEditando(matricula);
      setFormData({
        alunoId: matricula.alunoId || '',
        ano: matricula.ano || new Date().getFullYear(),
        status: matricula.status || 'pendente',
        observacoes: matricula.observacoes || ''
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

  // Salvar matrícula
  const salvarMatricula = async () => {
    if (!formData.alunoId) {
      adicionarToast('Selecione um aluno', 'erro');
      return;
    }

    setSalvando(true);
    try {
      const url = matriculaEditando 
        ? `${API_URL}/guarauna/matriculas/${matriculaEditando.id}`
        : `${API_URL}/guarauna/matriculas`;

      const response = await fetch(url, {
        method: matriculaEditando ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        adicionarToast(
          matriculaEditando ? 'Matrícula atualizada com sucesso!' : 'Matrícula criada com sucesso!',
          'sucesso'
        );
        fecharModal();
        carregarMatriculas();
      } else {
        const erro = await response.json();
        adicionarToast(erro.erro || 'Erro ao salvar matrícula', 'erro');
      }
    } catch (error) {
      console.error('Erro ao salvar matrícula:', error);
      adicionarToast('Erro ao salvar matrícula', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  // Excluir matrícula
  const excluirMatricula = async () => {
    const { matricula } = modalConfirmacao;
    try {
      const response = await fetch(`${API_URL}/guarauna/matriculas/${matricula.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        adicionarToast('Matrícula excluída com sucesso!', 'sucesso');
        carregarMatriculas();
      } else {
        const erro = await response.json();
        adicionarToast(erro.erro || 'Erro ao excluir matrícula', 'erro');
      }
    } catch (error) {
      console.error('Erro ao excluir matrícula:', error);
      adicionarToast('Erro ao excluir matrícula', 'erro');
    } finally {
      setModalConfirmacao({ aberto: false, matricula: null });
    }
  };

  // Alterar status rapidamente
  const alterarStatus = async (matricula, novoStatus) => {
    try {
      const response = await fetch(`${API_URL}/guarauna/matriculas/${matricula.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...matricula, status: novoStatus })
      });

      if (response.ok) {
        adicionarToast('Status atualizado!', 'sucesso');
        carregarMatriculas();
      } else {
        const erro = await response.json();
        adicionarToast(erro.erro || 'Erro ao atualizar status', 'erro');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      adicionarToast('Erro ao atualizar status', 'erro');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ativa': return <CheckCircle size={14} />;
      case 'cancelada': return <XCircle size={14} />;
      case 'pendente': return <Clock size={14} />;
      case 'concluida': return <CheckCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return '-';
    return new Date(dataStr).toLocaleDateString('pt-BR');
  };

  const breadcrumbItems = [
    { label: 'Guaraúna', path: '/guarauna' },
    { label: 'Matrículas', path: '/guarauna/matriculas' }
  ];

  return (
    <div className="pagina-matriculas">
      <Navbar />
      <Breadcrumb items={breadcrumbItems} />

      <div className="matriculas-container">
        <div className="matriculas-header">
          <div className="header-info">
            <h1><FileText size={28} /> Matrículas</h1>
            <p>{totalItens} matrícula{totalItens !== 1 ? 's' : ''}</p>
          </div>

          <button className="btn-novo" onClick={() => abrirModal()}>
            <Plus size={18} />
            <span>Nova Matrícula</span>
          </button>
        </div>

        {/* Filtros */}
        <div className="matriculas-filtros">
          <div className="filtro-busca">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por nome do aluno..."
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

          <select
            value={statusFiltro}
            onChange={(e) => {
              setStatusFiltro(e.target.value);
              setPaginaAtual(1);
            }}
          >
            <option value="">Todos os status</option>
            {statusOptions.map(s => (
              <option key={s.valor} value={s.valor}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Tabela */}
        <div className="matriculas-tabela-wrapper">
          {carregando ? (
            <div className="carregando-container">
              <div className="spinner"></div>
              <p>Carregando matrículas...</p>
            </div>
          ) : matriculas.length === 0 ? (
            <div className="sem-dados">
              <FileText size={48} />
              <p>Nenhuma matrícula encontrada</p>
              <button className="btn-novo" onClick={() => abrirModal()}>
                <Plus size={18} />
                Criar primeira matrícula
              </button>
            </div>
          ) : (
            <table className="matriculas-tabela">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Comunidade</th>
                  <th>Ano</th>
                  <th>Data Matrícula</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {matriculas.map(matricula => (
                  <tr key={matricula.id}>
                    <td>
                      <div className="matricula-aluno">
                        <User size={16} />
                        <span>{matricula.aluno?.pessoa?.nome || 'Aluno'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="matricula-comunidade">
                        <MapPin size={14} />
                        <span>{matricula.aluno?.comunidade?.nome || '-'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge-ano">{matricula.ano}</span>
                    </td>
                    <td>{formatarData(matricula.dataMatricula)}</td>
                    <td>
                      <div className="status-wrapper">
                        <span 
                          className={`badge-status ${matricula.status}`}
                          style={{ '--status-color': statusOptions.find(s => s.valor === matricula.status)?.cor }}
                        >
                          {getStatusIcon(matricula.status)}
                          {statusOptions.find(s => s.valor === matricula.status)?.label || matricula.status}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="acoes-btns">
                        <button 
                          className="btn-acao ver" 
                          onClick={() => setModalVisualizacao({ aberto: true, matricula })}
                          title="Visualizar"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          className="btn-acao editar" 
                          onClick={() => abrirModal(matricula)}
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn-acao excluir" 
                          onClick={() => setModalConfirmacao({ aberto: true, matricula })}
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <div className="modal-conteudo" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {matriculaEditando ? 'Editar Matrícula' : 'Nova Matrícula'}
              </h2>
              <button className="btn-fechar" onClick={fecharModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grupo">
                <label>Aluno *</label>
                <select
                  value={formData.alunoId}
                  onChange={(e) => setFormData({ ...formData, alunoId: e.target.value })}
                  disabled={!!matriculaEditando}
                >
                  <option value="">Selecione um aluno</option>
                  {alunos.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.pessoa?.nome || a.nome} - {a.comunidade?.nome || 'Sem comunidade'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Ano *</label>
                  <select
                    value={formData.ano}
                    onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })}
                  >
                    {anosDisponiveis.map(ano => (
                      <option key={ano} value={ano}>{ano}</option>
                    ))}
                  </select>
                </div>

                <div className="form-grupo">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {statusOptions.map(s => (
                      <option key={s.valor} value={s.valor}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grupo">
                <label>Observações</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações sobre a matrícula..."
                  rows={4}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancelar" onClick={fecharModal}>
                Cancelar
              </button>
              <button 
                className="btn-salvar" 
                onClick={salvarMatricula}
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

      {/* Modal de Visualização */}
      {modalVisualizacao.aberto && (
        <div className="modal-overlay" onClick={() => setModalVisualizacao({ aberto: false, matricula: null })}>
          <div className="modal-conteudo" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalhes da Matrícula</h2>
              <button className="btn-fechar" onClick={() => setModalVisualizacao({ aberto: false, matricula: null })}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body visualizacao">
              <div className="detalhe-item">
                <label>Aluno</label>
                <span>{modalVisualizacao.matricula?.aluno?.pessoa?.nome}</span>
              </div>

              <div className="detalhe-item">
                <label>Comunidade</label>
                <span>{modalVisualizacao.matricula?.aluno?.comunidade?.nome || '-'}</span>
              </div>

              <div className="detalhe-row">
                <div className="detalhe-item">
                  <label>Ano</label>
                  <span>{modalVisualizacao.matricula?.ano}</span>
                </div>

                <div className="detalhe-item">
                  <label>Status</label>
                  <span 
                    className={`badge-status ${modalVisualizacao.matricula?.status}`}
                    style={{ '--status-color': statusOptions.find(s => s.valor === modalVisualizacao.matricula?.status)?.cor }}
                  >
                    {statusOptions.find(s => s.valor === modalVisualizacao.matricula?.status)?.label}
                  </span>
                </div>
              </div>

              <div className="detalhe-row">
                <div className="detalhe-item">
                  <label>Data da Matrícula</label>
                  <span>{formatarData(modalVisualizacao.matricula?.dataMatricula)}</span>
                </div>

                <div className="detalhe-item">
                  <label>Última Atualização</label>
                  <span>{formatarData(modalVisualizacao.matricula?.atualizadoEm)}</span>
                </div>
              </div>

              {modalVisualizacao.matricula?.observacoes && (
                <div className="detalhe-item">
                  <label>Observações</label>
                  <p className="observacoes-texto">{modalVisualizacao.matricula.observacoes}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn-cancelar" 
                onClick={() => setModalVisualizacao({ aberto: false, matricula: null })}
              >
                Fechar
              </button>
              <button 
                className="btn-editar" 
                onClick={() => {
                  const matricula = modalVisualizacao.matricula;
                  setModalVisualizacao({ aberto: false, matricula: null });
                  abrirModal(matricula);
                }}
              >
                <Edit2 size={16} />
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      {modalConfirmacao.aberto && (
        <div className="modal-overlay" onClick={() => setModalConfirmacao({ aberto: false, matricula: null })}>
          <div className="modal-confirmacao" onClick={e => e.stopPropagation()}>
            <h3>Confirmar Exclusão</h3>
            <p>
              Deseja realmente excluir a matrícula de <strong>{modalConfirmacao.matricula?.aluno?.pessoa?.nome}</strong> do ano <strong>{modalConfirmacao.matricula?.ano}</strong>?
            </p>
            <p className="aviso">Esta ação não pode ser desfeita.</p>
            <div className="modal-footer">
              <button 
                className="btn-cancelar" 
                onClick={() => setModalConfirmacao({ aberto: false, matricula: null })}
              >
                Cancelar
              </button>
              <button className="btn-excluir" onClick={excluirMatricula}>
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

export default PaginaMatriculasGuarauna;
