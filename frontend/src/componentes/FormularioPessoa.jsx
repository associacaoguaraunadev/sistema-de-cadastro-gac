import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useToast } from '../hooks/useToast';
import { obterPessoa, criarPessoa, atualizarPessoa } from '../servicos/api';
import { ArrowLeft, Save, Check } from 'lucide-react';
import { ToastContainer } from './Toast';
import './FormularioPessoa.css';

export const FormularioPessoa = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { toasts, removerToast, sucesso: sucessoToast, erro: erroToast } = useToast();
  
  const [formulario, setFormulario] = useState({
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
  
  const [comunidadeCustomizada, setComunidadeCustomizada] = useState('');
  const [comunidadesCustomizadas, setComunidadesCustomizadas] = useState(() => {
    const salvas = localStorage.getItem('comunidadesCustomizadas');
    return salvas ? JSON.parse(salvas) : [];
  });

  // Estado para novo benefício GAC sendo adicionado
  const [novoBeneficio, setNovoBeneficio] = useState({
    tipo: 'Cesta Básica',
    dataInicio: '',
    dataFinal: ''
  });

  // Erros de validação por campo
  const [errosValidacao, setErrosValidacao] = useState({});

  // Estado para novo benefício do governo sendo adicionado
  const [novoBeneficioGoverno, setNovoBeneficioGoverno] = useState({
    nome: '',
    valor: ''
  });
  
  const [carregando, setCarregando] = useState(!!id);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [redirecionando, setRedirecionando] = useState(false);

  useEffect(() => {
    if (id && token) {
      carregarPessoa();
    }
  }, [id, token]);

  const carregarPessoa = async () => {
    try {
      const pessoa = await obterPessoa(token, id);
      setFormulario({
        ...pessoa,
        nome: (pessoa.nome || '').toString(),
        cpf: (pessoa.cpf || '').toString(),
        email: (pessoa.email || '').toString(),
        telefone: (pessoa.telefone || '').toString(),
        endereco: (pessoa.endereco || '').toString(),
        bairro: (pessoa.bairro || '').toString(),
        cidade: (pessoa.cidade || '').toString(),
        estado: (pessoa.estado || '').toString(),
        cep: (pessoa.cep || '').toString(),
        idade: pessoa.idade ? pessoa.idade.toString() : '',
        comunidade: (pessoa.comunidade || '').toString(),
        rendaFamiliar: pessoa.rendaFamiliar || '',
        numeroMembros: pessoa.numeroMembros ? pessoa.numeroMembros.toString() : '',
        dependentes: pessoa.dependentes ? pessoa.dependentes.toString() : '',
        observacoes: (pessoa.observacoes || '').toString(),
        beneficiosGAC: Array.isArray(pessoa.beneficiosGAC) ? pessoa.beneficiosGAC : [],
        beneficiosGoverno: Array.isArray(pessoa.beneficiosGoverno) ? pessoa.beneficiosGoverno : []
      });
    } catch (erro) {
      const mensagem = 'Não foi possível carregar os dados da pessoa. Tente novamente.';
      setErro(mensagem);
      erroToast('Erro ao Carregar', mensagem);
    } finally {
      setCarregando(false);
    }
  };

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

  const formatarCEP = (valor) => {
    // Garante que valor é string
    valor = (valor || '').toString();
    // Remove tudo que não é número
    valor = valor.replace(/\D/g, '');
    // Limita a 8 dígitos
    valor = valor.slice(0, 8);
    // Formata: 00000-000
    if (valor.length >= 5) {
      valor = valor.slice(0, 5) + '-' + valor.slice(5);
    }
    return valor;
  };

  const formatarTelefone = (valor) => {
    // Garante que valor é string
    valor = (valor || '').toString();
    // Remove tudo que não é número
    valor = valor.replace(/\D/g, '');
    // Limita a 11 dígitos
    valor = valor.slice(0, 11);
    
    // Se não tem dígitos, retorna vazio
    if (valor.length === 0) return '';
    
    // Formata: (XX) XXXXX-XXXX (10 dígitos) ou (XX) 9XXXX-XXXX (11 dígitos)
    if (valor.length <= 2) {
      return valor;
    } else if (valor.length <= 7) {
      return `(${valor.slice(0, 2)}) ${valor.slice(2)}`;
    } else {
      return `(${valor.slice(0, 2)}) ${valor.slice(2, 7)}-${valor.slice(7)}`;
    }
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

  const validarDataBeneficio = () => {
    if (!novoBeneficio.dataInicio) {
      setErro('Data de início é obrigatória');
      return false;
    }

    if (novoBeneficio.dataFinal) {
      const dataInicio = new Date(novoBeneficio.dataInicio);
      const dataFinal = new Date(novoBeneficio.dataFinal);

      if (dataFinal < dataInicio) {
        setErro('Data final não pode ser menor que a data de início');
        return false;
      }
    }

    return true;
  };

  const handleMudar = (e) => {
    const { name, value } = e.target;
    
    let novoValor = value;
    if (name === 'cpf') novoValor = formatarCPF(value);
    if (name === 'cep') novoValor = formatarCEP(value);
    if (name === 'telefone') novoValor = formatarTelefone(value);
    if (name === 'rendaFamiliar') novoValor = formatarMoeda(value);

    setFormulario(prev => ({
      ...prev,
      [name]: novoValor
    }));
    
    // Limpar erro de validação quando o campo é preenchido
    if (errosValidacao[name]) {
      setErrosValidacao(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleMudarComunidadeCustomizada = (e) => {
    setComunidadeCustomizada(e.target.value);
  };

  const adicionarComunidadeCustomizada = () => {
    const comunidadeNormalizada = comunidadeCustomizada.trim().toLowerCase();
    
    if (!comunidadeNormalizada) {
      setErro('Digite o nome da comunidade');
      return;
    }

    const todasAsComunidades = [
      'Vila Cheba',
      'Morro da Vila',
      'Barragem',
      'Parque Centenario',
      'Jardim Apura',
      ...comunidadesCustomizadas
    ].map(c => c.toLowerCase());

    if (todasAsComunidades.includes(comunidadeNormalizada)) {
      setErro('Esta comunidade já existe');
      return;
    }

    const novasComunidades = [...comunidadesCustomizadas, comunidadeCustomizada.trim()];
    setComunidadesCustomizadas(novasComunidades);
    localStorage.setItem('comunidadesCustomizadas', JSON.stringify(novasComunidades));

    setFormulario(prev => ({
      ...prev,
      comunidade: comunidadeCustomizada.trim()
    }));
    
    setComunidadeCustomizada('');
    setErro('');
  };

  // Funções para gerenciar benefícios GAC
  const adicionarBeneficio = () => {
    if (!validarDataBeneficio()) {
      return;
    }

    setFormulario(prev => ({
      ...prev,
      beneficiosGAC: [...prev.beneficiosGAC, { ...novoBeneficio }]
    }));

    setNovoBeneficio({
      tipo: 'Cesta Básica',
      dataInicio: '',
      dataFinal: ''
    });
    setErro('');
  };

  const removerBeneficio = (index) => {
    setFormulario(prev => ({
      ...prev,
      beneficiosGAC: prev.beneficiosGAC.filter((_, i) => i !== index)
    }));
  };

  const handleMudarNovoBeneficio = (field, value) => {
    setNovoBeneficio(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Funções para gerenciar benefícios do governo dinâmicos
  
  const adicionarBeneficioGoverno = () => {
    if (!novoBeneficioGoverno.nome.trim()) {
      erroToast('Campo Vazio', 'Digite o nome do benefício de governo');
      return;
    }

    const valor = parseFloat(extrairValorMoeda(novoBeneficioGoverno.valor));
    
    if (isNaN(valor) || valor < 0) {
      erroToast('Valor Inválido', 'Digite um valor numérico válido (maior que zero)');
      return;
    }

    setFormulario(prev => {
      const beneficiosAtuais = Array.isArray(prev.beneficiosGoverno) ? prev.beneficiosGoverno : [];
      return {
        ...prev,
        beneficiosGoverno: [
          ...beneficiosAtuais,
          {
            nome: novoBeneficioGoverno.nome.trim(),
            valor: valor
          }
        ]
      };
    });

    // Limpar formulário
    setNovoBeneficioGoverno({ nome: '', valor: '' });
  };

  const removerBeneficioGoverno = (index) => {
    setFormulario(prev => {
      const beneficiosAtuais = Array.isArray(prev.beneficiosGoverno) ? prev.beneficiosGoverno : [];
      return {
        ...prev,
        beneficiosGoverno: beneficiosAtuais.filter((_, i) => i !== index)
      };
    });
  };

  // Calcular soma total dos benefícios do governo
  const calcularTotalBeneficiosGoverno = () => {
    if (!Array.isArray(formulario.beneficiosGoverno)) return 0;
    return formulario.beneficiosGoverno.reduce((total, beneficio) => {
      const valor = typeof beneficio.valor === 'number' ? beneficio.valor : 0;
      return total + valor;
    }, 0);
  };

  // Validar campos obrigatórios
  const validarFormulario = () => {
    const novosErros = {};
    const mensagensErro = [];

    // Validar Nome
    if (!formulario.nome.trim()) {
      novosErros.nome = '⚠️ Nome completo é obrigatório';
      mensagensErro.push('Nome completo é obrigatório');
    }
    
    // Validar CPF: retirar formatação e verificar se tem 11 dígitos
    const cpfLimpo = (formulario.cpf || '').replace(/\D/g, '');
    if (!cpfLimpo) {
      novosErros.cpf = '⚠️ CPF é obrigatório';
      mensagensErro.push('CPF é obrigatório');
    } else if (cpfLimpo.length !== 11) {
      novosErros.cpf = `⚠️ CPF incompleto (${cpfLimpo.length}/11 dígitos)`;
      mensagensErro.push(`CPF incompleto (${cpfLimpo.length}/11 dígitos). Digite o CPF completo.`);
    }
    
    // Validar Endereço
    if (!formulario.endereco.trim()) {
      novosErros.endereco = '⚠️ Endereço é obrigatório';
      mensagensErro.push('Endereço é obrigatório');
    }
    
    // Validar Comunidade
    if (!formulario.comunidade.trim()) {
      novosErros.comunidade = '⚠️ Comunidade é obrigatória';
      mensagensErro.push('Comunidade é obrigatória');
    }
    
    // Validar Idade
    if (!formulario.idade || formulario.idade === '') {
      novosErros.idade = '⚠️ Idade é obrigatória';
      mensagensErro.push('Idade é obrigatória');
    } else if (isNaN(formulario.idade) || formulario.idade < 0 || formulario.idade > 150) {
      novosErros.idade = '⚠️ Idade inválida (0-150 anos)';
      mensagensErro.push('Idade deve ser um número entre 0 e 150');
    }

    // Validar Telefone: deve ter pelo menos 10 dígitos (padrão brasileiro)
    const telefoneLimpo = (formulario.telefone || '').replace(/\D/g, '');
    if (!telefoneLimpo) {
      novosErros.telefone = '⚠️ Telefone é obrigatório';
      mensagensErro.push('Telefone é obrigatório');
    } else if (telefoneLimpo.length < 10) {
      novosErros.telefone = `⚠️ Telefone incompleto (${telefoneLimpo.length}/10 dígitos)`;
      mensagensErro.push(`Telefone incompleto (${telefoneLimpo.length}/10 dígitos). Digite o telefone completo.`);
    }

    setErrosValidacao(novosErros);
    
    // Mostrar toast com todos os erros
    if (mensagensErro.length > 0) {
      const mensagensCombinadas = mensagensErro.join('\n');
      erroToast(
        `❌ ${mensagensErro.length} ${mensagensErro.length === 1 ? 'erro encontrado' : 'erros encontrados'}`,
        mensagensErro.length === 1 ? mensagensErro[0] : `Por favor, corrija os campos obrigatórios`
      );
    }
    
    return Object.keys(novosErros).length === 0;
  };


  const aoEnviar = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (!validarFormulario()) {
      return;
    }

    setSalvando(true);

    try {
      const dados = {
        nome: formulario.nome.trim(),
        cpf: (formulario.cpf || '').toString().replace(/\D/g, ''),
        email: formulario.email?.trim() || null,
        telefone: (formulario.telefone || '').toString().trim() || null,
        endereco: formulario.endereco.trim(),
        bairro: formulario.bairro?.trim() || null,
        cidade: formulario.cidade?.trim() || null,
        estado: formulario.estado?.trim() || null,
        cep: (formulario.cep || '').toString().trim() || null,
        idade: formulario.idade ? parseInt(formulario.idade) : null,
        comunidade: formulario.comunidade?.trim() || null,
        rendaFamiliar: formulario.rendaFamiliar ? extrairValorMoeda(formulario.rendaFamiliar) : null,
        numeroMembros: formulario.numeroMembros ? parseInt(formulario.numeroMembros) : null,
        dependentes: formulario.dependentes ? parseInt(formulario.dependentes) : null,
        beneficiosGAC: formulario.beneficiosGAC || [],
        beneficiosGoverno: formulario.beneficiosGoverno || [],
        observacoes: formulario.observacoes?.trim() || null
      };

      if (id) {
        await atualizarPessoa(token, id, dados);
        setSucesso('✓ Pessoa atualizada com sucesso!');
        sucessoToast('Sucesso!', 'Pessoa atualizada com sucesso');
      } else {
        await criarPessoa(token, dados);
        setSucesso('✓ Pessoa cadastrada com sucesso!');
        sucessoToast('Sucesso!', 'Pessoa cadastrada com sucesso');
      }

      // Salvar comunidade customizada se for nova
      const comunidadesFixas = ['Vila Cheba', 'Morro da Vila', 'Barragem', 'Parque Centenario', 'Jardim Apura'];
      if (formulario.comunidade && !comunidadesFixas.includes(formulario.comunidade)) {
        const comunidadesCustomizadas = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
        if (!comunidadesCustomizadas.includes(formulario.comunidade)) {
          comunidadesCustomizadas.push(formulario.comunidade);
          localStorage.setItem('comunidadesCustomizadas', JSON.stringify(comunidadesCustomizadas));
        }
      }

      // Animação de sucesso e redirecionamento
      setRedirecionando(true);
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (erro) {
      const mensagem = erro.response?.data?.erro || erro.message || 'Erro desconhecido ao salvar';
      setErro(mensagem);
      erroToast('Erro ao Salvar Dados', mensagem);
    } finally {
      setSalvando(false);
    }
  };

  const handleCancelar = () => {
    setRedirecionando(true);
    setTimeout(() => {
      navigate('/');
    }, 600);
  };

  if (carregando) {
    return <div className="carregando-container">Carregando...</div>;
  }

  return (
    <div className={`container-formulario ${redirecionando ? 'saindo' : ''}`}>
      <header className="cabecalho-formulario">
        <button 
          className="botao-voltar"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={20} />
        </button>
        <h1>{id ? 'Editar Beneficiário' : 'Novo Beneficiário'}</h1>
        <div style={{ width: '48px' }}></div>
      </header>

      <main className="conteudo-formulario">
        <form onSubmit={aoEnviar} className="formulario-pessoa" noValidate>
          {erro && <div className="alerta-erro">{erro}</div>}
          {sucesso && <div className="alerta-sucesso">{sucesso}</div>}

          <section className="secao-formulario">
            <h2>Informações Pessoais</h2>
            
            <div className="campo-duplo">
              <div className={`campo ${errosValidacao.nome ? 'campo-erro' : ''}`}>
                <label htmlFor="nome">Nome Completo *</label>
                <input
                  id="nome"
                  name="nome"
                  type="text"
                  value={formulario.nome}
                  onChange={handleMudar}
                  placeholder="Nome completo"
                  disabled={salvando}
                />
                {errosValidacao.nome && <span className="texto-erro">{errosValidacao.nome}</span>}
              </div>
              <div className={`campo ${errosValidacao.cpf ? 'campo-erro' : ''}`}>
                <label htmlFor="cpf">CPF *</label>
                <input
                  id="cpf"
                  name="cpf"
                  type="text"
                  value={formulario.cpf}
                  onChange={handleMudar}
                  placeholder="000.000.000-00"
                  maxLength="14"
                  disabled={salvando}
                />
                {errosValidacao.cpf && <span className="texto-erro">{errosValidacao.cpf}</span>}
              </div>
            </div>

            <div className="campo-duplo">
              <div className="campo">
                <label htmlFor="email">Email <span className="campo-opcional">(Opcional)</span></label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formulario.email}
                  onChange={handleMudar}
                  placeholder="email@exemplo.com"
                  disabled={salvando}
                />
              </div>
              <div className="campo">
                <label htmlFor="telefone">Telefone *</label>
                <input
                  id="telefone"
                  name="telefone"
                  type="text"
                  value={formulario.telefone}
                  onChange={handleMudar}
                  placeholder="(00) 90000-0000"
                  maxLength="15"
                  disabled={salvando}
                />
              </div>
            </div>

            <div className="campo-duplo">
              <div className={`campo ${errosValidacao.idade ? 'campo-erro' : ''}`}>
                <label htmlFor="idade">Idade *</label>
                <input
                  id="idade"
                  name="idade"
                  type="number"
                  min="0"
                  max="150"
                  value={formulario.idade}
                  onChange={handleMudar}
                  placeholder="Digite a idade"
                  disabled={salvando}
                />
                {errosValidacao.idade && (
                  <span className="erro-campo">{errosValidacao.idade}</span>
                )}
              </div>
            </div>
          </section>

          <section className="secao-formulario">
            <h2>Endereço</h2>
            
            <div className={`campo ${errosValidacao.endereco ? 'campo-erro' : ''}`}>
              <label htmlFor="endereco">Endereço *</label>
              <input
                id="endereco"
                name="endereco"
                type="text"
                value={formulario.endereco}
                onChange={handleMudar}
                placeholder="Rua, número"
                required
                disabled={salvando}
              />
              {errosValidacao.endereco && <span className="texto-erro">{errosValidacao.endereco}</span>}
            </div>

            <div className="campo-duplo">
              <div className="campo">
                <label htmlFor="bairro">Bairro *</label>
                <input
                  id="bairro"
                  name="bairro"
                  type="text"
                  value={formulario.bairro}
                  onChange={handleMudar}
                  placeholder="Bairro"
                  disabled={salvando}
                />
              </div>
              <div className="campo">
                <label htmlFor="cidade">Cidade *</label>
                <input
                  id="cidade"
                  name="cidade"
                  type="text"
                  value={formulario.cidade}
                  onChange={handleMudar}
                  placeholder="Cidade"
                  disabled={salvando}
                />
              </div>
            </div>

            <div className="campo-duplo">
              <div className="campo">
                <label htmlFor="estado">Estado *</label>
                <select
                  id="estado"
                  name="estado"
                  value={formulario.estado}
                  onChange={handleMudar}
                  disabled={salvando}
                >
                  <option value="">Selecione</option>
                  <option value="AC">Acre</option>
                  <option value="AL">Alagoas</option>
                  <option value="AP">Amapá</option>
                  <option value="AM">Amazonas</option>
                  <option value="BA">Bahia</option>
                  <option value="CE">Ceará</option>
                  <option value="DF">Distrito Federal</option>
                  <option value="ES">Espírito Santo</option>
                  <option value="GO">Goiás</option>
                  <option value="MA">Maranhão</option>
                  <option value="MT">Mato Grosso</option>
                  <option value="MS">Mato Grosso do Sul</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="PA">Pará</option>
                  <option value="PB">Paraíba</option>
                  <option value="PR">Paraná</option>
                  <option value="PE">Pernambuco</option>
                  <option value="PI">Piauí</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="RN">Rio Grande do Norte</option>
                  <option value="RS">Rio Grande do Sul</option>
                  <option value="RO">Rondônia</option>
                  <option value="RR">Roraima</option>
                  <option value="SC">Santa Catarina</option>
                  <option value="SP">São Paulo</option>
                  <option value="SE">Sergipe</option>
                  <option value="TO">Tocantins</option>
                </select>
              </div>
              <div className="campo">
                <label htmlFor="cep">CEP <span className="campo-opcional">(Opcional)</span></label>
                <input
                  id="cep"
                  name="cep"
                  type="text"
                  value={formulario.cep}
                  onChange={handleMudar}
                  placeholder="00000-000"
                  maxLength="9"
                  disabled={salvando}
                />
              </div>
            </div>
          </section>

          <section className="secao-formulario">
            <h2>Comunidade</h2>
            
            <div className={`campo ${errosValidacao.comunidade ? 'campo-erro' : ''}`}>
              <label htmlFor="comunidade">Comunidade *</label>
              <select
                id="comunidade"
                name="comunidade"
                value={formulario.comunidade}
                onChange={handleMudar}
                required
                disabled={salvando}
              >
                <option value="">Selecione uma comunidade</option>
                <option value="Vila Cheba">Vila Cheba</option>
                <option value="Morro da Vila">Morro da Vila</option>
                <option value="Barragem">Barragem</option>
                <option value="Parque Centenario">Parque Centenario</option>
                <option value="Jardim Apura">Jardim Apura</option>
                {comunidadesCustomizadas.map(com => (
                  <option key={com} value={com}>{com}</option>
                ))}
                <option value="Outra">Outra</option>
              </select>
              {errosValidacao.comunidade && <span className="texto-erro">{errosValidacao.comunidade}</span>}
            </div>

            {formulario.comunidade === 'Outra' && (
              <div className="campo">
                <label htmlFor="comunidadeCustomizada">Nome da Comunidade</label>
                <div className="campo-com-botao">
                  <input
                    id="comunidadeCustomizada"
                    type="text"
                    value={comunidadeCustomizada}
                    onChange={handleMudarComunidadeCustomizada}
                    placeholder="Digite o nome da comunidade"
                    disabled={salvando}
                    onKeyPress={(e) => e.key === 'Enter' && adicionarComunidadeCustomizada()}
                  />
                  <button
                    type="button"
                    onClick={adicionarComunidadeCustomizada}
                    disabled={salvando || !comunidadeCustomizada.trim()}
                    className="btn-adicionar"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="secao-formulario">
            <h2>Benefícios GAC</h2>
            
            {/* Exibir benefícios adicionados */}
            {formulario.beneficiosGAC && formulario.beneficiosGAC.length > 0 && (
              <div className="lista-beneficios">
                <h3>Benefícios Adicionados:</h3>
                {formulario.beneficiosGAC.map((beneficio, index) => (
                  <div key={index} className="item-beneficio">
                    <div className="info-beneficio">
                      <strong>{beneficio.tipo}</strong>
                      <span className="datas-beneficio">
                        De {new Date(beneficio.dataInicio).toLocaleDateString('pt-BR')}
                        {beneficio.dataFinal && ` até ${new Date(beneficio.dataFinal).toLocaleDateString('pt-BR')}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="botao-remover"
                      onClick={() => removerBeneficio(index)}
                      disabled={salvando}
                      title="Remover benefício"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulário para adicionar novo benefício */}
            <div className="secao-adicionar">
              <h3>Adicionar Benefício</h3>
              <div className="campo">
                <label htmlFor="tipoBeneficio">Tipo de Benefício</label>
                <select
                  id="tipoBeneficio"
                  value={novoBeneficio.tipo}
                  onChange={(e) => handleMudarNovoBeneficio('tipo', e.target.value)}
                  disabled={salvando}
                >
                  <option value="Cesta Básica">Cesta Básica</option>
                  <option value="Auxílio Alimentação">Auxílio Alimentação</option>
                  <option value="Auxílio Financeiro">Auxílio Financeiro</option>
                  <option value="Bolsa Cultura">Bolsa Cultura</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="campo-duplo">
                <div className="campo">
                  <label htmlFor="dataInicio">Data de Início</label>
                  <input
                    id="dataInicio"
                    type="date"
                    value={novoBeneficio.dataInicio}
                    onChange={(e) => handleMudarNovoBeneficio('dataInicio', e.target.value)}
                    disabled={salvando}
                  />
                </div>
                <div className="campo">
                  <label htmlFor="dataFinal">Data Final</label>
                  <input
                    id="dataFinal"
                    type="date"
                    value={novoBeneficio.dataFinal}
                    onChange={(e) => handleMudarNovoBeneficio('dataFinal', e.target.value)}
                    disabled={salvando}
                  />
                </div>
              </div>

              <button
                type="button"
                className="botao-adicionar-beneficio"
                onClick={adicionarBeneficio}
                disabled={salvando}
              >
                + Adicionar
              </button>
            </div>
          </section>

          <section className="secao-formulario">
            <h2>Benefícios do Governo</h2>
            <p className="descricao-secao">Adicione os benefícios do governo que a pessoa recebe com seus respectivos valores (opcional)</p>
            
            {/* Exibir benefícios adicionados */}
            {formulario.beneficiosGoverno && formulario.beneficiosGoverno.length > 0 && (
              <div className="lista-beneficios-governo">
                <h3>Benefícios Adicionados:</h3>
                {formulario.beneficiosGoverno.map((beneficio, index) => (
                  <div key={index} className="item-beneficio-governo">
                    <div className="info-beneficio-governo">
                      <strong className="nome-beneficio-governo">{beneficio.nome}</strong>
                      <span className="valor-beneficio-governo">
                        {typeof beneficio.valor === 'number' 
                          ? beneficio.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : 'R$ 0,00'
                        }
                      </span>
                    </div>
                    <button
                      type="button"
                      className="botao-remover"
                      onClick={() => removerBeneficioGoverno(index)}
                      disabled={salvando}
                      title="Remover benefício"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulário para adicionar novo benefício do governo */}
            <div className="secao-adicionar">
              <h3>Adicionar Benefício</h3>
              <div className="campo">
                <label htmlFor="nomeBeneficioGoverno">Nome do Benefício</label>
                <input
                  id="nomeBeneficioGoverno"
                  type="text"
                  value={novoBeneficioGoverno.nome}
                  onChange={(e) => setNovoBeneficioGoverno(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: LOAS, Bolsa Família, BPC, etc."
                  disabled={salvando}
                />
              </div>

              <div className="campo">
                <label htmlFor="valorBeneficioGoverno">Valor do Benefício</label>
                <input
                  id="valorBeneficioGoverno"
                  type="text"
                  value={novoBeneficioGoverno.valor}
                  onChange={(e) => setNovoBeneficioGoverno(prev => ({ 
                    ...prev, 
                    valor: formatarMoeda(e.target.value)
                  }))}
                  placeholder="R$ 0,00"
                  disabled={salvando}
                />
              </div>

              <button
                type="button"
                className="botao-adicionar-beneficio"
                onClick={adicionarBeneficioGoverno}
                disabled={salvando}
              >
                + Adicionar
              </button>
            </div>

            {/* Total de benefícios */}
            {formulario.beneficiosGoverno && formulario.beneficiosGoverno.length > 0 && (
              <div className="total-beneficios">
                <strong className="total-beneficios-label">Total de Benefícios do Governo:</strong>
                <span className="valor-total">
                  {calcularTotalBeneficiosGoverno().toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  })}
                </span>
              </div>
            )}
          </section>

          <section className="secao-formulario">
            <h2>Renda Familiar</h2>
            
            <div className="campo-duplo">
              <div className="campo">
                <label htmlFor="rendaFamiliar">Renda Familiar <span className="campo-opcional">(Opcional)</span></label>
                <input
                  id="rendaFamiliar"
                  name="rendaFamiliar"
                  type="text"
                  value={formulario.rendaFamiliar}
                  onChange={handleMudar}
                  placeholder="R$ 0,00"
                  disabled={salvando}
                />
              </div>
              <div className="campo">
                <label htmlFor="numeroMembros">Número de Membros <span className="campo-opcional">(Opcional)</span></label>
                <input
                  id="numeroMembros"
                  name="numeroMembros"
                  type="number"
                  min="1"
                  value={formulario.numeroMembros}
                  onChange={handleMudar}
                  placeholder="Ex: 4"
                  disabled={salvando}
                />
              </div>
            </div>

            <div className="campo">
              <label htmlFor="dependentes">Dependentes <span className="campo-opcional">(Opcional)</span></label>
              <input
                id="dependentes"
                name="dependentes"
                type="number"
                min="0"
                value={formulario.dependentes}
                onChange={handleMudar}
                placeholder="Ex: 2"
                disabled={salvando}
              />
            </div>
          </section>

          <section className="secao-formulario">
            <h2>Observações Gerais</h2>
            
            <div className="campo">
              <label htmlFor="observacoes">Observações <span className="campo-opcional">(Opcional)</span></label>
              <textarea
                id="observacoes"
                name="observacoes"
                value={formulario.observacoes}
                onChange={handleMudar}
                placeholder="Observações adicionais..."
                rows="4"
                disabled={salvando}
              />
            </div>
          </section>

          <div className="acoes-formulario">
            <button
              type="button"
              className="botao-cancelar"
              onClick={handleCancelar}
              disabled={salvando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="botao-salvar"
              disabled={salvando}
            >
              {salvando ? (
                <>
                  <div className="spinner"></div>
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
        </form>
      </main>
      <ToastContainer toasts={toasts} onClose={removerToast} />
    </div>
  );
};
