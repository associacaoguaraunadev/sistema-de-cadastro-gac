import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, User } from 'lucide-react';
import './PaginaAceiteMatricula.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.VITE_APP_URL || 'http://localhost:3001');

export default function PaginaAceiteMatricula() {
  const { codigo } = useParams();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [matricula, setMatricula] = useState(null);
  const [aceito, setAceito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch(`${API_URL}/aceite/matricula/${codigo}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErro(d.erro || 'Link inválido ou expirado');
        return;
      }
      const d = await res.json();
      setMatricula(d.matricula || null);
    } catch (err) {
      setErro('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  }

  async function registrar() {
    if (!aceito) return;
    setEnviando(true);
    try {
      const res = await fetch(`${API_URL}/aceite/matricula/${codigo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termoLGPD: true, termoResponsabilidade: true, termoImagem: true })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErro(d.erro || 'Falha ao registrar aceite');
        return;
      }
      setSucesso(true);
    } catch (err) {
      setErro('Erro ao registrar aceite');
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return (
    <div className="pagina-aceite-matricula">
      <div className="container carregando"><div className="spinner" /> <p>Carregando...</p></div>
    </div>
  );

  if (erro) return (
    <div className="pagina-aceite-matricula">
      <div className="container erro">
        <AlertCircle size={48} />
        <h2>Ops</h2>
        <p>{erro}</p>
      </div>
    </div>
  );

  if (sucesso) return (
    <div className="pagina-aceite-matricula">
      <div className="container sucesso">
        <CheckCircle size={64} />
        <h2>Aceite registrado</h2>
        <p>Sua matrícula foi confirmada com sucesso.</p>
      </div>
    </div>
  );

  return (
    <div className="pagina-aceite-matricula">
      <div className="container">
        <header>
          <h1>Confirmação de Matrícula</h1>
        </header>

        <section className="info">
          <div className="aluno">
            <User size={20} />
            <div>
              <div className="nome">{matricula?.aluno?.pessoa?.nome || 'Aluno'}</div>
              <div className="detalhe">Ano: {matricula?.ano || '—'}</div>
            </div>
          </div>
        </section>

        <section className="termos">
          <h3>Termos</h3>
          <p>Ao confirmar, você aceita os termos de responsabilidade, LGPD e autorização de imagem relacionados a esta matrícula.</p>

          <label className="checkbox">
            <input type="checkbox" checked={aceito} onChange={e => setAceito(e.target.checked)} />
            <span>Li e aceito os termos</span>
          </label>

          <button className="botao-confirmar" onClick={registrar} disabled={!aceito || enviando}>
            {enviando ? 'Registrando...' : 'Confirmar Matrícula'}
          </button>
        </section>
      </div>
    </div>
  );
}
