import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, AlertTriangle, Check, Save, Gift, Building2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './Toast';
import { useAuth } from '../contexto/AuthContext';
import './GerenciadorBeneficios.css';

const API_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api');

export const GerenciadorBeneficios = () => {
  const [beneficiosGAC, setBeneficiosGAC] = useState([]);
  const [beneficiosGoverno, setBeneficiosGoverno] = useState([]);
  const [novoBeneficioGAC, setNovoBeneficioGAC] = useState('');
  const [novoBeneficioGoverno, setNovoBeneficioGoverno] = useState('');
  const [editandoGAC, setEditandoGAC] = useState(null);
  const [editandoGoverno, setEditandoGoverno] = useState(null);
  const [nomeEditadoGAC, setNomeEditadoGAC] = useState('');
  const [nomeEditadoGoverno, setNomeEditadoGoverno] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [confirmandoExclusaoGAC, setConfirmandoExclusaoGAC] = useState(null);
  const [confirmandoExclusaoGoverno, setConfirmandoExclusaoGoverno] = useState(null);
  
  const { toasts, removerToast, sucesso, erro: erroToast } = useToast();
  const { token } = useAuth();

  useEffect(() => {
    carregarBeneficios();
  }, [token]);

  const carregarBeneficios = async () => {
    if (!token) return;
    
    try {
      setCarregando(true);
      
      // Carregar benefícios GAC
      const respostaGAC = await fetch(`${API_URL}/beneficios/gac`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dadosGAC = await respostaGAC.json();
      
      // Carregar benefícios Governo
      const respostaGoverno = await fetch(`${API_URL}/beneficios/governo`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dadosGoverno = await respostaGoverno.json();
      
      setBeneficiosGAC(dadosGAC.beneficios || []);
      setBeneficiosGoverno(dadosGoverno.beneficios || []);
    } catch (error) {
      console.error('Erro ao carregar benefícios:', error);
      erroToast('Erro ao Carregar', 'Não foi possível carregar os benefícios');
    } finally {
      setCarregando(false);
    }
  };

  // ==================== BENEFÍCIOS GAC ====================

  const adicionarBeneficioGAC = async () => {
    const tipo = novoBeneficioGAC.trim();
    if (!tipo) {
      erroToast('Campo obrigatório', 'Digite o nome do benefício GAC');
      return;
    }

    if (beneficiosGAC.includes(tipo)) {
      erroToast('Benefício já existe', `O benefício "${tipo}" já está cadastrado`);
      return;
    }

    try {
      setCarregando(true);
      const resposta = await fetch(`${API_URL}/beneficios/gac`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tipo })
      });

      if (!resposta.ok) {
        const erro = await resposta.json();
        throw new Error(erro.erro || 'Erro ao adicionar benefício');
      }

      sucesso('Benefício Adicionado', `"${tipo}" foi adicionado aos benefícios GAC`);
      setNovoBeneficioGAC('');
      await carregarBeneficios();
    } catch (error) {
      console.error('Erro ao adicionar benefício GAC:', error);
      erroToast('Erro ao Adicionar', error.message);
    } finally {
      setCarregando(false);
    }
  };

  const iniciarEdicaoGAC = (beneficio) => {
    setEditandoGAC(beneficio);
    setNomeEditadoGAC(beneficio);
  };

  const cancelarEdicaoGAC = () => {
    setEditandoGAC(null);
    setNomeEditadoGAC('');
  };

  const salvarEdicaoGAC = async () => {
    const novoNome = nomeEditadoGAC.trim();
    if (!novoNome) {
      erroToast('Campo obrigatório', 'Digite o novo nome do benefício');
      return;
    }

    if (novoNome === editandoGAC) {
      cancelarEdicaoGAC();
      return;
    }

    try {
      setCarregando(true);
      const resposta = await fetch(`${API_URL}/beneficios/gac/${encodeURIComponent(editandoGAC)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ novoTipo: novoNome })
      });

      if (!resposta.ok) {
        const erro = await resposta.json();
        throw new Error(erro.erro || 'Erro ao renomear benefício');
      }

      const dados = await resposta.json();
      sucesso('Benefício Renomeado', dados.mensagem || `"${editandoGAC}" → "${novoNome}"`);
      cancelarEdicaoGAC();
      await carregarBeneficios();
    } catch (error) {
      console.error('Erro ao renomear benefício GAC:', error);
      erroToast('Erro ao Renomear', error.message);
    } finally {
      setCarregando(false);
    }
  };

  const confirmarExclusaoGAC = (beneficio) => {
    setConfirmandoExclusaoGAC(beneficio);
  };

  const cancelarExclusaoGAC = () => {
    setConfirmandoExclusaoGAC(null);
  };

  const deletarBeneficioGAC = async () => {
    try {
      setCarregando(true);
      const resposta = await fetch(`${API_URL}/beneficios/gac/${encodeURIComponent(confirmandoExclusaoGAC)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || dados.mensagem || 'Erro ao deletar benefício');
      }

      sucesso('Benefício Removido', `"${confirmandoExclusaoGAC}" foi removido`);
      cancelarExclusaoGAC();
      await carregarBeneficios();
    } catch (error) {
      console.error('Erro ao deletar benefício GAC:', error);
      erroToast('Erro ao Deletar', error.message);
    } finally {
      setCarregando(false);
    }
  };

  // ==================== BENEFÍCIOS GOVERNO ====================

  const adicionarBeneficioGoverno = async () => {
    const nome = novoBeneficioGoverno.trim();
    if (!nome) {
      erroToast('Campo obrigatório', 'Digite o nome do benefício Governo');
      return;
    }

    if (beneficiosGoverno.includes(nome)) {
      erroToast('Benefício já existe', `O benefício "${nome}" já está cadastrado`);
      return;
    }

    try {
      setCarregando(true);
      const resposta = await fetch(`${API_URL}/beneficios/governo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nome })
      });

      if (!resposta.ok) {
        const erro = await resposta.json();
        throw new Error(erro.erro || 'Erro ao adicionar benefício');
      }

      sucesso('Benefício Adicionado', `"${nome}" foi adicionado aos benefícios Governo`);
      setNovoBeneficioGoverno('');
      await carregarBeneficios();
    } catch (error) {
      console.error('Erro ao adicionar benefício Governo:', error);
      erroToast('Erro ao Adicionar', error.message);
    } finally {
      setCarregando(false);
    }
  };

  const iniciarEdicaoGoverno = (beneficio) => {
    setEditandoGoverno(beneficio);
    setNomeEditadoGoverno(beneficio);
  };

  const cancelarEdicaoGoverno = () => {
    setEditandoGoverno(null);
    setNomeEditadoGoverno('');
  };

  const salvarEdicaoGoverno = async () => {
    const novoNome = nomeEditadoGoverno.trim();
    if (!novoNome) {
      erroToast('Campo obrigatório', 'Digite o novo nome do benefício');
      return;
    }

    if (novoNome === editandoGoverno) {
      cancelarEdicaoGoverno();
      return;
    }

    try {
      setCarregando(true);
      const resposta = await fetch(`${API_URL}/beneficios/governo/${encodeURIComponent(editandoGoverno)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ novoNome })
      });

      if (!resposta.ok) {
        const erro = await resposta.json();
        throw new Error(erro.erro || 'Erro ao renomear benefício');
      }

      const dados = await resposta.json();
      sucesso('Benefício Renomeado', dados.mensagem || `"${editandoGoverno}" → "${novoNome}"`);
      cancelarEdicaoGoverno();
      await carregarBeneficios();
    } catch (error) {
      console.error('Erro ao renomear benefício Governo:', error);
      erroToast('Erro ao Renomear', error.message);
    } finally {
      setCarregando(false);
    }
  };

  const confirmarExclusaoGoverno = (beneficio) => {
    setConfirmandoExclusaoGoverno(beneficio);
  };

  const cancelarExclusaoGoverno = () => {
    setConfirmandoExclusaoGoverno(null);
  };

  const deletarBeneficioGoverno = async () => {
    try {
      setCarregando(true);
      const resposta = await fetch(`${API_URL}/beneficios/governo/${encodeURIComponent(confirmandoExclusaoGoverno)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || dados.mensagem || 'Erro ao deletar benefício');
      }

      sucesso('Benefício Removido', `"${confirmandoExclusaoGoverno}" foi removido`);
      cancelarExclusaoGoverno();
      await carregarBeneficios();
    } catch (error) {
      console.error('Erro ao deletar benefício Governo:', error);
      erroToast('Erro ao Deletar', error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="gerenciador-beneficios">
      <ToastContainer toasts={toasts} onClose={removerToast} />

      <div className="header-gerenciador">
        <h2>Gerenciamento de Benefícios</h2>
        <p className="subtitulo">Gerencie os benefícios GAC e Governo cadastrados no sistema</p>
      </div>

      {/* SEÇÃO BENEFÍCIOS GAC */}
      <div className="secao-beneficios secao-gac">
        <div className="secao-header">
          <Gift size={24} />
          <h3>Benefícios GAC</h3>
          <span className="contador-beneficios">{beneficiosGAC.length} cadastrado(s)</span>
        </div>

        <div className="adicionar-beneficio">
          <input
            type="text"
            placeholder="Digite o nome do novo benefício GAC..."
            value={novoBeneficioGAC}
            onChange={(e) => setNovoBeneficioGAC(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && adicionarBeneficioGAC()}
            disabled={carregando}
            className="input-beneficio"
          />
          <button
            onClick={adicionarBeneficioGAC}
            disabled={carregando || !novoBeneficioGAC.trim()}
            className="botao-adicionar botao-gac"
          >
            <Plus size={18} />
            Adicionar
          </button>
        </div>

        <div className="lista-beneficios">
          {carregando && beneficiosGAC.length === 0 ? (
            <p className="carregando">Carregando benefícios GAC...</p>
          ) : beneficiosGAC.length === 0 ? (
            <p className="vazio">Nenhum benefício GAC cadastrado ainda</p>
          ) : (
            <ul className="lista-items">
              {beneficiosGAC.map((beneficio) => (
                <li key={beneficio} className="item-beneficio">
                  {editandoGAC === beneficio ? (
                    <>
                      <input
                        type="text"
                        value={nomeEditadoGAC}
                        onChange={(e) => setNomeEditadoGAC(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && salvarEdicaoGAC()}
                        autoFocus
                        className="input-edicao"
                        disabled={carregando}
                      />
                      <div className="acoes-edicao">
                        <button
                          onClick={salvarEdicaoGAC}
                          disabled={carregando}
                          className="botao-salvar"
                          title="Salvar"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={cancelarEdicaoGAC}
                          disabled={carregando}
                          className="botao-cancelar"
                          title="Cancelar"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </>
                  ) : confirmandoExclusaoGAC === beneficio ? (
                    <>
                      <span className="texto-confirmacao">
                        <AlertTriangle size={16} />
                        Confirmar exclusão de "{beneficio}"?
                      </span>
                      <div className="acoes-confirmacao">
                        <button
                          onClick={deletarBeneficioGAC}
                          disabled={carregando}
                          className="botao-confirmar-deletar"
                        >
                          <Check size={16} />
                          Sim
                        </button>
                        <button
                          onClick={cancelarExclusaoGAC}
                          disabled={carregando}
                          className="botao-cancelar"
                        >
                          <X size={16} />
                          Não
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="nome-beneficio">{beneficio}</span>
                      <div className="acoes-item">
                        <button
                          onClick={() => iniciarEdicaoGAC(beneficio)}
                          disabled={carregando}
                          className="botao-editar"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => confirmarExclusaoGAC(beneficio)}
                          disabled={carregando}
                          className="botao-deletar"
                          title="Deletar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* SEÇÃO BENEFÍCIOS GOVERNO */}
      <div className="secao-beneficios secao-governo">
        <div className="secao-header">
          <Building2 size={24} />
          <h3>Benefícios Governo</h3>
          <span className="contador-beneficios">{beneficiosGoverno.length} cadastrado(s)</span>
        </div>

        <div className="adicionar-beneficio">
          <input
            type="text"
            placeholder="Digite o nome do novo benefício Governo..."
            value={novoBeneficioGoverno}
            onChange={(e) => setNovoBeneficioGoverno(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && adicionarBeneficioGoverno()}
            disabled={carregando}
            className="input-beneficio"
          />
          <button
            onClick={adicionarBeneficioGoverno}
            disabled={carregando || !novoBeneficioGoverno.trim()}
            className="botao-adicionar botao-governo"
          >
            <Plus size={18} />
            Adicionar
          </button>
        </div>

        <div className="lista-beneficios">
          {carregando && beneficiosGoverno.length === 0 ? (
            <p className="carregando">Carregando benefícios Governo...</p>
          ) : beneficiosGoverno.length === 0 ? (
            <p className="vazio">Nenhum benefício Governo cadastrado ainda</p>
          ) : (
            <ul className="lista-items">
              {beneficiosGoverno.map((beneficio) => (
                <li key={beneficio} className="item-beneficio">
                  {editandoGoverno === beneficio ? (
                    <>
                      <input
                        type="text"
                        value={nomeEditadoGoverno}
                        onChange={(e) => setNomeEditadoGoverno(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && salvarEdicaoGoverno()}
                        autoFocus
                        className="input-edicao"
                        disabled={carregando}
                      />
                      <div className="acoes-edicao">
                        <button
                          onClick={salvarEdicaoGoverno}
                          disabled={carregando}
                          className="botao-salvar"
                          title="Salvar"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={cancelarEdicaoGoverno}
                          disabled={carregando}
                          className="botao-cancelar"
                          title="Cancelar"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </>
                  ) : confirmandoExclusaoGoverno === beneficio ? (
                    <>
                      <span className="texto-confirmacao">
                        <AlertTriangle size={16} />
                        Confirmar exclusão de "{beneficio}"?
                      </span>
                      <div className="acoes-confirmacao">
                        <button
                          onClick={deletarBeneficioGoverno}
                          disabled={carregando}
                          className="botao-confirmar-deletar"
                        >
                          <Check size={16} />
                          Sim
                        </button>
                        <button
                          onClick={cancelarExclusaoGoverno}
                          disabled={carregando}
                          className="botao-cancelar"
                        >
                          <X size={16} />
                          Não
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="nome-beneficio">{beneficio}</span>
                      <div className="acoes-item">
                        <button
                          onClick={() => iniciarEdicaoGoverno(beneficio)}
                          disabled={carregando}
                          className="botao-editar"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => confirmarExclusaoGoverno(beneficio)}
                          disabled={carregando}
                          className="botao-deletar"
                          title="Deletar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default GerenciadorBeneficios;
