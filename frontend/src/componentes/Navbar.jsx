import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { 
  Home, 
  Users, 
  Settings, 
  Key, 
  MapPin, 
  Gift,
  ChevronDown, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const [gerenciamentoAberto, setGerenciamentoAberto] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();
  const location = useLocation();

  const handleSair = () => {
    sair();
    navegar('/entrar');
  };

  const navegarPara = (caminho) => {
    navegar(caminho);
    setMenuMobileAberto(false);
    setGerenciamentoAberto(false);
  };

  const toggleGerenciamento = (e) => {
    e.stopPropagation();
    setGerenciamentoAberto(!gerenciamentoAberto);
  };

  // Fechar dropdowns ao clicar fora
  React.useEffect(() => {
    const handleClick = () => {
      setGerenciamentoAberto(false);
    };

    if (gerenciamentoAberto) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [gerenciamentoAberto]);

  const isActive = (caminho) => location.pathname === caminho;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo e Título */}
        <div className="navbar-marca">
          <div className="navbar-logo">GAC</div>
          <span className="navbar-titulo">Sistema de administração</span>
        </div>

        {/* Menu Desktop */}
        <div className="navbar-menu">
          <button 
            className={`navbar-item ${isActive('/') ? 'active' : ''}`}
            onClick={() => navegarPara('/')}
          >
            <Home size={18} />
            <span>Pessoas</span>
          </button>

          {usuario?.funcao === 'admin' && (
            <button 
              className={`navbar-item ${isActive('/transferencia') ? 'active' : ''}`}
              onClick={() => navegarPara('/transferencia')}
            >
              <Users size={18} />
              <span>Transferência</span>
            </button>
          )}

          {usuario?.funcao === 'admin' && (
            <div className="navbar-dropdown">
              <button 
                className={`navbar-item dropdown-trigger ${
                  isActive('/gerenciamento/comunidades') || isActive('/beneficios') || isActive('/tokens') || isActive('/usuarios') ? 'active' : ''
                }`}
                onClick={toggleGerenciamento}
              >
                <Settings size={18} />
                <span>Gerenciamento</span>
                <ChevronDown 
                  size={16} 
                  className={`chevron ${gerenciamentoAberto ? 'rotated' : ''}`}
                />
              </button>

              {gerenciamentoAberto && (
                <div className="dropdown-menu">
                  <button 
                    className={`dropdown-item ${isActive('/gerenciamento/comunidades') ? 'active' : ''}`}
                    onClick={() => navegarPara('/gerenciamento/comunidades')}
                  >
                    <MapPin size={16} />
                    <span>Comunidades</span>
                  </button>
                  <button 
                    className={`dropdown-item ${isActive('/beneficios') ? 'active' : ''}`}
                    onClick={() => navegarPara('/beneficios')}
                  >
                    <Gift size={16} />
                    <span>Benefícios</span>
                  </button>
                  <button 
                    className={`dropdown-item ${isActive('/tokens') ? 'active' : ''}`}
                    onClick={() => navegarPara('/tokens')}
                  >
                    <Key size={16} />
                    <span>Tokens</span>
                  </button>
                  <button 
                    className={`dropdown-item ${isActive('/usuarios') ? 'active' : ''}`}
                    onClick={() => navegarPara('/usuarios')}
                  >
                    <Users size={16} />
                    <span>Usuários</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info do Usuário */}
        <div className="navbar-usuario">
          <span className="usuario-nome">{usuario?.nome}</span>
          <button className="botao-sair" onClick={handleSair} title="Sair">
            <LogOut size={18} />
          </button>
        </div>

        {/* Botão Mobile */}
        <button 
          className="navbar-mobile-toggle"
          onClick={() => setMenuMobileAberto(!menuMobileAberto)}
        >
          {menuMobileAberto ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Menu Mobile */}
      {menuMobileAberto && (
        <div className="navbar-mobile-menu">
          <button 
            className={`mobile-item ${isActive('/') ? 'active' : ''}`}
            onClick={() => navegarPara('/')}
          >
            <Home size={18} />
            <span>Pessoas</span>
          </button>

          {usuario?.funcao === 'admin' && (
            <button 
              className={`mobile-item ${isActive('/transferencia') ? 'active' : ''}`}
              onClick={() => navegarPara('/transferencia')}
            >
              <Users size={18} />
              <span>Transferência</span>
            </button>
          )}

          {usuario?.funcao === 'admin' && (
            <>
              <div className="mobile-section">Gerenciamento</div>
              <button 
                className={`mobile-item indent ${isActive('/gerenciamento/comunidades') ? 'active' : ''}`}
                onClick={() => navegarPara('/gerenciamento/comunidades')}
              >
                <MapPin size={18} />
                <span>Comunidades</span>
              </button>
              <button 
                className={`mobile-item indent ${isActive('/tokens') ? 'active' : ''}`}
                onClick={() => navegarPara('/tokens')}
              >
                <Key size={18} />
                <span>Tokens</span>
              </button>
              <button 
                className={`mobile-item indent ${isActive('/usuarios') ? 'active' : ''}`}
                onClick={() => navegarPara('/usuarios')}
              >
                <Users size={18} />
                <span>Usuários</span>
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;