import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import Navbar from '../componentes/Navbar';
import Toast from '../componentes/Toast';
import { 
  Music, 
  Users, 
  GraduationCap, 
  UserCheck, 
  Calendar,
  FileText,
  BarChart3,
  Plus,
  ArrowRight,
  BookOpen,
  Clock
} from 'lucide-react';
import './PaginaGuarauna.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const PaginaGuarauna = () => {
  const { usuario, token } = useAuth();
  const navegar = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [toast, setToast] = useState(null);

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

  const cards = [
    {
      titulo: 'Alunos',
      descricao: 'Gerenciar alunos do Guaraúna',
      icone: GraduationCap,
      cor: '#4CAF50',
      rota: '/guarauna/alunos',
      valor: dashboard?.totais?.alunosAtivos || 0,
      label: 'ativos'
    },
    {
      titulo: 'Responsáveis',
      descricao: 'Gerenciar responsáveis legais',
      icone: UserCheck,
      cor: '#2196F3',
      rota: '/guarauna/responsaveis',
      valor: null,
      label: 'cadastrados'
    },
    {
      titulo: 'Professores',
      descricao: 'Gerenciar professores e instrutores',
      icone: Users,
      cor: '#9C27B0',
      rota: '/guarauna/professores',
      valor: dashboard?.totais?.professores || 0,
      label: 'ativos'
    },
    {
      titulo: 'Turmas',
      descricao: 'Gerenciar turmas por comunidade',
      icone: BookOpen,
      cor: '#FF9800',
      rota: '/guarauna/turmas',
      valor: dashboard?.totais?.turmas || 0,
      label: 'ativas'
    },
    {
      titulo: 'Matrículas',
      descricao: `Matrículas do ano ${dashboard?.anoAtual || new Date().getFullYear()}`,
      icone: Calendar,
      cor: '#00BCD4',
      rota: '/guarauna/matriculas',
      valor: dashboard?.totais?.matriculasAno || 0,
      label: 'no ano'
    },
    {
      titulo: 'Termos & Eventos',
      descricao: 'Gerenciar autorizações de eventos',
      icone: FileText,
      cor: '#E91E63',
      rota: '/guarauna/eventos',
      valor: dashboard?.totais?.eventosAtivos || 0,
      label: 'eventos ativos'
    }
  ];

  const acoesRapidas = [
    { titulo: 'Novo Aluno', icone: Plus, rota: '/guarauna/alunos/novo', cor: '#4CAF50' },
    { titulo: 'Nova Turma', icone: Plus, rota: '/guarauna/turmas/nova', cor: '#FF9800' },
    { titulo: 'Novo Evento', icone: Plus, rota: '/guarauna/eventos/novo', cor: '#E91E63' },
    { titulo: 'Nova Matrícula', icone: Plus, rota: '/guarauna/matriculas/nova', cor: '#00BCD4' }
  ];

  return (
    <div className="pagina-guarauna">
      <Navbar />
      
      <main className="guarauna-conteudo">
        <header className="guarauna-header">
          <div className="header-info">
            <div className="header-icone">
              <Music size={32} />
            </div>
            <div>
              <h1>Módulo Guaraúna</h1>
              <p>Sistema de gestão de alunos, turmas e matrículas</p>
            </div>
          </div>
          
          {usuario?.funcao === 'admin' && (
            <div className="acoes-rapidas">
              {acoesRapidas.map((acao, index) => (
                <button
                  key={index}
                  className="acao-rapida"
                  onClick={() => navegar(acao.rota)}
                  style={{ '--cor-acao': acao.cor }}
                >
                  <acao.icone size={16} />
                  <span>{acao.titulo}</span>
                </button>
              ))}
            </div>
          )}
        </header>

        {carregando ? (
          <div className="carregando-dashboard">
            <div className="spinner"></div>
            <p>Carregando dashboard...</p>
          </div>
        ) : (
          <>
            <section className="guarauna-cards">
              {cards.map((card, index) => (
                <div 
                  key={index} 
                  className="guarauna-card"
                  onClick={() => navegar(card.rota)}
                  style={{ '--cor-card': card.cor }}
                >
                  <div className="card-icone" style={{ background: card.cor }}>
                    <card.icone size={24} color="white" />
                  </div>
                  <div className="card-info">
                    <h3>{card.titulo}</h3>
                    <p>{card.descricao}</p>
                    {card.valor !== null && (
                      <div className="card-valor">
                        <span className="valor">{card.valor}</span>
                        <span className="label">{card.label}</span>
                      </div>
                    )}
                  </div>
                  <ArrowRight size={20} className="card-seta" />
                </div>
              ))}
            </section>

            <section className="guarauna-info">
              <div className="info-card">
                <h3><BarChart3 size={20} /> Resumo do Sistema</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-valor">{dashboard?.totais?.alunos || 0}</span>
                    <span className="info-label">Total de Alunos</span>
                  </div>
                  <div className="info-item">
                    <span className="info-valor">{dashboard?.totais?.alunosAtivos || 0}</span>
                    <span className="info-label">Alunos Ativos</span>
                  </div>
                  <div className="info-item">
                    <span className="info-valor">{dashboard?.totais?.turmas || 0}</span>
                    <span className="info-label">Turmas Ativas</span>
                  </div>
                  <div className="info-item">
                    <span className="info-valor">{dashboard?.totais?.eventosAtivos || 0}</span>
                    <span className="info-label">Eventos Pendentes</span>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <h3><Clock size={20} /> Próximos Passos</h3>
                <ul className="proximos-passos">
                  <li>Cadastrar alunos e responsáveis</li>
                  <li>Criar turmas por comunidade</li>
                  <li>Realizar matrículas anuais</li>
                  <li>Criar eventos e coletar autorizações</li>
                </ul>
              </div>
            </section>
          </>
        )}
      </main>

      {toast && (
        <Toast 
          mensagem={toast.mensagem} 
          tipo={toast.tipo} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
};

export default PaginaGuarauna;
