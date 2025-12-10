import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { 
  Home, 
  Users,
  Settings, 
  Key,
  MapPin,
  Gift,
  LogOut, 
  Menu, 
  X,
  Sprout,
  ArrowRightLeft,
  BarChart3,
  ChevronDown
} from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [gerenciamentoAberto, setGerenciamentoAberto] = useState(false);
  const gerenciamentoRef = useRef(null);
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

  const toggleGerenciamento = () => {
    setGerenciamentoAberto(!gerenciamentoAberto);
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (gerenciamentoRef.current && !gerenciamentoRef.current.contains(event.target)) {
        setGerenciamentoAberto(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fechar menu mobile ao redimensionar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMenuMobileAberto(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (caminho) => location.pathname === caminho;
  const isGerenciamentoActive = () => 
    location.pathname.startsWith('/gerenciamento') || 
    isActive('/beneficios') || 
    isActive('/tokens') || 
    isActive('/usuarios') ||
    isActive('/transferencia') ||
    isActive('/guarauna/metricas');

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo e Título */}
        <div className="navbar-marca" onClick={() => navegarPara('/')}>
          <div className="navbar-logo">GAC</div>
          <span className="navbar-titulo">Sistema de administração</span>
        </div>

        {/* Menu Desktop Central */}
        <div className="navbar-menu-central">
          <button 
            className={`navbar-item ${isActive('/') ? 'active' : ''}`}
            onClick={() => navegarPara('/')}
          >
            <Home size={18} />
            <span>Pessoas</span>
          </button>

          {usuario?.funcao === 'admin' && (
            <button 
              className={`navbar-item ${location.pathname.startsWith('/guarauna') && !isActive('/guarauna/metricas') ? 'active' : ''}`}
              onClick={() => navegarPara('/guarauna')}
            >
              <Sprout size={18} />
              <span>Guaraúna</span>
            </button>
          )}

          {usuario?.funcao === 'admin' && (
            <div className="gerenciamento-wrapper" ref={gerenciamentoRef}>
              <button 
                className={`navbar-item ${isGerenciamentoActive() ? 'active' : ''}`}
                onClick={toggleGerenciamento}
              >
                <Settings size={18} />
                <span>Gerenciamento</span>
                <ChevronDown size={14} className={`chevron-icon ${gerenciamentoAberto ? 'rotated' : ''}`} />
              </button>

              {gerenciamentoAberto && (
                <div className="gerenciamento-dropdown">
                  <div className="dropdown-section">
                    <span className="dropdown-section-title">Ferramentas</span>
                    <button 
                      className={`dropdown-item ${isActive('/transferencia') ? 'active' : ''}`}
                      onClick={() => navegarPara('/transferencia')}
                    >
                      <ArrowRightLeft size={16} />
                      <span>Transferência</span>
                    </button>
                    <button 
                      className={`dropdown-item ${isActive('/guarauna/metricas') ? 'active' : ''}`}
                      onClick={() => navegarPara('/guarauna/metricas')}
                    >
                      <BarChart3 size={16} />
                      <span>Métricas</span>
                    </button>
                  </div>
                  
                  <div className="dropdown-divider"></div>
                  
                  <div className="dropdown-section">
                    <span className="dropdown-section-title">Configurações</span>
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
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ações do lado direito */}
        <div className="navbar-acoes">
          {/* Nome do usuário (desktop) */}
          <span className="usuario-nome">{usuario?.nome}</span>

          {/* Botão Sair */}
          <button className="botao-sair" onClick={handleSair} title="Sair">
            <LogOut size={18} />
          </button>

          {/* Botão Mobile */}
          <button 
            className="navbar-mobile-toggle"
            onClick={() => setMenuMobileAberto(!menuMobileAberto)}
          >
            {menuMobileAberto ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
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
              className={`mobile-item ${location.pathname.startsWith('/guarauna') && !isActive('/guarauna/metricas') ? 'active' : ''}`}
              onClick={() => navegarPara('/guarauna')}
            >
              <Sprout size={18} />
              <span>Guaraúna</span>
            </button>
          )}

          {usuario?.funcao === 'admin' && (
            <button 
              className={`mobile-item ${isGerenciamentoActive() ? 'active' : ''}`}
              onClick={toggleGerenciamento}
            >
              <Settings size={18} />
              <span>Gerenciamento</span>
              <ChevronDown size={14} className={`chevron-icon ${gerenciamentoAberto ? 'rotated' : ''}`} />
            </button>
          )}

          {usuario?.funcao === 'admin' && gerenciamentoAberto && (
            <>
              <div className="mobile-section">Ferramentas</div>
              <button 
                className={`mobile-item indent ${isActive('/transferencia') ? 'active' : ''}`}
                onClick={() => navegarPara('/transferencia')}
              >
                <ArrowRightLeft size={18} />
                <span>Transferência</span>
              </button>
              <button 
                className={`mobile-item indent ${isActive('/guarauna/metricas') ? 'active' : ''}`}
                onClick={() => navegarPara('/guarauna/metricas')}
              >
                <BarChart3 size={18} />
                <span>Métricas</span>
              </button>
              
              <div className="mobile-section">Configurações</div>
              <button 
                className={`mobile-item indent ${isActive('/gerenciamento/comunidades') ? 'active' : ''}`}
                onClick={() => navegarPara('/gerenciamento/comunidades')}
              >
                <MapPin size={18} />
                <span>Comunidades</span>
              </button>
              <button 
                className={`mobile-item indent ${isActive('/beneficios') ? 'active' : ''}`}
                onClick={() => navegarPara('/beneficios')}
              >
                <Gift size={18} />
                <span>Benefícios</span>
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