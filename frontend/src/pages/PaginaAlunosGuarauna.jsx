import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useGlobalToast } from '../contexto/ToastContext';
import Navbar from '../componentes/Navbar';
import Breadcrumb from '../componentes/Breadcrumb';
import { ModalConfirmacao } from '../componentes/ModalConfirmacao';
import { GraduacaoSelectOptions, getGraduacaoLabel, getCategoria } from '../utils/graduacoesCapoeira';
import { 
  ArrowLeft,
  Search,
  ChevronRight,
  ChevronDown,
  User,
  UserCheck
} from 'lucide-react';
import './PaginaAlunosGuarauna.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

const PaginaAlunosGuarauna = () => {
  const { usuario, token } = useAuth();
  const { adicionarToast } = useGlobalToast();
  const navegar = useNavigate();
  
  // Estados principais
  const [alunos, setAlunos] = useState([]);
  const [comunidades, setComunidades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState({ comunidade: '', ativo: 'true' });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const itensPorPagina = 15;
  
  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    dataNascimento: '',
    cpf: '',
    rg: '',
    telefone: '',
    email: '',
    comunidade: '',
    endereco: '',
    graduacaoAtual: '',
    // Campos de saúde
    ubs: '',
    numeroSUS: '',
    doencas: '',
    alergias: '',
    medicamentos: '',
    necessidadesEspeciais: '',
    observacoes: ''
  });
  
  // Modal de confirmação
  const [modalDeletar, setModalDeletar] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);

  // Busca de pessoa existente
  const [buscaPessoa, setBuscaPessoa] = useState('');
  const [pessoasSugeridas, setPessoasSugeridas] = useState([]);
  const [todasPessoas, setTodasPessoas] = useState([]);
  const [pessoaSelecionada, setPessoaSelecionada] = useState(null);
  const [buscandoPessoas, setBuscandoPessoas] = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const dropdownRef = useRef(null);

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

  // Carregar comunidades
  const carregarComunidades = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/comunidades`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Comunidades carregadas:', data);
        // Garantir que data seja um array
        if (Array.isArray(data)) {
          setComunidades(data);
        } else if (data.comunidades) {
          setComunidades(data.comunidades);
        } else {
          setComunidades([]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar comunidades:', error);
    }
  }, [token]);

  // Ordenar alunos alfabeticamente
  const ordenarAlunosAlfabeticamente = (listaAlunos) => {
    return [...listaAlunos].sort((a, b) => {
      const nomeA = (a.pessoa?.nome || a.nome || '').toLowerCase();
      const nomeB = (b.pessoa?.nome || b.nome || '').toLowerCase();
      return nomeA.localeCompare(nomeB, 'pt-BR');
    });
  };

  // Carregar alunos
  const carregarAlunos = useCallback(async () => {
    setCarregando(true);
    console.log('carregarAlunos chamado');
    try {
      const params = new URLSearchParams({
        pagina: paginaAtual.toString(),
        limite: itensPorPagina.toString()
      });
      if (filtros.comunidade) params.append('comunidade', filtros.comunidade);
      if (filtros.ativo) params.append('ativo', filtros.ativo);
      if (busca) params.append('busca', busca);

      const resposta = await fetch(`${API_URL}/guarauna/alunos?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Resposta da API alunos:', resposta);
      if (resposta.ok) {
        const dados = await resposta.json();
        console.log('Dados recebidos:', dados);
        const alunosCarregados = dados.alunos || dados || [];
        const alunosOrdenados = ordenarAlunosAlfabeticamente(alunosCarregados);
        setAlunos(alunosOrdenados);
        setTotalPaginas(dados.totalPaginas || 1);
        setTotalItens(dados.total || alunosCarregados.length);
        if (!Array.isArray(alunosCarregados)) {
          adicionarToast('Resposta do backend inválida: alunos não é array', 'erro');
        }
      } else {
        adicionarToast('Erro ao buscar alunos: resposta não OK', 'erro');
      }
    } catch (erro) {
      console.error('Erro ao carregar alunos:', erro);
      adicionarToast('Erro ao carregar alunos', 'erro');
    } finally {
      setCarregando(false);
      console.log('carregando definido como false');
    }
  }, [token, paginaAtual, filtros, busca, adicionarToast]);

  useEffect(() => {
    carregarComunidades();
  }, [carregarComunidades]);

  useEffect(() => {
    carregarAlunos();
  }, [carregarAlunos]);

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
        // Se dropdown está aberto e tem todas as pessoas, filtra localmente
        if (dropdownAberto && todasPessoas.length > 0) {
          setPessoasSugeridas(todasPessoas);
        } else {
          setPessoasSugeridas([]);
        }
        return;
      }

      // Filtrar localmente se já temos todas as pessoas
      if (todasPessoas.length > 0) {
        const filtradas = todasPessoas.filter(p => 
          p.nome?.toLowerCase().includes(buscaPessoa.toLowerCase()) ||
          p.cpf?.includes(buscaPessoa)
        );
        setPessoasSugeridas(filtradas);
        return;
      }

      setBuscandoPessoas(true);
      try {
        const response = await fetch(`${API_URL}/pessoas?busca=${encodeURIComponent(buscaPessoa)}&limite=10`, {
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
    setPessoaSelecionada(pessoa);
    setBuscaPessoa('');
    setPessoasSugeridas([]);
    setDropdownAberto(false);
    
    // Preencher o formulário com os dados da pessoa
    setFormData({
      ...formData,
      nome: pessoa.nome || '',
      dataNascimento: pessoa.dataNascimento?.split('T')[0] || '',
      cpf: pessoa.cpf || '',
      rg: pessoa.rg || '',
      telefone: pessoa.telefone || '',
      email: pessoa.email || '',
      comunidade: pessoa.comunidade || '',
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
      dataNascimento: '',
      cpf: '',
      rg: '',
      telefone: '',
      email: '',
      comunidade: '',
      endereco: '',
      pessoaId: null
    });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      nome: '',
      dataNascimento: '',
      cpf: '',
      rg: '',
      telefone: '',
      email: '',
      comunidade: '',
      endereco: '',
      graduacaoAtual: '',
      ubs: '',
      numeroSUS: '',
      doencas: '',
      alergias: '',
      medicamentos: '',
      necessidadesEspeciais: '',
      observacoes: '',
      pessoaId: null
    });
    setAlunoEditando(null);
    setPessoaSelecionada(null);
    setBuscaPessoa('');
    setPessoasSugeridas([]);
    setDropdownAberto(false);
  };

  // Abrir modal
  const abrirModal = async (aluno = null) => {
    // Mostrar feedback visual que está carregando
    setModalAberto(true);
    setSalvando(true);
    
    // Carregar todas as pessoas para o dropdown
    try {
      const response = await fetch(`${API_URL}/pessoas?limite=1000`, {
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

    if (aluno) {
      setAlunoEditando(aluno);
      setFormData({
        nome: aluno.pessoa?.nome || aluno.nome || '',
        dataNascimento: aluno.pessoa?.dataNascimento?.split('T')[0] || aluno.dataNascimento?.split('T')[0] || '',
        cpf: aluno.pessoa?.cpf || aluno.cpf || '',
        rg: aluno.pessoa?.rg || aluno.rg || '',
        telefone: aluno.pessoa?.telefone || aluno.telefone || '',
        email: aluno.pessoa?.email || aluno.email || '',
        comunidade: aluno.pessoa?.comunidade || aluno.comunidade || '',
        endereco: aluno.pessoa?.endereco || aluno.endereco || '',
        graduacaoAtual: aluno.graduacaoAtual || '',
        ubs: aluno.ubs || '',
        numeroSUS: aluno.numeroSUS || '',
        doencas: aluno.doencas || '',
        alergias: aluno.alergias || '',
        medicamentos: aluno.medicamentos || '',
        necessidadesEspeciais: aluno.necessidadesEspeciais || '',
        observacoes: aluno.pessoa?.observacoes || aluno.observacoes || ''
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

  // Salvar aluno
  const salvarAluno = async () => {
    if (!formData.nome.trim()) {
      adicionarToast('Nome é obrigatório', 'erro');
      return;
    }

    if (!formData.comunidade) {
      adicionarToast('Comunidade é obrigatória', 'erro');
      return;
    }

    setSalvando(true);
    try {
      const url = alunoEditando 
        ? `${API_URL}/guarauna/alunos/${alunoEditando.id}`
        : `${API_URL}/guarauna/alunos`;

      const response = await fetch(url, {
        method: alunoEditando ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        adicionarToast(
          alunoEditando ? 'Aluno atualizado com sucesso!' : 'Aluno cadastrado com sucesso!',
          'sucesso'
        );
        fecharModal();
        carregarAlunos();
      } else {
        const erro = await response.json();
        adicionarToast(erro.erro || 'Erro ao salvar aluno', 'erro');
      }
    } catch (error) {
      console.error('Erro ao salvar aluno:', error);
      adicionarToast('Erro ao salvar aluno', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  const deletarAluno = async () => {
    if (!alunoSelecionado) return;

    try {
      const resposta = await fetch(`${API_URL}/guarauna/alunos/${alunoSelecionado.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (resposta.ok) {
        adicionarToast('Aluno removido com sucesso', 'sucesso');
        carregarAlunos();
      } else {
        const erro = await resposta.json();
        adicionarToast(erro.erro || 'Erro ao remover aluno', 'erro');
      }
    } catch (erro) {
      adicionarToast('Erro ao remover aluno', 'erro');
    } finally {
      setModalDeletar(false);
      setAlunoSelecionado(null);
    }
  };

  const calcularIdade = (dataNascimento) => {
    if (!dataNascimento) return null;
    const nascimento = new Date(dataNascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const breadcrumbItems = [
    { label: 'Guaraúna', path: '/guarauna' },
    { label: 'Alunos', path: '/guarauna/alunos' }
  ];

  return (
    <div className="pagina-alunos-guarauna">
      <Navbar />
      <Breadcrumb items={breadcrumbItems} />
      
      <div className="alunos-container">
        <div className="alunos-header">
          <div className="header-info">
            <h1><User size={28} /> Alunos</h1>
            <p>{totalItens} aluno{totalItens !== 1 ? 's' : ''} cadastrado{totalItens !== 1 ? 's' : ''}</p>
          </div>

          {usuario?.funcao === 'admin' && (
            <button className="btn-novo" onClick={() => abrirModal()}>
              <Plus size={18} />
              <span>Novo Aluno</span>
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="alunos-filtros">
          <div className="filtro-busca">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <select
            value={filtros.comunidade}
            onChange={(e) => {
              setFiltros({ ...filtros, comunidade: e.target.value });
              setPaginaAtual(1);
            }}
          >
            <option value="">Todas as comunidades</option>
            {comunidades.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          <select
            value={filtros.ativo}
            onChange={(e) => {
              setFiltros({ ...filtros, ativo: e.target.value });
              setPaginaAtual(1);
            }}
          >
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
            <option value="">Todos</option>
          </select>
        </div>

        {/* Lista de Alunos */}
        {carregando ? (
          <div className="carregando-container">
            <div className="spinner"></div>
            <p>Carregando alunos...</p>
          </div>
        ) : alunos.length === 0 ? (
          <div className="sem-dados">
            <User size={48} />
            <p>Nenhum aluno encontrado</p>
            {usuario?.funcao === 'admin' && (
              <button className="btn-novo" onClick={() => abrirModal()}>
                <Plus size={18} />
                Cadastrar primeiro aluno
                </button>
              )}
            </div>
          ) : (
            <div className="grid-alunos">
              {alunos.map(aluno => {
                const nome = aluno.pessoa?.nome || aluno.nome;
                const idade = calcularIdade(aluno.pessoa?.dataNascimento || aluno.dataNascimento);
                const comunidadeNome = aluno.pessoa?.comunidade || aluno.comunidade;
                const telefone = aluno.pessoa?.telefone || aluno.telefone;
                const temAlerta = aluno.doencas || aluno.alergias || aluno.necessidadesEspeciais;
                const dadosSaude = [];
                
                if (aluno.doencas) dadosSaude.push(`Doenças: ${aluno.doencas}`);
                if (aluno.alergias) dadosSaude.push(`Alergias: ${aluno.alergias}`);
                if (aluno.necessidadesEspeciais) dadosSaude.push(`Necessidades especiais: ${aluno.necessidadesEspeciais}`);
                
                return (
                  <div key={aluno.id} className={`card-aluno ${!aluno.ativo ? 'inativo' : ''}`}>
                    <div className="card-aluno-header">
                      <div className="card-aluno-avatar">
                        {nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="card-aluno-info-principal">
                        <h3 className="card-aluno-nome">{nome}</h3>
                        <span className="card-aluno-idade">{idade ? `${idade} anos` : '-'}</span>
                      </div>
                    </div>
                    
                    <span className={`card-aluno-status ${aluno.ativo ? 'ativo' : 'inativo'}`}>
                      {aluno.ativo ? 'ATIVO' : 'INATIVO'}
                    </span>
                    
                    <div className="card-aluno-body">
                      <div className="card-aluno-detalhes">
                        <div className="card-aluno-detalhe">
                          <MapPin size={14} />
                          <span>{comunidadeNome || '-'}</span>
                        </div>
                        <div className="card-aluno-detalhe">
                          <Phone size={14} />
                          <span>{telefone || '-'}</span>
                        </div>
                        {aluno.graduacaoAtual && (
                          <div className="card-aluno-detalhe">
                            <Award size={14} />
                            <span className="badge-graduacao-card">{aluno.graduacaoAtual}</span>
                          </div>
                        )}
                        {aluno.responsaveis?.length > 0 && (
                          <div className="card-aluno-detalhe">
                            <UserCheck size={14} />
                            <span>{aluno.responsaveis.find(r => r.principal)?.nome || aluno.responsaveis[0]?.nome}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="card-aluno-footer">
                      {temAlerta && (
                        <div className="saude-tooltip">
                          <Heart size={16} className="saude-tooltip-icon" />
                          <div className="saude-tooltip-content">
                            {dadosSaude.join(' • ')}
                          </div>
                        </div>
                      )}
                      <button 
                        className="btn-card-acao editar"
                        onClick={() => abrirModal(aluno)}
                        title="Editar"
                      >
                        <Edit2 size={14} />
                        Editar
                      </button>
                      {usuario?.funcao === 'admin' && (
                        <button 
                          className="btn-card-acao excluir"
                          onClick={() => {
                            setAlunoSelecionado(aluno);
                            setModalDeletar(true);
                          }}
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
              <h2>{alunoEditando ? 'Editar Aluno' : 'Novo Aluno'}</h2>
              <button className="btn-fechar" onClick={fecharModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Busca de Pessoa Existente */}
              {!alunoEditando && (
                <div className="pessoa-busca-container">
                  <label><UserCheck size={16} /> Selecionar pessoa cadastrada</label>
                  
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
                    placeholder="Nome completo do aluno"
                  />
                </div>

                <div className="form-grupo">
                  <label>Data de Nascimento</label>
                  <input
                    type="date"
                    value={formData.dataNascimento}
                    onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                  />
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
                    placeholder="RG do aluno"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Telefone</label>
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

              <div className="form-row">
                <div className="form-grupo">
                  <label>Comunidade *</label>
                  <select
                    value={formData.comunidade}
                    onChange={(e) => setFormData({ ...formData, comunidade: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    {comunidades.map(c => (
                      <option key={c.id} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="form-grupo">
                  <label>Graduação Atual</label>
                  <select
                    value={formData.graduacaoAtual}
                    onChange={(e) => setFormData({ ...formData, graduacaoAtual: e.target.value })}
                  >
                    <GraduacaoSelectOptions />
                  </select>
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

              <div className="form-secao">
                <h4><Heart size={16} /> Informações de Saúde</h4>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>UBS (Unidade Básica de Saúde)</label>
                  <input
                    type="text"
                    value={formData.ubs}
                    onChange={(e) => setFormData({ ...formData, ubs: e.target.value })}
                    placeholder="Nome da UBS"
                  />
                </div>

                <div className="form-grupo">
                  <label>Número do Cartão SUS</label>
                  <input
                    type="text"
                    value={formData.numeroSUS}
                    onChange={(e) => setFormData({ ...formData, numeroSUS: e.target.value })}
                    placeholder="Número do cartão SUS"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Doenças</label>
                  <textarea
                    value={formData.doencas}
                    onChange={(e) => setFormData({ ...formData, doencas: e.target.value })}
                    placeholder="Descreva doenças ou condições médicas..."
                    rows={2}
                  />
                </div>

                <div className="form-grupo">
                  <label>Alergias</label>
                  <textarea
                    value={formData.alergias}
                    onChange={(e) => setFormData({ ...formData, alergias: e.target.value })}
                    placeholder="Descreva alergias conhecidas..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Medicamentos de Uso Contínuo</label>
                  <textarea
                    value={formData.medicamentos}
                    onChange={(e) => setFormData({ ...formData, medicamentos: e.target.value })}
                    placeholder="Medicamentos em uso..."
                    rows={2}
                  />
                </div>

                <div className="form-grupo">
                  <label>Necessidades Especiais</label>
                  <textarea
                    value={formData.necessidadesEspeciais}
                    onChange={(e) => setFormData({ ...formData, necessidadesEspeciais: e.target.value })}
                    placeholder="Descreva necessidades especiais de atenção..."
                    rows={2}
                  />
                </div>
              </div>

                <div className="form-grupo">
                  <label>Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Observações adicionais..."
                    rows={2}
                  />
                </div>

                {/* Composição Familiar - UI/UX melhorado */}
                <div className="composicao-familiar-section">
                  <label className="composicao-familiar-label">Composição Familiar</label>
                  {formData.composicaoFamiliar?.map((membro, idx) => (
                    <div key={idx} className="membro-card">
                      <div className="membro-header">
                        <span className="membro-numero">Membro {idx + 1}</span>
                        <button type="button" className="btn-remover-membro" title="Remover membro" onClick={() => removerMembro(idx)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      </div>
                      <div className="membro-fields">
                        <div className="membro-field"><span className="membro-icon">👤</span><input placeholder="Nome" value={membro.nome} onChange={e => atualizarMembro(idx, 'nome', e.target.value)} /></div>
                        <div className="membro-field"><span className="membro-icon">🎂</span><input placeholder="Idade" value={membro.idade} onChange={e => atualizarMembro(idx, 'idade', e.target.value)} /></div>
                        <div className="membro-field"><span className="membro-icon">👪</span><input placeholder="Parentesco" value={membro.parentesco} onChange={e => atualizarMembro(idx, 'parentesco', e.target.value)} /></div>
                        <div className="membro-field"><span className="membro-icon">🎓</span><input placeholder="Escolaridade" value={membro.escolaridade} onChange={e => atualizarMembro(idx, 'escolaridade', e.target.value)} /></div>
                        <div className="membro-field"><span className="membro-icon">💼</span><input placeholder="Ocupação" value={membro.ocupacao} onChange={e => atualizarMembro(idx, 'ocupacao', e.target.value)} /></div>
                        <div className="membro-field"><span className="membro-icon">💰</span><input placeholder="Renda" value={membro.renda} onChange={e => atualizarMembro(idx, 'renda', e.target.value)} /></div>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn-adicionar-membro" onClick={adicionarMembro}>
                    <span className="btn-adicionar-icon">➕</span> Adicionar membro
                  </button>
                </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancelar" onClick={fecharModal}>
                Cancelar
              </button>
              <button 
                className="btn-salvar" 
                onClick={salvarAluno}
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

      {/* Modal de Confirmação de Exclusão */}
      {modalDeletar && (
        <ModalConfirmacao
          aberto={modalDeletar}
          titulo="Remover Aluno"
          mensagem={`Tem certeza que deseja remover ${alunoSelecionado?.pessoa?.nome || alunoSelecionado?.nome} do Guaraúna?`}
          botaoPrincipalTexto="Remover"
          botaoCancelarTexto="Cancelar"
          tipo="deletar"
          onConfirmar={deletarAluno}
          onCancelar={() => {
            setModalDeletar(false);
            setAlunoSelecionado(null);
          }}
        />
      )}
    </div>
  );
};

export default PaginaAlunosGuarauna;
