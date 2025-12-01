import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './Toast';
import './FormularioAutenticacao.css';

export const FormularioRecuperacaoSenha = () => {
  const [etapa, setEtapa] = useState('email'); // email | codigo | novaSenha
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  
  const navegar = useNavigate();
  const { toasts, removerToast, sucesso: sucessoToast, erro: erroToast } = useToast();

  const solicitarRecuperacao = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const resposta = await fetch('http://localhost:3001/api/autenticacao/recuperacao-senha/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro || 'Erro ao solicitar recuperação');
        erroToast('Erro', dados.erro || 'Erro ao solicitar recuperação de senha');
        return;
      }

      sucessoToast('Email Enviado!', `Um link de recuperação foi enviado para ${email}`);
      setEtapa('codigo');
    } catch (erro) {
      setErro('Erro: ' + erro.message);
      erroToast('Erro de Conexão', 'Erro ao conectar com o servidor');
    } finally {
      setCarregando(false);
    }
  };

  const validarToken = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const resposta = await fetch('http://localhost:3001/api/autenticacao/recuperacao-senha/validar-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token })
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro || 'Código inválido ou expirado');
        erroToast('Código Inválido', dados.erro || 'Código inválido ou expirado');
        return;
      }

      sucessoToast('Código Válido!', 'Agora defina sua nova senha');
      setEtapa('novaSenha');
    } catch (erro) {
      setErro('Erro: ' + erro.message);
      erroToast('Erro de Conexão', 'Erro ao validar código');
    } finally {
      setCarregando(false);
    }
  };

  const redefinirSenha = async (e) => {
    e.preventDefault();
    setErro('');

    if (novaSenha.length < 8) {
      setErro('Senha deve ter no mínimo 8 caracteres');
      erroToast('Senha Fraca', 'Mínimo 8 caracteres');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não correspondem');
      erroToast('Senhas Diferentes', 'As senhas digitadas não correspondem');
      return;
    }

    setCarregando(true);

    try {
      const resposta = await fetch('http://localhost:3001/api/autenticacao/recuperacao-senha/redefinir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, novaSenha })
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro || 'Erro ao redefinir senha');
        erroToast('Erro', dados.erro || 'Erro ao redefinir senha');
        return;
      }

      sucessoToast('Sucesso!', 'Sua senha foi alterada com sucesso');
      setTimeout(() => {
        navegar('/entrar');
      }, 2000);
    } catch (erro) {
      setErro('Erro: ' + erro.message);
      erroToast('Erro de Conexão', 'Erro ao redefinir senha');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="container-autenticacao">
      <ToastContainer toasts={toasts} onClose={removerToast} />
      <div className="card-autenticacao">
        <div className="logo-gac">
          <div className="marca-gac">GAC</div>
          <p className="subtitulo-gac">Associação Guaraúna de Arte e Cultura</p>
        </div>

        {etapa === 'email' && (
          <form onSubmit={solicitarRecuperacao} className="formulario">
            <h2>Recuperar Senha</h2>
            <p className="texto-instrucao">Digite seu email para receber um código de recuperação</p>
            
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

            <button 
              type="submit" 
              className="botao-primario"
              disabled={carregando}
            >
              {carregando ? 'Enviando...' : 'Enviar Código'}
            </button>

            <p className="texto-rodape">
              Lembrou sua senha? <Link to="/entrar">Entre aqui</Link>
            </p>
          </form>
        )}

        {etapa === 'codigo' && (
          <form onSubmit={validarToken} className="formulario">
            <h2>Código de Recuperação</h2>
            <p className="texto-instrucao">Digite o código que foi enviado para {email}</p>
            
            {erro && <div className="alerta-erro">{erro}</div>}

            <div className="grupo-entrada">
              <label htmlFor="token">Código</label>
              <input
                id="token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                placeholder="ABC123XYZ"
                required
                disabled={carregando}
                maxLength="10"
              />
              <p className="texto-ajuda">Código de 10 caracteres enviado por email</p>
            </div>

            <button 
              type="submit" 
              className="botao-primario"
              disabled={carregando}
            >
              {carregando ? 'Validando...' : 'Validar Código'}
            </button>

            <p className="texto-rodape">
              <button 
                type="button" 
                className="botao-link"
                onClick={() => { setEtapa('email'); setToken(''); }}
              >
                Usar outro email
              </button>
            </p>
          </form>
        )}

        {etapa === 'novaSenha' && (
          <form onSubmit={redefinirSenha} className="formulario">
            <h2>Nova Senha</h2>
            <p className="texto-instrucao">Defina uma nova senha para sua conta</p>
            
            {erro && <div className="alerta-erro">{erro}</div>}

            <div className="grupo-entrada">
              <label htmlFor="novaSenha">Nova Senha</label>
              <div className="container-senha">
                <input
                  id="novaSenha"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
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
                  {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <div className="grupo-entrada">
              <label htmlFor="confirmarSenha">Confirmar Senha</label>
              <div className="container-senha">
                <input
                  id="confirmarSenha"
                  type={mostrarConfirmar ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Digite a senha novamente"
                  required
                  disabled={carregando}
                />
                <button
                  type="button"
                  className="botao-toggle-senha"
                  onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                  disabled={carregando}
                  title={mostrarConfirmar ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarConfirmar ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="botao-primario"
              disabled={carregando}
            >
              {carregando ? 'Redefinindo...' : 'Redefinir Senha'}
            </button>

            <p className="texto-rodape">
              <Link to="/entrar">Voltar ao Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
