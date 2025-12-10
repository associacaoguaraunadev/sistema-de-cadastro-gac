import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Award,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Save,
  FileText,
  UserCheck,
  Check
} from 'lucide-react';
import { GRADUACOES_ADULTO, getGraduacaoNome } from '../utils/graduacoesCapoeira';
import './PaginaEducadoresGuarauna.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Função para formatar CPF
const formatarCPF = (valor) => {
  if (!valor) return '';
  valor = valor.toString().replace(/\D/g, '').slice(0, 11);
  if (valor.length <= 3) return valor;
  if (valor.length <= 6) return `${valor.slice(0, 3)}.${valor.slice(3)}`;
  if (valor.length <= 9) return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6)}`;
  return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6, 9)}-${valor.slice(9)}`;
};

// Função para formatar telefone
const formatarTelefone = (valor) => {
  const numeros = valor.replace(/\D/g, '');
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 7) return `(${numeros.slice(0,2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 11) return `(${numeros.slice(0,2)}) ${numeros.slice(2,7)}-${numeros.slice(7)}`;
  return `(${numeros.slice(0,2)}) ${numeros.slice(2,7)}-${numeros.slice(7,11)}`;
};

const PaginaEducadoresGuarauna = () => {
  const { token } = useAuth();
  const { adicionarToast } = useGlobalToast();
  const navegar = useNavigate();

  // Estados principais
  const [educadores, setEducadores] = useState([]);
  const [comunidades, setComunidades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [comunidadeFiltro, setComunidadeFiltro] = useState('');
  const [graduacaoFiltro, setGraduacaoFiltro] = useState('');

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const itensPorPagina = 15;

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [educadorEditando, setEducadorEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    endereco: '',
    apelido: '',
    graduacao: '',
    formacao: '',
    comunidadeIds: []
  });

  // Modal de confirmação
  const [modalConfirmacao, setModalConfirmacao] = useState({ aberto: false, educador: null });

  // Busca de pessoa existente
  const [buscaPessoa, setBuscaPessoa] = useState('');
  const [pessoasSugeridas, setPessoasSugeridas] = useState([]);
  const [pessoaSelecionada, setPessoaSelecionada] = useState(null);
  
  // Dropdown de pessoa
  const [dropdownPessoaAberto, setDropdownPessoaAberto] = useState(false);
  const dropdownPessoaRef = useRef(null);
  
  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownPessoaRef.current && !dropdownPessoaRef.current.contains(event.target)) {
        setDropdownPessoaAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Carregar educadores
  const carregarEducadores = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({
        pagina: paginaAtual.toString(),
        limite: itensPorPagina.toString()
      });

      if (busca) params.append('busca', busca);
      if (comunidadeFiltro) params.append('comunidadeId', comunidadeFiltro);
      if (graduacaoFiltro) params.append('graduacao', graduacaoFiltro);

      const response = await fetch(`${API_URL}/api/guarauna/educadores?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // API retorna array direto ou objeto com educadores
        const lista = data.educadores || data || [];
        setEducadores(Array.isArray(lista) ? lista : []);
        setTotalPaginas(data.totalPaginas || 1);
        setTotalItens(data.total || lista.length || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar educadores:', error);
      adicionarToast('Erro ao carregar educadores', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [token, paginaAtual, busca, comunidadeFiltro, graduacaoFiltro, adicionarToast]);

  useEffect(() => {
    carregarComunidades();
  }, [carregarComunidades]);

  useEffect(() => {
    carregarEducadores();
  }, [carregarEducadores]);

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
    
    setFormData({
      ...formData,
      nome: pessoa.nome || '',
      cpf: formatarCPF(pessoa.cpf) || '',
      email: pessoa.email || '',
      telefone: formatarTelefone(pessoa.telefone) || '',
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
      email: '',
      telefone: '',
      endereco: '',
      pessoaId: null
    });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      nome: '',
      cpf: '',
      email: '',
      telefone: '',
      endereco: '',
      apelido: '',
      graduacao: '',
      formacao: '',
      comunidadeIds: [],
      pessoaId: null
    });
    setEducadorEditando(null);
    setPessoaSelecionada(null);
    setBuscaPessoa('');
    setPessoasSugeridas([]);
  };

  // Abrir modal
  const abrirModal = (educador = null) => {
    if (educador) {
      setEducadorEditando(educador);
      // Acessar dados via pessoa
      const pessoa = educador.pessoa || {};
      setFormData({
        nome: pessoa.nome || educador.nome || '',
        cpf: formatarCPF(pessoa.cpf || ''),
        email: pessoa.email || educador.email || '',
        telefone: formatarTelefone(pessoa.telefone || educador.telefone || ''),
        endereco: pessoa.endereco || '',
        apelido: educador.apelido || '',
        graduacao: educador.especialidade || educador.graduacao || '',
        formacao: educador.formacao || '',
        comunidadeIds: educador.comunidades?.map(c => c.comunidade || c.comunidadeId) || [],
        pessoaId: pessoa.id || educador.pessoaId
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

  // Salvar educador
  const salvarEducador = async () => {
    if (!formData.nome.trim()) {
      adicionarToast('Nome é obrigatório', 'erro');
      return;
    }

    if (!formData.graduacao) {
      adicionarToast('Graduação é obrigatória', 'erro');
      return;
    }

    if (formData.comunidadeIds.length === 0) {
      adicionarToast('Selecione pelo menos uma comunidade', 'erro');
      return;
    }

    setSalvando(true);
    try {
      const url = educadorEditando 
        ? `${API_URL}/api/guarauna/educadores/${educadorEditando.id}`
        : `${API_URL}/api/guarauna/educadores`;

      const response = await fetch(url, {
        method: educadorEditando ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        adicionarToast(
          educadorEditando ? 'Educador atualizado com sucesso!' : 'Educador criado com sucesso!',
          'sucesso'
        );
        fecharModal();
        carregarEducadores();
      } else {
        const erro = await response.json();
        adicionarToast(erro.erro || 'Erro ao salvar educador', 'erro');
      }
    } catch (error) {
      console.error('Erro ao salvar educador:', error);
      adicionarToast('Erro ao salvar educador', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  // Excluir educador
  const excluirEducador = async () => {
    const { educador } = modalConfirmacao;
    try {
      const response = await fetch(`${API_URL}/api/guarauna/educadores/${educador.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        adicionarToast('Educador excluído com sucesso!', 'sucesso');
        carregarEducadores();
      } else {
        const erro = await response.json();
        adicionarToast(erro.erro || 'Erro ao excluir educador', 'erro');
      }
    } catch (error) {
      console.error('Erro ao excluir educador:', error);
      adicionarToast('Erro ao excluir educador', 'erro');
    } finally {
      setModalConfirmacao({ aberto: false, educador: null });
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
    { label: 'Educadores', path: '/guarauna/educadores' }
  ];

  return (
    <div className="pagina-educadores">
      <Navbar />
      <Breadcrumb items={breadcrumbItems} />

      <div className="educadores-container">
        <div className="educadores-header">
          <div className="header-info">
            <h1><GraduationCap size={28} /> Educadores</h1>
            <p>{totalItens} educador{totalItens !== 1 ? 'es' : ''} cadastrado{totalItens !== 1 ? 's' : ''}</p>
          </div>

          <button className="btn-novo" onClick={() => abrirModal()}>
            <Plus size={18} />
            <span>Novo Educador</span>
          </button>
        </div>

        {/* Filtros */}
        <div className="educadores-filtros">
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
            value={graduacaoFiltro}
            onChange={(e) => {
              setGraduacaoFiltro(e.target.value);
              setPaginaAtual(1);
            }}
          >
            <option value="">Todas as graduações</option>
            {GRADUACOES_ADULTO.map(grupo => (
              <optgroup key={grupo.categoria} label={grupo.label}>
                {grupo.itens.map(grad => (
                  <option key={grad.valor} value={grad.valor}>{grad.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Tabela */}
        <div className="educadores-tabela-wrapper">
          {carregando ? (
            <div className="carregando-container">
              <div className="spinner"></div>
              <p>Carregando educadores...</p>
            </div>
          ) : educadores.length === 0 ? (
            <div className="sem-dados">
              <GraduationCap size={48} />
              <p>Nenhum educador encontrado</p>
              <button className="btn-novo" onClick={() => abrirModal()}>
                <Plus size={18} />
                Adicionar primeiro educador
              </button>
            </div>
          ) : (
            <table className="educadores-tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Graduação</th>
                  <th>Contato</th>
                  <th>Comunidades</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {educadores.map(educador => {
                  // Acessar dados via pessoa
                  const pessoa = educador.pessoa || {};
                  const nome = pessoa.nome || educador.nome || 'Sem nome';
                  const email = pessoa.email || educador.email || '';
                  const telefone = pessoa.telefone || educador.telefone || '';
                  const especialidade = educador.especialidade || educador.graduacao || '';
                  
                  return (
                  <tr key={educador.id}>
                    <td>
                      <div className="educador-nome">
                        <User size={16} />
                        <span>{nome}</span>
                        {educador.apelido && <span className="educador-apelido">({educador.apelido})</span>}
                      </div>
                    </td>
                    <td>
                      <span className="badge-graduacao">
                        <Award size={14} />
                        {getGraduacaoNome(especialidade)}
                      </span>
                    </td>
                    <td>
                      <div className="educador-contato">
                        {email && (
                          <span><Mail size={14} /> {email}</span>
                        )}
                        {telefone && (
                          <span><Phone size={14} /> {formatarTelefone(telefone)}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="educador-comunidades">
                        {educador.comunidades?.map((pc, idx) => (
                          <span key={pc.id || pc.comunidade || idx} className="badge-comunidade">
                            <MapPin size={12} />
                            {pc.comunidade || 'Comunidade'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="acoes-btns">
                        <button 
                          className="btn-acao editar" 
                          onClick={() => abrirModal(educador)}
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn-acao excluir" 
                          onClick={() => setModalConfirmacao({ aberto: true, educador })}
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
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
                {educadorEditando ? 'Editar Educador' : 'Novo Educador'}
              </h2>
              <button className="btn-fechar" onClick={fecharModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Busca de Pessoa Existente - Dropdown Padrão Ouro */}
              {!educadorEditando && (
                <div className="form-grupo pessoa-dropdown-container" ref={dropdownPessoaRef}>
                  <label><UserCheck size={16} /> Vincular a pessoa já cadastrada</label>
                  <div 
                    className={`pessoa-dropdown-select ${dropdownPessoaAberto ? 'aberto' : ''}`}
                    onClick={() => setDropdownPessoaAberto(!dropdownPessoaAberto)}
                  >
                    {pessoaSelecionada ? (
                      <div className="pessoa-dropdown-selecionada">
                        <User size={18} />
                        <span className="pessoa-nome">{pessoaSelecionada.nome}</span>
                        {pessoaSelecionada.comunidade && (
                          <span className="pessoa-comunidade">{pessoaSelecionada.comunidade}</span>
                        )}
                        <button 
                          type="button" 
                          className="btn-limpar-pessoa"
                          onClick={(e) => { e.stopPropagation(); limparPessoaSelecionada(); }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="pessoa-dropdown-placeholder">
                        <Search size={16} />
                        Clique para buscar pessoa cadastrada
                      </span>
                    )}
                    <ChevronDown size={18} className={`dropdown-arrow ${dropdownPessoaAberto ? 'rotacionado' : ''}`} />
                  </div>
                  
                  {dropdownPessoaAberto && (
                    <div className="pessoa-dropdown-menu">
                      <div className="pessoa-dropdown-busca">
                        <Search size={16} />
                        <input
                          type="text"
                          value={buscaPessoa}
                          onChange={(e) => setBuscaPessoa(e.target.value)}
                          placeholder="Buscar por nome ou CPF..."
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div className="pessoa-dropdown-lista">
                        {pessoasSugeridas.length > 0 ? (
                          pessoasSugeridas.map(pessoa => (
                            <div 
                              key={pessoa.id} 
                              className="pessoa-dropdown-item"
                              onClick={(e) => { e.stopPropagation(); selecionarPessoa(pessoa); setDropdownPessoaAberto(false); }}
                            >
                              <User size={16} />
                              <div className="pessoa-dropdown-item-info">
                                <span className="pessoa-dropdown-item-nome">{pessoa.nome}</span>
                                <span className="pessoa-dropdown-item-detalhes">
                                  {pessoa.comunidade || 'Sem comunidade'}
                                  {pessoa.cpf && ` • CPF: ${pessoa.cpf}`}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : buscaPessoa.length >= 2 ? (
                          <div className="pessoa-dropdown-vazio">
                            Nenhuma pessoa encontrada
                          </div>
                        ) : (
                          <div className="pessoa-dropdown-dica">
                            Digite ao menos 2 caracteres para buscar
                          </div>
                        )}
                      </div>
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
                    placeholder="Nome completo do educador"
                  />
                </div>

                <div className="form-grupo">
                  <label>Apelido / Nome Artístico</label>
                  <input
                    type="text"
                    value={formData.apelido}
                    onChange={(e) => setFormData({ ...formData, apelido: e.target.value })}
                    placeholder="Ex: Mestre João"
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
                    onChange={(e) => setFormData({ ...formData, telefone: formatarTelefone(e.target.value) })}
                    placeholder="(00) 00000-0000"
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
                  <label>Graduação *</label>
                  <select
                    value={formData.graduacao}
                    onChange={(e) => setFormData({ ...formData, graduacao: e.target.value })}
                  >
                    <option value="">Selecione a graduação</option>
                    {GRADUACOES_ADULTO.map(grupo => (
                      <optgroup key={grupo.categoria} label={grupo.label}>
                        {grupo.itens.map(grad => (
                          <option key={grad.valor} value={grad.valor}>{grad.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="form-grupo">
                  <label>Formação</label>
                  <input
                    type="text"
                    value={formData.formacao}
                    onChange={(e) => setFormData({ ...formData, formacao: e.target.value })}
                    placeholder="Ex: Educação Física, Pedagogia"
                  />
                </div>
              </div>

              <div className="form-grupo comunidades-selecao-container">
                <label><MapPin size={16} /> Comunidades de atuação *</label>
                <div className="comunidades-chips">
                  {comunidades.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={`comunidade-chip ${formData.comunidadeIds.includes(c.id) ? 'selecionada' : ''}`}
                      onClick={() => toggleComunidade(c.id)}
                    >
                      {formData.comunidadeIds.includes(c.id) && <Check size={14} />}
                      <span>{c.nome}</span>
                    </button>
                  ))}
                </div>
                {formData.comunidadeIds.length > 0 && (
                  <div className="comunidades-selecionadas-info">
                    {formData.comunidadeIds.length} comunidade{formData.comunidadeIds.length > 1 ? 's' : ''} selecionada{formData.comunidadeIds.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancelar" onClick={fecharModal}>
                Cancelar
              </button>
              <button 
                className="btn-salvar" 
                onClick={salvarEducador}
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
        <div className="modal-overlay" onClick={() => setModalConfirmacao({ aberto: false, educador: null })}>
          <div className="modal-confirmacao" onClick={e => e.stopPropagation()}>
            <h3>Confirmar Exclusão</h3>
            <p>
              Deseja realmente excluir o educador <strong>{modalConfirmacao.educador?.pessoa?.nome || modalConfirmacao.educador?.nome}</strong>?
            </p>
            <p className="aviso">Esta ação não pode ser desfeita.</p>
            <div className="modal-footer">
              <button 
                className="btn-cancelar" 
                onClick={() => setModalConfirmacao({ aberto: false, educador: null })}
              >
                Cancelar
              </button>
              <button className="btn-excluir" onClick={excluirEducador}>
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

export default PaginaEducadoresGuarauna;
