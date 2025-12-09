import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexto/AuthContext';
import { ToastProvider } from './contexto/ToastContext';
import { PusherProvider } from './contexto/PusherContext';
import { ToastContainer } from './componentes/Toast';
import { useGlobalToast } from './contexto/ToastContext';
import { RotaPrivada } from './componentes/RotaPrivada';
import { FormularioLogin, FormularioRegistro } from './componentes/FormularioAutenticacao';
import { FormularioRecuperacaoSenha } from './componentes/FormularioRecuperacaoSenha';
import { ListaPessoas } from './componentes/ListaPessoas';
import Navbar from './componentes/Navbar';
import PaginaTokens from './pages/PaginaTokens';
import PaginaComunidades from './pages/PaginaComunidades';
import PaginaGerenciamentoComunidades from './pages/PaginaGerenciamentoComunidades';
import PaginaTransferencia from './pages/PaginaTransferencia';
import PaginaUsuarios from './pages/PaginaUsuarios';
import PaginaBeneficios from './pages/PaginaBeneficios';
import PaginaGuarauna from './pages/PaginaGuarauna';
import PaginaAlunosGuarauna from './pages/PaginaAlunosGuarauna';
import PaginaProfessoresGuarauna from './pages/PaginaProfessoresGuarauna';
import PaginaTurmasGuarauna from './pages/PaginaTurmasGuarauna';
import PaginaMatriculasGuarauna from './pages/PaginaMatriculasGuarauna';
import PaginaEventosGuarauna from './pages/PaginaEventosGuarauna';
import PaginaAceiteEvento from './pages/PaginaAceiteEvento';
import './index.css';

// Limpar cache ao iniciar
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      caches.delete(cacheName);
    });
  });
}

// Limpar localStorage se necessário
// localStorage.clear();

// Limpar sessionStorage
// sessionStorage.clear();

// Layout com Navbar
function LayoutComNavbar({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

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
            <LayoutComNavbar>
              <ListaPessoas />
            </LayoutComNavbar>
          </RotaPrivada>
        } 
      />
      <Route 
        path="/comunidades" 
        element={
          <RotaPrivada>
            <LayoutComNavbar>
              <PaginaComunidades />
            </LayoutComNavbar>
          </RotaPrivada>
        } 
      />
      <Route 
        path="/gerenciamento/comunidades" 
        element={
          <RotaPrivada>
            <LayoutComNavbar>
              <PaginaGerenciamentoComunidades />
            </LayoutComNavbar>
          </RotaPrivada>
        } 
      />
      <Route 
        path="/beneficios" 
        element={
          <RotaPrivada>
            <LayoutComNavbar>
              <PaginaBeneficios />
            </LayoutComNavbar>
          </RotaPrivada>
        } 
      />

      <Route 
        path="/transferencia" 
        element={
          <RotaPrivada>
            <LayoutComNavbar>
              <PaginaTransferencia />
            </LayoutComNavbar>
          </RotaPrivada>
        } 
      />
      <Route 
        path="/tokens" 
        element={
          <RotaPrivada>
            <LayoutComNavbar>
              <PaginaTokens />
            </LayoutComNavbar>
          </RotaPrivada>
        } 
      />
      <Route 
        path="/usuarios" 
        element={
          <RotaPrivada>
            <LayoutComNavbar>
              <PaginaUsuarios />
            </LayoutComNavbar>
          </RotaPrivada>
        } 
      />

      <Route 
        path="/guarauna" 
        element={
          <RotaPrivada>
            <PaginaGuarauna />
          </RotaPrivada>
        } 
      />

      <Route 
        path="/guarauna/alunos" 
        element={
          <RotaPrivada>
            <PaginaAlunosGuarauna />
          </RotaPrivada>
        } 
      />

      <Route 
        path="/guarauna/professores" 
        element={
          <RotaPrivada>
            <PaginaProfessoresGuarauna />
          </RotaPrivada>
        } 
      />

      <Route 
        path="/guarauna/turmas" 
        element={
          <RotaPrivada>
            <PaginaTurmasGuarauna />
          </RotaPrivada>
        } 
      />

      <Route 
        path="/guarauna/matriculas" 
        element={
          <RotaPrivada>
            <PaginaMatriculasGuarauna />
          </RotaPrivada>
        } 
      />

      <Route 
        path="/guarauna/eventos" 
        element={
          <RotaPrivada>
            <PaginaEventosGuarauna />
          </RotaPrivada>
        } 
      />

      {/* Rota pública para aceite de termos de eventos - não requer autenticação */}
      <Route 
        path="/aceite/evento/:codigo" 
        element={<PaginaAceiteEvento />} 
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function AppWrapper() {
  const { toasts, removerToast } = useGlobalToast();
  return (
    <>
      <App />
      <ToastContainer toasts={toasts} onClose={removerToast} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <PusherProvider>
            <AppWrapper />
          </PusherProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
