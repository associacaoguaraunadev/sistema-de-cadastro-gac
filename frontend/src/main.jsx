import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexto/AuthContext';
import { RotaPrivada } from './componentes/RotaPrivada';
import { FormularioLogin, FormularioRegistro } from './componentes/FormularioAutenticacao';
import { FormularioRecuperacaoSenha } from './componentes/FormularioRecuperacaoSenha';
import { ListaPessoas } from './componentes/ListaPessoas';
import { ListaComunidades } from './componentes/ListaComunidades';
import { FormularioPessoa } from './componentes/FormularioPessoa';
import { TransferenciaPessoas } from './componentes/TransferenciaPessoas';
import './index.css';

function App() {
  const { autenticado } = useAuth();

  return (
    <Routes>
      <Route 
        path="/entrar" 
        element={autenticado ? <Navigate to="/" /> : <FormularioLogin />} 
      />
      <Route 
        path="/registrar" 
        element={autenticado ? <Navigate to="/" /> : <FormularioRegistro />} 
      />
      <Route 
        path="/recuperar-senha" 
        element={autenticado ? <Navigate to="/" /> : <FormularioRecuperacaoSenha />} 
      />
      <Route 
        path="/" 
        element={
          <RotaPrivada>
            <ListaPessoas />
          </RotaPrivada>
        } 
      />
      <Route 
        path="/comunidades" 
        element={
          <RotaPrivada>
            <ListaComunidades />
          </RotaPrivada>
        } 
      />
      <Route 
        path="/pessoas" 
        element={
          <RotaPrivada>
            <ListaPessoas />
          </RotaPrivada>
        } 
      />
      <Route 
        path="/pessoas/novo" 
        element={
          <RotaPrivada>
            <FormularioPessoa />
          </RotaPrivada>
        } 
      />
      <Route 
        path="/pessoas/:id" 
        element={
          <RotaPrivada>
            <FormularioPessoa />
          </RotaPrivada>
        } 
      />
      <Route 
        path="/transferir" 
        element={
          <RotaPrivada>
            <TransferenciaPessoas />
          </RotaPrivada>
        } 
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
