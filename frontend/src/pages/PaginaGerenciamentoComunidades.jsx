import React from 'react';
import { useAuth } from '../contexto/AuthContext';
import { Navigate } from 'react-router-dom';
import ListaComunidadesGerenciamento from '../componentes/ListaComunidadesGerenciamento';
import Breadcrumb from '../componentes/Breadcrumb';
import './PaginaGerenciamentoComunidades.css';

const PaginaGerenciamentoComunidades = () => {
  const { usuario } = useAuth();

  // Proteção: apenas admins podem acessar
  if (usuario?.funcao !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pagina-gerenciamento-comunidades">
      <div className="pagina-container">
        <Breadcrumb 
          items={[
            { label: 'Gerenciamento', path: null },
            { label: 'Comunidades', path: '/gerenciamento/comunidades' }
          ]} 
        />
        
        <div className="pagina-header">
          <h1>Gerenciamento de Comunidades</h1>
          <p>Adicione, edite e organize as comunidades do sistema</p>
        </div>

        <div className="pagina-conteudo">
          <ListaComunidadesGerenciamento />
        </div>
      </div>
    </div>
  );
};

export default PaginaGerenciamentoComunidades;