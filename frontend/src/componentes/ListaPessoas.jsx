import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { obterPessoas, deletarPessoa } from '../servicos/api';
import { Plus, Edit2, Trash2, Search, LogOut, Users, Baby, User, Heart } from 'lucide-react';
import './ListaPessoas.css';

export const ListaPessoas = () => {
  const [pessoas, setPessoas] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');
  const [tipoBeneficioFiltro, setTipoBeneficioFiltro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const timeoutRef = useRef(null);
  
  const { token, usuario, sair } = useAuth();
  const navegar = useNavigate();
  const LIMITE = 50;

  // Debounce para a busca - espera 500ms após parar de digitar
  useEffect(() => {
    clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      setBusca(buscaInput);
      setPagina(1);
    }, 500);

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
  }, [pagina, busca, tipoBeneficioFiltro, token]);

  const carregarPessoas = async () => {
    if (!token) return;
    
    setCarregando(true);
    setErro('');
    
    try {
      const dados = await obterPessoas(token, {
        pagina,
        limite: LIMITE,
        busca,
        status: 'ativo'
      });
      
      setPessoas(dados.pessoas);
      setTotal(dados.total);
    } catch (erro) {
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
    } catch (erro) {
      setErro('Erro ao deletar: ' + erro.message);
    }
  };

  const handleSair = () => {
    if (window.confirm('Deseja sair do sistema?')) {
      sair();
      navegar('/entrar');
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

  // Segmentar pessoas por faixa etária
  const pessoasSegmentadas = {
    criancas: pessoas.filter(p => obterFaixaEtaria(calcularIdade(p)) === 'criancas'),
    adultos: pessoas.filter(p => obterFaixaEtaria(calcularIdade(p)) === 'adultos'),
    idosos: pessoas.filter(p => obterFaixaEtaria(calcularIdade(p)) === 'idosos')
  };

  // Obter tipos de benefício únicos
  const tiposBeneficio = [...new Set(pessoas.map(p => p.tipoBeneficio))].sort();

  // Filtrar por tipo de benefício se selecionado
  const pessoasFiltradas = tipoBeneficioFiltro
    ? pessoas.filter(p => p.tipoBeneficio === tipoBeneficioFiltro)
    : pessoas;

  const paginas = Math.ceil(total / LIMITE);

  return (
    <div className="container-lista">
      <header className="cabecalho-lista">
        <div className="titulo-cabecalho">
          <div className="marca-pequena">GAC</div>
          <h1>Sistema de Cadastro de Beneficiários</h1>
        </div>
        <div className="info-usuario">
          <span>{usuario?.nome}</span>
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

          {tiposBeneficio.length > 0 && (
            <select
              className="filtro-beneficio"
              value={tipoBeneficioFiltro}
              onChange={(e) => {
                setTipoBeneficioFiltro(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todos os benefícios</option>
              {tiposBeneficio.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          )}

          <button 
            className="botao-novo"
            onClick={() => navegar('/pessoas/novo')}
          >
            <Plus size={18} /> Novo Cadastro
          </button>
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
            {/* SEÇÃO CRIANÇAS E ADOLESCENTES */}
            {pessoasSegmentadas.criancas.length > 0 && (
              <div className="secao-faixa-etaria">
                <div className="cabecalho-secao">
                  <Baby size={20} />
                  <h2>Crianças e Adolescentes (0-17 anos)</h2>
                  <span className="badge-quantidade">{pessoasSegmentadas.criancas.length}</span>
                </div>
                <div className="grid-pessoas">
                  {pessoasSegmentadas.criancas.map((pessoa) => (
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

            {/* SEÇÃO ADULTOS */}
            {pessoasSegmentadas.adultos.length > 0 && (
              <div className="secao-faixa-etaria">
                <div className="cabecalho-secao">
                  <User size={20} />
                  <h2>Adultos (18-59 anos)</h2>
                  <span className="badge-quantidade">{pessoasSegmentadas.adultos.length}</span>
                </div>
                <div className="grid-pessoas">
                  {pessoasSegmentadas.adultos.map((pessoa) => (
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

            {/* SEÇÃO IDOSOS */}
            {pessoasSegmentadas.idosos.length > 0 && (
              <div className="secao-faixa-etaria">
                <div className="cabecalho-secao">
                  <Heart size={20} />
                  <h2>Idosos (60+ anos)</h2>
                  <span className="badge-quantidade">{pessoasSegmentadas.idosos.length}</span>
                </div>
                <div className="grid-pessoas">
                  {pessoasSegmentadas.idosos.map((pessoa) => (
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
    </div>
  );
};

const formatarCPF = (cpf) => {
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
          <span className="valor">{new Date(pessoa.dataCriacao).toLocaleDateString('pt-BR')}</span>
        </div>
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
