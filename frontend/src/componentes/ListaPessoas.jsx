import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useGlobalToast } from '../contexto/ToastContext';
import { obterPessoas, deletarPessoa, obterTotaisPorComunidade } from '../servicos/api';
import { Plus, Edit2, Trash2, Search, Users, Baby, User, Heart } from 'lucide-react';
import { FiltroAvancado } from './FiltroAvancado';


import { ModalConfirmacao } from './ModalConfirmacao';
import ModalPreview from './ModalPreview';
import ModalEdicao from './ModalEdicao';
import ModalCadastro from './ModalCadastro';
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


  const [comunidadeSelecionada, setComunidadeSelecionada] = useState(null);
  const [totalPorComunidadeReal, setTotalPorComunidadeReal] = useState({});
  const [totalGeral, setTotalGeral] = useState(0);
  const [modalPreviewAberto, setModalPreviewAberto] = useState(false);
  const [pessoaSelecionada, setPessoaSelecionada] = useState(null);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [pessoaParaEditar, setPessoaParaEditar] = useState(null);
  const [modalDeleteAberto, setModalDeleteAberto] = useState(false);
  const [pessoaParaDeleter, setPessoaParaDeleter] = useState(null);
  const [deletandoPessoa, setDeletandoPessoa] = useState(false);
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [mostrarMensagemAtualizacao, setMostrarMensagemAtualizacao] = useState(false);
  const [tipoMensagemAtualizacao, setTipoMensagemAtualizacao] = useState('');
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(Date.now());
  const timeoutRef = useRef(null);
  const abasWrapperRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  
  const { token, usuario, sair } = useAuth();
  const navegar = useNavigate();
  const { sucesso, erro: erroToast, aviso } = useGlobalToast();
  const LIMITE = 200;

  // Restaurar estado do localStorage ao carregar a página
  useEffect(() => {
    const estadoSalvo = localStorage.getItem('listaPessoasEstado');
    if (estadoSalvo) {
      try {
        const { pagina: paginaSalva, busca: buscaSalva, comunidade: comunidadeSalva } = JSON.parse(estadoSalvo);
        if (paginaSalva) setPagina(paginaSalva);
        if (buscaSalva) {
          setBuscaInput(buscaSalva);
          setBusca(buscaSalva);
        }
        if (comunidadeSalva) setComunidadeSelecionada(comunidadeSalva);
      } catch (e) {
        console.error('Erro ao restaurar estado:', e);
      }
    }
  }, []);

  // Salvar estado no localStorage quando mudar
  useEffect(() => {
    const estado = {
      pagina,
      busca,
      comunidade: comunidadeSelecionada
    };
    localStorage.setItem('listaPessoasEstado', JSON.stringify(estado));
  }, [pagina, busca, comunidadeSelecionada]);

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
    carregarTotaisPorComunidade();
  }, [pagina, busca, tipoBeneficioFiltro, filtrosAvancados, token]);

  // Sistema inteligente de auto-refresh com SSE (Server-Sent Events) + suporte para Vercel
  useEffect(() => {
    if (!token || !usuario?.id) return;

    let eventSource;
    let reconnectTimeout;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let isIntentionalClose = false;

    const connectSSE = () => {
      try {
        console.log('🔗 Tentando conectar ao SSE...');
        
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const sseUrl = `${baseUrl}/eventos/sse?token=${encodeURIComponent(token)}`;
        console.log('📍 URL SSE:', sseUrl);
        
        eventSource = new EventSource(sseUrl);
        
        eventSource.onopen = () => {
          console.log('✅ SSE conectado com sucesso');
          console.log('🔍 DEBUG: Usuário conectado ao SSE:', {
            id: usuario?.id,
            funcao: usuario?.funcao,
            email: usuario?.email
          });
          reconnectAttempts = 0; // Reset contador de tentativas
        };
        
        eventSource.onmessage = (event) => {
          console.log('📨 Mensagem SSE recebida:', event);
        };
        
        // Listener para heartbeat (manter conexão ativa)
        eventSource.addEventListener('heartbeat', (event) => {
          const data = JSON.parse(event.data);
          console.log('💓 Heartbeat recebido:', data);
          
          // WORKAROUND para Vercel: Verificar se há atualizações de outras instâncias
          verificarAtualizacoesExternas();
        });
        
        eventSource.onerror = (error) => {
          console.error('❌ Erro SSE:', error);
          console.error('📊 Estado da conexão:', eventSource.readyState);
          
          if (eventSource.readyState === EventSource.CLOSED) {
            console.log('🔌 Conexão SSE foi fechada');
            
            // Reconectar automaticamente se não foi fechamento intencional
            if (!isIntentionalClose && reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++;
              const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Backoff exponencial
              console.log(`🔄 Tentativa de reconexão ${reconnectAttempts}/${maxReconnectAttempts} em ${delay}ms`);
              
              reconnectTimeout = setTimeout(() => {
                connectSSE();
              }, delay);
            }
          }
        };

        const handleSSEEvent = (eventType, data) => {
          console.log(`📡 Evento SSE recebido: ${eventType}`, data);
          console.log(`🔍 DEBUG: Meu usuário ID: ${usuario?.id}, função: ${usuario?.funcao}`);
          console.log(`🔍 DEBUG: Autor do evento ID: ${data.autorId}, função: ${data.autorFuncao}`);
          console.log(`🔍 DEBUG: Comparação autorId === usuario.id:`, data.autorId === usuario?.id);
          console.log(`🔍 DEBUG: Instância origem: ${data.instanciaOrigem}, Evento ID: ${data.eventoId}`);
          
          const { autorId, autorFuncao } = data;
          
          // Se sou o autor da ação, refresh silencioso
          if (autorId === usuario?.id) {
            console.log(`🔄 Refresh silencioso (própria ação): ${eventType}`);
            carregarPessoas();
            carregarTotaisPorComunidade();
            return;
          }
          
          // Determinar mensagem baseada na hierarquia
          let mensagem = '';
          if (autorFuncao === 'admin' && usuario?.funcao === 'funcionario') {
            mensagem = 'O administrador atualizou os dados, favor recarregar a página.';
          } else if (autorFuncao === 'funcionario' && usuario?.funcao === 'admin') {
            mensagem = 'Um funcionário atualizou os dados, favor recarregar a página.';
          }
          
          if (mensagem) {
            console.log(`📢 Mostrando alerta: ${mensagem}`);
            setTipoMensagemAtualizacao(mensagem);
            setMostrarMensagemAtualizacao(true);
          } else {
            console.log(`ℹ️ Evento ignorado (mesma hierarquia): ${eventType}`);
          }
        };

        // Eventos específicos
        eventSource.addEventListener('pessoaCadastrada', (event) => {
          const data = JSON.parse(event.data);
          handleSSEEvent('pessoaCadastrada', data);
        });

        eventSource.addEventListener('pessoaAtualizada', (event) => {
          const data = JSON.parse(event.data);
          handleSSEEvent('pessoaAtualizada', data);
        });

        eventSource.addEventListener('pessoaDeletada', (event) => {
          const data = JSON.parse(event.data);
          handleSSEEvent('pessoaDeletada', data);
        });

        // Listener para eventos de conexão
        eventSource.addEventListener('connected', (event) => {
          const data = JSON.parse(event.data);
          console.log('🎯 Conexão SSE estabelecida:', data);
        });

        // Função para verificar atualizações de outras instâncias Vercel
        const verificarAtualizacoesExternas = async () => {
          try {
            const response = await fetch(`${baseUrl}/pessoas/ultima-atualizacao`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
              const { ultimaAtualizacao: serverUltimaAtualizacao, ultimoAutor } = await response.json();
              const serverTime = new Date(serverUltimaAtualizacao).getTime();
              
              console.log('🔍 Verificando atualizações externas:', {
                meuUltimo: new Date(ultimaAtualizacao).toISOString(),
                servidor: new Date(serverTime).toISOString(),
                diferenca: serverTime - ultimaAtualizacao,
                diferencaSegundos: Math.round((serverTime - ultimaAtualizacao) / 1000),
                ultimoAutor,
                meuId: usuario?.id,
                autorId: ultimoAutor?.id,
                saoIguais: ultimoAutor?.id === usuario?.id
              });
              
              // Se há atualizações mais recentes de outros usuários
              if (serverTime > ultimaAtualizacao && ultimoAutor?.id !== usuario?.id) {
                console.log('🚨 Detectada atualização externa! Autor:', ultimoAutor);
                
                // Determinar mensagem baseada na hierarquia
                let mensagem = '';
                if (ultimoAutor.funcao === 'admin' && usuario?.funcao === 'funcionario') {
                  mensagem = 'O administrador atualizou os dados, favor recarregar a página.';
                } else if (ultimoAutor.funcao === 'funcionario' && usuario?.funcao === 'admin') {
                  mensagem = 'Um funcionário atualizou os dados, favor recarregar a página.';
                }
                
                if (mensagem) {
                  console.log(`📢 Mostrando alerta (via polling): ${mensagem}`);
                  setTipoMensagemAtualizacao(mensagem);
                  setMostrarMensagemAtualizacao(true);
                  setUltimaAtualizacao(serverTime);
                } else {
                  console.log(`ℹ️ Sem alerta - mesma hierarquia ou condição não atendida:`, {
                    autorFuncao: ultimoAutor.funcao,
                    meuFuncao: usuario?.funcao,
                    condicao1: `${ultimoAutor.funcao} === 'admin' && ${usuario?.funcao} === 'funcionario'`,
                    condicao2: `${ultimoAutor.funcao} === 'funcionario' && ${usuario?.funcao} === 'admin'`,
                    resultado1: ultimoAutor.funcao === 'admin' && usuario?.funcao === 'funcionario',
                    resultado2: ultimoAutor.funcao === 'funcionario' && usuario?.funcao === 'admin'
                  });
                }
              } else {
                console.log(`⏭️ Nenhuma atualização externa detectada:`, {
                  tempoValido: serverTime > ultimaAtualizacao,
                  autorDiferente: ultimoAutor?.id !== usuario?.id,
                  serverTime: new Date(serverTime).toISOString(),
                  ultimaAtualizacao: new Date(ultimaAtualizacao).toISOString(),
                  diferenca: serverTime - ultimaAtualizacao
                });
              }
            }
          } catch (erro) {
            console.error('❌ Erro ao verificar atualizações externas:', erro);
          }
        };
        
      } catch (error) {
        console.error('❌ Erro ao criar conexão SSE:', error);
        
        // Tentar reconectar se possível
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(1000 * reconnectAttempts, 10000);
          console.log(`🔄 Erro na conexão, tentando novamente em ${delay}ms`);
          
          reconnectTimeout = setTimeout(() => {
            connectSSE();
          }, delay);
        }
      }
    };

    // Iniciar primeira conexão
    connectSSE();

    return () => {
      console.log('🔌 Desconectando SSE...');
      isIntentionalClose = true;
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [token, usuario?.id, usuario?.funcao]);



  // Resetar página quando comunidade for selecionada
  useEffect(() => {
    if (comunidadeSelecionada && pagina !== 1) {
      setPagina(1);
    }
  }, [comunidadeSelecionada]);

  // Implementar drag scroll na barra de comunidades
  useEffect(() => {
    const wrapper = abasWrapperRef.current;
    if (!wrapper) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    wrapper.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - wrapper.offsetLeft;
      scrollLeft = wrapper.scrollLeft;
    });

    wrapper.addEventListener('mouseleave', () => {
      isDown = false;
    });

    wrapper.addEventListener('mouseup', () => {
      isDown = false;
    });

    wrapper.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - wrapper.offsetLeft;
      const walk = x - startX;
      wrapper.scrollLeft = scrollLeft - walk;
    });

    return () => {
      // Cleanup se necessário
    };
  }, []);

  const carregarTotaisPorComunidade = async () => {
    if (!token) return;
    
    try {
      const dados = await obterTotaisPorComunidade(token);
      setTotalPorComunidadeReal(dados.totalPorComunidade);
      setTotalGeral(dados.totalGeral);
    } catch (erro) {
      console.error('❌ Erro ao carregar totais por comunidade:', erro);
    }
  };

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
        filtrosAvancados
      });
      
      console.log(`✅ [ListaPessoas] Retornou ${dados.pessoas.length} de ${dados.total} pessoas`);
      
      setPessoas(dados.pessoas);
      setTotal(dados.total);
      setUltimaAtualizacao(Date.now()); // Registrar timestamp do carregamento
    } catch (erro) {
      console.error('❌ [ListaPessoas] Erro ao carregar:', erro);
      
      // Interceptador de sessão expirada
      if (erro.response?.status === 401) {
        console.log('Token expirado, redirecionando para login...');
        sair();
        navegar('/entrar');
        return;
      }
      
      setErro('Erro ao carregar pessoas: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  };

  const handleDeletar = async (id) => {
    setPessoaParaDeleter(id);
    setModalDeleteAberto(true);
  };

  const confirmarDeletar = async () => {
    if (!pessoaParaDeleter || deletandoPessoa) return;
    
    const pessoaParaDeletar = pessoas.find(p => p.id === pessoaParaDeleter);
    setDeletandoPessoa(true);
    
    try {
      await deletarPessoa(token, pessoaParaDeleter);
      setPessoas(pessoas.filter(p => p.id !== pessoaParaDeleter));
      setTotal(total - 1);
      sucesso('Sucesso', 'Beneficiário deletado com sucesso!');
      
      // Auto-refresh: O evento SSE será disparado automaticamente pelo backend
      
    } catch (erro) {
      console.error('❌ Erro ao deletar pessoa:', erro);
      
      // Interceptador de sessão expirada
      if (erro.response?.status === 401) {
        console.log('Token expirado, redirecionando para login...');
        sair();
        navegar('/entrar');
        return;
      }
      
      erroToast('Erro ao Deletar', 'Não foi possível deletar o beneficiário');
    } finally {
      setDeletandoPessoa(false);
      setModalDeleteAberto(false);
      setPessoaParaDeleter(null);
    }
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

  // Carregar comunidades customizadas do localStorage
  const [comunidadesCustomizadas, setComunidadesCustomizadas] = useState(() => {
    const salvas = localStorage.getItem('comunidadesCustomizadas');
    return salvas ? JSON.parse(salvas) : [];
  });

  // Escutar atualizações de comunidades do gerenciador
  useEffect(() => {
    const handleComunidadesAtualizadas = () => {
      const comunidadesAtualizadas = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
      setComunidadesCustomizadas(comunidadesAtualizadas);
    };
    
    window.addEventListener('comunidadesAtualizadas', handleComunidadesAtualizadas);
    return () => window.removeEventListener('comunidadesAtualizadas', handleComunidadesAtualizadas);
  }, []);

  // Efeito para adicionar apenas NOVAS comunidades das pessoas (sem sobrescrever)
  useEffect(() => {
    if (pessoas.length > 0) {
      // Extrair comunidades únicas das pessoas
      const comunidadesDasPessoas = new Set(
        pessoas
          .map(p => p.comunidade)
          .filter(c => c && c.trim())
      );

      // Obter comunidades atuais do localStorage
      const comunidadesAtuais = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
      
      // Adicionar apenas comunidades que ainda não existem
      let foiAtualizado = false;
      const comunidadesAtualizadas = [...comunidadesAtuais];
      
      Array.from(comunidadesDasPessoas).forEach(comunidade => {
        if (!comunidadesAtualizadas.includes(comunidade)) {
          comunidadesAtualizadas.push(comunidade);
          foiAtualizado = true;
        }
      });

      // Só atualizar se houver mudanças
      if (foiAtualizado) {
        const comunidadesOrdenadas = comunidadesAtualizadas.sort();
        localStorage.setItem('comunidadesCustomizadas', JSON.stringify(comunidadesOrdenadas));
        setComunidadesCustomizadas(comunidadesOrdenadas);
        
        // Notificar outros componentes
        window.dispatchEvent(new CustomEvent('comunidadesAtualizadas'));
      }
    }
  }, [pessoas]);

  // Função para gerar cor consistente a partir do nome
  const gerarCorDeComunidade = (nomeComun) => {
    const cores = ['#1C78C0', '#CC3131', '#114E7A', '#D39E00', '#0A2A43', '#ec4899', '#f43f5e', '#06b6d4', '#14b8a6', '#84cc16', '#a78bfa'];
    let hash = 0;
    for (let i = 0; i < nomeComun.length; i++) {
      hash = ((hash << 5) - hash) + nomeComun.charCodeAt(i);
      hash = hash & hash;
    }
    return cores[Math.abs(hash) % cores.length];
  };

  // Usar apenas as comunidades do localStorage (que inclui as iniciais + customizadas)
  const comunidades = comunidadesCustomizadas.map(nome => ({
    nome,
    cor: gerarCorDeComunidade(nome)
  }));

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

  // Contar total por comunidade - usar valores reais da API
  const totalPorComunidade = comunidades.reduce((acc, comunidade) => {
    // Se temos dados reais da API, usar esses, senão usar contagem da página
    acc[comunidade.nome] = totalPorComunidadeReal[comunidade.nome] || 
                           (pessoasAgrupadas[comunidade.nome].criancas.length + 
                            pessoasAgrupadas[comunidade.nome].adultos.length + 
                            pessoasAgrupadas[comunidade.nome].idosos.length);
    return acc;
  }, {});

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
            className="botao-novo-simplificado"
            onClick={() => setModalCadastroAberto(true)}
            title="Adicionar nova pessoa ao sistema"
          >
            <Plus size={18} /> Novo Cadastro
          </button>
        </div>



        {erro && <div className="alerta-erro">{erro}</div>}

        {/* Mensagem flutuante de atualização */}
        {mostrarMensagemAtualizacao && (
          <div className="mensagem-atualizacao-flutuante">
            <div className="conteudo-mensagem">
              <span className="texto-mensagem">{tipoMensagemAtualizacao}</span>
              <div className="botoes-mensagem">
                <button 
                  onClick={() => {
                    carregarPessoas();
                    carregarTotaisPorComunidade();
                    setMostrarMensagemAtualizacao(false);
                  }}
                  className="botao-recarregar"
                >
                  Recarregar
                </button>
                <button 
                  onClick={() => setMostrarMensagemAtualizacao(false)}
                  className="botao-fechar-mensagem"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

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
              <div className="abas-wrapper" ref={abasWrapperRef}>
                <button
                  className={`aba-comunidade aba-todas ${!comunidadeSelecionada ? 'ativa' : ''}`}
                  onClick={() => setComunidadeSelecionada(null)}
                  title="Visualizar todas as comunidades"
                >
                  <span className="icone-aba">👥</span>
                  <span className="label-aba">Todas</span>
                  <span className="badge-aba">{totalGeral || total}</span>
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

              // Não renderizar se não há pessoas nesta comunidade
              if (totalComunidade === 0) return null;

              // Verificar se há pelo menos uma faixa etária com pessoas
              const temPessoas = gruposComunidade.criancas.length > 0 || 
                                gruposComunidade.adultos.length > 0 || 
                                gruposComunidade.idosos.length > 0;
              
              // Não renderizar seção vazia
              if (!temPessoas) return null;

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
                              onEditar={() => {
                                setPessoaParaEditar(pessoa);
                                setModalEdicaoAberto(true);
                              }}
                            onDeletar={() => handleDeletar(pessoa.id)}
                            onPreview={(p, i) => {
                              setPessoaSelecionada({ pessoa: p, idade: i });
                              setModalPreviewAberto(true);
                            }}
                            deletandoPessoa={deletandoPessoa}
                            pessoaParaDeleter={pessoaParaDeleter}
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
                            onEditar={() => {
                              setPessoaParaEditar(pessoa);
                              setModalEdicaoAberto(true);
                            }}
                            onDeletar={() => handleDeletar(pessoa.id)}
                            onPreview={(p, i) => {
                              setPessoaSelecionada({ pessoa: p, idade: i });
                              setModalPreviewAberto(true);
                            }}
                            deletandoPessoa={deletandoPessoa}
                            pessoaParaDeleter={pessoaParaDeleter}
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
                            onEditar={() => {
                              setPessoaParaEditar(pessoa);
                              setModalEdicaoAberto(true);
                            }}
                            onDeletar={() => handleDeletar(pessoa.id)}
                            onPreview={(p, i) => {
                              setPessoaSelecionada({ pessoa: p, idade: i });
                              setModalPreviewAberto(true);
                            }}
                            deletandoPessoa={deletandoPessoa}
                            pessoaParaDeleter={pessoaParaDeleter}
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

            {paginas > 1 && !comunidadeSelecionada && (
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
        aberto={modalDeleteAberto}
        tipo="delete"
        titulo="Deletar Beneficiário"
        mensagem="Tem certeza que deseja deletar este beneficiário? Esta ação não pode ser desfeita."
        botaoPrincipalTexto="Deletar"
        botaoCancelarTexto="Cancelar"
        onConfirmar={confirmarDeletar}
        onCancelar={() => {
          if (!deletandoPessoa) {
            setModalDeleteAberto(false);
            setPessoaParaDeleter(null);
          }
        }}
        carregando={deletandoPessoa}
      />

      {pessoaSelecionada && (
        <ModalPreview
          pessoa={pessoaSelecionada.pessoa}
          idade={pessoaSelecionada.idade}
          isOpen={modalPreviewAberto}
          onClose={() => {
            setModalPreviewAberto(false);
            setPessoaSelecionada(null);
          }}
        />
      )}
      {pessoaParaEditar && (
        <ModalEdicao
          pessoa={pessoaParaEditar}
          isOpen={modalEdicaoAberto}
          onClose={() => {
            setModalEdicaoAberto(false);
            setPessoaParaEditar(null);
          }}
          onAtualizar={(pessoaAtualizada) => {
            setPessoas(pessoas.map(p => p.id === pessoaAtualizada.id ? pessoaAtualizada : p));
          }}
        />
      )}
      <ModalCadastro
        isOpen={modalCadastroAberto}
        onClose={() => setModalCadastroAberto(false)}
        onCadastrar={() => {
          setModalCadastroAberto(false);
          carregarPessoas();
        }}
      />

    </div>
  );
};

const formatarCPF = (cpf) => {
  cpf = (cpf || '').toString();
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const CartaoPessoa = ({ pessoa, idade, onEditar, onDeletar, onPreview, deletandoPessoa, pessoaParaDeleter }) => {
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      onPreview(pessoa, idade);
    }, 2000);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const handleBotaoMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="cartao-pessoa"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onPreview(pessoa, idade)}
    >
      <div className="cartao-cabecalho">
        <div className="info-principal">
          <h3 className="nome-cartao">{pessoa.nome}</h3>
          <p className="idade-cartao">{idade} anos</p>
        </div>
        {(pessoa.beneficiosGAC && Array.isArray(pessoa.beneficiosGAC) && pessoa.beneficiosGAC.length > 0) && (
          <div className="badge-beneficio">GAC ({pessoa.beneficiosGAC.length})</div>
        )}
        {(pessoa.beneficiosGoverno && Array.isArray(pessoa.beneficiosGoverno) && pessoa.beneficiosGoverno.length > 0) && (
          <div className="badge-beneficio">Gov ({pessoa.beneficiosGoverno.length})</div>
        )}
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

        {pessoa.endereco && (
          <div className="linha-info">
            <span className="label">Endereço:</span>
            <span className="valor">{pessoa.endereco}</span>
          </div>
        )}

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
      </div>

      <div className="cartao-rodape">
        <button
          className="botao-cartao botao-editar"
          onClick={(e) => {
            e.stopPropagation();
            onEditar();
          }}
          onMouseEnter={handleBotaoMouseEnter}
          title="Editar"
        >
          <Edit2 size={16} /> Editar
        </button>
        <button
          className={`botao-cartao botao-deletar ${deletandoPessoa && pessoaParaDeleter === pessoa.id ? 'carregando' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!deletandoPessoa) {
              onDeletar();
            }
          }}
          onMouseEnter={handleBotaoMouseEnter}
          disabled={deletandoPessoa && pessoaParaDeleter === pessoa.id}
          title={deletandoPessoa && pessoaParaDeleter === pessoa.id ? "Deletando..." : "Deletar"}
        >
          {deletandoPessoa && pessoaParaDeleter === pessoa.id ? (
            <>
              <span style={{ 
                display: 'inline-block', 
                width: '14px', 
                height: '14px', 
                border: '2px solid transparent',
                borderTop: '2px solid currentColor',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '6px'
              }}></span>
              Deletando...
            </>
          ) : (
            <>
              <Trash2 size={16} /> Deletar
            </>
          )}
        </button>
      </div>
    </div>
  );
};
