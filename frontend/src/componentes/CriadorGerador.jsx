import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import './CriadorGerador.css';

const formatarCPF = (cpf) => {
  return cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const CriadorGerador = () => {
  const [etapa, setEtapa] = useState('token'); // 'token' ou 'dados'
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [validacoes, setValidacoes] = useState({});

  const navegar = useNavigate();
  const { sucesso, erro: erroToast, aviso } = useToast();
  const inputTokenRef = useRef(null);

  const validarSenha = (s) => {
    const erros = [];
    if (s.length < 8) erros.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(s)) erros.push('Pelo menos uma letra maiúscula');
    if (!/[a-z]/.test(s)) erros.push('Pelo menos uma letra minúscula');
    if (!/[0-9]/.test(s)) erros.push('Pelo menos um número');
    if (!/[!@#$%^&*]/.test(s)) erros.push('Pelo menos um caractere especial (!@#$%^&*)');
    return erros;
  };

  const validarToken = async () => {
    if (!token.trim()) {
      aviso('Cole o token que você recebeu');
      return;
    }

    try {
      setCarregando(true);
      const response = await fetch('http://localhost:3001/api/autenticacao/token/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const dados = await response.json();

      if (!response.ok) {
        erroToast(dados.erro || 'Token inválido');
        return;
      }

      setEmail(dados.email);
      sucesso('Token validado! Crie sua conta');
      setEtapa('dados');
    } catch (erro) {
      erroToast('Erro ao validar token: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  };

  const criarGerador = async (e) => {
    e.preventDefault();

    // Validar campos
    if (!nome.trim()) {
      aviso('Digite seu nome');
      return;
    }

    const errosSenha = validarSenha(senha);
    if (errosSenha.length > 0) {
      setValidacoes({ senha: errosSenha });
      return;
    }

    try {
      setCarregando(true);
      const response = await fetch('http://localhost:3001/api/autenticacao/token/usar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, senha, nome })
      });

      const dados = await response.json();

      if (!response.ok) {
        if (dados.erros) {
          setValidacoes({ senha: dados.erros });
        } else {
          erroToast(dados.erro || 'Erro ao criar conta');
        }
        return;
      }

      sucesso('Conta criada com sucesso!');
      
      // Salvar dados no localStorage
      localStorage.setItem('token', dados.token);
      localStorage.setItem('usuario', JSON.stringify(dados.usuario));

      // Redirecionar para página de geração de convites
      setTimeout(() => {
        navegar('/gerar-convites');
      }, 1500);
    } catch (erro) {
      erroToast('Erro ao criar conta: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="criador-gerador-container">
      <div className="criador-gerador-card">
        {/* ETAPA 1: VALIDAR TOKEN */}
        {etapa === 'token' && (
          <div className="etapa-token">
            <div className="criador-cabecalho">
              <h1>🔑 Criar Gerador de Convites</h1>
              <p>Você receberá um token do administrador. Cole aqui para criar sua conta.</p>
            </div>

            <div className="criador-form">
              <div className="grupo-input">
                <label htmlFor="token">Token de Acesso</label>
                <input
                  ref={inputTokenRef}
                  id="token"
                  type="text"
                  placeholder="Cole o token que você recebeu (ex: GAC-TOKEN-...)"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && validarToken()}
                  disabled={carregando}
                  className="input-grande"
                />
                <p className="texto-ajuda">
                  Você pode copiar o token do email ou mensagem e colar aqui
                </p>
              </div>

              <button
                onClick={validarToken}
                disabled={carregando || !token.trim()}
                className="botao-validar"
              >
                {carregando ? '⏳ Validando...' : '✓ Validar Token'}
              </button>

              <div className="info-token">
                <AlertCircle size={20} />
                <div>
                  <h4>O que é um token?</h4>
                  <p>
                    Um token é um código único que o administrador gera para você. 
                    Cada token pode ser usado apenas uma vez e expira em 7 dias.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 2: CRIAR CONTA */}
        {etapa === 'dados' && (
          <div className="etapa-dados">
            <div className="criador-cabecalho">
              <h1>👤 Criar sua Conta</h1>
              <p>Preencha os dados abaixo para criar sua conta de gerador</p>
            </div>

            <form onSubmit={criarGerador} className="criador-form">
              <div className="grupo-input">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="input-desabilitado"
                />
                <p className="texto-ajuda">
                  ℹ️ Email confirmado pelo token
                </p>
              </div>

              <div className="grupo-input">
                <label htmlFor="nome">Seu Nome *</label>
                <input
                  id="nome"
                  type="text"
                  placeholder="Ex: João Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={carregando}
                  className="input-grande"
                />
              </div>

              <div className="grupo-input">
                <label htmlFor="senha">Senha *</label>
                <div className="input-com-toggle">
                  <input
                    id="senha"
                    type={senhaVisivel ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres com maiúscula, número e símbolo"
                    value={senha}
                    onChange={(e) => {
                      setSenha(e.target.value);
                      setValidacoes({ ...validacoes, senha: validarSenha(e.target.value) });
                    }}
                    disabled={carregando}
                    className={`input-grande ${validacoes.senha?.length > 0 ? 'com-erro' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setSenhaVisivel(!senhaVisivel)}
                    className="botao-toggle"
                  >
                    {senhaVisivel ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {validacoes.senha && validacoes.senha.length > 0 && (
                  <div className="validacao-erros">
                    {validacoes.senha.map((erro, i) => (
                      <div key={i} className="erro-item">
                        <span className="icone">✗</span>
                        {erro}
                      </div>
                    ))}
                  </div>
                )}

                {senha && validacoes.senha?.length === 0 && (
                  <div className="validacao-sucesso">
                    <span className="icone">✓</span>
                    Senha forte!
                  </div>
                )}
              </div>

              <div className="info-criador">
                <CheckCircle size={20} />
                <div>
                  <h4>Você será um Gerador de Convites</h4>
                  <p>
                    Após criar sua conta, você poderá gerar códigos de convite 
                    para que novos usuários se registrem no sistema.
                  </p>
                </div>
              </div>

              <div className="botoes-forma">
                <button
                  type="button"
                  onClick={() => {
                    setEtapa('token');
                    setToken('');
                    setEmail('');
                  }}
                  className="botao-voltar"
                  disabled={carregando}
                >
                  ← Voltar
                </button>

                <button
                  type="submit"
                  disabled={carregando || !nome.trim() || validacoes.senha?.length > 0}
                  className="botao-criar"
                >
                  {carregando ? '⏳ Criando...' : '✓ Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
