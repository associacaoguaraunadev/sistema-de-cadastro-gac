import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { atualizarPessoa } from '../servicos/api';
import { useGlobalToast } from '../contexto/ToastContext';
import { useAuth } from '../contexto/AuthContext';
import './ModalEdicao.css';

const ModalEdicao = ({ pessoa, isOpen, onClose, onAtualizar }) => {
  const [formData, setFormData] = useState(pessoa || {});
  const [carregando, setCarregando] = useState(false);
  const [camposTocados, setCamposTocados] = useState({});
  const [novoBeneficioGAC, setNovoBeneficioGAC] = useState({ tipo: '', dataInicio: '', dataFinal: '' });
  const [novoBeneficioGoverno, setNovoBeneficioGoverno] = useState({ nome: '', valor: '' });
  const { sucesso, erro: erroToast } = useGlobalToast();
  const { token } = useAuth();

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

  // Funções para gerenciar Benefícios GAC
  const adicionarBeneficioGAC = () => {
    if (!novoBeneficioGAC.tipo || !novoBeneficioGAC.dataInicio) {
      erroToast('Campos Obrigatórios', 'Preencha tipo e data de início do benefício');
      return;
    }
    
    const beneficiosAtual = Array.isArray(formData.beneficiosGAC) ? formData.beneficiosGAC : [];
    setFormData(prev => ({
      ...prev,
      beneficiosGAC: [...beneficiosAtual, { ...novoBeneficioGAC }]
    }));
    
    setNovoBeneficioGAC({ tipo: '', dataInicio: '', dataFinal: '' });
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
            <div className="form-secao">
              <h3 className="form-secao-titulo">Benefícios GAC</h3>
              
              {/* Lista de Benefícios Existentes */}
              {Array.isArray(formData.beneficiosGAC) && formData.beneficiosGAC.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  {formData.beneficiosGAC.map((beneficio, index) => (
                    <div key={index} style={{
                      padding: '12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      marginBottom: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#f9f9f9'
                    }}>
                      <div>
                        <strong style={{ color: '#333' }}>{beneficio.tipo}</strong>
                        <span style={{ display: 'block', fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          De {new Date(beneficio.dataInicio).toLocaleDateString('pt-BR')}
                          {beneficio.dataFinal && ` até ${new Date(beneficio.dataFinal).toLocaleDateString('pt-BR')}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerBeneficioGAC(index)}
                        style={{
                          background: '#ff6b6b',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulário para adicionar novo benefício GAC */}
              <div style={{ backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label htmlFor="tipoBeneficio">Tipo de Benefício</label>
                  <select
                    id="tipoBeneficio"
                    value={novoBeneficioGAC.tipo}
                    onChange={(e) => setNovoBeneficioGAC(prev => ({ ...prev, tipo: e.target.value }))}
                    className="form-input"
                  >
                    <option value="">Selecione um tipo</option>
                    <option value="Cesta Básica">Cesta Básica</option>
                    <option value="Auxílio Alimentação">Auxílio Alimentação</option>
                    <option value="Auxílio Financeiro">Auxílio Financeiro</option>
                    <option value="Bolsa Cultura">Bolsa Cultura</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="dataInicioBeneficio">Data de Início</label>
                    <input
                      id="dataInicioBeneficio"
                      type="date"
                      value={novoBeneficioGAC.dataInicio}
                      onChange={(e) => setNovoBeneficioGAC(prev => ({ ...prev, dataInicio: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="dataFinalBeneficio">Data Final</label>
                    <input
                      id="dataFinalBeneficio"
                      type="date"
                      value={novoBeneficioGAC.dataFinal}
                      onChange={(e) => setNovoBeneficioGAC(prev => ({ ...prev, dataFinal: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={adicionarBeneficioGAC}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#2e7d32',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  + Adicionar Benefício GAC
                </button>
              </div>
            </div>

            {/* Seção Benefícios do Governo */}
            <div className="form-secao">
              <h3 className="form-secao-titulo">Benefícios do Governo</h3>
              
              {/* Lista de Benefícios Existentes */}
              {Array.isArray(formData.beneficiosGoverno) && formData.beneficiosGoverno.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  {formData.beneficiosGoverno.map((beneficio, index) => (
                    <div key={index} style={{
                      padding: '12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      marginBottom: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#f9f9f9'
                    }}>
                      <div>
                        <strong style={{ color: '#333' }}>{beneficio.nome}</strong>
                        <span style={{ display: 'block', fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          {typeof beneficio.valor === 'number' 
                            ? beneficio.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : 'R$ 0,00'
                          }
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerBeneficioGoverno(index)}
                        style={{
                          background: '#ff6b6b',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulário para adicionar novo benefício do governo */}
              <div style={{ backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '6px' }}>
                <div className="form-group">
                  <label htmlFor="nomeBeneficioGoverno">Nome do Benefício</label>
                  <input
                    id="nomeBeneficioGoverno"
                    type="text"
                    value={novoBeneficioGoverno.nome}
                    onChange={(e) => setNovoBeneficioGoverno(prev => ({ ...prev, nome: e.target.value }))}
                    className="form-input"
                    placeholder="Ex: LOAS, Bolsa Família, BPC, etc."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="valorBeneficioGoverno">Valor do Benefício</label>
                  <input
                    id="valorBeneficioGoverno"
                    type="text"
                    value={novoBeneficioGoverno.valor}
                    onChange={(e) => setNovoBeneficioGoverno(prev => ({ ...prev, valor: e.target.value }))}
                    className="form-input"
                    placeholder="R$ 0,00"
                  />
                </div>

                <button
                  type="button"
                  onClick={adicionarBeneficioGoverno}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#2e7d32',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
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
    </>
  );
};

export default ModalEdicao;
