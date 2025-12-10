import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useGlobalToast } from '../contexto/ToastContext';
import Navbar from '../componentes/Navbar';
import Breadcrumb from '../componentes/Breadcrumb';
import { ModalConfirmacao } from '../componentes/ModalConfirmacao';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  User,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Save,
  Users
} from 'lucide-react';
import './PaginaResponsaveisGuarauna.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Função para calcular idade
const calcularIdade = (dataNascimento) => {
  if (!dataNascimento) return null;
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return Math.max(0, idade);
};

// Funções de formatação
const formatarCPF = (valor) => {
  if (!valor) return '';
  valor = valor.toString().replace(/\D/g, '').slice(0, 11);
  if (valor.length <= 3) return valor;
  if (valor.length <= 6) return `${valor.slice(0, 3)}.${valor.slice(3)}`;
  if (valor.length <= 9) return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6)}`;
  return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6, 9)}-${valor.slice(9)}`;
};

const formatarTelefone = (valor) => {
  if (!valor) return '';
  valor = valor.toString().replace(/\D/g, '').slice(0, 11);
  if (valor.length <= 2) return valor;
  if (valor.length <= 7) return `(${valor.slice(0, 2)}) ${valor.slice(2)}`;
  return `(${valor.slice(0, 2)}) ${valor.slice(2, 7)}-${valor.slice(7)}`;
};

const PaginaResponsaveisGuarauna = () => {
  const { usuario, token } = useAuth();
  const { adicionarToast } = useGlobalToast();
  const navegar = useNavigate();
  const dropdownRef = useRef(null);

  // Estados principais
  const [responsaveis, setResponsaveis] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const itensPorPagina = 15;

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [responsavelEditando, setResponsavelEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    rg: '',
    telefone: '',
    email: '',
    endereco: '',
    parentesco: '',
    profissao: '',
    localTrabalho: '',
    alunoIds: []
  });

  // Modal de confirmação
  const [modalConfirmacao, setModalConfirmacao] = useState({ aberto: false, responsavel: null });

  // Busca de pessoa existente
  const [buscaPessoa, setBuscaPessoa] = useState('');
  const [pessoasSugeridas, setPessoasSugeridas] = useState([]);
  const [todasPessoas, setTodasPessoas] = useState([]);
  const [pessoaSelecionada, setPessoaSelecionada] = useState(null);
  const [buscandoPessoas, setBuscandoPessoas] = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState(false);

  // Busca e filtro de alunos vinculados
  const [buscaAluno, setBuscaAluno] = useState('');
  const [comunidadeFiltroAlunos, setComunidadeFiltroAlunos] = useState('');
  const [comunidades, setComunidades] = useState([]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownAberto(false);
      }
    };

    if (dropdownAberto) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownAberto]);

  const parentescos = [
    'Mãe',
    'Pai',
    'Avó',
    'Avô',
    'Tia',
    'Tio',
    'Irmã',
    'Irmão',
    'Madrasta',
    'Padrasto',
    'Responsável Legal',
    'Outro'
  ];

  // Ordenar responsáveis alfabeticamente
  const ordenarResponsaveisAlfabeticamente = (listaResponsaveis) => {
    return [...listaResponsaveis].sort((a, b) => {
      const nomeA = (a.pessoa?.nome || a.nome || '').toLowerCase();
      const nomeB = (b.pessoa?.nome || b.nome || '').toLowerCase();
      return nomeA.localeCompare(nomeB, 'pt-BR');
    });
  };

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

  // Carregar alunos para vincular
  const carregarAlunos = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/guarauna/alunos?limite=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAlunos(data.alunos || data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    }
  }, [token]);

  // Carregar responsáveis
  const carregarResponsaveis = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({
        pagina: paginaAtual.toString(),
        limite: itensPorPagina.toString()
      });

      if (busca) params.append('busca', busca);

      const response = await fetch(`${API_URL}/api/guarauna/responsaveis?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const responsaveisCarregados = data.responsaveis || data || [];
        const responsaveisOrdenados = ordenarResponsaveisAlfabeticamente(responsaveisCarregados);
        setResponsaveis(responsaveisOrdenados);
        setTotalPaginas(data.totalPaginas || 1);
        setTotalItens(data.total || responsaveisCarregados.length);
      }
    } catch (error) {
      console.error('Erro ao carregar responsáveis:', error);
      adicionarToast('Erro ao carregar responsáveis', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [token, paginaAtual, busca, adicionarToast]);

  useEffect(() => {
    carregarAlunos();
    carregarComunidades();
  }, [carregarAlunos, carregarComunidades]);

  useEffect(() => {
    carregarResponsaveis();
  }, [carregarResponsaveis]);

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setPaginaAtual(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [busca]);

  // Buscar pessoas quando digitar
  useEffect(() => {
    const buscarPessoas = async () => {
      if (buscaPessoa.length < 2) {
        setPessoasSugeridas([]);
        return;
      }

      setBuscandoPessoas(true);
      try {
        const response = await fetch(`${API_URL}/api/pessoas?busca=${encodeURIComponent(buscaPessoa)}&limite=10`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPessoasSugeridas(data.pessoas || data || []);
        }
      } catch (error) {
        console.error('Erro ao buscar pessoas:', error);
      } finally {
        setBuscandoPessoas(false);
      }
    };

    const timer = setTimeout(buscarPessoas, 300);
    return () => clearTimeout(timer);
  }, [buscaPessoa, token]);

  // Selecionar pessoa existente
  const selecionarPessoa = (pessoa) => {
    // Validar se a pessoa tem 18 anos ou mais
    const idade = calcularIdade(pessoa.dataNascimento);
    if (idade !== null && idade < 18) {
      adicionarToast('O responsável deve ter pelo menos 18 anos', 'erro');
      return;
    }
    
    setPessoaSelecionada(pessoa);
    setBuscaPessoa('');
    setPessoasSugeridas([]);
    setDropdownAberto(false);
    
    setFormData({
      ...formData,
      nome: pessoa.nome || '',
      cpf: pessoa.cpf || '',
      rg: pessoa.rg || '',
      telefone: pessoa.telefone || '',
      email: pessoa.email || '',
      endereco: pessoa.endereco || '',
      pessoaId: pessoa.id
    });
  };

  // Limpar pessoa selecionada
  const limparPessoaSelecionada = () => {
    setPessoaSelecionada(null);
    setFormData({
      ...formData,
      nome: '',
      cpf: '',
      rg: '',
      telefone: '',
      email: '',
      endereco: '',
      pessoaId: null
    });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      nome: '',
      cpf: '',
      rg: '',
      telefone: '',
      email: '',
      endereco: '',
      parentesco: '',
      profissao: '',
      localTrabalho: '',
      alunoIds: [],
      pessoaId: null
    });
    setResponsavelEditando(null);
    setPessoaSelecionada(null);
    setBuscaPessoa('');
    setPessoasSugeridas([]);
    setDropdownAberto(false);
  };

  // Abrir modal
  const abrirModal = async (responsavel = null) => {
    // Mostrar feedback visual que está carregando
    setModalAberto(true);
    setSalvando(true);
    
    // Carregar todas as pessoas para o dropdown
    try {
      const response = await fetch(`${API_URL}/api/pessoas?limite=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const pessoas = data.pessoas || data || [];
        setTodasPessoas(pessoas);
      }
    } catch (error) {
      console.error('Erro ao carregar pessoas:', error);
    }

    if (responsavel) {
      setResponsavelEditando(responsavel);
      
      // Mapear IDs dos alunos - garantir que são strings (UUIDs)
      const alunosIds = responsavel.alunos?.map(rel => {
        const id = rel.alunoId || rel.aluno?.id || rel.id;
        return id ? String(id) : null;
      }).filter(id => id !== null && id !== undefined) || [];
      
      // Obter valores brutos (sem formatação)
      const cpfBruto = responsavel.pessoa?.cpf || responsavel.cpf || '';
      const telefoneBruto = responsavel.pessoa?.telefone || responsavel.telefone || '';
      const rgBruto = responsavel.pessoa?.rg || responsavel.rg || '';
      
      setFormData({
        nome: responsavel.pessoa?.nome || responsavel.nome || '',
        cpf: formatarCPF(cpfBruto),
        rg: rgBruto,
        telefone: formatarTelefone(telefoneBruto),
        email: responsavel.pessoa?.email || responsavel.email || '',
        endereco: responsavel.pessoa?.endereco || responsavel.endereco || '',
        parentesco: responsavel.parentesco || '',
        profissao: responsavel.profissao || '',
        localTrabalho: responsavel.localTrabalho || '',
        alunoIds: alunosIds,
        pessoaId: responsavel.pessoa?.id || responsavel.pessoaId
      });
    } else {
      resetForm();
    }
    
    // Remover feedback visual após carregar
    setSalvando(false);
  };

  // Fechar modal
  const fecharModal = () => {
    setModalAberto(false);
    resetForm();
  };

  // Salvar responsável
  const salvarResponsavel = async () => {
    if (!formData.nome.trim()) {
      adicionarToast('Nome é obrigatório', 'erro');
      return;
    }

    if (!formData.telefone.trim()) {
      adicionarToast('Telefone é obrigatório', 'erro');
      return;
    }

    setSalvando(true);
    try {
      const url = responsavelEditando 
        ? `${API_URL}/api/guarauna/responsaveis/${responsavelEditando.id}`
        : `${API_URL}/api/guarauna/responsaveis`;

      const response = await fetch(url, {
        method: responsavelEditando ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        adicionarToast(
          responsavelEditando ? 'Responsável atualizado com sucesso!' : 'Responsável cadastrado com sucesso!',
          'sucesso'
        );
        fecharModal();
        carregarResponsaveis();
      } else {
        const erro = await response.json();
        adicionarToast(erro.erro || 'Erro ao salvar responsável', 'erro');
      }
    } catch (error) {
      console.error('Erro ao salvar responsável:', error);
      adicionarToast('Erro ao salvar responsável', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  // Excluir responsável
  const excluirResponsavel = async () => {
    const { responsavel } = modalConfirmacao;
    try {
      const response = await fetch(`${API_URL}/api/guarauna/responsaveis/${responsavel.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        adicionarToast('Responsável excluído com sucesso!', 'sucesso');
        carregarResponsaveis();
      } else {
        const erro = await response.json();
        adicionarToast(erro.erro || 'Erro ao excluir responsável', 'erro');
      }
    } catch (error) {
      console.error('Erro ao excluir responsável:', error);
      adicionarToast('Erro ao excluir responsável', 'erro');
    } finally {
      setModalConfirmacao({ aberto: false, responsavel: null });
    }
  };

  // Toggle aluno no form - IDs são UUIDs (strings), não números!
  const toggleAluno = (alunoId) => {
    const idString = String(alunoId);
    
    setFormData(prev => {
      // Comparar como strings pois IDs são UUIDs
      const jaExiste = prev.alunoIds.some(id => String(id) === idString);
      
      const novosIds = jaExiste
        ? prev.alunoIds.filter(id => String(id) !== idString)
        : [...prev.alunoIds, idString];
      
      return {
        ...prev,
        alunoIds: novosIds
      };
    });
  };

  const breadcrumbItems = [
    { label: 'Guaraúna', path: '/guarauna' },
    { label: 'Responsáveis', path: '/guarauna/responsaveis' }
  ];

  return (
    <div className="pagina-responsaveis">
      <Navbar />
      <Breadcrumb items={breadcrumbItems} />

      <div className="responsaveis-container">
        <div className="responsaveis-header">
          <div className="header-info">
            <h1><UserCheck size={28} /> Responsáveis Legais</h1>
            <p>{totalItens} responsável(is) cadastrado(s)</p>
          </div>

          <button className="btn-novo" onClick={() => abrirModal()}>
            <Plus size={18} />
            <span>Novo Responsável</span>
          </button>
        </div>

        {/* Filtros */}
        <div className="responsaveis-filtros">
          <div className="filtro-busca">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou telefone..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="responsaveis-tabela-wrapper">
          {carregando ? (
            <div className="carregando-container">
              <div className="spinner"></div>
              <p>Carregando responsáveis...</p>
            </div>
          ) : responsaveis.length === 0 ? (
            <div className="sem-dados">
              <UserCheck size={48} />
              <p>Nenhum responsável encontrado</p>
              <button className="btn-novo" onClick={() => abrirModal()}>
                <Plus size={18} />
                Cadastrar primeiro responsável
              </button>
            </div>
          ) : (
            <div className="grid-responsaveis">
              {responsaveis.map(responsavel => {
                const nome = responsavel.pessoa?.nome || responsavel.nome;
                const telefone = responsavel.pessoa?.telefone || responsavel.telefone;
                const email = responsavel.pessoa?.email || responsavel.email;
                const cpf = responsavel.pessoa?.cpf || responsavel.cpf;
                
                return (
                  <div key={responsavel.id} className="card-responsavel">
                    <div className="card-responsavel-header">
                      <div className="card-responsavel-avatar">
                        {nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="card-responsavel-info-principal">
                        <h3 className="card-responsavel-nome">{nome}</h3>
                        {cpf && <span className="card-responsavel-cpf">CPF: {cpf}</span>}
                      </div>
                    </div>
                    
                    {responsavel.parentesco && (
                      <span className="badge-parentesco">{responsavel.parentesco}</span>
                    )}
                    
                    <div className="card-responsavel-body">
                      <div className="card-responsavel-detalhes">
                        {telefone && (
                          <div className="card-responsavel-detalhe">
                            <Phone size={14} />
                            <span>{telefone}</span>
                          </div>
                        )}
                        {email && (
                          <div className="card-responsavel-detalhe">
                            <Mail size={14} />
                            <span>{email}</span>
                          </div>
                        )}
                        <div className="card-responsavel-detalhe">
                          <Users size={14} />
                          {responsavel.alunos?.length > 0 ? (
                            <div className="alunos-badges">
                              {responsavel.alunos.map(rel => (
                                <span key={rel.alunoId || rel.id} className="badge-aluno-mini">
                                  {rel.aluno?.pessoa?.nome || rel.aluno?.nome || 'Aluno'}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="sem-alunos-vinculados">Nenhum aluno vinculado</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="card-responsavel-footer">
                      <button 
                        className="btn-card-acao editar"
                        onClick={() => abrirModal(responsavel)}
                        title="Editar"
                      >
                        <Edit2 size={14} />
                        Editar
                      </button>
                      <button 
                        className="btn-card-acao excluir"
                        onClick={() => setModalConfirmacao({ aberto: true, responsavel })}
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
                {responsavelEditando ? 'Editar Responsável' : 'Novo Responsável'}
              </h2>
              <button className="btn-fechar" onClick={fecharModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Busca de Pessoa Existente */}
              {!responsavelEditando && (
                <div className="pessoa-busca-container">
                  <label><User size={16} /> Buscar pessoa já cadastrada</label>
                  
                  {pessoaSelecionada ? (
                    <div className="pessoa-selecionada">
                      <User size={24} />
                      <div className="pessoa-selecionada-info">
                        <div className="pessoa-selecionada-nome">{pessoaSelecionada.nome}</div>
                        <div className="pessoa-selecionada-detalhes">
                          {pessoaSelecionada.comunidade && `${pessoaSelecionada.comunidade}`}
                          {pessoaSelecionada.cpf && ` • CPF: ${pessoaSelecionada.cpf}`}
                        </div>
                      </div>
                      <button type="button" className="btn-limpar-pessoa" onClick={limparPessoaSelecionada}>
                        Limpar
                      </button>
                    </div>
                  ) : (
                    <div className="pessoa-dropdown-container" ref={dropdownRef}>
                      <div 
                        className={`pessoa-dropdown-trigger ${dropdownAberto ? 'aberto' : ''}`}
                        onClick={() => {
                          setDropdownAberto(!dropdownAberto);
                          if (!dropdownAberto) {
                            setPessoasSugeridas(todasPessoas);
                          }
                        }}
                      >
                        <Search size={18} />
                        <span>Clique para selecionar uma pessoa...</span>
                        <ChevronDown size={18} className={`chevron ${dropdownAberto ? 'rotacionado' : ''}`} />
                      </div>
                      
                      {dropdownAberto && (
                        <div className="pessoa-dropdown-menu">
                          <div className="pessoa-dropdown-busca">
                            <Search size={16} />
                            <input
                              type="text"
                              value={buscaPessoa}
                              onChange={(e) => setBuscaPessoa(e.target.value)}
                              placeholder="Filtrar por nome ou CPF..."
                              autoFocus
                            />
                          </div>
                          
                          <div className="pessoa-dropdown-lista">
                            {(buscaPessoa.length >= 2 ? pessoasSugeridas : todasPessoas).length === 0 ? (
                              <div className="pessoa-dropdown-vazio">
                                {buscandoPessoas ? 'Buscando...' : 'Nenhuma pessoa encontrada'}
                              </div>
                            ) : (
                              (buscaPessoa.length >= 2 ? pessoasSugeridas : todasPessoas).map(pessoa => (
                                <div 
                                  key={pessoa.id} 
                                  className="pessoa-dropdown-item"
                                  onClick={() => selecionarPessoa(pessoa)}
                                >
                                  <User size={16} />
                                  <div className="pessoa-dropdown-item-info">
                                    <div className="pessoa-dropdown-item-nome">{pessoa.nome}</div>
                                    <div className="pessoa-dropdown-item-detalhes">
                                      {pessoa.comunidade || 'Sem comunidade'}
                                      {pessoa.cpf && ` • CPF: ${pessoa.cpf}`}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="form-row">
                <div className="form-grupo flex-2">
                  <label>Nome Completo *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome completo do responsável"
                  />
                </div>

                <div className="form-grupo">
                  <label>Parentesco</label>
                  <select
                    value={formData.parentesco}
                    onChange={(e) => setFormData({ ...formData, parentesco: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    {parentescos.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>CPF</label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: formatarCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="form-grupo">
                  <label>RG</label>
                  <input
                    type="text"
                    value={formData.rg}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    placeholder="RG"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Telefone *</label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: formatarTelefone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="form-grupo">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="form-grupo">
                <label>Endereço</label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Endereço completo"
                />
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Profissão</label>
                  <input
                    type="text"
                    value={formData.profissao}
                    onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                    placeholder="Ex: Professor, Agricultor, etc."
                  />
                </div>

                <div className="form-grupo">
                  <label>Local de Trabalho</label>
                  <input
                    type="text"
                    value={formData.localTrabalho}
                    onChange={(e) => setFormData({ ...formData, localTrabalho: e.target.value })}
                    placeholder="Nome da empresa ou local"
                  />
                </div>
              </div>

              <div className="form-grupo alunos-vinculados-container">
                <label className="label-alunos-vinculados">
                  <Users size={16} />
                  Alunos Vinculados
                </label>
                
                {/* Filtros de busca */}
                <div className="alunos-filtros-inline">
                  <div className="filtro-busca-alunos">
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="Buscar aluno por nome..."
                      value={buscaAluno}
                      onChange={(e) => setBuscaAluno(e.target.value)}
                    />
                  </div>
                  <select
                    value={comunidadeFiltroAlunos}
                    onChange={(e) => setComunidadeFiltroAlunos(e.target.value)}
                    className="filtro-comunidade-alunos"
                  >
                    <option value="">Todas as comunidades</option>
                    {comunidades.map(c => (
                      <option key={c.id} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Alunos selecionados (tags) */}
                {formData.alunoIds.length > 0 && (
                  <div className="alunos-selecionados">
                    {formData.alunoIds.map(alunoId => {
                      // Comparar como strings pois IDs são UUIDs
                      const aluno = alunos.find(a => String(a.id) === String(alunoId));
                      const nome = aluno?.pessoa?.nome || aluno?.nome || `ID: ${alunoId}`;
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
                )}

                {/* Lista de alunos filtrada */}
                <div className="alunos-lista-selecao">
                  {alunos.length === 0 ? (
                    <p className="sem-alunos-msg">Nenhum aluno cadastrado ainda</p>
                  ) : (
                    alunos
                      // Filtrar próprio responsável
                      .filter(aluno => {
                        const pessoaIdAluno = aluno.pessoa?.id || aluno.pessoaId;
                        const pessoaIdResponsavel = formData.pessoaId || pessoaSelecionada?.id;
                        return pessoaIdAluno !== pessoaIdResponsavel;
                      })
                      // Filtrar por busca
                      .filter(aluno => {
                        if (!buscaAluno) return true;
                        const nome = (aluno.pessoa?.nome || aluno.nome || '').toLowerCase();
                        return nome.includes(buscaAluno.toLowerCase());
                      })
                      // Filtrar por comunidade
                      .filter(aluno => {
                        if (!comunidadeFiltroAlunos) return true;
                        const comunidade = aluno.pessoa?.comunidade || aluno.comunidade || '';
                        return comunidade === comunidadeFiltroAlunos;
                      })
                      .map(aluno => {
                        const nome = aluno.pessoa?.nome || aluno.nome;
                        const comunidade = aluno.pessoa?.comunidade || aluno.comunidade;
                        // Comparar como strings pois IDs são UUIDs
                        const alunoIdStr = String(aluno.id);
                        const selecionado = formData.alunoIds.some(id => String(id) === alunoIdStr);
                        
                        return (
                          <div 
                            key={aluno.id} 
                            className={`aluno-item-selecao ${selecionado ? 'selecionado' : ''}`}
                            onClick={() => toggleAluno(aluno.id)}
                          >
                            <input
                              type="checkbox"
                              checked={selecionado}
                              onChange={() => toggleAluno(aluno.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="aluno-item-info">
                              <span className="aluno-item-nome">{nome}</span>
                              {comunidade && <span className="aluno-item-comunidade">{comunidade}</span>}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancelar" onClick={fecharModal}>
                Cancelar
              </button>
              <button 
                className="btn-salvar" 
                onClick={salvarResponsavel}
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
        onCancelar={() => setModalConfirmacao({ aberto: false, responsavel: null })}
        onConfirmar={excluirResponsavel}
        titulo="Confirmar Exclusão"
        mensagem={`Deseja realmente excluir o responsável ${modalConfirmacao.responsavel?.pessoa?.nome || modalConfirmacao.responsavel?.nome || ''}?`}
        tipo="deletar"
        botaoPrincipalTexto="Excluir"
        botaoCancelarTexto="Cancelar"
      />
    </div>
  );
};

export default PaginaResponsaveisGuarauna;
