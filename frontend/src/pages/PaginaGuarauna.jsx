import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import Navbar from '../componentes/Navbar';
import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  Calendar,
  FileText,
  BookOpen,
  Layers,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import './PaginaGuarauna.css';

// Importar imagens
import LogoGuarauna from '../images/Logo guarauna.jpg';
import SistemaGraduacaoInfantil from '../images/sistema de graduacao infantil.jpg';
import SistemaGraduacaoOficial from '../images/Sistema de graduacao oficial.jpg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PaginaGuarauna = () => {
  const { usuario, token } = useAuth();
  const navegar = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [modalAjudaAberto, setModalAjudaAberto] = useState(false);
  const [imagemAtiva, setImagemAtiva] = useState(0);

  // Dados das imagens explicativas
  const imagensExplicativas = [
    {
      src: SistemaGraduacaoOficial,
      titulo: 'Sistema de Graduação Oficial',
      descricao: 'O sistema de graduação oficial do Projeto Guaraúna segue uma progressão estruturada de cordas. Cada corda representa um nível de desenvolvimento do aluno(a), considerando aspectos técnicos, comportamentais e de participação nas atividades. A progressão é feita através de avaliações periódicas realizadas pelos educadores.'
    },
    {
      src: SistemaGraduacaoInfantil,
      titulo: 'Sistema de Graduação Infantil',
      descricao: 'Para os alunos mais jovens, temos um sistema de graduação adaptado que respeita o desenvolvimento infantil. As faixas são conquistadas através de atividades lúdicas e educativas, incentivando a participação, disciplina e respeito. Este sistema prepara as crianças para a transição ao sistema oficial quando atingirem a idade apropriada.'
    }
  ];

  useEffect(() => {
    carregarDashboard();
  }, []);

  const carregarDashboard = async () => {
    try {
      const resposta = await fetch(`${API_URL}/guarauna/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resposta.ok) {
        const dados = await resposta.json();
        setDashboard(dados);
      }
    } catch (erro) {
      console.error('Erro ao carregar dashboard:', erro);
    } finally {
      setCarregando(false);
    }
  };

  // Seção 1: Pessoas (base do sistema)
  const cardsPessoas = [
    {
      titulo: 'Alunos',
      descricao: 'Cadastro e gestão dos alunos',
      icone: GraduationCap,
      cor: '#4CAF50',
      rota: '/guarauna/alunos',
      valor: dashboard?.totais?.alunosAtivos || 0,
      label: 'ativos'
    },
    {
      titulo: 'Responsáveis',
      descricao: 'Responsáveis legais dos alunos',
      icone: UserCheck,
      cor: '#2196F3',
      rota: '/guarauna/responsaveis',
      valor: dashboard?.totais?.responsaveis || 0,
      label: 'cadastrados'
    },
    {
      titulo: 'Educadores',
      descricao: 'Instrutores e professores',
      icone: Users,
      cor: '#9C27B0',
      rota: '/guarauna/educadores',
      valor: dashboard?.totais?.educadores || 0,
      label: 'ativos'
    }
  ];

  // Seção 2: Gestão
  const cardsGestao = [
    {
      titulo: 'Turmas',
      descricao: 'Organização por comunidade',
      icone: BookOpen,
      cor: '#FF9800',
      rota: '/guarauna/turmas',
      valor: dashboard?.totais?.turmas || 0,
      label: 'ativas'
    },
    {
      titulo: 'Matrículas',
      descricao: `Ano ${dashboard?.anoAtual || new Date().getFullYear()}`,
      icone: Calendar,
      cor: '#00BCD4',
      rota: '/guarauna/matriculas',
      valor: dashboard?.totais?.matriculasAno || 0,
      label: 'no ano'
    },
    {
      titulo: 'Termos & Eventos',
      descricao: 'Autorizações e eventos',
      icone: FileText,
      cor: '#E91E63',
      rota: '/guarauna/eventos',
      valor: dashboard?.totais?.eventosAtivos || 0,
      label: 'eventos ativos'
    }
  ];

  const renderCard = (card) => (
    <div 
      key={card.titulo} 
      className="guarauna-card"
      onClick={() => navegar(card.rota)}
      style={{ '--cor-card': card.cor }}
    >
      <div className="card-icone" style={{ background: card.cor }}>
        <card.icone size={22} color="white" />
      </div>
      <div className="card-info">
        <h3>{card.titulo}</h3>
        <p>{card.descricao}</p>
      </div>
      <div className="card-valor">
        <span className="valor">{card.valor}</span>
        <span className="label">{card.label}</span>
      </div>
    </div>
  );

  return (
    <div className="pagina-guarauna" style={{ '--bg-logo': `url(${LogoGuarauna})` }}>
      <Navbar />
      
      <main className="guarauna-conteudo">
        <header className="guarauna-header">
          <div className="header-info">
            <div>
              <h1>Gerenciamento Guaraúna</h1>
              <p>Sistema de gestão de alunos, turmas e matrículas</p>
            </div>
          </div>
          <button 
            className="btn-ajuda"
            onClick={() => setModalAjudaAberto(true)}
            title="Informações sobre o sistema de graduação"
          >
            <HelpCircle size={20} />
            <span>Sistema de Graduação</span>
          </button>
        </header>

        {carregando ? (
          <div className="carregando-dashboard">
            <div className="spinner"></div>
            <p>Carregando...</p>
          </div>
        ) : (
          <>
            {/* Seção: Cadastros (Pessoas) */}
            <section className="guarauna-secao">
              <div className="secao-header">
                <div className="secao-icone pessoas">
                  <Layers size={16} />
                </div>
                <div className="secao-titulo">
                  <h2>Cadastros</h2>
                </div>
              </div>
              <div className="guarauna-cards tres-colunas">
                {cardsPessoas.map(renderCard)}
              </div>
            </section>

            {/* Seção: Gestão Acadêmica */}
            <section className="guarauna-secao">
              <div className="secao-header">
                <div className="secao-icone gestao">
                  <BookOpen size={16} />
                </div>
                <div className="secao-titulo">
                  <h2>Gestão Acadêmica</h2>
                </div>
              </div>
              <div className="guarauna-cards tres-colunas">
                {cardsGestao.map(renderCard)}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Modal de Ajuda - Sistema de Graduação */}
      {modalAjudaAberto && (
        <div className="modal-overlay-graduacao" onClick={() => setModalAjudaAberto(false)}>
          <div className="modal-graduacao" onClick={(e) => e.stopPropagation()}>
            <div className="modal-graduacao-header">
              <h2>Sistema de Graduação Guaraúna</h2>
              <button className="btn-fechar-graduacao" onClick={() => setModalAjudaAberto(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-graduacao-content">
              <div className="graduacao-navegacao">
                <button 
                  className="btn-nav-graduacao"
                  onClick={() => setImagemAtiva(imagemAtiva === 0 ? imagensExplicativas.length - 1 : imagemAtiva - 1)}
                >
                  <ChevronLeft size={24} />
                </button>
                
                <div className="graduacao-imagem-container">
                  <img 
                    src={imagensExplicativas[imagemAtiva].src} 
                    alt={imagensExplicativas[imagemAtiva].titulo}
                    className="graduacao-imagem"
                  />
                </div>
                
                <button 
                  className="btn-nav-graduacao"
                  onClick={() => setImagemAtiva((imagemAtiva + 1) % imagensExplicativas.length)}
                >
                  <ChevronRight size={24} />
                </button>
              </div>
              
              <div className="graduacao-info">
                <h3>{imagensExplicativas[imagemAtiva].titulo}</h3>
                <p>{imagensExplicativas[imagemAtiva].descricao}</p>
              </div>
              
              <div className="graduacao-indicadores">
                {imagensExplicativas.map((_, index) => (
                  <button
                    key={index}
                    className={`indicador ${index === imagemAtiva ? 'ativo' : ''}`}
                    onClick={() => setImagemAtiva(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaginaGuarauna;
