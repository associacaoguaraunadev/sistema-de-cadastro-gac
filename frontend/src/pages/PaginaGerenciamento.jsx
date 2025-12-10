import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, MapPin, Gift, Key, Users, ChevronRight } from 'lucide-react';
import Navbar from '../componentes/Navbar';
import './PaginaGerenciamento.css';

const PaginaGerenciamento = () => {
  const navegar = useNavigate();

  const opcoes = [
    {
      id: 'comunidades',
      titulo: 'Comunidades',
      descricao: 'Gerencie as comunidades cadastradas no sistema',
      icone: MapPin,
      cor: '#4caf50',
      caminho: '/gerenciamento/comunidades'
    },
    {
      id: 'beneficios',
      titulo: 'Benefícios',
      descricao: 'Configure os tipos de benefícios disponíveis',
      icone: Gift,
      cor: '#ff9800',
      caminho: '/beneficios'
    },
    {
      id: 'tokens',
      titulo: 'Tokens',
      descricao: 'Gere e gerencie tokens de convite para novos usuários',
      icone: Key,
      cor: '#2196f3',
      caminho: '/tokens'
    },
    {
      id: 'usuarios',
      titulo: 'Usuários',
      descricao: 'Administre os usuários do sistema',
      icone: Users,
      cor: '#9c27b0',
      caminho: '/usuarios'
    }
  ];

  return (
    <div className="pagina-gerenciamento">
      <Navbar />
      
      <div className="gerenciamento-container">
        <div className="gerenciamento-header">
          <div className="gerenciamento-titulo">
            <Settings size={32} className="icone-titulo" />
            <div>
              <h1>Gerenciamento</h1>
              <p>Configure e administre as funcionalidades do sistema</p>
            </div>
          </div>
        </div>

        <div className="gerenciamento-grid">
          {opcoes.map((opcao) => {
            const Icone = opcao.icone;
            return (
              <div 
                key={opcao.id}
                className="gerenciamento-card"
                onClick={() => navegar(opcao.caminho)}
              >
                <div 
                  className="card-icone"
                  style={{ backgroundColor: `${opcao.cor}15`, color: opcao.cor }}
                >
                  <Icone size={28} />
                </div>
                <div className="card-conteudo">
                  <h3>{opcao.titulo}</h3>
                  <p>{opcao.descricao}</p>
                </div>
                <ChevronRight size={20} className="card-seta" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PaginaGerenciamento;
