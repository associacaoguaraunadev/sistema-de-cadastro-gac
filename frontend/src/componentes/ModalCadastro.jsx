import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { criarPessoa, validarCPF } from '../servicos/api';
import { useGlobalToast } from '../contexto/ToastContext';
import { useAuth } from '../contexto/AuthContext';
import GerenciadorBeneficiosGAC from './GerenciadorBeneficiosGAC';
import CampoComunidade from './CampoComunidade';
import './ModalEdicao.css';

// Função para formatação monetária
const formatarMoeda = (valor) => {
  // Garante que valor é string
  valor = (valor || '').toString();
  // Remove tudo que não é número
  valor = valor.replace(/\D/g, '');
  // Converte para número e formata com 2 casas decimais
  const numero = parseInt(valor || '0', 10) / 100;
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Função para extrair valor numérico da moeda
const extrairValorMoeda = (valor) => {
  // Remove formatação e extrai apenas o número
  valor = (valor || '').toString();
  return parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
};

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
    dataNascimento: '',
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

  // Escutar atualizações de comunidades
  useEffect(() => {
    const handleComunidadesAtualizadas = () => {
      const comunidadesAtualizadas = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
      setComunidadesCustomizadas(comunidadesAtualizadas);
    };
    
    window.addEventListener('comunidadesAtualizadas', handleComunidadesAtualizadas);
    return () => window.removeEventListener('comunidadesAtualizadas', handleComunidadesAtualizadas);
  }, []);

  const [carregando, setCarregando] = useState(false);
  const [novoBeneficioGAC, setNovoBeneficioGAC] = useState({ tipo: '', dataInicio: '', dataFinal: '' });
  const [novoBeneficioGoverno, setNovoBeneficioGoverno] = useState({ nome: '', valor: '' });
  const [mostrarGerenciadorBeneficios, setMostrarGerenciadorBeneficios] = useState(false);
  const [tiposBeneficios, setTiposBeneficios] = useState([]);
  const [beneficiosGovernoDisponiveis, setBeneficiosGovernoDisponiveis] = useState([]);
  const { sucesso, erro: erroToast } = useGlobalToast();
  const { token, usuario } = useAuth();

  const API_URL = import.meta.env.VITE_API_URL || 
    (window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api');

  // Função para gerar dados de teste aleatórios
  const gerarDadosTeste = () => {
    const nomes = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Ferreira', 'Lucia Almeida', 'José Pereira', 'Fernanda Lima', 'Roberto Souza', 'Patricia Rocha'];
    const enderecos = ['Rua das Flores, 123', 'Av. Brasil, 456', 'Rua São João, 789', 'Rua da Paz, 321', 'Av. Paulista, 654'];
    const bairros = ['Centro', 'Vila Nova', 'Jardim das Rosas', 'Parque Industrial', 'Vila São José', 'Residencial Santos'];
    const cidades = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Brasília', 'Fortaleza'];
    const estados = ['SP', 'RJ', 'MG', 'BA', 'DF', 'CE'];
    const comunidades = ['Barragem', 'Vila Verde', 'Centro Comunitário', 'Jardim Esperança'];
    
    // Gerar CPF aleatório (apenas para teste)
    const gerarCPF = () => {
      const nums = [];
      for (let i = 0; i < 9; i++) {
        nums.push(Math.floor(Math.random() * 10));
      }
      return nums.join('').replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3-') + '00';
    };
    
    // Gerar telefone aleatório
    const gerarTelefone = () => {
      return `(11) 9${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    };
    
    const dadosTeste = {
      nome: nomes[Math.floor(Math.random() * nomes.length)],
      cpf: gerarCPF(),
      email: `teste${Math.floor(Math.random() * 1000)}@gmail.com`,
      telefone: gerarTelefone(),
      endereco: enderecos[Math.floor(Math.random() * enderecos.length)],
      bairro: bairros[Math.floor(Math.random() * bairros.length)],
      cidade: cidades[Math.floor(Math.random() * cidades.length)],
      estado: estados[Math.floor(Math.random() * estados.length)],
      cep: `${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`,
      idade: Math.floor(Math.random() * 80) + 1,
      comunidade: comunidades[Math.floor(Math.random() * comunidades.length)],
      rendaFamiliar: formatarMoeda((Math.floor(Math.random() * 5000) + 500).toString()),
      numeroMembros: Math.floor(Math.random() * 8) + 1,
      dependentes: Math.floor(Math.random() * 5),
      beneficiosGAC: [],
      beneficiosGoverno: [],
      observacoes: 'Dados gerados automaticamente para teste'
    };
    
    setFormData(dadosTeste);
    
    // Limpar campos tocados para não mostrar erros
    setCamposTocados({});
  };

  // Carregar benefícios da API
  useEffect(() => {
    const carregarBeneficios = async () => {
      if (!token) return;
      
      try {
        // Carregar benefícios GAC
        const respostaGAC = await fetch(`${API_URL}/beneficios/gac`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dadosGAC = await respostaGAC.json();
        setTiposBeneficios(dadosGAC.beneficios || []);

        // Carregar benefícios Governo
        const respostaGoverno = await fetch(`${API_URL}/beneficios/governo`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dadosGoverno = await respostaGoverno.json();
        setBeneficiosGovernoDisponiveis(dadosGoverno.beneficios || []);
      } catch (error) {
        console.error('Erro ao carregar benefícios:', error);
      }
    };

    if (isOpen) {
      carregarBeneficios();
    }

    // Listener para recarregar quando houver atualizações
    const handleBeneficiosAtualizados = () => {
      if (isOpen) {
        carregarBeneficios();
      }
    };

    window.addEventListener('beneficiosAtualizados', handleBeneficiosAtualizados);
    return () => window.removeEventListener('beneficiosAtualizados', handleBeneficiosAtualizados);
  }, [isOpen, token]);

  useEffect(() => {
    if (!isOpen) return;
    
    // Limpar formulários de benefícios quando o modal for aberto
    setNovoBeneficioGAC({ tipo: '', dataInicio: '', dataFinal: '' });
    setNovoBeneficioGoverno({ nome: '', valor: '' });
    
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
    
    // Formatação específica por campo
    if (name === 'rendaFamiliar') {
      setFormData(prev => ({ ...prev, [name]: formatarMoeda(value) }));
      return;
    }
    
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
      case 'dataNascimento':
        if (!valor) return 'Data de nascimento é obrigatória';
        const dataNasc = new Date(valor);
        if (isNaN(dataNasc.getTime())) return 'Data de nascimento inválida';
        if (dataNasc > new Date()) return 'Data não pode ser no futuro';
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

  // Função para lidar com Enter em todos os campos
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Se for um dropdown (select), simula um clique para abrir/fechar
      if (e.target.tagName === 'SELECT') {
        // Para dropdowns, apenas previne o comportamento padrão
        // O usuário pode navegar com as setas e Enter para selecionar
        return;
      }
      
      // Tratar casos especiais de benefícios
      if (e.target.id === 'valorBeneficioGoverno') {
        // Se está no campo valor do benefício do governo, adiciona o benefício
        if (novoBeneficioGoverno.nome && novoBeneficioGoverno.valor) {
          adicionarBeneficioGoverno();
          return;
        }
      }
      
      if (e.target.id === 'nomeBeneficioGoverno') {
        // Se está no campo nome do benefício do governo, vai para o valor
        const valorInput = document.getElementById('valorBeneficioGoverno');
        if (valorInput) {
          valorInput.focus();
          return;
        }
      }
      
      // Para outros campos, tenta focar no próximo campo
      const form = e.target.closest('form');
      if (form) {
        const elementos = form.querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
        const indiceAtual = Array.from(elementos).indexOf(e.target);
        
        if (indiceAtual > -1 && indiceAtual < elementos.length - 1) {
          elementos[indiceAtual + 1].focus();
        } else {
          // Se for o último campo, submete o formulário
          form.querySelector('button[type="submit"]')?.click();
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // MARCAR TODOS OS CAMPOS COMO TOCADOS PARA MOSTRAR ERROS
    setCamposTocados({
      nome: true,
      cpf: true,
      dataNascimento: true,
      telefone: true,
      endereco: true,
      bairro: true,
      cidade: true,
      estado: true,
      comunidade: true
    });
    
    // VALIDAÇÃO RIGOROSA DE TODOS OS CAMPOS OBRIGATÓRIOS
    const camposObrigatorios = ['nome', 'cpf', 'dataNascimento', 'telefone', 'endereco', 'bairro', 'cidade', 'estado', 'comunidade'];
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

    // VALIDAR CPF DUPLICADO
    try {
      const cpfLimpo = (formData.cpf || '').replace(/\D/g, '');
      await validarCPF(token, cpfLimpo);
    } catch (erro) {
      if (erro.response?.status === 409) {
        erroToast(
          'CPF já cadastrado',
          `Já existe um beneficiário cadastrado com o CPF ${formData.cpf}. Verifique os dados ou edite o beneficiário existente.`
        );
        return;
      } else {
        erroToast('Erro de Validação', 'Não foi possível validar o CPF. Tente novamente.');
        return;
      }
    }
    
    // PREPARAR DADOS PARA ENVIO
    const dadosEnvio = {
      ...formData,
      beneficiosGAC: Array.isArray(formData.beneficiosGAC) ? formData.beneficiosGAC : [],
      beneficiosGoverno: Array.isArray(formData.beneficiosGoverno) ? formData.beneficiosGoverno : [],
      cpf: (formData.cpf || '').replace(/\D/g, ''),
      telefone: (formData.telefone || '').replace(/\D/g, ''),
      cep: (formData.cep || '').replace(/\D/g, ''),
      dataNascimento: formData.dataNascimento || null,
      rendaFamiliar: formData.rendaFamiliar ? extrairValorMoeda(formData.rendaFamiliar) : null,
      numeroMembros: formData.numeroMembros ? parseInt(formData.numeroMembros) : null,
      dependentes: formData.dependentes ? parseInt(formData.dependentes) : null
    };
    
    setCarregando(true);

    try {
      const resultado = await criarPessoa(token, dadosEnvio);
      sucesso('Sucesso', 'Beneficiário cadastrado!');
      onCadastrar?.(dadosEnvio);
      
      // Auto-refresh: O evento SSE será disparado automaticamente pelo backend
      
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
        dataNascimento: '',
        comunidade: '',
        rendaFamiliar: '',
        numeroMembros: '',
        dependentes: '',
        beneficiosGAC: [],
        beneficiosGoverno: [],
        observacoes: ''
      });
      
      // Limpar formulários de benefícios
      setNovoBeneficioGAC({ tipo: '', dataInicio: '', dataFinal: '' });
      setNovoBeneficioGoverno({ nome: '', valor: '' });
      
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
          <div className="modal-header-actions">
            <button
              className="botao-template"
              onClick={gerarDadosTeste}
              type="button"
              disabled={carregando}
              title="Preencher com dados de teste"
            >
              🎲 Teste
            </button>
            <button
              className="modal-edicao-close"
              onClick={onClose}
              type="button"
              disabled={carregando}
              title="Fechar (ESC)"
            >
              <X size={20} />
            </button>
          </div>
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
                    onKeyDown={handleKeyDown}
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
                    onKeyDown={handleKeyDown}
                    className={`form-input ${obterErrosCampo('cpf') ? 'form-input-erro' : ''}`}
                    placeholder="000.000.000-00"
                  />
                  {obterErrosCampo('cpf') && <span className="form-erro-msg">{obterErrosCampo('cpf')}</span>}
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label htmlFor="dataNascimento">Data de Nascimento *</label>
                  <input
                    id="dataNascimento"
                    type="date"
                    name="dataNascimento"
                    max={new Date().toISOString().split('T')[0]}
                    value={formData.dataNascimento || ''}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className={`form-input ${obterErrosCampo('dataNascimento') ? 'form-input-erro' : ''}`}
                  />
                  {obterErrosCampo('dataNascimento') && <span className="form-erro-msg">{obterErrosCampo('dataNascimento')}</span>}
                  {formData.dataNascimento && (
                    <span className="idade-calculada-modal">
                      Idade: {(() => {
                        const nascimento = new Date(formData.dataNascimento);
                        const hoje = new Date();
                        let idade = hoje.getFullYear() - nascimento.getFullYear();
                        const mes = hoje.getMonth() - nascimento.getMonth();
                        if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
                          idade--;
                        }
                        return Math.max(0, idade);
                      })()} anos
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <CampoComunidade
                    value={formData.comunidade || ''}
                    onChange={(valor) => handleChange({ target: { name: 'comunidade', value: valor } })}
                    onKeyDown={handleKeyDown}
                    error={obterErrosCampo('comunidade')}
                    required={true}
                  />
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
                    onKeyDown={handleKeyDown}
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
                  onKeyDown={handleKeyDown}
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
                    onKeyDown={handleKeyDown}
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
                    onKeyDown={handleKeyDown}
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
                    onKeyDown={handleKeyDown}
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
                  onKeyDown={handleKeyDown}
                  className="form-input"
                  placeholder="06712-200"
                  maxLength="9"
                />
              </div>
            </div>

            {/* Seção Benefícios GAC */}
            <div className="beneficio-gac-secao">
              <div className="beneficio-gac-cabecalho">
                <h3 className="form-secao-titulo">🌿 Benefícios GAC</h3>
                <button
                  type="button"
                  onClick={() => setMostrarGerenciadorBeneficios(true)}
                  className="beneficio-gac-botao-editar-tipos"
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
                        ×
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
                {/* Campo de seleção de tipo */}
                <div className="beneficio-gac-form-group">
                  <label htmlFor="tipoBeneficio">Tipo de Benefício</label>
                  <select
                    id="tipoBeneficio"
                    value={novoBeneficioGAC.tipo}
                    onChange={(e) => setNovoBeneficioGAC(prev => ({ ...prev, tipo: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    className="beneficio-gac-data-input"
                  >
                    <option value="">Selecione um tipo</option>
                    {tiposBeneficios.map((tipo, idx) => (
                      <option key={idx} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                {/* Campos de data */}
                <div className="beneficio-gac-form-row">
                  <div className="beneficio-gac-form-group">
                    <label htmlFor="dataInicioBeneficio">Data de Início</label>
                    <div 
                      className="data-input-wrapper"
                      onClick={(e) => {
                        const input = e.currentTarget.querySelector('input[type="date"]');
                        if (input && input.showPicker) {
                          input.showPicker();
                        } else if (input) {
                          input.focus();
                          input.click();
                        }
                      }}
                    >
                      <input
                        id="dataInicioBeneficio"
                        type="date"
                        value={novoBeneficioGAC.dataInicio}
                        onChange={(e) => setNovoBeneficioGAC(prev => ({ ...prev, dataInicio: e.target.value }))}
                        onKeyDown={handleKeyDown}
                        placeholder="dd/mm/aaaa"
                        className="beneficio-gac-data-input"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (e.target.showPicker) {
                            e.target.showPicker();
                          }
                        }}
                        onSelectStart={(e) => e.preventDefault()}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setTimeout(() => {
                            if (e.target.showPicker) {
                              e.target.showPicker();
                            }
                          }, 0);
                        }}
                        onFocus={(e) => {
                          setTimeout(() => {
                            if (e.target.showPicker) {
                              e.target.showPicker();
                            }
                          }, 0);
                        }}
                      />
                      <span className="data-input-icon">📆</span>
                    </div>
                  </div>
                  <div className="beneficio-gac-form-group">
                    <label htmlFor="dataFinalBeneficio">Data Final (opcional)</label>
                    <div 
                      className="data-input-wrapper"
                      onClick={(e) => {
                        const input = e.currentTarget.querySelector('input[type="date"]');
                        if (input && input.showPicker) {
                          input.showPicker();
                        } else if (input) {
                          input.focus();
                          input.click();
                        }
                      }}
                    >
                      <input
                        id="dataFinalBeneficio"
                        type="date"
                        value={novoBeneficioGAC.dataFinal}
                        onChange={(e) => setNovoBeneficioGAC(prev => ({ ...prev, dataFinal: e.target.value }))}
                        onKeyDown={handleKeyDown}
                        placeholder="dd/mm/aaaa"
                        className="beneficio-gac-data-input"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (e.target.showPicker) {
                            e.target.showPicker();
                          }
                        }}
                        onSelectStart={(e) => e.preventDefault()}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setTimeout(() => {
                            if (e.target.showPicker) {
                              e.target.showPicker();
                            }
                          }, 0);
                        }}
                        onFocus={(e) => {
                          setTimeout(() => {
                            if (e.target.showPicker) {
                              e.target.showPicker();
                            }
                          }, 0);
                        }}
                      />
                      <span className="data-input-icon">📆</span>
                    </div>
                  </div>
                </div>

                {/* Botão adicionar */}
                <button
                  type="button"
                  onClick={adicionarBeneficioGAC}
                  className="beneficio-gac-adicionar"
                >
                  🌿 Adicionar Benefício GAC
                </button>
              </div>
            </div>

            {/* Seção Benefícios do Governo */}
            <div className="beneficio-governo-secao">
              <h3 className="beneficio-governo-titulo">🏦 Benefícios do Governo</h3>
              
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
                <div className="beneficio-gac-form-row">
                  <div className="beneficio-gac-input-group">
                    <label htmlFor="nomeBeneficioGoverno" className="beneficio-gac-label">Nome do Benefício</label>
                    <select
                      id="nomeBeneficioGoverno"
                      value={novoBeneficioGoverno.nome}
                      onChange={(e) => setNovoBeneficioGoverno(prev => ({ ...prev, nome: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      className="beneficio-gac-input"
                    >
                      <option value="">Selecione um benefício</option>
                      {beneficiosGovernoDisponiveis.map((beneficio, idx) => (
                        <option key={idx} value={beneficio}>{beneficio}</option>
                      ))}
                    </select>
                  </div>

                  <div className="beneficio-gac-input-group">
                    <label htmlFor="valorBeneficioGoverno" className="beneficio-gac-label">Valor do Benefício</label>
                    <input
                      id="valorBeneficioGoverno"
                      type="text"
                      value={novoBeneficioGoverno.valor}
                      onChange={(e) => setNovoBeneficioGoverno(prev => ({ ...prev, valor: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      className="beneficio-gac-input"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={adicionarBeneficioGoverno}
                  className="beneficio-gac-adicionar"
                >
                  🏦 Adicionar Benefício do Governo
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
                    type="text"
                    name="rendaFamiliar"
                    value={formData.rendaFamiliar || ''}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
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
                    onKeyDown={handleKeyDown}
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
                    onKeyDown={handleKeyDown}
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
                  onKeyDown={handleKeyDown}
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

