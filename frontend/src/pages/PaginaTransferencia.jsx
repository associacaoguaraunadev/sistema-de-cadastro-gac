import React from 'react';
import { useAuth } from '../contexto/AuthContext';
import { Navigate } from 'react-router-dom';
import { TransferenciaPessoas } from '../componentes/TransferenciaPessoas';
import Breadcrumb from '../componentes/Breadcrumb';
import './PaginaTransferencia.css';

const PaginaTransferencia = () => {
  const { usuario } = useAuth();

  // Proteção: apenas admins podem acessar
  if (usuario?.funcao !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pagina-transferencia">
      <div className="pagina-container">
        <Breadcrumb 
          items={[
            { label: 'Transferência de Pessoas', path: '/transferencia' }
          ]} 
        />
        
        <div className="pagina-header">
          <h1>Transferência de Pessoas</h1>
          <p>Transfira pessoas entre diferentes usuários do sistema</p>
        </div>

        <div className="pagina-conteudo">
          <TransferenciaPessoas />
        </div>
      </div>
    </div>
  );
};

export default PaginaTransferencia;