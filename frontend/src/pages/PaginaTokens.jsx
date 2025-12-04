import React from 'react';
import { useAuth } from '../contexto/AuthContext';
import { Navigate } from 'react-router-dom';
import { GerenciadorTokens } from '../componentes/GerenciadorTokens';
import Breadcrumb from '../componentes/Breadcrumb';
import './PaginaTokens.css';

const PaginaTokens = () => {
  const { usuario } = useAuth();

  // Proteção: apenas admins podem acessar
  if (usuario?.funcao !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pagina-tokens">
      <div className="pagina-container">
        <Breadcrumb 
          items={[
            { label: 'Gerenciamento', path: null },
            { label: 'Tokens', path: '/tokens' }
          ]} 
        />
        
        <div className="pagina-header">
          <h1>Gerenciamento de Tokens</h1>
          <p>Controle os tokens de acesso e convites do sistema</p>
        </div>

        <div className="pagina-conteudo">
          <GerenciadorTokens onFechar={() => {}} />
        </div>
      </div>
    </div>
  );
};

export default PaginaTokens;