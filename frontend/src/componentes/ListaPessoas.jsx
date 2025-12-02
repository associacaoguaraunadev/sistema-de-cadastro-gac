import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useToast } from '../hooks/useToast';
import { obterPessoas, deletarPessoa } from '../servicos/api';
import { Plus, Edit2, Trash2, Search, LogOut, Users, Baby, User, Heart, Key } from 'lucide-react';
import { FiltroAvancado } from './FiltroAvancado';
import { GerenciadorTokens } from './GerenciadorTokens';
import { ToastContainer } from './Toast';
import { ModalConfirmacao } from './ModalConfirmacao';
import './ListaPessoas.css';

// Função helper para converter hex para RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
};

export const ListaPessoas = () => {
  const [pessoas, setPessoas] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');
  const [tipoBeneficioFiltro, setTipoBeneficioFiltro] = useState('');
  const [filtrosAvancados, setFiltrosAvancados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [modalSairAberto, setModalSairAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [gerenciadorTokensAberto, setGerenciadorTokensAberto] = useState(false);
  const [comunidadeSelecionada, setComunidadeSelecionada] = useState(null);
  const timeoutRef = useRef(null);
  
  const { token, usuario, sair } = useAuth();
  const navegar = useNavigate();
  const { toasts, removerToast, sucesso, erro: erroToast, aviso } = useToast();
  const LIMITE = 50;

  // Debounce para a busca - espera 2000ms após parar de digitar
  useEffect(() => {
    clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      setBusca(buscaInput);
      setPagina(1);
    }, 2000);

    return () => clearTimeout(timeoutRef.current);
  }, [buscaInput]);

  const handleBuscaEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(timeoutRef.current);
      setBusca(buscaInput);
      setPagina(1);
    }
  };

  useEffect(() => {
    carregarPessoas();
  }, [pagina, busca, tipoBeneficioFiltro, filtrosAvancados, token]);

  const carregarPessoas = async () => {
    if (!token) return;
    
    setCarregando(true);
    setErro('');
    
    // Log para debug
    if (filtrosAvancados || busca) {
      console.group('🔍 [ListaPessoas] Carregando com filtros');
      console.log('Busca:', busca);
      console.log('Filtros Avançados:', filtrosAvancados);
      console.log('Página:', pagina);
      console.groupEnd();
    }
    
    try {
      const dados = await obterPessoas(token, {
        pagina,
        limite: LIMITE,
        busca,
        status: 'ativo',
        filtrosAvancados
      });
      
      console.log(`✅ [ListaPessoas] Retornou ${dados.pessoas.length} de ${dados.total} pessoas`);
      
      setPessoas(dados.pessoas);
      setTotal(dados.total);
    } catch (erro) {
      console.error('❌ [ListaPessoas] Erro ao carregar:', erro);
      setErro('Erro ao carregar pessoas: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  };

  const handleDeletar = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar esta pessoa?')) return;
    
    try {
      await deletarPessoa(token, id);
      setPessoas(pessoas.filter(p => p.id !== id));
      setTotal(total - 1);
      sucesso('Sucesso!', 'Pessoa deletada com sucesso');
    } catch (erro) {
      setErro('Erro ao deletar: ' + erro.message);
      erroToast('Erro ao Deletar', 'Não foi possível deletar a pessoa');
    }
  };

  const handleSair = () => {
    setModalSairAberto(true);
  };

  const confirmarSair = () => {
    setSaindo(true);
    setTimeout(() => {
      sucesso('Até logo!', 'Você foi desconectado com sucesso');
      sair();
      setTimeout(() => {
        navegar('/entrar');
      }, 500);
    }, 300);
  };

  // Calcular idade baseado em dataBeneficio (ou usar dataCriacao como fallback)
  // Se houver idade no banco, usar ela. Caso contrário, calcular.
  const calcularIdade = (pessoa) => {
    // Se já tem idade no banco de dados, usar essa
    if (pessoa.idade !== null && pessoa.idade !== undefined) {
      return pessoa.idade;
    }
    
    // Senão, calcular pela data de benefício ou data de criação
    const data = pessoa.dataBeneficio ? new Date(pessoa.dataBeneficio) : new Date(pessoa.dataCriacao);
    const hoje = new Date();
    let idade = hoje.getFullYear() - data.getFullYear();
    const mes = hoje.getMonth() - data.getMonth();
    
    if (mes < 0 || (mes === 0 && hoje.getDate() < data.getDate())) {
      idade--;
    }
    
    return Math.max(0, idade);
  };

  const obterFaixaEtaria = (idade) => {
    if (idade < 18) return 'criancas';
    if (idade < 60) return 'adultos';
    return 'idosos';
  };

  // Comunidades pré-cadastradas com nova paleta de cores
  const comunidadesFixas = [
    { nome: 'Vila Cheba', cor: '#1C78C0' },
    { nome: 'Morro da Vila', cor: '#CC3131' },
    { nome: 'Barragem', cor: '#114E7A' },
    { nome: 'Parque Centenario', cor: '#D39E00' },
    { nome: 'Jardim Apura', cor: '#0A2A43' }
  ];

  // Carregar comunidades customizadas do localStorage
  const [comunidadesCustomizadas] = useState(() => {
    const salvas = localStorage.getItem('comunidadesCustomizadas');
    return salvas ? JSON.parse(salvas) : [];
  });

  // Função para gerar cor consistente a partir do nome
  const gerarCorDeComunidade = (nomeComun) => {
    const cores = ['#ec4899', '#f43f5e', '#06b6d4', '#14b8a6', '#84cc16', '#a78bfa'];
    let hash = 0;
    for (let i = 0; i < nomeComun.length; i++) {
      hash = ((hash << 5) - hash) + nomeComun.charCodeAt(i);
      hash = hash & hash;
    }
    return cores[Math.abs(hash) % cores.length];
  };

  // Combinar comunidades fixas com customizadas
  const comunidades = [
    ...comunidadesFixas,
    ...comunidadesCustomizadas.map(nome => ({
      nome,
      cor: gerarCorDeComunidade(nome)
    }))
  ];

  // Agrupar pessoas por comunidade E por faixa etária
  const pessoasAgrupadas = {};
  
  comunidades.forEach(comunidade => {
    pessoasAgrupadas[comunidade.nome] = {
      ...comunidade,
      criancas: pessoas.filter(p => 
        p.comunidade === comunidade.nome && 
        obterFaixaEtaria(calcularIdade(p)) === 'criancas'
      ),
      adultos: pessoas.filter(p => 
        p.comunidade === comunidade.nome && 
        obterFaixaEtaria(calcularIdade(p)) === 'adultos'
      ),
      idosos: pessoas.filter(p => 
        p.comunidade === comunidade.nome && 
        obterFaixaEtaria(calcularIdade(p)) === 'idosos'
      )
    };
  });

  // Contar total por comunidade
  const totalPorComunidade = Object.entries(pessoasAgrupadas).reduce((acc, [nome, grupo]) => {
    acc[nome] = grupo.criancas.length + grupo.adultos.length + grupo.idosos.length;
    return acc;
  }, {});

  // Obter tipos de benefício únicos
  const tiposBeneficio = [...new Set(pessoas.map(p => p.tipoBeneficio))].sort();

  // Filtrar por tipo de benefício se selecionado
  const aplicarFiltro = (pessoa) => {
    if (tipoBeneficioFiltro && pessoa.tipoBeneficio !== tipoBeneficioFiltro) return false;
    return true;
  };

  const pessoasFiltradas = pessoas.filter(aplicarFiltro);

  const paginas = Math.ceil(total / LIMITE);

  return (
    <div className="container-lista">
      <header className="cabecalho-lista">
        <div className="titulo-cabecalho">
          <button 
            className="marca-pequena-clicavel" 
            onClick={() => navegar('/')}
            title="Voltar para página principal"
          >
            GAC
          </button>
        </div>
        <div className="titulo-sistema">
          <h2><b>Sistema de Cadastro de Beneficiários</b></h2>
        </div>
        <div className="info-usuario">
          <span><b>{usuario?.nome}</b></span>
          {usuario?.funcao === 'admin' && (
            <button 
              onClick={() => setGerenciadorTokensAberto(true)} 
              className="botao-tokens" 
              title="Gerenciar tokens de acesso"
            >
              <Key size={18} />
            </button>
          )}
          <button onClick={handleSair} className="botao-sair" title="Sair do sistema">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="conteudo-lista">
        <div className="barra-acoes">
          <div className="campo-busca">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, email ou tipo de benefício..."
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
              onKeyPress={handleBuscaEnter}
              disabled={carregando}
            />
          </div>

          <FiltroAvancado
            onAplicar={(config) => {
              // Passa apenas os filtros, sem o wrapper de operador
              setFiltrosAvancados(config.filtros);
              setPagina(1);
              setBusca('');
              setBuscaInput('');
            }}
            onLimpar={() => {
              setFiltrosAvancados(null);
              setBusca('');
              setBuscaInput('');
              setTipoBeneficioFiltro('');
              setPagina(1);
            }}
          />

          <button 
            className="botao-novo"
            onClick={() => navegar('/pessoas/novo')}
          >
            <Plus size={18} /> Novo Cadastro
          </button>

          {usuario?.funcao === 'admin' && (
            <button 
              className="botao-transferencia"
              onClick={() => navegar('/transferir')}
              title="Transferir pessoas para outro usuário"
            >
              📦 Transferência
            </button>
          )}
        </div>

        {erro && <div className="alerta-erro">{erro}</div>}

        {carregando && <div className="carregando">Carregando...</div>}

        {!carregando && pessoas.length === 0 && (
          <div className="vazio">
            <p>Nenhuma pessoa encontrada</p>
          </div>
        )}

        {!carregando && pessoasFiltradas.length > 0 && (
          <>
            {/* ABAS DE COMUNIDADES MODERNAS */}
            <div className="container-abas-comunidades">
              <div className="abas-wrapper">
                <button
                  className={`aba-comunidade aba-todas ${!comunidadeSelecionada ? 'ativa' : ''}`}
                  onClick={() => setComunidadeSelecionada(null)}
                  title="Visualizar todas as comunidades"
                >
                  <span className="icone-aba">👥</span>
                  <span className="label-aba">Todas</span>
                  <span className="badge-aba">{pessoasFiltradas.length}</span>
                </button>
                
                {comunidades.map(comunidade => {
                  const totalComunidade = totalPorComunidade[comunidade.nome] || 0;
                  if (totalComunidade === 0) return null;
                  
                  return (
                    <button
                      key={comunidade.nome}
                      className={`aba-comunidade ${comunidadeSelecionada === comunidade.nome ? 'ativa' : ''}`}
                      onClick={() => setComunidadeSelecionada(comunidade.nome)}
                      style={{ '--cor-aba': comunidade.cor }}
                      title={`Ver ${comunidade.nome}`}
                    >
                      <span className="icone-aba" style={{ '--cor-aba': comunidade.cor }}>●</span>
                      <span className="label-aba">{comunidade.nome}</span>
                      <span className="badge-aba">{totalComunidade}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RENDERIZAR POR COMUNIDADE COM FILTRO */}
            {comunidades.map(comunidade => {
              const gruposComunidade = pessoasAgrupadas[comunidade.nome];
              const totalComunidade = totalPorComunidade[comunidade.nome] || 0;

              // Se uma comunidade está selecionada, mostrar apenas essa
              if (comunidadeSelecionada && comunidade.nome !== comunidadeSelecionada) {
                return null;
              }

              if (totalComunidade === 0) return null;

              return (
                <div key={comunidade.nome} className="secao-comunidade" style={{ '--cor-comunidade-rgb': hexToRgb(comunidade.cor), borderLeftColor: comunidade.cor }}>
                  <div className="conteudo-comunidade">

                  {/* CRIANÇAS */}
                  {gruposComunidade.criancas.length > 0 && (
                    <div className="secao-faixa-etaria">
                      <div className="cabecalho-faixa">
                        <Baby size={18} />
                        <h3>Crianças e Adolescentes (0-17 anos)</h3>
                        <span className="badge-pequeno">{gruposComunidade.criancas.length}</span>
                      </div>
                      <div className="grid-pessoas">
                        {gruposComunidade.criancas.map((pessoa) => (
                          <CartaoPessoa
                            key={pessoa.id}
                            pessoa={pessoa}
                            idade={calcularIdade(pessoa)}
                            onEditar={() => navegar(`/pessoas/${pessoa.id}`)}
                            onDeletar={() => handleDeletar(pessoa.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ADULTOS */}
                  {gruposComunidade.adultos.length > 0 && (
                    <div className="secao-faixa-etaria">
                      <div className="cabecalho-faixa">
                        <User size={18} />
                        <h3>Adultos (18-59 anos)</h3>
                        <span className="badge-pequeno">{gruposComunidade.adultos.length}</span>
                      </div>
                      <div className="grid-pessoas">
                        {gruposComunidade.adultos.map((pessoa) => (
                          <CartaoPessoa
                            key={pessoa.id}
                            pessoa={pessoa}
                            idade={calcularIdade(pessoa)}
                            onEditar={() => navegar(`/pessoas/${pessoa.id}`)}
                            onDeletar={() => handleDeletar(pessoa.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* IDOSOS */}
                  {gruposComunidade.idosos.length > 0 && (
                    <div className="secao-faixa-etaria">
                      <div className="cabecalho-faixa">
                        <Heart size={18} />
                        <h3>Idosos (60+ anos)</h3>
                        <span className="badge-pequeno">{gruposComunidade.idosos.length}</span>
                      </div>
                      <div className="grid-pessoas">
                        {gruposComunidade.idosos.map((pessoa) => (
                          <CartaoPessoa
                            key={pessoa.id}
                            pessoa={pessoa}
                            idade={calcularIdade(pessoa)}
                            onEditar={() => navegar(`/pessoas/${pessoa.id}`)}
                            onDeletar={() => handleDeletar(pessoa.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                  <div className="painel-comunidade-sticky" style={{ backgroundColor: comunidade.cor }}>
                    <div className="info-painel-sticky">
                      <h2>{comunidade.nome}</h2>
                      <span className="badge-quantidade">{totalComunidade}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {paginas > 1 && (
              <div className="paginacao">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="botao-pagina"
                >
                  ← Anterior
                </button>
                <span className="numero-pagina">
                  Página {pagina} de {paginas}
                </span>
                <button
                  onClick={() => setPagina(p => Math.min(paginas, p + 1))}
                  disabled={pagina === paginas}
                  className="botao-pagina"
                >
                  Próxima →
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <ModalConfirmacao
        aberto={modalSairAberto}
        tipo="logout"
        titulo="Sair do Sistema"
        mensagem="Tem certeza que deseja sair? Você será redirecionado para a página de login."
        botaoPrincipalTexto="Sair"
        botaoCancelarTexto="Cancelar"
        onConfirmar={confirmarSair}
        onCancelar={() => setModalSairAberto(false)}
        carregando={saindo}
      />
      {gerenciadorTokensAberto && (
        <GerenciadorTokens onFechar={() => setGerenciadorTokensAberto(false)} />
      )}
      <ToastContainer toasts={toasts} onClose={removerToast} />
    </div>
  );
};

const formatarCPF = (cpf) => {
  cpf = (cpf || '').toString();
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const CartaoPessoa = ({ pessoa, idade, onEditar, onDeletar }) => {
  return (
    <div className="cartao-pessoa">
      <div className="cartao-cabecalho">
        <div className="info-principal">
          <h3 className="nome-cartao">{pessoa.nome}</h3>
          <p className="idade-cartao">{idade} anos</p>
        </div>
        <div className="badge-beneficio">{pessoa.tipoBeneficio}</div>
      </div>

      <div className="cartao-conteudo">
        <div className="linha-info">
          <span className="label">CPF:</span>
          <span className="valor">{formatarCPF(pessoa.cpf)}</span>
        </div>

        {pessoa.telefone && (
          <div className="linha-info">
            <span className="label">Telefone:</span>
            <span className="valor">{pessoa.telefone}</span>
          </div>
        )}

        {pessoa.email && (
          <div className="linha-info">
            <span className="label">Email:</span>
            <span className="valor">{pessoa.email}</span>
          </div>
        )}

        <div className="linha-info">
          <span className="label">Endereço:</span>
          <span className="valor">{pessoa.endereco}</span>
        </div>

        {pessoa.bairro && (
          <div className="linha-info">
            <span className="label">Bairro:</span>
            <span className="valor">{pessoa.bairro}</span>
          </div>
        )}

        {pessoa.cidade && (
          <div className="linha-info">
            <span className="label">Cidade:</span>
            <span className="valor">{pessoa.cidade}{pessoa.estado ? ` - ${pessoa.estado}` : ''}</span>
          </div>
        )}

        {pessoa.cep && (
          <div className="linha-info">
            <span className="label">CEP:</span>
            <span className="valor">{pessoa.cep}</span>
          </div>
        )}

        {pessoa.observacoes && (
          <div className="linha-info">
            <span className="label">Observações:</span>
            <span className="valor observacao">{pessoa.observacoes}</span>
          </div>
        )}

        <div className="linha-info">
          <span className="label">Cadastrado em:</span>
          <span className="valor">{new Date(pessoa.dataCriacao).toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {pessoa.dataAtualizacao && (
          <div className="linha-info">
            <span className="label">Editado em:</span>
            <span className="valor">{new Date(pessoa.dataAtualizacao).toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
      </div>

      <div className="cartao-rodape">
        <button
          className="botao-cartao botao-editar"
          onClick={onEditar}
          title="Editar"
        >
          <Edit2 size={16} /> Editar
        </button>
        <button
          className="botao-cartao botao-deletar"
          onClick={onDeletar}
          title="Deletar"
        >
          <Trash2 size={16} /> Deletar
        </button>
      </div>
    </div>
  );
};
