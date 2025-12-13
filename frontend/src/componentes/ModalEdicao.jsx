import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { atualizarPessoa, validarCPF } from '../servicos/api';
import { useGlobalToast } from '../contexto/ToastContext';
import { useAuth } from '../contexto/AuthContext';
import { usePusher } from '../contexto/PusherContext';
import GerenciadorBeneficiosGAC from './GerenciadorBeneficiosGAC';
import CampoComunidade from './CampoComunidade';
import DatePickerGAC from './DatePickerGAC';
import './ModalEdicao.css';

// Função para formatar moeda
const formatarMoeda = (valor) => {
  valor = (valor || '').toString();
  valor = valor.replace(/\D/g, '');
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
  valor = (valor || '').toString();
  return parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
};

const ModalEdicao = ({ pessoa, isOpen, onClose, onAtualizar }) => {
  const [formData, setFormData] = useState(pessoa || {});
  const [carregando, setCarregando] = useState(false);
  const [camposTocados, setCamposTocados] = useState({});
  const [novoBeneficioGAC, setNovoBeneficioGAC] = useState({ tipo: '', dataInicio: '', dataFinal: '' });
  const [novoBeneficioGoverno, setNovoBeneficioGoverno] = useState({ nome: '', valor: '' });
  const [mostrarGerenciadorBeneficios, setMostrarGerenciadorBeneficios] = useState(false);
  const [tiposBeneficios, setTiposBeneficios] = useState([]);
  const [beneficiosGovernoDisponiveis, setBeneficiosGovernoDisponiveis] = useState([]);
  const [alertaConflito, setAlertaConflito] = useState(null);
  const [pessoaExcluida, setPessoaExcluida] = useState(false);
  const [contadorFechamento, setContadorFechamento] = useState(null);
  const [carregandoRefresh, setCarregandoRefresh] = useState(false);
  const { sucesso, erro: erroToast, aviso } = useGlobalToast();
  const { token, usuario } = useAuth();
  const { registrarCallback } = usePusher();

  const API_URL = import.meta.env.VITE_API_URL || 
    (window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api');

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
    if (pessoa) {
      const dadosFormatados = {
        ...pessoa,
        rendaFamiliar: pessoa.rendaFamiliar ? formatarMoeda((pessoa.rendaFamiliar * 100).toString()) : ''
      };
      setFormData(dadosFormatados);
    }
  }, [pessoa, isOpen]);

  // ⚡ Sistema PUSHER em TEMPO REAL com callbacks imediatos
  useEffect(() => {
    if (!isOpen || !pessoa?.id) return;

    console.log(`⚙️ ModalEdicao: Registrando callbacks para pessoa ${pessoa.id}`);

    // Callback para quando pessoa for atualizada
    const unsubAtualizacao = registrarCallback('pessoaAtualizada', (evento) => {
      console.log(`🔔 ModalEdicao: Evento pessoaAtualizada recebido`);
      console.log(`🔍 evento.pessoa.id: ${evento.pessoa.id}, pessoa.id: ${pessoa.id}`);
      console.log(`🔍 evento.autorId: ${evento.autorId}, usuario.id: ${usuario?.id}`);
      
      if (String(evento.pessoa.id) === String(pessoa.id)) {
        console.log(`✅ É a mesma pessoa que está sendo editada`);
        
        // Alerta de conflito FAZ SENTIDO apenas quando OUTRO usuário edita
        if (evento.autorId !== usuario?.id) {
          console.log(`⚠️ MOSTRANDO ALERTA DE CONFLITO - outro usuário editou`);
          
          setAlertaConflito({
            tipo: 'editado',
            autorFuncao: evento.autorFuncao,
            timestamp: evento.timestamp
          });
        } else {
          console.log(`⏭️ Não mostrando alerta de conflito (é o próprio usuário que fez a edição)`);
        }
      } else {
        console.log(`⏭️ Pessoa diferente, ignorando evento`);
      }
    });

    // Callback para quando pessoa for deletada
    const unsubDelecao = registrarCallback('pessoaDeletada', (evento) => {
      if (String(evento.pessoa.id) === String(pessoa.id)) {
        console.log(`🗑️ ModalEdicao: Pessoa ${pessoa.id} foi deletada`);
        
        setPessoaExcluida(true);

        let contador = 5;
        setContadorFechamento(contador);

        const interval = setInterval(() => {
          contador--;
          setContadorFechamento(contador);

          if (contador <= 0) {
            clearInterval(interval);
            onClose();
          }
        }, 1000);

        return () => clearInterval(interval);
      }
    });

    // Limpar callbacks ao fechar modal
    return () => {
      unsubAtualizacao();
      unsubDelecao();
    };

  }, [isOpen, pessoa?.id, usuario?.id, registrarCallback, onClose, aviso, erroToast]);

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

  const formatarRG = (valor) => {
    if (!valor) return '';
    valor = valor.toString();
    let apenasNumeros = valor.replace(/\D/g, '');
    apenasNumeros = apenasNumeros.slice(0, 13);
    if (apenasNumeros.length <= 3) return apenasNumeros;
    if (apenasNumeros.length <= 6) return `${apenasNumeros.slice(0,3)}.${apenasNumeros.slice(3)}`;
    if (apenasNumeros.length <= 9) return `${apenasNumeros.slice(0,3)}.${apenasNumeros.slice(3,6)}.${apenasNumeros.slice(6)}`;
    return `${apenasNumeros.slice(0,3)}.${apenasNumeros.slice(3,6)}.${apenasNumeros.slice(6,9)}-${apenasNumeros.slice(9)}`;
  };

  const formatarNIS = (valor) => {
    if (!valor) return '';
    valor = valor.toString();
    let nums = valor.replace(/\D/g, '').slice(0, 11); // NIS 11 dígitos
    if (nums.length <= 3) return nums;
    if (nums.length <= 5) return nums.slice(0,3) + '.' + nums.slice(3);
    if (nums.length <= 7) return nums.slice(0,3) + '.' + nums.slice(3,5) + '.' + nums.slice(5);
    if (nums.length <= 10) return nums.slice(0,3) + '.' + nums.slice(3,5) + '.' + nums.slice(5,7) + '.' + nums.slice(7);
    return nums.slice(0,3) + '.' + nums.slice(3,5) + '.' + nums.slice(5,7) + '.' + nums.slice(7,10) + '-' + nums.slice(10);
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

  const extrairValorMoeda = (valor) => {
    // Remove formatação e extrai apenas o número
    valor = (valor || '').toString();
    return parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Marcar o campo como tocado
    setCamposTocados(prev => ({ ...prev, [name]: true }));
    
    let novoValor = value;
    
    if (name === 'rendaFamiliar') {
      setFormData(prev => ({ ...prev, [name]: formatarMoeda(value) }));
      return;
    } else if (name === 'cpf') {
      novoValor = formatarCPF(value);
    } else if (name === 'rg') {
      novoValor = formatarRG(value);
    } else if (name === 'nis') {
      novoValor = formatarNIS(value);
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
      case 'dataNascimento':
        if (!valor) return 'Data de nascimento é obrigatória';
        const dataNasc = new Date(valor);
        if (isNaN(dataNasc.getTime())) return 'Data de nascimento inválida';
        if (dataNasc > new Date()) return 'Data não pode ser no futuro';
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
        valor: extrairValorMoeda(novoBeneficioGoverno.valor)
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

  // 🔄 Função para recarregar dados da pessoa sem fechar o modal
  const handleRefreshDados = async () => {
    if (!pessoa?.id || !token) return;
    
    setCarregandoRefresh(true);
    
    try {
      const { obterPessoa } = await import('../servicos/api');
      const dadosAtualizados = await obterPessoa(token, pessoa.id);
      
      // Atualizar formData com dados frescos do backend
      const dadosFormatados = {
        ...dadosAtualizados,
        rendaFamiliar: dadosAtualizados.rendaFamiliar 
          ? formatarMoeda((dadosAtualizados.rendaFamiliar * 100).toString()) 
          : ''
      };
      
      setFormData(dadosFormatados);
      setAlertaConflito(null); // Esconder o alerta após refresh
      
      console.log('✅ Dados recarregados com sucesso no modal de edição');
      aviso('Atualizado', 'Dados recarregados com sucesso!');
      
    } catch (erro) {
      console.error('❌ Erro ao recarregar dados:', erro);
      erroToast('Erro', 'Não foi possível recarregar os dados. Tente novamente.');
    } finally {
      setCarregandoRefresh(false);
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

    // VALIDAR CPF LOCALMENTE E DUPLICADO (excluindo a própria pessoa)
    try {
      const cpfLimpo = (formData.cpf || '').replace(/\D/g, '');
      // Checagem local rápida: deve ter 11 dígitos
      if (!cpfLimpo || cpfLimpo.length !== 11) {
        erroToast('CPF inválido', 'Informe um CPF válido com 11 dígitos antes de salvar.');
        return;
      }

      await validarCPF(token, cpfLimpo, pessoa.id);
    } catch (erro) {
      if (erro.response?.status === 409) {
        erroToast(
          'CPF já cadastrado',
          `Já existe outro beneficiário cadastrado com o CPF ${formData.cpf}. Verifique os dados.`
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
      rg: formData.rg || null,
      cor: formData.cor || null,
      nis: formData.nis || null,
      telefone: (formData.telefone || '').replace(/\D/g, ''),
      cep: (formData.cep || '').replace(/\D/g, ''),
      dataNascimento: formData.dataNascimento || null,
      rendaFamiliar: formData.rendaFamiliar ? extrairValorMoeda(formData.rendaFamiliar) : null,
      numeroMembros: formData.numeroMembros ? parseInt(formData.numeroMembros) : null,
      dependentes: formData.dependentes ? parseInt(formData.dependentes) : null
    };
    
    setCarregando(true);

    try {
      const resultado = await atualizarPessoa(token, pessoa.id, dadosEnvio);
      sucesso('Sucesso', 'Beneficiário atualizado!');
      onAtualizar?.(dadosEnvio);
      
      // Auto-refresh: O evento SSE será disparado automaticamente pelo backend
      
      setTimeout(onClose, 500);
    } catch (erro) {
      const mensagemErro = erro.response?.data?.erro || erro.message || 'Erro desconhecido ao atualizar';
      erroToast('Erro ao Atualizar', mensagemErro);
    } finally {
      setCarregando(false);
    }
  };

  if (!isOpen || !pessoa) return null;

  return (
    <div className="modal-edicao-overlay" onClick={onClose}>
      {/* Overlay de bloqueio para pessoa excluída */}
      {pessoaExcluida && (
        <div className="modal-bloqueio-overlay">
          <div className="modal-bloqueio-card">
            <div className="bloqueio-icone">🗑️</div>
            <div className="bloqueio-titulo">Cadastro Removido</div>
            <div className="bloqueio-mensagem">
              Este cadastro foi excluído do sistema por outro usuário e não pode mais ser editado.
            </div>
            {contadorFechamento && (
              <div className="bloqueio-contador">
                Fechando automaticamente em <span className="contador-numero">{contadorFechamento}</span> segundos
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Alerta de conflito de edição */}
      {alertaConflito && (
        <div className="modal-alerta-conflito">
          <div className="conflito-icone">⚠️</div>
          <div className="conflito-texto">
            <strong>Cadastro atualizado por {alertaConflito.autorFuncao || 'outro usuário'}</strong>
            <br />
            <small>Os dados exibidos podem estar desatualizados. Clique em "Atualizar" para ver as alterações.</small>
          </div>
          <div className="conflito-acoes">
            <button 
              type="button"
              className="conflito-btn-refresh"
              onClick={(e) => {
                e.stopPropagation();
                handleRefreshDados();
              }}
              disabled={carregandoRefresh}
            >
              {carregandoRefresh ? '🔄 Atualizando...' : '🔄 Atualizar Dados'}
            </button>
            <button 
              type="button"
              className="conflito-fechar"
              onClick={(e) => {
                e.stopPropagation();
                setAlertaConflito(null);
              }}
              title="Fechar alerta"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div 
        className={`modal-edicao-container ${pessoaExcluida ? 'bloqueado' : ''}`}
        onClick={(e) => e.stopPropagation()}
        data-modal="edicao"
        data-pessoa-id={pessoa.id}
      >
        {/* HEADER */}
        <div className="modal-edicao-header">
          <h2 className="modal-edicao-titulo">Editar Beneficiário</h2>
          <button className="modal-edicao-close" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {/* CONTEÚDO SCROLLÁVEL */}
        <div className="modal-edicao-content">
          <form onSubmit={handleSubmit} className="modal-edicao-form" id="modal-form" noValidate>
            {/* Seção Pessoal */}
            <div className="form-secao">
              <h3 className="form-secao-titulo">Informações Pessoais</h3>
              
              <div className="form-grid-3">
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
                  />
                  {obterErrosCampo('cpf') && <span className="form-erro-msg">{obterErrosCampo('cpf')}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="rg">RG</label>
                  <input
                    id="rg"
                    type="text"
                    name="rg"
                    value={formData.rg || ''}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label htmlFor="dataNascimento">Data de Nascimento *</label>
                  <DatePickerGAC
                    value={formData.dataNascimento || ''}
                    onChange={(iso) => setFormData(prev => ({ ...prev, dataNascimento: iso || '' }))}
                    placeholder="dd/mm/aaaa"
                    maxDate={new Date().toISOString().split('T')[0]}
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
                    onChange={(valor) => {
                      setCamposTocados(prev => ({ ...prev, comunidade: true }));
                      setFormData(prev => ({ ...prev, comunidade: valor }));
                    }}
                    onKeyDown={handleKeyDown}
                    error={obterErrosCampo('comunidade')}
                    disabled={carregando}
                    required={true}
                    label="Comunidade"
                    placeholder="Selecione uma comunidade"
                  />
                </div>

              </div>
            </div>

            {/* Seção Contato */}
            <div className="form-secao">
              <h3 className="form-secao-titulo">Contato</h3>
              
              <div className="form-grid-3">
                <div className="form-group">
                  <label htmlFor="email">Email <span className="campo-opcional">(Opcional)</span></label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
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
                    onKeyDown={handleKeyDown}
                    className={`form-input ${obterErrosCampo('telefone') ? 'form-input-erro' : ''}`}
                  />
                  {obterErrosCampo('telefone') && <span className="form-erro-msg">{obterErrosCampo('telefone')}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="cor">Cor / Raça</label>
                  <select
                    id="cor"
                    name="cor"
                    value={formData.cor || ''}
                    onChange={(e) => { setCamposTocados(prev => ({ ...prev, cor: true })); setFormData(prev => ({ ...prev, cor: e.target.value })); }}
                    className="form-input"
                  >
                    <option value="">Selecione</option>
                    <option value="preto">Preto</option>
                    <option value="pardo">Pardo</option>
                    <option value="branco">Branco</option>
                    <option value="amarelo">Amarelo</option>
                    <option value="indigena">Indígena</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="nis">NIS <span className="campo-opcional">(Opcional)</span></label>
                  <input
                    id="nis"
                    type="text"
                    name="nis"
                    value={formData.nis || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, nis: e.target.value }))}
                    className="form-input"
                  />
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

            {/* Seção Informações de Renda */}
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
                  />
                </div>
              </div>
            </div>

            {/* Seção Benefícios GAC */}
            <div className="beneficio-gac-secao">
              <div className="beneficio-gac-cabecalho">
                <h3 className="form-secao-titulo">🌿 Benefícios GAC</h3>
              </div>
              
              {/* Lista de Benefícios Existentes */}
              {Array.isArray(formData.beneficiosGAC) && formData.beneficiosGAC.length > 0 ? (
                <div style={{ marginBottom: '20px' }}>
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
                        <DatePickerGAC
                          value={novoBeneficioGAC.dataInicio}
                          onChange={(iso) => setNovoBeneficioGAC(prev => ({ ...prev, dataInicio: iso || '' }))}
                          placeholder="dd/mm/aaaa"
                        />
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
                        <DatePickerGAC
                          value={novoBeneficioGAC.dataFinal}
                          onChange={(iso) => setNovoBeneficioGAC(prev => ({ ...prev, dataFinal: iso || '' }))}
                          placeholder="dd/mm/aaaa"
                        />
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
              <h3 className="beneficio-gac-titulo">🏦 Benefícios do Governo</h3>
              
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
                        className="botao-remover"
                        onClick={() => removerBeneficioGoverno(index)}
                        title="Remover benefício"
                      >
                        ✕
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
                      onChange={(e) => setNovoBeneficioGoverno(prev => ({
                        ...prev,
                        valor: formatarMoeda(e.target.value)
                      }))}
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
            disabled={carregando || pessoaExcluida}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="modal-form"
            className="btn btn-primary"
            disabled={carregando || pessoaExcluida}
          >
            {carregando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEdicao;
