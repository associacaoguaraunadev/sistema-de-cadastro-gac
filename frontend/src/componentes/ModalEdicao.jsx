import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { atualizarPessoa } from '../servicos/api';
import { useGlobalToast } from '../contexto/ToastContext';
import { useAuth } from '../contexto/AuthContext';
import GerenciadorBeneficiosGAC from './GerenciadorBeneficiosGAC';
import './ModalEdicao.css';

const ModalEdicao = ({ pessoa, isOpen, onClose, onAtualizar }) => {
  const [formData, setFormData] = useState(pessoa || {});
  const [carregando, setCarregando] = useState(false);
  const [camposTocados, setCamposTocados] = useState({});
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
    if (pessoa) {
      setFormData(pessoa);
    }
  }, [pessoa, isOpen]);

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

  if (!isOpen || !pessoa) return null;

  const formatarCPF = (valor) => {
    // Se está vazio, retorna vazio
    if (!valor) return '';
    
    valor = valor.toString();
    // Remove tudo que não é número
    let apenasNumeros = valor.replace(/\D/g, '');
    // Limita a 11 dígitos
    apenasNumeros = apenasNumeros.slice(0, 11);
    
    // Formata de acordo com a quantidade de dígitos
    if (apenasNumeros.length === 0) return '';
    if (apenasNumeros.length <= 3) return apenasNumeros;
    if (apenasNumeros.length <= 6) return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3)}`;
    if (apenasNumeros.length <= 9) return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3, 6)}.${apenasNumeros.slice(6)}`;
    return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3, 6)}.${apenasNumeros.slice(6, 9)}-${apenasNumeros.slice(9)}`;
  };

  const formatarTelefone = (valor) => {
    valor = (valor || '').toString();
    valor = valor.replace(/\D/g, '');
    valor = valor.slice(0, 11);
    if (valor.length === 0) return '';
    if (valor.length <= 2) {
      return valor;
    } else if (valor.length <= 7) {
      return `(${valor.slice(0, 2)}) ${valor.slice(2)}`;
    } else {
      return `(${valor.slice(0, 2)}) ${valor.slice(2, 7)}-${valor.slice(7)}`;
    }
  };

  const formatarCEP = (valor) => {
    valor = (valor || '').toString();
    valor = valor.replace(/\D/g, '');
    valor = valor.slice(0, 8);
    if (valor.length >= 5) {
      valor = valor.slice(0, 5) + '-' + valor.slice(5);
    }
    return valor;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Marcar o campo como tocado
    setCamposTocados(prev => ({ ...prev, [name]: true }));
    
    let novoValor = value;
    
    if (name === 'cpf') {
      novoValor = formatarCPF(value);
    } else if (name === 'telefone') {
      novoValor = formatarTelefone(value);
    } else if (name === 'cep') {
      novoValor = formatarCEP(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: novoValor
    }));
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
        if (telefoneLimpo.length < 10) return `Telefone incompleto (${telefoneLimpo.length}/10 dígitos)`;
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

  // Funções para gerenciar Benefícios GAC
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
    
    const beneficiosAtual = Array.isArray(formData.beneficiosGAC) ? formData.beneficiosGAC : [];
    setFormData(prev => ({
      ...prev,
      beneficiosGAC: [...beneficiosAtual, { ...novoBeneficioGAC }]
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

  const removerBeneficioGAC = (index) => {
    setFormData(prev => ({
      ...prev,
      beneficiosGAC: (prev.beneficiosGAC || []).filter((_, i) => i !== index)
    }));
  };

  // Funções para gerenciar Benefícios do Governo
  const adicionarBeneficioGoverno = () => {
    if (!novoBeneficioGoverno.nome || !novoBeneficioGoverno.valor) {
      erroToast('Campos Obrigatórios', 'Preencha nome e valor do benefício');
      return;
    }
    
    const beneficiosAtual = Array.isArray(formData.beneficiosGoverno) ? formData.beneficiosGoverno : [];
    setFormData(prev => ({
      ...prev,
      beneficiosGoverno: [...beneficiosAtual, { 
        nome: novoBeneficioGoverno.nome,
        valor: parseFloat(novoBeneficioGoverno.valor)
      }]
    }));
    
    setNovoBeneficioGoverno({ nome: '', valor: '' });
  };

  const removerBeneficioGoverno = (index) => {
    setFormData(prev => ({
      ...prev,
      beneficiosGoverno: (prev.beneficiosGoverno || []).filter((_, i) => i !== index)
    }));
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
      const resultado = await atualizarPessoa(token, pessoa.id, dadosEnvio);
      sucesso('Sucesso', 'Beneficiário atualizado!');
      onAtualizar?.(dadosEnvio);
      setTimeout(onClose, 500);
    } catch (erro) {
      const mensagemErro = erro.response?.data?.erro || erro.message || 'Erro desconhecido ao atualizar';
      erroToast('Erro ao Atualizar', mensagemErro);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <>
    <div className="modal-edicao-overlay" onClick={onClose}>
      <div className="modal-edicao-container" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="modal-edicao-header">
          <h2 className="modal-edicao-titulo">Editar Beneficiário</h2>
          <button className="modal-edicao-close" onClick={onClose} type="button">
            <X size={24} />
          </button>
        </div>

        {/* CONTEÚDO SCROLLÁVEL */}
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
                    <option value="">Selecionar...</option>
                    <option value="Vila Cheba">Vila Cheba</option>
                    <option value="Morro da Vila">Morro da Vila</option>
                    <option value="Barragem">Barragem</option>
                    <option value="Parque Centenario">Parque Centenario</option>
                    <option value="Jardim Apura">Jardim Apura</option>
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

            {/* Seção Informações de Renda */}
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
                  />
                </div>
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
              <h3 className="form-secao-titulo">💰 Benefícios do Governo</h3>
              
              {/* Lista de Benefícios Existentes */}
              {Array.isArray(formData.beneficiosGoverno) && formData.beneficiosGoverno.length > 0 ? (
                <div className="beneficio-gac-lista">
                  {formData.beneficiosGoverno.map((beneficio, index) => (
                    <div key={index} className="beneficio-gac-card">
                      <div className="beneficio-gac-info">
                        <div className="beneficio-gac-tipo">{beneficio.nome}</div>
                        <div className="beneficio-gac-valor" style={{ color: '#1b5e20', fontWeight: '600' }}>
                          💵 {typeof beneficio.valor === 'number' 
                            ? beneficio.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : typeof beneficio.valor === 'string' && beneficio.valor
                              ? `R$ ${beneficio.valor}`
                              : 'R$ 0,00'
                          }
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerBeneficioGoverno(index)}
                        className="beneficio-gac-remover"
                        title="Remover benefício"
                      >
                        −
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="beneficio-gac-vazio">
                  Nenhum benefício do governo adicionado
                </div>
              )}

              {/* Total de Benefícios do Governo */}
              {Array.isArray(formData.beneficiosGoverno) && formData.beneficiosGoverno.length > 0 && (
                <div className="beneficio-gac-form" style={{ 
                  marginBottom: '20px', 
                  backgroundColor: '#e8f5e9', 
                  borderColor: '#2e7d32',
                  borderStyle: 'solid'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 0'
                  }}>
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: '#1b5e20' 
                    }}>
                      💰 Total de Benefícios do Governo:
                    </span>
                    <span style={{ 
                      fontSize: '16px', 
                      fontWeight: '700', 
                      color: '#1b5e20',
                      backgroundColor: '#ffffff',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #2e7d32'
                    }}>
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
                {/* 1️⃣ LINHA 1: Nome e Valor */}
                <div className="beneficio-gac-form-row">
                  <div className="beneficio-gac-form-group" style={{ flex: 2 }}>
                    <label htmlFor="nomeBeneficioGoverno">📋 Nome do Benefício</label>
                    <input
                      id="nomeBeneficioGoverno"
                      type="text"
                      value={novoBeneficioGoverno.nome}
                      onChange={(e) => setNovoBeneficioGoverno(prev => ({ ...prev, nome: e.target.value }))}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        border: '1px solid #ccc',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        backgroundColor: 'white'
                      }}
                      placeholder="Ex: LOAS, Bolsa Família, BPC, etc."
                    />
                  </div>
                  <div className="beneficio-gac-form-group">
                    <label htmlFor="valorBeneficioGoverno">💵 Valor do Benefício</label>
                    <input
                      id="valorBeneficioGoverno"
                      type="text"
                      value={novoBeneficioGoverno.valor}
                      onChange={(e) => setNovoBeneficioGoverno(prev => ({ ...prev, valor: e.target.value }))}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        border: '1px solid #ccc',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        backgroundColor: 'white'
                      }}
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>

                {/* 2️⃣ BOTÃO ADICIONAR */}
                <button
                  type="button"
                  onClick={adicionarBeneficioGoverno}
                  className="beneficio-gac-adicionar"
                >
                  + Adicionar Benefício do Governo
                </button>
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
            {carregando ? 'Salvando...' : 'Salvar Alterações'}
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

export default ModalEdicao;
