import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { obterPessoa, criarPessoa, atualizarPessoa } from '../servicos/api';
import { ArrowLeft, Save, Check } from 'lucide-react';
import './FormularioPessoa.css';

export const FormularioPessoa = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
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
    tipoBeneficio: 'Cesta Básica',
    dataBeneficio: '',
    observacoes: ''
  });
  
  const [comunidadeCustomizada, setComunidadeCustomizada] = useState('');
  const [comunidadesCustomizadas, setComunidadesCustomizadas] = useState(() => {
    const salvas = localStorage.getItem('comunidadesCustomizadas');
    return salvas ? JSON.parse(salvas) : [];
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
        dataBeneficio: pessoa.dataBeneficio ? pessoa.dataBeneficio.split('T')[0] : ''
      });
    } catch (erro) {
      setErro('Erro ao carregar pessoa: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  };

  const formatarCPF = (valor) => {
    // Remove tudo que não é número
    valor = valor.replace(/\D/g, '');
    // Limita a 11 dígitos
    valor = valor.slice(0, 11);
    // Formata: 000.000.000-00
    if (valor.length >= 3) {
      valor = valor.slice(0, 3) + '.' + valor.slice(3);
    }
    if (valor.length >= 7) {
      valor = valor.slice(0, 7) + '.' + valor.slice(7);
    }
    if (valor.length >= 11) {
      valor = valor.slice(0, 11) + '-' + valor.slice(11, 13);
    }
    return valor;
  };

  const formatarCEP = (valor) => {
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
    // Remove tudo que não é número
    valor = valor.replace(/\D/g, '');
    // Limita a 11 dígitos
    valor = valor.slice(0, 11);
    // Formata: (00) 90000-0000
    if (valor.length >= 2) {
      valor = '(' + valor.slice(0, 2) + ') ' + valor.slice(2);
    }
    if (valor.length >= 9) {
      valor = valor.slice(0, 9) + '-' + valor.slice(9);
    }
    return valor;
  };

  const handleMudar = (e) => {
    const { name, value } = e.target;
    
    let novoValor = value;
    if (name === 'cpf') novoValor = formatarCPF(value);
    if (name === 'cep') novoValor = formatarCEP(value);
    if (name === 'telefone') novoValor = formatarTelefone(value);

    setFormulario(prev => ({
      ...prev,
      [name]: novoValor
    }));
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


  const aoEnviar = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setSalvando(true);

    try {
      const dados = {
        nome: formulario.nome.trim(),
        cpf: formulario.cpf.replace(/\D/g, ''),
        email: formulario.email?.trim() || null,
        telefone: formulario.telefone?.trim() || null,
        endereco: formulario.endereco.trim(),
        bairro: formulario.bairro?.trim() || null,
        cidade: formulario.cidade?.trim() || null,
        estado: formulario.estado?.trim() || null,
        cep: formulario.cep?.trim() || null,
        idade: formulario.idade ? parseInt(formulario.idade) : null,
        comunidade: formulario.comunidade?.trim() || null,
        tipoBeneficio: formulario.tipoBeneficio.trim(),
        dataBeneficio: formulario.dataBeneficio || null,
        observacoes: formulario.observacoes?.trim() || null
      };

      if (id) {
        await atualizarPessoa(token, id, dados);
        setSucesso('✓ Pessoa atualizada com sucesso!');
      } else {
        await criarPessoa(token, dados);
        setSucesso('✓ Pessoa cadastrada com sucesso!');
      }

      // Animação de sucesso e redirecionamento
      setRedirecionando(true);
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (erro) {
      setErro(erro.message);
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
        <form onSubmit={aoEnviar} className="formulario-pessoa">
          {erro && <div className="alerta-erro">{erro}</div>}
          {sucesso && <div className="alerta-sucesso">{sucesso}</div>}

          <section className="secao-formulario">
            <h2>Informações Pessoais</h2>
            
            <div className="campo-duplo">
              <div className="campo">
                <label htmlFor="nome">Nome Completo *</label>
                <input
                  id="nome"
                  name="nome"
                  type="text"
                  value={formulario.nome}
                  onChange={handleMudar}
                  placeholder="Nome completo"
                  required
                  disabled={salvando}
                />
              </div>
              <div className="campo">
                <label htmlFor="cpf">CPF *</label>
                <input
                  id="cpf"
                  name="cpf"
                  type="text"
                  value={formulario.cpf}
                  onChange={handleMudar}
                  placeholder="000.000.000-00"
                  maxLength="14"
                  required
                  disabled={salvando}
                />
              </div>
            </div>

            <div className="campo-duplo">
              <div className="campo">
                <label htmlFor="email">Email</label>
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
                <label htmlFor="telefone">Telefone</label>
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
              <div className="campo">
                <label htmlFor="idade">Idade</label>
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
              </div>
            </div>
          </section>

          <section className="secao-formulario">
            <h2>Endereço</h2>
            
            <div className="campo">
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
            </div>

            <div className="campo-duplo">
              <div className="campo">
                <label htmlFor="bairro">Bairro</label>
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
                <label htmlFor="cidade">Cidade</label>
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
                <label htmlFor="estado">Estado</label>
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
                <label htmlFor="cep">CEP</label>
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
            
            <div className="campo">
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
            <h2>Benefício</h2>
            
            <div className="campo-duplo">
              <div className="campo">
                <label htmlFor="tipoBeneficio">Tipo de Benefício *</label>
                <select
                  id="tipoBeneficio"
                  name="tipoBeneficio"
                  value={formulario.tipoBeneficio}
                  onChange={handleMudar}
                  required
                  disabled={salvando}
                >
                  <option value="Cesta Básica">Cesta Básica</option>
                  <option value="Auxílio Alimentação">Auxílio Alimentação</option>
                  <option value="Auxílio Financeiro">Auxílio Financeiro</option>
                  <option value="Bolsa Cultura">Bolsa Cultura</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="campo">
                <label htmlFor="dataBeneficio">Data do Benefício</label>
                <input
                  id="dataBeneficio"
                  name="dataBeneficio"
                  type="date"
                  value={formulario.dataBeneficio}
                  onChange={handleMudar}
                  disabled={salvando}
                />
              </div>
            </div>

            <div className="campo">
              <label htmlFor="observacoes">Observações</label>
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
    </div>
  );
};
