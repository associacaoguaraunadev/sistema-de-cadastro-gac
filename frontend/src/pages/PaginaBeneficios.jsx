import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import GerenciadorBeneficios from '../componentes/GerenciadorBeneficios';
import Breadcrumb from '../componentes/Breadcrumb';

const PaginaBeneficios = () => {
  const { usuario } = useAuth();

  // Verifica se o usuário está autenticado e é admin
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (usuario.funcao !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const itens = [
    { nome: 'Início', caminho: '/' },
    { nome: 'Gerenciamento', caminho: '/gerenciamento' },
    { nome: 'Benefícios', caminho: '/beneficios' }
  ];

  return (
    <div className="pagina-beneficios">
      <Breadcrumb itens={itens} />
      <GerenciadorBeneficios />
    </div>
  );
};

export default PaginaBeneficios;
