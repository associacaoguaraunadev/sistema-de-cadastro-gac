import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useGlobalToast } from '../contexto/ToastContext';
import Navbar from '../componentes/Navbar';
import Breadcrumb from '../componentes/Breadcrumb';
import { 
  User, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MapPin,
  Phone,
  Mail,
  GraduationCap,
  Music,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  FileText
} from 'lucide-react';
import './PaginaProfessoresGuarauna.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PaginaProfessoresGuarauna = () => {
  const { token } = useAuth();
  const { adicionarToast } = useGlobalToast();
  const navegar = useNavigate();

  // Estados principais
  const [professores, setProfessores] = useState([]);
  const [comunidades, setComunidades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [comunidadeFiltro, setComunidadeFiltro] = useState('');
  const [instrumentoFiltro, setInstrumentoFiltro] = useState('');

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const itensPorPagina = 15;

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [professorEditando, setProfessorEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    instrumento: '',
    formacao: '',
    comunidadeIds: []
  });

  // Modal de confirmação
  const [modalConfirmacao, setModalConfirmacao] = useState({ aberto: false, professor: null });

  const instrumentos = [
    'Violino', 'Viola', 'Violoncelo', 'Contrabaixo', 'Flauta', 'Clarinete',
    'Oboé', 'Fagote', 'Trompete', 'Trombone', 'Trompa', 'Tuba',
    'Piano', 'Percussão', 'Violão', 'Canto', 'Teoria Musical', 'Regência', 'Outro'
  ];

  // Carregar comunidades
  const carregarComunidades = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/comunidades`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setComunidades(data);
      }
    } catch (error) {
      console.error('Erro ao carregar comunidades:', error);
    }
  }, [token]);

  // Carregar professores
  const carregarProfessores = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({
        pagina: paginaAtual.toString(),
        limite: itensPorPagina.toString()
      });

      if (busca) params.append('busca', busca);
      if (comunidadeFiltro) params.append('comunidadeId', comunidadeFiltro);
      if (instrumentoFiltro) params.append('instrumento', instrumentoFiltro);

      const response = await fetch(`${API_URL}/api/guarauna/professores?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProfessores(data.professores || []);
        setTotalPaginas(data.totalPaginas || 1);
        setTotalItens(data.total || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar professores:', error);
      adicionarToast('Erro ao carregar professores', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [token, paginaAtual, busca, comunidadeFiltro, instrumentoFiltro, adicionarToast]);

  useEffect(() => {
    carregarComunidades();
  }, [carregarComunidades]);

  useEffect(() => {
    carregarProfessores();
  }, [carregarProfessores]);

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
      email: '',
      telefone: '',
      instrumento: '',
      formacao: '',
      comunidadeIds: []
    });
    setProfessorEditando(null);
  };

  // Abrir modal
  const abrirModal = (professor = null) => {
    if (professor) {
      setProfessorEditando(professor);
      setFormData({
        nome: professor.nome || '',
        email: professor.email || '',
        telefone: professor.telefone || '',
        instrumento: professor.instrumento || '',
        formacao: professor.formacao || '',
        comunidadeIds: professor.comunidades?.map(c => c.comunidade?.id || c.comunidadeId) || []
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

  // Salvar professor
  const salvarProfessor = async () => {
    if (!formData.nome.trim()) {
      adicionarToast('Nome é obrigatório', 'erro');
      return;
    }

    if (!formData.instrumento) {
      adicionarToast('Instrumento é obrigatório', 'erro');
      return;
    }

    if (formData.comunidadeIds.length === 0) {
      adicionarToast('Selecione pelo menos uma comunidade', 'erro');
      return;
    }

    setSalvando(true);
    try {
      const url = professorEditando 
        ? `${API_URL}/api/guarauna/professores/${professorEditando.id}`
        : `${API_URL}/api/guarauna/professores`;

      const response = await fetch(url, {
        method: professorEditando ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        adicionarToast(
          professorEditando ? 'Professor atualizado com sucesso!' : 'Professor criado com sucesso!',
          'sucesso'
        );
        fecharModal();
        carregarProfessores();
      } else {
        const erro = await response.json();
        adicionarToast(erro.erro || 'Erro ao salvar professor', 'erro');
      }
    } catch (error) {
      console.error('Erro ao salvar professor:', error);
      adicionarToast('Erro ao salvar professor', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  // Excluir professor
  const excluirProfessor = async () => {
    const { professor } = modalConfirmacao;
    try {
      const response = await fetch(`${API_URL}/api/guarauna/professores/${professor.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        adicionarToast('Professor excluído com sucesso!', 'sucesso');
        carregarProfessores();
      } else {
        const erro = await response.json();
        adicionarToast(erro.erro || 'Erro ao excluir professor', 'erro');
      }
    } catch (error) {
      console.error('Erro ao excluir professor:', error);
      adicionarToast('Erro ao excluir professor', 'erro');
    } finally {
      setModalConfirmacao({ aberto: false, professor: null });
    }
  };

  // Toggle comunidade no form
  const toggleComunidade = (comunidadeId) => {
    setFormData(prev => ({
      ...prev,
      comunidadeIds: prev.comunidadeIds.includes(comunidadeId)
        ? prev.comunidadeIds.filter(id => id !== comunidadeId)
        : [...prev.comunidadeIds, comunidadeId]
    }));
  };

  const breadcrumbItems = [
    { label: 'Guaraúna', path: '/guarauna' },
    { label: 'Professores', path: '/guarauna/professores' }
  ];

  return (
    <div className="pagina-professores">
      <Navbar />
      <Breadcrumb items={breadcrumbItems} />

      <div className="professores-container">
        <div className="professores-header">
          <div className="header-info">
            <h1><GraduationCap size={28} /> Professores</h1>
            <p>{totalItens} professor{totalItens !== 1 ? 'es' : ''} cadastrado{totalItens !== 1 ? 's' : ''}</p>
          </div>

          <button className="btn-novo" onClick={() => abrirModal()}>
            <Plus size={18} />
            <span>Novo Professor</span>
          </button>
        </div>

        {/* Filtros */}
        <div className="professores-filtros">
          <div className="filtro-busca">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por nome, email..."
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
            value={instrumentoFiltro}
            onChange={(e) => {
              setInstrumentoFiltro(e.target.value);
              setPaginaAtual(1);
            }}
          >
            <option value="">Todos os instrumentos</option>
            {instrumentos.map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>

        {/* Tabela */}
        <div className="professores-tabela-wrapper">
          {carregando ? (
            <div className="carregando-container">
              <div className="spinner"></div>
              <p>Carregando professores...</p>
            </div>
          ) : professores.length === 0 ? (
            <div className="sem-dados">
              <GraduationCap size={48} />
              <p>Nenhum professor encontrado</p>
              <button className="btn-novo" onClick={() => abrirModal()}>
                <Plus size={18} />
                Adicionar primeiro professor
              </button>
            </div>
          ) : (
            <table className="professores-tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Instrumento</th>
                  <th>Contato</th>
                  <th>Comunidades</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {professores.map(professor => (
                  <tr key={professor.id}>
                    <td>
                      <div className="professor-nome">
                        <User size={16} />
                        <span>{professor.nome}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge-instrumento">
                        <Music size={14} />
                        {professor.instrumento}
                      </span>
                    </td>
                    <td>
                      <div className="professor-contato">
                        {professor.email && (
                          <span><Mail size={14} /> {professor.email}</span>
                        )}
                        {professor.telefone && (
                          <span><Phone size={14} /> {professor.telefone}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="professor-comunidades">
                        {professor.comunidades?.map(pc => (
                          <span key={pc.comunidade?.id || pc.comunidadeId} className="badge-comunidade">
                            <MapPin size={12} />
                            {pc.comunidade?.nome || 'Comunidade'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="acoes-btns">
                        <button 
                          className="btn-acao editar" 
                          onClick={() => abrirModal(professor)}
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn-acao excluir" 
                          onClick={() => setModalConfirmacao({ aberto: true, professor })}
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
                {professorEditando ? 'Editar Professor' : 'Novo Professor'}
              </h2>
              <button className="btn-fechar" onClick={fecharModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grupo">
                <label>Nome *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome completo do professor"
                />
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div className="form-grupo">
                  <label>Telefone</label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Instrumento *</label>
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

                <div className="form-grupo">
                  <label>Formação</label>
                  <input
                    type="text"
                    value={formData.formacao}
                    onChange={(e) => setFormData({ ...formData, formacao: e.target.value })}
                    placeholder="Ex: Bacharelado em Música"
                  />
                </div>
              </div>

              <div className="form-grupo">
                <label>Comunidades de atuação *</label>
                <div className="comunidades-grid">
                  {comunidades.map(c => (
                    <label key={c.id} className="comunidade-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.comunidadeIds.includes(c.id)}
                        onChange={() => toggleComunidade(c.id)}
                      />
                      <span>{c.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancelar" onClick={fecharModal}>
                Cancelar
              </button>
              <button 
                className="btn-salvar" 
                onClick={salvarProfessor}
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
        <div className="modal-overlay" onClick={() => setModalConfirmacao({ aberto: false, professor: null })}>
          <div className="modal-confirmacao" onClick={e => e.stopPropagation()}>
            <h3>Confirmar Exclusão</h3>
            <p>
              Deseja realmente excluir o professor <strong>{modalConfirmacao.professor?.nome}</strong>?
            </p>
            <p className="aviso">Esta ação não pode ser desfeita.</p>
            <div className="modal-footer">
              <button 
                className="btn-cancelar" 
                onClick={() => setModalConfirmacao({ aberto: false, professor: null })}
              >
                Cancelar
              </button>
              <button className="btn-excluir" onClick={excluirProfessor}>
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

export default PaginaProfessoresGuarauna;
