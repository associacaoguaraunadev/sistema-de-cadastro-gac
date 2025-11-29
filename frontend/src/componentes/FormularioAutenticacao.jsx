import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import './FormularioAutenticacao.css';

export const FormularioLogin = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  
  const { entrar } = useAuth();
  const navegar = useNavigate();

  const aoEnviar = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await entrar(email, senha);
      navegar('/');
    } catch (erro) {
      setErro(erro.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="container-autenticacao">
      <div className="card-autenticacao">
        <div className="logo-gac">
          <div className="marca-gac">GAC</div>
          <p className="subtitulo-gac">Associação Guaraúna de Arte e Cultura</p>
        </div>

        <form onSubmit={aoEnviar} className="formulario">
          <h2>Sistema de Cadastro</h2>
          
          {erro && <div className="alerta-erro">{erro}</div>}

          <div className="grupo-entrada">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={carregando}
            />
          </div>

          <div className="grupo-entrada">
            <label htmlFor="senha">Senha</label>
            <div className="container-senha">
              <input
                id="senha"
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha"
                required
                disabled={carregando}
              />
              <button
                type="button"
                className="botao-toggle-senha"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                disabled={carregando}
                title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="botao-primario"
            disabled={carregando}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="texto-rodape">
            Não tem conta? <Link to="/registrar">Registre-se aqui</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export const FormularioRegistro = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  
  const { registrar } = useAuth();
  const navegar = useNavigate();

  const aoEnviar = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await registrar(email, senha, nome);
      navegar('/');
    } catch (erro) {
      setErro(erro.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="container-autenticacao">
      <div className="card-autenticacao">
        <div className="logo-gac">
          <div className="marca-gac">GAC</div>
          <p className="subtitulo-gac">Associação Guaraúna de Arte e Cultura</p>
        </div>

        <form onSubmit={aoEnviar} className="formulario">
          <h2>Criar Nova Conta</h2>
          
          {erro && <div className="alerta-erro">{erro}</div>}

          <div className="grupo-entrada">
            <label htmlFor="nome">Nome Completo</label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              required
              disabled={carregando}
            />
          </div>

          <div className="grupo-entrada">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={carregando}
            />
          </div>

          <div className="grupo-entrada">
            <label htmlFor="senha">Senha</label>
            <div className="container-senha">
              <input
                id="senha"
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                disabled={carregando}
              />
              <button
                type="button"
                className="botao-toggle-senha"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                disabled={carregando}
                title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="botao-primario"
            disabled={carregando}
          >
            {carregando ? 'Registrando...' : 'Criar Conta'}
          </button>

          <p className="texto-rodape">
            Já tem conta? <Link to="/entrar">Entre aqui</Link>
          </p>
        </form>
      </div>
    </div>
  );
};
