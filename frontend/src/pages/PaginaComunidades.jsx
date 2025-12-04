import React from 'react';
import { useAuth } from '../contexto/AuthContext';
import { Navigate } from 'react-router-dom';
import GerenciadorComunidades from '../componentes/GerenciadorComunidades';
import Breadcrumb from '../componentes/Breadcrumb';
import './PaginaComunidades.css';

const PaginaComunidades = () => {
  const { usuario } = useAuth();

  // Proteção: apenas admins podem acessar
  if (usuario?.funcao !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pagina-comunidades">
      <div className="pagina-container">
        <Breadcrumb 
          items={[
            { label: 'Gerenciamento', path: null },
            { label: 'Comunidades', path: '/comunidades' }
          ]} 
        />
        
        <div className="pagina-header">
          <h1>Gerenciamento de Comunidades</h1>
          <p>Adicione, edite e organize as comunidades do sistema</p>
        </div>

        <div className="pagina-conteudo">
          <GerenciadorComunidades 
            isOpen={true}
            onClose={() => {}}
          />
        </div>
      </div>
    </div>
  );
};

export default PaginaComunidades;