import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useGlobalToast } from '../contexto/ToastContext';
import Navbar from '../componentes/Navbar';
import { ModalConfirmacao } from '../componentes/ModalConfirmacao';
import { 
  ArrowLeft,
  Search,
  Plus,
  Edit,
  Trash2,
  User,
  Phone,
  MapPin,
  Heart,
  UserCheck,
  BookOpen,
  Filter,
  X
} from 'lucide-react';
import './PaginaAlunosGuarauna.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const PaginaAlunosGuarauna = () => {
  const { usuario, token } = useAuth();
  const { adicionarToast } = useGlobalToast();
  const navegar = useNavigate();
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState({ comunidade: '', ativo: 'true' });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [modalDeletar, setModalDeletar] = useState(false);

  useEffect(() => {
    carregarAlunos();
  }, [filtros]);

  const carregarAlunos = async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (filtros.comunidade) params.append('comunidade', filtros.comunidade);
      if (filtros.ativo) params.append('ativo', filtros.ativo);
      if (busca) params.append('busca', busca);

      const resposta = await fetch(`${API_URL}/guarauna/alunos?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (resposta.ok) {
        const dados = await resposta.json();
        setAlunos(dados);
      }
    } catch (erro) {
      console.error('Erro ao carregar alunos:', erro);
      adicionarToast('Erro ao carregar alunos', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  const deletarAluno = async () => {
    if (!alunoSelecionado) return;

    try {
      const resposta = await fetch(`${API_URL}/guarauna/alunos/${alunoSelecionado.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (resposta.ok) {
        adicionarToast('Aluno removido com sucesso', 'sucesso');
        carregarAlunos();
      } else {
        const erro = await resposta.json();
        adicionarToast(erro.erro || 'Erro ao remover aluno', 'erro');
      }
    } catch (erro) {
      adicionarToast('Erro ao remover aluno', 'erro');
    } finally {
      setModalDeletar(false);
      setAlunoSelecionado(null);
    }
  };

  const calcularIdade = (dataNascimento) => {
    if (!dataNascimento) return null;
    const nascimento = new Date(dataNascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const alunosFiltrados = alunos.filter(aluno =>
    aluno.pessoa.nome.toLowerCase().includes(busca.toLowerCase()) ||
    aluno.pessoa.cpf?.includes(busca)
  );

  const comunidades = [...new Set(alunos.map(a => a.pessoa.comunidade).filter(Boolean))];

  return (
    <div className="pagina-alunos-guarauna">
      <Navbar />
      
      <main className="alunos-conteudo">
        <header className="alunos-header">
          <button className="botao-voltar" onClick={() => navegar('/guarauna')}>
            <ArrowLeft size={20} />
            <span>Voltar</span>
          </button>
          
          <div className="header-titulo">
            <h1>Alunos do Guaraúna</h1>
            <span className="contador">{alunosFiltrados.length} aluno(s)</span>
          </div>

          {usuario?.funcao === 'admin' && (
            <button 
              className="botao-novo-aluno"
              onClick={() => navegar('/guarauna/alunos/novo')}
            >
              <Plus size={18} />
              <span>Novo Aluno</span>
            </button>
          )}
        </header>

        <div className="alunos-ferramentas">
          <div className="campo-busca">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca && (
              <button className="limpar-busca" onClick={() => setBusca('')}>
                <X size={16} />
              </button>
            )}
          </div>

          <button 
            className={`botao-filtros ${mostrarFiltros ? 'ativo' : ''}`}
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
          >
            <Filter size={18} />
            <span>Filtros</span>
          </button>
        </div>

        {mostrarFiltros && (
          <div className="painel-filtros">
            <div className="filtro-grupo">
              <label>Comunidade</label>
              <select
                value={filtros.comunidade}
                onChange={(e) => setFiltros({ ...filtros, comunidade: e.target.value })}
              >
                <option value="">Todas</option>
                {comunidades.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="filtro-grupo">
              <label>Status</label>
              <select
                value={filtros.ativo}
                onChange={(e) => setFiltros({ ...filtros, ativo: e.target.value })}
              >
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
                <option value="">Todos</option>
              </select>
            </div>
          </div>
        )}

        {carregando ? (
          <div className="carregando">
            <div className="spinner"></div>
            <p>Carregando alunos...</p>
          </div>
        ) : alunosFiltrados.length === 0 ? (
          <div className="lista-vazia">
            <User size={48} />
            <h3>Nenhum aluno encontrado</h3>
            <p>Cadastre um novo aluno ou ajuste os filtros</p>
          </div>
        ) : (
          <div className="lista-alunos">
            {alunosFiltrados.map(aluno => (
              <div key={aluno.id} className={`card-aluno ${!aluno.ativo ? 'inativo' : ''}`}>
                <div className="aluno-avatar">
                  <User size={24} />
                </div>
                
                <div className="aluno-info">
                  <h3>{aluno.pessoa.nome}</h3>
                  <div className="aluno-detalhes">
                    {aluno.pessoa.dataNascimento && (
                      <span className="detalhe">
                        <User size={14} />
                        {calcularIdade(aluno.pessoa.dataNascimento)} anos
                      </span>
                    )}
                    {aluno.pessoa.comunidade && (
                      <span className="detalhe">
                        <MapPin size={14} />
                        {aluno.pessoa.comunidade}
                      </span>
                    )}
                    {aluno.pessoa.telefone && (
                      <span className="detalhe">
                        <Phone size={14} />
                        {aluno.pessoa.telefone}
                      </span>
                    )}
                  </div>
                  
                  <div className="aluno-tags">
                    {aluno.responsaveis?.length > 0 && (
                      <span className="tag responsavel">
                        <UserCheck size={12} />
                        {aluno.responsaveis.length} responsável(is)
                      </span>
                    )}
                    {aluno.turmas?.length > 0 && (
                      <span className="tag turma">
                        <BookOpen size={12} />
                        {aluno.turmas.map(t => t.turma.nome).join(', ')}
                      </span>
                    )}
                    {(aluno.doencas || aluno.alergias || aluno.necessidadesEspeciais) && (
                      <span className="tag saude">
                        <Heart size={12} />
                        Atenção à saúde
                      </span>
                    )}
                  </div>
                </div>

                <div className="aluno-acoes">
                  <button 
                    className="botao-acao editar"
                    onClick={() => navegar(`/guarauna/alunos/${aluno.id}`)}
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  {usuario?.funcao === 'admin' && (
                    <button 
                      className="botao-acao deletar"
                      onClick={() => {
                        setAlunoSelecionado(aluno);
                        setModalDeletar(true);
                      }}
                      title="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {!aluno.ativo && (
                  <div className="badge-inativo">Inativo</div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {modalDeletar && (
        <ModalConfirmacao
          aberto={modalDeletar}
          titulo="Remover Aluno"
          mensagem={`Tem certeza que deseja remover ${alunoSelecionado?.pessoa?.nome} do Guaraúna?`}
          botaoPrincipalTexto="Remover"
          botaoCancelarTexto="Cancelar"
          tipo="deletar"
          onConfirmar={deletarAluno}
          onCancelar={() => {
            setModalDeletar(false);
            setAlunoSelecionado(null);
          }}
        />
      )}
    </div>
  );
};

export default PaginaAlunosGuarauna;
