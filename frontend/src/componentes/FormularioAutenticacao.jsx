import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './Toast';
import './FormularioAutenticacao.css';

export const FormularioLogin = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  
  const { entrar } = useAuth();
  const navegar = useNavigate();
  const { toasts, removerToast, sucesso: sucessoToast, erro: erroToast } = useToast();

  const aoEnviar = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await entrar(email, senha);
      sucessoToast('Bem-vindo!', 'Login realizado com sucesso');
      setTimeout(() => {
        navegar('/');
      }, 500);
    } catch (erro) {
      setErro(erro.message);
      erroToast('Erro no Login', erro.message);
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
                {mostrarSenha ? 'Ocultar' : 'Mostrar'}
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

          <div className="link-recuperacao">
            <Link to="/recuperar-senha">Esqueci minha senha</Link>
          </div>

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
  const [codigoConvite, setCodigoConvite] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [codigoValidado, setCodigoValidado] = useState(false);
  
  const { registrar } = useAuth();
  const navegar = useNavigate();
  const { toasts: toastsReg, removerToast: removerToastReg, sucesso: sucessoToastReg, erro: erroToastReg, aviso: avisoReg } = useToast();

  const validarCodigo = async () => {
    setErro('');
    setCarregando(true);

    try {
      // Detectar qual tipo de código foi fornecido
      const ehToken = codigoConvite.startsWith('GAC-GEN-') || codigoConvite.startsWith('GAC-TOKEN-');
      const endpoint = ehToken 
        ? 'http://localhost:3001/api/autenticacao/token/validar'
        : 'http://localhost:3001/api/autenticacao/convite/validar';

      const resposta = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: codigoConvite, codigo: codigoConvite })
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro || 'Código inválido');
        setCodigoValidado(false);
        erroToastReg('Código Inválido', dados.erro || 'Código inválido ou expirado');
        return;
      }

      setEmail(dados.email);
      setCodigoValidado(true);
      setErro('');
      sucessoToastReg('Código Validado!', 'Complete seu cadastro abaixo');
    } catch (erro) {
      setErro('Erro ao validar código: ' + erro.message);
      setCodigoValidado(false);
      erroToastReg('Erro ao Validar', 'Erro ao validar código: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  };

  const aoEnviar = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await registrar(email, senha, nome, codigoConvite);
      sucessoToastReg('Conta Criada!', 'Bem-vindo ao sistema');
      setTimeout(() => {
        navegar('/');
      }, 500);
    } catch (erro) {
      setErro(erro.message);
      erroToastReg('Erro no Registro', erro.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="container-autenticacao">
      <ToastContainer toasts={toastsReg} onClose={removerToastReg} />
      <div className="card-autenticacao">
        <div className="logo-gac">
          <div className="marca-gac">GAC</div>
          <p className="subtitulo-gac">Associação Guaraúna de Arte e Cultura</p>
        </div>

        <form onSubmit={aoEnviar} className="formulario">
          <h2>Criar Nova Conta</h2>
          
          {erro && <div className="alerta-erro">{erro}</div>}

          {!codigoValidado && (
            <div className="grupo-entrada">
              <label htmlFor="codigoConvite">Código de Convite</label>
              <div className="container-codigo-convite">
                <input
                  id="codigoConvite"
                  type="text"
                  value={codigoConvite}
                  onChange={(e) => setCodigoConvite(e.target.value)}
                  placeholder="Cole o código que recebeu"
                  required
                  disabled={carregando}
                />
                <button
                  type="button"
                  className="botao-validar-codigo"
                  onClick={validarCodigo}
                  disabled={carregando || !codigoConvite}
                >
                  Validar
                </button>
              </div>
              <p className="texto-ajuda">Você recebeu um código por email. Cole acima para continuar.</p>
            </div>
          )}

          {codigoValidado && (
            <>
              <div className="alerta-sucesso">Código validado! Complete seu cadastro abaixo.</div>

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
                  disabled
                  className="input-desabilitado"
                />
                <p className="texto-ajuda">Email do convite (não pode ser alterado)</p>
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
                    {mostrarSenha ? 'Ocultar' : 'Mostrar'}
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
            </>
          )}

          {codigoValidado && (
            <p className="texto-rodape">
              Já tem conta? <Link to="/entrar">Entre aqui</Link>
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
