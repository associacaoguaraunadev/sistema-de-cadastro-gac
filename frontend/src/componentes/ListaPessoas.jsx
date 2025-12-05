import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useGlobalToast } from '../contexto/ToastContext';
import { usePusher } from '../contexto/PusherContext';
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
  // ✨ ESTADOS PARA AUTO-REFRESH E ALERTAS
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(Date.now());
  const [alertaEdicao, setAlertaEdicao] = useState(null);
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);
  const abasWrapperRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const alertaTimeoutRef = useRef(null);
  const modalEdicaoAbertoRef = useRef(false);
  const modalPreviewAbertoRef = useRef(false);
  
  const { token, usuario, sair } = useAuth();
  const navegar = useNavigate();
  const { sucesso, erro: erroToast, aviso } = useGlobalToast();
  const { registrarCallback, isConnected } = usePusher();
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
  
  // 🔄 Função para atualizar dados da pessoa no preview silenciosamente
  const atualizarPessoaPreview = async (pessoaId) => {
    if (!token || !pessoaId) return;
    
    try {
      const { obterPessoa } = await import('../servicos/api');
      const pessoaAtualizada = await obterPessoa(token, pessoaId);
      setPessoaSelecionada(pessoaAtualizada);
      console.log(`✨ Preview atualizado silenciosamente: ${pessoaAtualizada.nome}`);
    } catch (erro) {
      console.error(`❌ Erro ao atualizar preview da pessoa ${pessoaId}:`, erro);
    }
  };

  useEffect(() => {
    carregarPessoas();
    carregarTotaisPorComunidade();
  }, [pagina, busca, tipoBeneficioFiltro, filtrosAvancados, token]);

  // ⚡ Sistema PUSHER em TEMPO REAL - Comunicação bilateral TOTAL
  useEffect(() => {
    if (!registrarCallback) return;
    
    console.log('⚙️ ListaPessoas: Registrando callbacks Pusher globais');

    // Callback para quando pessoa for cadastrada
    const unsubCadastro = registrarCallback('pessoaCadastrada', (evento) => {
      console.log(`\n🎉🎉🎉 EVENTO PUSHER RECEBIDO: pessoaCadastrada`);
      console.log(`👤 Nova pessoa: ${evento.pessoa?.nome || 'N/A'}`);
      console.log(`👮 Cadastrada por: ${evento.autorFuncao} (ID: ${evento.autorId})`);
      console.log(`📊 Evento completo:`, evento);
      console.log(`🆔 Usuario atual: ${usuario?.nome} (ID: ${usuario?.id})`);
      console.log(`🔄 Comparação IDs: ${String(evento.autorId)} !== ${String(usuario?.id)}`);
      
      // Mostrar toast apenas se NÃO for o próprio usuário
      if (usuario?.id && String(evento.autorId) !== String(usuario.id)) {
        console.log(`✅ Mostrando toast (não é o próprio usuário)`);
        sucesso(`Nova pessoa "${evento.pessoa.nome}" cadastrada por ${evento.autorFuncao}`);
      } else {
        console.log(`⏭️ Não mostrando toast (é o próprio usuário)`);
      }
      
      // SEMPRE recarregar lista (comunicação bilateral)
      console.log(`🔄 Recarregando lista de pessoas...`);
      carregarPessoas();
      carregarTotaisPorComunidade();
    });

    // Callback para quando pessoa for atualizada
    const unsubAtualizacao = registrarCallback('pessoaAtualizada', (evento) => {
      console.log(`✏️ ListaPessoas: Pessoa atualizada por ${evento.autorFuncao}`);
      console.log(`🔍 Modal de edição aberto? ${modalEdicaoAbertoRef.current}`);
      console.log(`🔍 Modal de preview aberto? ${modalPreviewAbertoRef.current}`);
      console.log(`🔍 Verificando se é o próprio usuário: autorId=${evento.autorId}, usuario.id=${usuario?.id}`);
      
      // NÃO mostrar alerta se:
      // 1. Modal de edição estiver aberto (para não atrapalhar a edição do usuário)
      // 2. Foi o próprio usuário que fez a edição
      if (evento.autorId === usuario?.id) {
        console.log(`⏭️ Não mostrando alerta (é o próprio usuário que fez a edição)`);
      } else if (!modalEdicaoAbertoRef.current) {
        console.log(`✅ Mostrando alerta de edição (modal não está aberto e não é o próprio usuário)`);
        
        // Mostrar alerta amarelo que desaparece em 10 segundos
        setAlertaEdicao({
          pessoaNome: evento.pessoa.nome,
          autorFuncao: evento.autorFuncao
        });
        
        // Limpar timeout anterior se existir
        if (alertaTimeoutRef.current) {
          clearTimeout(alertaTimeoutRef.current);
        }
        
        // Auto-esconder após 10 segundos
        alertaTimeoutRef.current = setTimeout(() => {
          setAlertaEdicao(null);
        }, 10000);
      } else {
        console.log(`⏭️ Modal de edição aberto, não mostrando alerta global`);
      }
      
      // SEMPRE recarregar lista (comunicação bilateral)
      carregarPessoas();
      carregarTotaisPorComunidade();
    });

    // Callback para quando pessoa for deletada
    const unsubDelecao = registrarCallback('pessoaDeletada', (evento) => {
      console.log(`🗑️ ListaPessoas: Pessoa deletada por ${evento.autorFuncao}`);
      console.log(`🔍 Verificando se é o próprio usuário: autorId=${evento.autorId}, usuario.id=${usuario?.id}`);
      
      // Mostrar toast APENAS se NÃO for o próprio usuário que deletou
      if (evento.autorId !== usuario?.id) {
        console.log(`✅ Mostrando toast de deleção`);
        aviso(
          `🗑️ ${evento.pessoa.nome} foi excluído(a)`,
          `Excluído por ${evento.autorFuncao}`
        );
      } else {
        console.log(`⏭️ Não mostrando toast (é o próprio usuário)`);
      }
      
      // SEMPRE recarregar lista (comunicação bilateral)
      carregarPessoas();
      carregarTotaisPorComunidade();
    });

    // Limpar callbacks ao desmontar
    return () => {
      unsubCadastro();
      unsubAtualizacao();
      unsubDelecao();
      
      // Limpar timeout do alerta
      if (alertaTimeoutRef.current) {
        clearTimeout(alertaTimeoutRef.current);
      }
    };

  }, [registrarCallback]);

  // Sincronizar refs com estados dos modais
  useEffect(() => {
    modalEdicaoAbertoRef.current = modalEdicaoAberto;
    console.log(`🔄 Ref modalEdicaoAberto atualizado: ${modalEdicaoAberto}`);
  }, [modalEdicaoAberto]);

  useEffect(() => {
    modalPreviewAbertoRef.current = modalPreviewAberto;
    console.log(`🔄 Ref modalPreviewAberto atualizado: ${modalPreviewAberto}`);
  }, [modalPreviewAberto]);

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
      {/* Alerta amarelo de edição - aparece por 10 segundos */}
      {alertaEdicao && (
        <div className="alerta-edicao-flutuante">
          <div className="alerta-edicao-conteudo">
            <div className="alerta-icone">⚠️</div>
            <div className="alerta-texto">
              Pessoa <strong>"{alertaEdicao.pessoaNome}"</strong> foi atualizada por {alertaEdicao.autorFuncao}
            </div>
            <button 
              className="alerta-fechar"
              onClick={() => {
                setAlertaEdicao(null);
                if (alertaTimeoutRef.current) {
                  clearTimeout(alertaTimeoutRef.current);
                }
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
      
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

        {/* ✨ AUTO-REFRESH FLUIDO: Sem necessidade de alertas manuais */}

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
          onPessoaDeletada={() => {
            carregarPessoas();
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
