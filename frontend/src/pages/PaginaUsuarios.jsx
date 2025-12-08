import React from 'react';
import { useAuth } from '../contexto/AuthContext';
import { Navigate } from 'react-router-dom';
import GerenciadorUsuarios from '../componentes/GerenciadorUsuarios';
import Breadcrumb from '../componentes/Breadcrumb';
import './PaginaUsuarios.css';

const PaginaUsuarios = () => {
  const { usuario } = useAuth();

  // Proteção: apenas admins podem acessar
  if (usuario?.funcao !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pagina-usuarios">
      <div className="pagina-container">
        <Breadcrumb 
          items={[
            { label: 'Gerenciamento', path: null },
            { label: 'Usuários', path: '/usuarios' }
          ]} 
        />
        
        <div className="pagina-conteudo">
          <GerenciadorUsuarios />
        </div>
      </div>
    </div>
  );
};

export default PaginaUsuarios;
