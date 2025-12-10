import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexto/AuthContext';
import Navbar from '../componentes/Navbar';
import Breadcrumb from '../componentes/Breadcrumb';
import { 
  BarChart3, 
  Users, 
  GraduationCap, 
  UserCheck, 
  BookOpen,
  Calendar,
  FileText,
  TrendingUp,
  Activity
} from 'lucide-react';
import './PaginaMetricasGuarauna.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PaginaMetricasGuarauna = () => {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [carregando, setCarregando] = useState(true);

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

  const breadcrumbItems = [
    { label: 'Guaraúna', path: '/guarauna' },
    { label: 'Métricas', path: '/guarauna/metricas' }
  ];

  return (
    <div className="pagina-metricas">
      <Navbar />
      <Breadcrumb items={breadcrumbItems} />
      
      <main className="metricas-conteudo">
        <header className="metricas-header">
          <div className="header-info">
            <div className="header-icone">
              <BarChart3 size={28} />
            </div>
            <div>
              <h1>Métricas do Guaraúna</h1>
              <p>Acompanhe os indicadores do sistema</p>
            </div>
          </div>
        </header>

        {carregando ? (
          <div className="carregando-dashboard">
            <div className="spinner"></div>
            <p>Carregando métricas...</p>
          </div>
        ) : (
          <>
            {/* Cards de métricas principais */}
            <section className="metricas-grid">
              <div className="metrica-card destaque">
                <div className="metrica-icone" style={{ background: '#4CAF50' }}>
                  <GraduationCap size={24} color="white" />
                </div>
                <div className="metrica-info">
                  <span className="metrica-valor">{dashboard?.totais?.alunos || 0}</span>
                  <span className="metrica-label">Total de Alunos</span>
                </div>
              </div>

              <div className="metrica-card">
                <div className="metrica-icone" style={{ background: '#2196F3' }}>
                  <Activity size={24} color="white" />
                </div>
                <div className="metrica-info">
                  <span className="metrica-valor">{dashboard?.totais?.alunosAtivos || 0}</span>
                  <span className="metrica-label">Alunos Ativos</span>
                </div>
              </div>

              <div className="metrica-card">
                <div className="metrica-icone" style={{ background: '#9C27B0' }}>
                  <Users size={24} color="white" />
                </div>
                <div className="metrica-info">
                  <span className="metrica-valor">{dashboard?.totais?.educadores || 0}</span>
                  <span className="metrica-label">Educadores</span>
                </div>
              </div>

              <div className="metrica-card">
                <div className="metrica-icone" style={{ background: '#FF9800' }}>
                  <UserCheck size={24} color="white" />
                </div>
                <div className="metrica-info">
                  <span className="metrica-valor">{dashboard?.totais?.responsaveis || 0}</span>
                  <span className="metrica-label">Responsáveis</span>
                </div>
              </div>

              <div className="metrica-card">
                <div className="metrica-icone" style={{ background: '#00BCD4' }}>
                  <BookOpen size={24} color="white" />
                </div>
                <div className="metrica-info">
                  <span className="metrica-valor">{dashboard?.totais?.turmas || 0}</span>
                  <span className="metrica-label">Turmas Ativas</span>
                </div>
              </div>

              <div className="metrica-card">
                <div className="metrica-icone" style={{ background: '#E91E63' }}>
                  <Calendar size={24} color="white" />
                </div>
                <div className="metrica-info">
                  <span className="metrica-valor">{dashboard?.totais?.matriculasAno || 0}</span>
                  <span className="metrica-label">Matrículas {dashboard?.anoAtual || new Date().getFullYear()}</span>
                </div>
              </div>

              <div className="metrica-card">
                <div className="metrica-icone" style={{ background: '#607D8B' }}>
                  <FileText size={24} color="white" />
                </div>
                <div className="metrica-info">
                  <span className="metrica-valor">{dashboard?.totais?.eventosAtivos || 0}</span>
                  <span className="metrica-label">Eventos Ativos</span>
                </div>
              </div>

              <div className="metrica-card">
                <div className="metrica-icone" style={{ background: '#795548' }}>
                  <TrendingUp size={24} color="white" />
                </div>
                <div className="metrica-info">
                  <span className="metrica-valor">
                    {dashboard?.totais?.alunos > 0 
                      ? Math.round((dashboard?.totais?.alunosAtivos / dashboard?.totais?.alunos) * 100)
                      : 0}%
                  </span>
                  <span className="metrica-label">Taxa de Atividade</span>
                </div>
              </div>
            </section>

            {/* Seção futura para gráficos */}
            <section className="metricas-graficos">
              <div className="grafico-placeholder">
                <BarChart3 size={48} />
                <p>Gráficos e análises detalhadas em breve...</p>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default PaginaMetricasGuarauna;
