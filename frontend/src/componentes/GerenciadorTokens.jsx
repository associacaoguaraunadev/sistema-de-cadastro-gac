import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexto/AuthContext';
import { useToast } from '../hooks/useToast';
import { Copy, Trash2, Check, Loader, AlertCircle, X } from 'lucide-react';
import axios from 'axios';
import './GerenciadorTokens.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const GerenciadorTokens = ({ onFechar }) => {
  const [email, setEmail] = useState('');
  const [tokens, setTokens] = useState({ pendentes: [], usados: [] });
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [copiados, setCopiados] = useState({});
  const [dialogRevogar, setDialogRevogar] = useState({ aberto: false, tokenId: null });
  const { token } = useAuth();
  const { sucesso, erro: erroToast, aviso } = useToast();

  useEffect(() => {
    carregarTokens();
  }, []);

  const carregarTokens = async () => {
    try {
      setCarregando(true);
      const response = await axios.get(`${API_URL}/autenticacao/token/listar`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setTokens(response.data);
    } catch (erro) {
      console.error('❌ Erro ao carregar tokens:', erro);
      const mensagem = erro.response?.data?.erro || 'Não foi possível carregar os tokens';
      erroToast(mensagem);
    } finally {
      setCarregando(false);
    }
  };

  const gerarToken = async () => {
    if (!email) {
      aviso('Por favor, digite um email');
      return;
    }

    try {
      setGerando(true);
      console.log('🔑 Gerando token para:', email);
      
      const response = await axios.post(`${API_URL}/autenticacao/token/gerar`, 
        { email },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Token gerado:', response.data);
      sucesso('✅ Token gerado com sucesso!');
      setEmail('');
      await carregarTokens();
    } catch (erro) {
      console.error('❌ Erro ao gerar token:', erro);
      let mensagem = 'Erro ao gerar token';
      
      if (erro.response?.status === 409) {
        mensagem = erro.response.data?.erro || 'Email já possui conta ou token pendente';
      } else if (erro.response?.status === 400) {
        mensagem = erro.response.data?.erro || 'Email inválido';
      } else if (erro.response?.status === 401) {
        mensagem = 'Você não tem permissão para gerar tokens';
      } else if (erro.response?.data?.erro) {
        mensagem = erro.response.data.erro;
      } else if (erro.code === 'ERR_NETWORK') {
        mensagem = 'Erro de conexão com o servidor';
      } else {
        mensagem = erro.message || 'Erro desconhecido ao gerar token';
      }
      
      erroToast(mensagem);
    } finally {
      setGerando(false);
    }
  };

  const copiarToken = (tokenStr, id) => {
    navigator.clipboard.writeText(tokenStr);
    setCopiados({ ...copiados, [id]: true });
    sucesso('Token copiado!');
    setTimeout(() => {
      setCopiados({ ...copiados, [id]: false });
    }, 2000);
  };

  const revogarToken = async (tokenId) => {
    setDialogRevogar({ aberto: true, tokenId });
  };

  const confirmarRevogar = async () => {
    if (!dialogRevogar.tokenId) return;

    try {
      await axios.delete(`${API_URL}/autenticacao/token/${dialogRevogar.tokenId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      sucesso('✅ Token revogado com sucesso!');
      await carregarTokens();
    } catch (erro) {
      console.error('❌ Erro ao revogar token:', erro);
      let mensagem = 'Erro ao revogar token';
      
      if (erro.response?.data?.erro) {
        mensagem = erro.response.data.erro;
      } else if (erro.code === 'ERR_NETWORK') {
        mensagem = 'Erro de conexão com o servidor';
      } else {
        mensagem = erro.message || 'Erro desconhecido';
      }
      
      erroToast(mensagem);
    } finally {
      setDialogRevogar({ aberto: false, tokenId: null });
    }
  };

  const cancelarRevogar = () => {
    setDialogRevogar({ aberto: false, tokenId: null });
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="gerenciador-tokens-overlay" onClick={onFechar}>
      <div className="gerenciador-tokens-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tokens-cabecalho">
          <h2>🔑 Gerar Tokens de Acesso</h2>
          <button className="botao-fechar" onClick={onFechar}>
            <X size={18} />
          </button>
        </div>

        <div className="tokens-conteudo">
          {/* SEÇÃO DE GERAÇÃO */}
          <div className="secao-geracao">
            <h3>Criar Novo Token</h3>
            <p className="descricao">
              Gere um token único para compartilhar com alguém que poderá gerar códigos de convite
            </p>

            <div className="form-token">
              <input
                type="email"
                placeholder="E-mail do funcionário (Ex: murilogac@gmail.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && gerarToken()}
              />
              <button 
                onClick={gerarToken} 
                disabled={gerando || !email}
                className="botao-gerar"
              >
                {gerando ? <Loader size={18} className="spin" /> : '+'}
                {gerando ? 'Gerando...' : 'Gerar Token'}
              </button>
            </div>
          </div>

          {/* SEÇÃO DE TOKENS PENDENTES */}
          <div className="secao-tokens">
            <h3>
              📋 Tokens Pendentes ({tokens.pendentes?.length || 0})
            </h3>

            {carregando ? (
              <div className="carregando">Carregando...</div>
            ) : tokens.pendentes?.length === 0 ? (
              <p className="vazio">Nenhum token pendente</p>
            ) : (
              <div className="lista-tokens">
                {tokens.pendentes.map((t) => (
                  <div key={t.id} className="card-token pendente">
                    <div className="token-info">
                      <p className="email-token">{t.email}</p>
                      <p className="data-criacao">
                        Criado: {formatarData(t.dataCriacao)}
                      </p>
                      <p className="data-expiracao">
                        Expira: {formatarData(t.dataExpiracao)}
                      </p>
                    </div>

                    <div className="token-valor">
                      <code>{t.token}</code>
                      <button
                        className="botao-copiar"
                        onClick={() => copiarToken(t.token, t.id)}
                        title="Copiar token"
                      >
                        {copiados[t.id] ? (
                          <Check size={18} className="sucesso" />
                        ) : (
                          <Copy size={18} />
                        )}
                      </button>
                    </div>

                    <button
                      className="botao-revogar"
                      onClick={() => revogarToken(t.id)}
                      title="Revogar token"
                    >
                      <Trash2 size={16} /> Revogar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEÇÃO DE TOKENS USADOS */}
          {tokens.usados?.length > 0 && (
            <div className="secao-tokens">
              <h3>✅ Tokens Usados ({tokens.usados.length})</h3>
              <div className="lista-tokens">
                {tokens.usados.map((t) => (
                  <div key={t.id} className="card-token usado">
                    <div className="token-info">
                      <p className="email-token">{t.email}</p>
                      <p className="data-criacao">
                        Criado: {formatarData(t.dataCriacao)}
                      </p>
                      <p className="data-uso">
                        Usado por: <strong>{t.usadoPor}</strong>
                      </p>
                      <p className="data-uso">
                        em {formatarData(t.usadoEm)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* INSTRUÇÕES */}
        <div className="tokens-instrucoes">
          <h4>📖 Como funciona:</h4>
          <ol>
            <li>Gere um token colocando o email do funcionário do GAC.</li>
            <li>Copie o token (clique no ícone de cópia).</li>
            <li>Compartilhe o token com o funcionário.</li>
            <li>O funcionário entra na <code>página de registrar</code> e cola o token.</li>
            <li>Após colar o token basta finalizar o cadastro.</li>
          </ol>
        </div>

        {/* DIALOG DE CONFIRMAÇÃO PARA REVOGAR */}
        {dialogRevogar.aberto && (
          <div className="dialog-overlay">
            <div className="dialog-revogar">
              <div className="dialog-header">
                <AlertCircle size={24} className="icone-alerta" />
                <h3>Confirmar Revogação</h3>
                <button className="dialog-fechar" onClick={cancelarRevogar}>
                  <X size={20} />
                </button>
              </div>

              <div className="dialog-body">
                <p>Tem certeza que deseja revogar este token?</p>
                <p className="aviso">Esta ação não pode ser desfeita.</p>
              </div>

              <div className="dialog-footer">
                <button className="botao-cancelar" onClick={cancelarRevogar}>
                  Cancelar
                </button>
                <button className="botao-confirmar" onClick={confirmarRevogar}>
                  Revogar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
