import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { criarPessoa } from '../servicos/api';
import { useGlobalToast } from '../contexto/ToastContext';
import { useAuth } from '../contexto/AuthContext';
import GerenciadorBeneficiosGAC from './GerenciadorBeneficiosGAC';
import './ModalEdicao.css';

const ModalCadastro = ({ isOpen, onClose, onCadastrar }) => {
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    idade: '',
    comunidade: '',
    rendaFamiliar: '',
    numeroMembros: '',
    dependentes: '',
    beneficiosGAC: [],
    beneficiosGoverno: [],
    observacoes: ''
  });

  // Rastrear quais campos foram tocados (para mostrar erros apenas após interação)
  const [camposTocados, setCamposTocados] = useState({});

  const [comunidadeCustomizada, setComunidadeCustomizada] = useState('');
  const [comunidadesCustomizadas, setComunidadesCustomizadas] = useState(() => {
    const salvas = localStorage.getItem('comunidadesCustomizadas');
    return salvas ? JSON.parse(salvas) : [];
  });

  const [carregando, setCarregando] = useState(false);
  const [novoBeneficioGAC, setNovoBeneficioGAC] = useState({ tipo: '', dataInicio: '', dataFinal: '' });
  const [novoBeneficioGoverno, setNovoBeneficioGoverno] = useState({ nome: '', valor: '' });
  const [mostrarGerenciadorBeneficios, setMostrarGerenciadorBeneficios] = useState(false);
  const [tiposBeneficios, setTiposBeneficios] = useState([]);
  const [adicionandoNovoTipo, setAdicionandoNovoTipo] = useState(false);
  const [novoTipoBeneficio, setNovoTipoBeneficio] = useState('');
  const { sucesso, erro: erroToast } = useGlobalToast();
  const { token } = useAuth();

  // Carregar tipos de benefícios do localStorage
  useEffect(() => {
    const salvo = localStorage.getItem('beneficiosGACTipos');
    if (salvo) {
      setTiposBeneficios(JSON.parse(salvo));
    } else {
      const defaults = ['Cesta Básica', 'Auxílio Alimentação', 'Auxílio Financeiro', 'Bolsa Cultura', 'Outro'];
      setTiposBeneficios(defaults);
      localStorage.setItem('beneficiosGACTipos', JSON.stringify(defaults));
    }
  }, []);

  // Escutar atualizações de tipos de benefícios
  useEffect(() => {
    const handleBeneficiosAtualizados = (e) => {
      setTiposBeneficios(e.detail);
    };
    window.addEventListener('beneficiosGACAtualizados', handleBeneficiosAtualizados);
    return () => window.removeEventListener('beneficiosGACAtualizados', handleBeneficiosAtualizados);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatarCPF = (valor) => {
    if (!valor) return '';
    
    valor = valor.toString();
    let apenasNumeros = valor.replace(/\D/g, '');
    apenasNumeros = apenasNumeros.slice(0, 11);
    
    if (apenasNumeros.length <= 3) return apenasNumeros;
    if (apenasNumeros.length <= 6) return apenasNumeros.slice(0, 3) + '.' + apenasNumeros.slice(3);
    if (apenasNumeros.length <= 9) return apenasNumeros.slice(0, 3) + '.' + apenasNumeros.slice(3, 6) + '.' + apenasNumeros.slice(6);
    return apenasNumeros.slice(0, 3) + '.' + apenasNumeros.slice(3, 6) + '.' + apenasNumeros.slice(6, 9) + '-' + apenasNumeros.slice(9);
  };

  const formatarTelefone = (valor) => {
    if (!valor) return '';
    
    valor = valor.toString();
    let apenasNumeros = valor.replace(/\D/g, '');
    apenasNumeros = apenasNumeros.slice(0, 11);
    
    if (apenasNumeros.length <= 2) return apenasNumeros;
    if (apenasNumeros.length <= 7) return '(' + apenasNumeros.slice(0, 2) + ') ' + apenasNumeros.slice(2);
    return '(' + apenasNumeros.slice(0, 2) + ') ' + apenasNumeros.slice(2, 7) + '-' + apenasNumeros.slice(7);
  };

  const formatarCEP = (valor) => {
    if (!valor) return '';
    
    valor = valor.toString();
    // Remove tudo que não é número
    let apenasNumeros = valor.replace(/\D/g, '');
    // Limita a 8 dígitos
    apenasNumeros = apenasNumeros.slice(0, 8);
    
    // Formata como XXXXX-XXX
    if (apenasNumeros.length <= 5) return apenasNumeros;
    return apenasNumeros.slice(0, 5) + '-' + apenasNumeros.slice(5);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Marcar o campo como tocado
    setCamposTocados(prev => ({ ...prev, [name]: true }));
    
    if (name === 'cpf') {
      setFormData(prev => ({ ...prev, [name]: formatarCPF(value) }));
    } else if (name === 'telefone') {
      setFormData(prev => ({ ...prev, [name]: formatarTelefone(value) }));
    } else if (name === 'cep') {
      setFormData(prev => ({ ...prev, [name]: formatarCEP(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // FUNÇÃO DE VALIDAÇÃO INDIVIDUAL POR CAMPO
  const validarCampo = (nome, valor) => {
    switch (nome) {
      case 'nome':
        if (!valor || !valor.trim()) return 'Nome completo é obrigatório';
        if (valor.trim().length < 3) return 'Nome deve ter pelo menos 3 caracteres';
        return null;
      case 'cpf':
        const cpfLimpo = (valor || '').replace(/\D/g, '');
        if (!cpfLimpo) return 'CPF é obrigatório';
        if (cpfLimpo.length !== 11) return `CPF incompleto (${cpfLimpo.length}/11 dígitos)`;
        return null;
      case 'idade':
        if (!valor && valor !== 0) return 'Idade é obrigatória';
        const idadeNum = parseInt(valor);
        if (isNaN(idadeNum)) return 'Idade deve ser um número';
        if (idadeNum < 0 || idadeNum > 150) return 'Idade deve estar entre 0 e 150';
        return null;
      case 'telefone':
        const telefoneLimpo = (valor || '').replace(/\D/g, '');
        if (!telefoneLimpo) return 'Telefone é obrigatório';
        if (telefoneLimpo.length < 10) return `Telefone incompleto (${telefoneLimpo.length}/10 dígitos no mínimo)`;
        return null;
      case 'endereco':
        if (!valor || !valor.trim()) return 'Endereço é obrigatório';
        return null;
      case 'bairro':
        if (!valor || !valor.trim()) return 'Bairro é obrigatório';
        return null;
      case 'cidade':
        if (!valor || !valor.trim()) return 'Cidade é obrigatória';
        return null;
      case 'estado':
        if (!valor || !valor.trim()) return 'Estado é obrigatório';
        return null;
      case 'comunidade':
        if (!valor || !valor.trim()) return 'Comunidade é obrigatória';
        return null;
      default:
        return null;
    }
  };

  // FUNÇÃO PARA OBTER ERRO DO CAMPO (MOSTRA SÓ SE TOCADO E COM ERRO)
  const obterErrosCampo = (nome) => {
    if (!camposTocados[nome]) return null;
    return validarCampo(nome, formData[nome]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // MARCAR TODOS OS CAMPOS COMO TOCADOS PARA MOSTRAR ERROS
    setCamposTocados({
      nome: true,
      cpf: true,
      idade: true,
      telefone: true,
      endereco: true,
      bairro: true,
      cidade: true,
      estado: true,
      comunidade: true
    });
    
    // VALIDAÇÃO RIGOROSA DE TODOS OS CAMPOS OBRIGATÓRIOS
    const camposObrigatorios = ['nome', 'cpf', 'idade', 'telefone', 'endereco', 'bairro', 'cidade', 'estado', 'comunidade'];
    const erros = [];
    
    for (const campo of camposObrigatorios) {
      const erro = validarCampo(campo, formData[campo]);
      if (erro) {
        erros.push(erro);
      }
    }

    // Se há erros, mostrar toast e retornar
    if (erros.length > 0) {
      erroToast(
        `❌ ${erros.length} ${erros.length === 1 ? 'erro encontrado' : 'erros encontrados'}`,
        erros.join('\n')
      );
      return;
    }
    
    // PREPARAR DADOS PARA ENVIO
    const dadosEnvio = {
      ...formData,
      beneficiosGAC: Array.isArray(formData.beneficiosGAC) ? formData.beneficiosGAC : [],
      beneficiosGoverno: Array.isArray(formData.beneficiosGoverno) ? formData.beneficiosGoverno : [],
      cpf: (formData.cpf || '').replace(/\D/g, ''),
      telefone: (formData.telefone || '').replace(/\D/g, ''),
      cep: (formData.cep || '').replace(/\D/g, ''),
      idade: parseInt(formData.idade),
      rendaFamiliar: formData.rendaFamiliar ? parseFloat(formData.rendaFamiliar) : null,
      numeroMembros: formData.numeroMembros ? parseInt(formData.numeroMembros) : null,
      dependentes: formData.dependentes ? parseInt(formData.dependentes) : null
    };
    
    setCarregando(true);

    try {
      const resultado = await criarPessoa(token, dadosEnvio);
      sucesso('Sucesso', 'Beneficiário cadastrado!');
      onCadastrar?.(dadosEnvio);
      
      // Limpar formulário
      setFormData({
        nome: '',
        cpf: '',
        email: '',
        telefone: '',
        endereco: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        idade: '',
        comunidade: '',
        rendaFamiliar: '',
        numeroMembros: '',
        dependentes: '',
        beneficiosGAC: [],
        beneficiosGoverno: [],
        observacoes: ''
      });
      
      // Limpar campos tocados
      setCamposTocados({});
      
      // Fechar modal após 900ms
      setTimeout(onClose, 500);
    } catch (erro) {
      const mensagemErro = erro.response?.data?.erro || erro.message || 'Erro desconhecido ao cadastrar';
      erroToast('Erro ao Cadastrar', mensagemErro);
    } finally {
      setCarregando(false);
    }
  };

  const adicionarComunidadeCustomizada = () => {
    if (comunidadeCustomizada.trim()) {
      const novasComunidades = [...new Set([...comunidadesCustomizadas, comunidadeCustomizada])];
      setComunidadesCustomizadas(novasComunidades);
      localStorage.setItem('comunidadesCustomizadas', JSON.stringify(novasComunidades));
      setFormData(prev => ({ ...prev, comunidade: comunidadeCustomizada }));
      setComunidadeCustomizada('');
    }
  };

  const removerBeneficioGAC = (index) => {
    setFormData(prev => ({
      ...prev,
      beneficiosGAC: prev.beneficiosGAC.filter((_, i) => i !== index)
    }));
  };

  const removerBeneficioGoverno = (index) => {
    setFormData(prev => ({
      ...prev,
      beneficiosGoverno: prev.beneficiosGoverno.filter((_, i) => i !== index)
    }));
  };

  // Função para calcular total dos benefícios do governo
  const calcularTotalBeneficiosGoverno = () => {
    if (!Array.isArray(formData.beneficiosGoverno)) return 0;
    return formData.beneficiosGoverno.reduce((total, beneficio) => {
      const valor = typeof beneficio.valor === 'string' 
        ? parseFloat(beneficio.valor.replace(/[R$\s.,]/g, '').replace(/,/g, '.')) || 0
        : typeof beneficio.valor === 'number' ? beneficio.valor : 0;
      return total + valor;
    }, 0);
  };

  const adicionarBeneficioGAC = () => {
    if (!novoBeneficioGAC.tipo || !novoBeneficioGAC.dataInicio) {
      erroToast('Campos Obrigatórios', 'Preencha tipo e data de início do benefício');
      return;
    }

    // Validação de datas: data final não pode ser anterior à data inicial
    if (novoBeneficioGAC.dataFinal && novoBeneficioGAC.dataInicio > novoBeneficioGAC.dataFinal) {
      erroToast('Datas Inválidas', 'A data final não pode ser anterior à data inicial do benefício');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      beneficiosGAC: [...(prev.beneficiosGAC || []), novoBeneficioGAC]
    }));
    setNovoBeneficioGAC({ tipo: '', dataInicio: '', dataFinal: '' });
    sucesso('Benefício Adicionado', 'Benefício GAC adicionado com sucesso');
  };

  // Adicionar novo tipo de benefício
  const adicionarNovoTipoBeneficio = () => {
    const tipoTrimmed = novoTipoBeneficio.trim();
    
    if (!tipoTrimmed) {
      erroToast('Campo Vazio', 'Digite o nome do benefício');
      return;
    }

    if (tiposBeneficios.includes(tipoTrimmed)) {
      erroToast('Duplicado', 'Este benefício já existe');
      return;
    }

    const novosTipos = [...tiposBeneficios, tipoTrimmed];
    setTiposBeneficios(novosTipos);
    localStorage.setItem('beneficiosGACTipos', JSON.stringify(novosTipos));
    setNovoTipoBeneficio('');
    sucesso('Benefício Adicionado', `${tipoTrimmed} foi adicionado`);
  };

  const adicionarBeneficioGoverno = () => {
    if (!novoBeneficioGoverno.nome.trim()) {
      erroToast('Campo Vazio', 'Digite o nome do benefício de governo');
      return;
    }

    const valor = parseFloat((novoBeneficioGoverno.valor || '0').replace(/[^\d,]/g, '').replace(',', '.'));
    
    if (isNaN(valor) || valor < 0) {
      erroToast('Valor Inválido', 'Digite um valor numérico válido');
      return;
    }

    setFormData(prev => ({
      ...prev,
      beneficiosGoverno: [...(prev.beneficiosGoverno || []), { 
        nome: novoBeneficioGoverno.nome.trim(),
        valor: valor
      }]
    }));
    setNovoBeneficioGoverno({ nome: '', valor: '' });
  };

  return (
    <>
      <div className="modal-edicao-overlay" onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
        <div className="modal-edicao-container">
        {/* HEADER */}
        <div className="modal-edicao-header">
          <h2 className="modal-edicao-titulo">Novo Cadastro de Beneficiário</h2>
          <button
            className="modal-edicao-close"
            onClick={onClose}
            type="button"
            disabled={carregando}
            title="Fechar (ESC)"
          >
            <X size={24} />
          </button>
        </div>

        {/* CONTEÚDO ROLÁVEL */}
        <div className="modal-edicao-content">
          <form onSubmit={handleSubmit} className="modal-edicao-form" id="modal-form" noValidate>
            {/* Seção Pessoal */}
            <div className="form-secao">
              <h3 className="form-secao-titulo">Informações Pessoais</h3>
              
              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="nome">Nome Completo *</label>
                  <input
                    id="nome"
                    type="text"
                    name="nome"
                    value={formData.nome || ''}
                    onChange={handleChange}
                    className={`form-input ${obterErrosCampo('nome') ? 'form-input-erro' : ''}`}
                    placeholder="Digite o nome completo"
                  />
                  {obterErrosCampo('nome') && <span className="form-erro-msg">{obterErrosCampo('nome')}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="cpf">CPF *</label>
                  <input
                    id="cpf"
                    type="text"
                    name="cpf"
                    value={formData.cpf || ''}
                    onChange={handleChange}
                    className={`form-input ${obterErrosCampo('cpf') ? 'form-input-erro' : ''}`}
                    placeholder="000.000.000-00"
                  />
                  {obterErrosCampo('cpf') && <span className="form-erro-msg">{obterErrosCampo('cpf')}</span>}
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label htmlFor="idade">Idade *</label>
                  <input
                    id="idade"
                    type="number"
                    name="idade"
                    min="0"
                    max="150"
                    value={formData.idade || ''}
                    onChange={handleChange}
                    className={`form-input ${obterErrosCampo('idade') ? 'form-input-erro' : ''}`}
                    placeholder="Ex: 35"
                  />
                  {obterErrosCampo('idade') && <span className="form-erro-msg">{obterErrosCampo('idade')}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="comunidade">Comunidade *</label>
                  <select
                    id="comunidade"
                    name="comunidade"
                    value={formData.comunidade || ''}
                    onChange={handleChange}
                    className={`form-input ${obterErrosCampo('comunidade') ? 'form-input-erro' : ''}`}
                  >
                    <option value="">Selecione uma comunidade</option>
                    <option value="Jardim Guarauna">Jardim Guarauna</option>
                    <option value="Vila Novo Eldorado">Vila Novo Eldorado</option>
                    <option value="Jardim Apura">Jardim Apura</option>
                    {comunidadesCustomizadas.map(com => (
                      <option key={com} value={com}>{com}</option>
                    ))}
                    <option value="Outra">Outra</option>
                  </select>
                  {obterErrosCampo('comunidade') && <span className="form-erro-msg">{obterErrosCampo('comunidade')}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="status">Status <span className="campo-opcional">(Opcional)</span></label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status || 'ativo'}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              {formData.comunidade === 'Outra' && (
                <div className="form-group">
                  <label htmlFor="comunidadeCustomizada">Nome da Comunidade</label>
                  <div className="campo-com-botao">
                    <input
                      id="comunidadeCustomizada"
                      type="text"
                      value={comunidadeCustomizada}
                      onChange={(e) => setComunidadeCustomizada(e.target.value)}
                      placeholder="Digite o nome da comunidade"
                      onKeyPress={(e) => e.key === 'Enter' && adicionarComunidadeCustomizada()}
                    />
                    <button
                      type="button"
                      onClick={adicionarComunidadeCustomizada}
                      disabled={!comunidadeCustomizada.trim()}
                      className="btn-adicionar-comunidade"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Seção Contato */}
            <div className="form-secao">
              <h3 className="form-secao-titulo">Contato</h3>
              
              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="email">Email <span className="campo-opcional">(Opcional)</span></label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="exemplo@email.com"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="telefone">Telefone *</label>
                  <input
                    id="telefone"
                    type="tel"
                    name="telefone"
                    value={formData.telefone || ''}
                    onChange={handleChange}
                    className={`form-input ${obterErrosCampo('telefone') ? 'form-input-erro' : ''}`}
                    placeholder="(00) 00000-0000"
                  />
                  {obterErrosCampo('telefone') && <span className="form-erro-msg">{obterErrosCampo('telefone')}</span>}
                </div>
              </div>
            </div>

            {/* Seção Endereço */}
            <div className="form-secao">
              <h3 className="form-secao-titulo">Endereço</h3>
              
              <div className="form-group">
                <label htmlFor="endereco">Endereço *</label>
                <input
                  id="endereco"
                  type="text"
                  name="endereco"
                  value={formData.endereco || ''}
                  onChange={handleChange}
                  className={`form-input ${obterErrosCampo('endereco') ? 'form-input-erro' : ''}`}
                  placeholder="Rua, avenida, etc"
                />
                {obterErrosCampo('endereco') && <span className="form-erro-msg">{obterErrosCampo('endereco')}</span>}
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label htmlFor="bairro">Bairro *</label>
                  <input
                    id="bairro"
                    type="text"
                    name="bairro"
                    value={formData.bairro || ''}
                    onChange={handleChange}
                    className={`form-input ${obterErrosCampo('bairro') ? 'form-input-erro' : ''}`}
                    placeholder="Bairro"
                  />
                  {obterErrosCampo('bairro') && <span className="form-erro-msg">{obterErrosCampo('bairro')}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="cidade">Cidade *</label>
                  <input
                    id="cidade"
                    type="text"
                    name="cidade"
                    value={formData.cidade || ''}
                    onChange={handleChange}
                    className={`form-input ${obterErrosCampo('cidade') ? 'form-input-erro' : ''}`}
                    placeholder="Cidade"
                  />
                  {obterErrosCampo('cidade') && <span className="form-erro-msg">{obterErrosCampo('cidade')}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="estado">Estado *</label>
                  <input
                    id="estado"
                    type="text"
                    name="estado"
                    value={formData.estado || ''}
                    onChange={handleChange}
                    className={`form-input ${obterErrosCampo('estado') ? 'form-input-erro' : ''}`}
                    placeholder="UF"
                    maxLength="2"
                  />
                  {obterErrosCampo('estado') && <span className="form-erro-msg">{obterErrosCampo('estado')}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="cep">CEP <span className="campo-opcional">(Opcional)</span></label>
                <input
                  id="cep"
                  type="text"
                  name="cep"
                  value={formData.cep || ''}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="06712-200"
                  maxLength="9"
                />
              </div>
            </div>

            {/* Seção Benefícios GAC */}
            <div className="beneficio-gac-secao">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: 0 }}>
                <h3 className="form-secao-titulo" style={{ margin: 0 }}>Benefícios GAC</h3>
                <button
                  type="button"
                  onClick={() => setMostrarGerenciadorBeneficios(true)}
                  style={{
                    background: '#1b5e20',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  title="Gerenciar tipos de benefícios"
                >
                  ⚙️ Editar Tipos
                </button>
              </div>
              
              {/* Lista de Benefícios Existentes */}
              {Array.isArray(formData.beneficiosGAC) && formData.beneficiosGAC.length > 0 ? (
                <div className="beneficio-gac-lista">
                  {formData.beneficiosGAC.map((beneficio, index) => (
                    <div key={index} className="beneficio-gac-card">
                      <div className="beneficio-gac-info">
                        <div className="beneficio-gac-tipo">{beneficio.tipo}</div>
                        <div className="beneficio-gac-datas">
                          <div className="beneficio-gac-data-item">
                            <span className="beneficio-gac-data-icon">📅</span>
                            <span>{new Date(beneficio.dataInicio).toLocaleDateString('pt-BR')}</span>
                          </div>
                          {beneficio.dataFinal && (
                            <div className="beneficio-gac-data-item">
                              <span className="beneficio-gac-data-icon">→</span>
                              <span>{new Date(beneficio.dataFinal).toLocaleDateString('pt-BR')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerBeneficioGAC(index)}
                        className="beneficio-gac-remover"
                        title="Remover benefício"
                      >
                        −
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="beneficio-gac-lista">
                  <div className="beneficio-gac-vazio">Nenhum benefício GAC adicionado</div>
                </div>
              )}

              {/* Formulário para adicionar novo benefício GAC */}
              <div className="beneficio-gac-form">
                {/* 1️⃣ LINHA 1: Select Dropdown + Botão Gerenciar */}
                <div style={{ marginBottom: '12px' }}>
                  <label htmlFor="tipoBeneficio" style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#1b5e20', textTransform: 'uppercase' }}>Tipo de Benefício</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      id="tipoBeneficio"
                      value={novoBeneficioGAC.tipo}
                      onChange={(e) => setNovoBeneficioGAC(prev => ({ ...prev, tipo: e.target.value }))}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        border: '1px solid #ccc',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        backgroundColor: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Selecione um tipo</option>
                      {tiposBeneficios.map((tipo, idx) => (
                        <option key={idx} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2️⃣ PAINEL GERENCIAR TIPOS (Colapsável) */}
                {adicionandoNovoTipo && (
                  <div style={{
                    background: '#f9fdf9',
                    border: '2px solid #2e7d32',
                    borderRadius: '8px',
                    padding: '14px',
                    marginBottom: '14px'
                  }}>
                    {/* Lista Tipos Atuais */}
                    <div style={{ marginBottom: '14px' }}>
                      <h5 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: '700', color: '#1b5e20', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ✓ Tipos Atuais
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                        {tiposBeneficios.map((tipo, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'white', border: '1px solid #c8e6c9', borderRadius: '6px', fontSize: '13px' }}>
                            <span>{tipo}</span>
                            <button type="button" onClick={() => { const ns = tiposBeneficios.filter((_, i) => i !== idx); setTiposBeneficios(ns); localStorage.setItem('beneficiosGACTipos', JSON.stringify(ns)); sucesso('✓', tipo); }} style={{ background: '#ff6b6b', color: 'white', border: 'none', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer', fontSize: '13px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Linha Divisória */}
                    <div style={{ borderTop: '1px solid #c8e6c9', marginBottom: '14px' }} />

                    {/* Adicionar Novo Tipo */}
                    <div>
                      <h5 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: '700', color: '#1b5e20', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        + Novo Tipo
                      </h5>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input type="text" value={novoTipoBeneficio} onChange={(e) => setNovoTipoBeneficio(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && adicionarNovoTipoBeneficio()} placeholder="Ex: Auxílio Emergencial" style={{ flex: 1, padding: '8px 10px', border: '1px solid #2e7d32', borderRadius: '6px', fontSize: '12px' }} />
                        <button type="button" onClick={adicionarNovoTipoBeneficio} style={{ background: '#2e7d32', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>+ Adicionar</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3️⃣ LINHA 2: Datas de Início e Fim */}
                <div className="beneficio-gac-form-row">
                  <div className="beneficio-gac-form-group">
                    <label htmlFor="dataInicioBeneficio">📅 Data de Início</label>
                    <div className="data-input-wrapper">
                      <input
                        id="dataInicioBeneficio"
                        type="date"
                        value={novoBeneficioGAC.dataInicio}
                        onChange={(e) => setNovoBeneficioGAC(prev => ({ ...prev, dataInicio: e.target.value }))}
                        className="beneficio-gac-data-input"
                      />
                      <span className="data-input-icon">📆</span>
                    </div>
                  </div>
                  <div className="beneficio-gac-form-group">
                    <label htmlFor="dataFinalBeneficio">📅 Data Final (opcional)</label>
                    <div className="data-input-wrapper">
                      <input
                        id="dataFinalBeneficio"
                        type="date"
                        value={novoBeneficioGAC.dataFinal}
                        onChange={(e) => setNovoBeneficioGAC(prev => ({ ...prev, dataFinal: e.target.value }))}
                        className="beneficio-gac-data-input"
                      />
                      <span className="data-input-icon">📆</span>
                    </div>
                  </div>
                </div>

                {/* 4️⃣ BOTÃO ADICIONAR BENEFÍCIO */}
                <button
                  type="button"
                  onClick={adicionarBeneficioGAC}
                  className="beneficio-gac-adicionar"
                >
                  + Adicionar Benefício
                </button>
              </div>
            </div>

            {/* Seção Benefícios do Governo */}
            <div className="beneficio-gac-secao">
              <h3 className="beneficio-gac-titulo">🏛️ Benefícios do Governo</h3>
              
              {/* Lista de Benefícios Existentes */}
              {Array.isArray(formData.beneficiosGoverno) && formData.beneficiosGoverno.length > 0 && (
                <div className="beneficio-gac-lista">
                  {formData.beneficiosGoverno.map((beneficio, index) => (
                    <div key={index} className="beneficio-gac-card">
                      <div className="beneficio-gac-info">
                        <strong className="beneficio-gac-nome">{beneficio.nome}</strong>
                        <span className="beneficio-gac-valor">
                          {typeof beneficio.valor === 'number' 
                            ? beneficio.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : 'R$ 0,00'
                          }
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerBeneficioGoverno(index)}
                        className="beneficio-gac-remover"
                        title="Remover benefício"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Total de Benefícios do Governo */}
              {Array.isArray(formData.beneficiosGoverno) && formData.beneficiosGoverno.length > 0 && (
                <div className="beneficio-gac-total">
                  <div className="beneficio-gac-total-content">
                    <span className="beneficio-gac-total-label">
                      💰 Total de Benefícios do Governo:
                    </span>
                    <span className="beneficio-gac-total-valor">
                      {calcularTotalBeneficiosGoverno().toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      })}
                    </span>
                  </div>
                </div>
              )}

              {/* Formulário para adicionar novo benefício do governo */}
              <div className="beneficio-gac-form">
                <div className="beneficio-gac-input-group">
                  <label htmlFor="nomeBeneficioGoverno" className="beneficio-gac-label">Nome do Benefício</label>
                  <input
                    id="nomeBeneficioGoverno"
                    type="text"
                    value={novoBeneficioGoverno.nome}
                    onChange={(e) => setNovoBeneficioGoverno(prev => ({ ...prev, nome: e.target.value }))}
                    className="beneficio-gac-input"
                    placeholder="Ex: LOAS, Bolsa Família, BPC, etc."
                  />
                </div>

                <div className="beneficio-gac-input-group">
                  <label htmlFor="valorBeneficioGoverno" className="beneficio-gac-label">Valor do Benefício</label>
                  <input
                    id="valorBeneficioGoverno"
                    type="text"
                    value={novoBeneficioGoverno.valor}
                    onChange={(e) => setNovoBeneficioGoverno(prev => ({ ...prev, valor: e.target.value }))}
                    className="beneficio-gac-input"
                    placeholder="R$ 0,00"
                  />
                </div>

                <button
                  type="button"
                  onClick={adicionarBeneficioGoverno}
                  className="beneficio-gac-adicionar"
                >
                  + Adicionar Benefício do Governo
                </button>
              </div>
            </div>

            {/* Seção Renda Familiar */}
            <div className="form-secao">
              <h3 className="form-secao-titulo">Informações de Renda</h3>
              
              <div className="form-grid-3">
                <div className="form-group">
                  <label htmlFor="rendaFamiliar">Renda Familiar <span className="campo-opcional">(Opcional)</span></label>
                  <input
                    id="rendaFamiliar"
                    type="number"
                    name="rendaFamiliar"
                    step="0.01"
                    value={formData.rendaFamiliar || ''}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="numeroMembros">Número de Membros <span className="campo-opcional">(Opcional)</span></label>
                  <input
                    id="numeroMembros"
                    type="number"
                    name="numeroMembros"
                    min="1"
                    value={formData.numeroMembros || ''}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Ex: 4"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="dependentes">Dependentes <span className="campo-opcional">(Opcional)</span></label>
                  <input
                    id="dependentes"
                    type="number"
                    name="dependentes"
                    min="0"
                    value={formData.dependentes || ''}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Ex: 2"
                  />
                </div>
              </div>
            </div>

            {/* Seção Observações */}
            <div className="form-secao">
              <h3 className="form-secao-titulo">Observações Gerais</h3>
              
              <div className="form-group">
                <label htmlFor="observacoes">Observações <span className="campo-opcional">(Opcional)</span></label>
                <textarea
                  id="observacoes"
                  name="observacoes"
                  value={formData.observacoes || ''}
                  onChange={handleChange}
                  rows="4"
                  className="form-input form-textarea"
                  placeholder="Observações adicionais..."
                />
              </div>
            </div>
          </form>
        </div>

        {/* FOOTER COM BOTÕES */}
        <div className="modal-edicao-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={carregando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="modal-form"
            className="btn btn-primary"
            disabled={carregando}
          >
            {carregando ? 'Cadastrando...' : 'Cadastrar Beneficiário'}
          </button>
        </div>
      </div>
      </div>

      {/* Modal de gerenciador de benefícios */}
      <GerenciadorBeneficiosGAC
        isOpen={mostrarGerenciadorBeneficios}
        onClose={() => setMostrarGerenciadorBeneficios(false)}
      />
    </>
  );
};

export default ModalCadastro;

