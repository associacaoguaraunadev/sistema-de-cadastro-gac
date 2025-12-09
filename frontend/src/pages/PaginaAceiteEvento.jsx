import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  FileText,
  User,
  ChevronDown,
  Check
} from 'lucide-react';
import './PaginaAceiteEvento.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const PaginaAceiteEvento = () => {
  const { codigo } = useParams();
  const [evento, setEvento] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [etapa, setEtapa] = useState('selecao'); // selecao, aceite, sucesso
  
  // Dados do formulário
  const [cpfResponsavel, setCpfResponsavel] = useState('');
  const [responsavel, setResponsavel] = useState(null);
  const [alunosSelecionados, setAlunosSelecionados] = useState([]);
  const [aceiteTermo, setAceiteTermo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultados, setResultados] = useState([]);

  useEffect(() => {
    carregarEvento();
  }, [codigo]);

  const carregarEvento = async () => {
    try {
      const resposta = await fetch(`${API_URL}/aceite/evento/${codigo}`);
      
      if (resposta.ok) {
        const dados = await resposta.json();
        setEvento(dados);
      } else {
        const erro = await resposta.json();
        setErro(erro.erro || 'Evento não encontrado');
      }
    } catch (err) {
      setErro('Erro ao carregar evento');
    } finally {
      setCarregando(false);
    }
  };

  const buscarResponsavel = async () => {
    if (cpfResponsavel.length < 11) return;

    try {
      const resposta = await fetch(`${API_URL}/aceite/evento/${codigo}/responsavel?cpf=${cpfResponsavel}`);
      
      if (resposta.ok) {
        const dados = await resposta.json();
        setResponsavel(dados);
        setEtapa('aceite');
      } else {
        const erro = await resposta.json();
        setErro(erro.erro || 'Responsável não encontrado');
      }
    } catch (err) {
      setErro('Erro ao buscar responsável');
    }
  };

  const toggleAluno = (alunoId) => {
    setAlunosSelecionados(prev => 
      prev.includes(alunoId)
        ? prev.filter(id => id !== alunoId)
        : [...prev, alunoId]
    );
  };

  const registrarAceite = async () => {
    if (!aceiteTermo || alunosSelecionados.length === 0) return;

    setEnviando(true);
    const resultadosTemp = [];

    try {
      for (const alunoId of alunosSelecionados) {
        try {
          const resposta = await fetch(`${API_URL}/aceite/evento/${codigo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              alunoId,
              responsavelId: responsavel.id,
              aceite: true
            })
          });

          const dados = await resposta.json();
          
          resultadosTemp.push({
            alunoId,
            sucesso: resposta.ok,
            mensagem: resposta.ok ? 'Aceite registrado' : dados.erro
          });
        } catch (err) {
          resultadosTemp.push({
            alunoId,
            sucesso: false,
            mensagem: 'Erro ao registrar'
          });
        }
      }

      setResultados(resultadosTemp);
      setEtapa('sucesso');
    } finally {
      setEnviando(false);
    }
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatarCPF = (valor) => {
    const numeros = valor.replace(/\D/g, '');
    return numeros
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  if (carregando) {
    return (
      <div className="pagina-aceite-evento">
        <div className="aceite-container carregando">
          <div className="spinner"></div>
          <p>Carregando evento...</p>
        </div>
      </div>
    );
  }

  if (erro && !evento) {
    return (
      <div className="pagina-aceite-evento">
        <div className="aceite-container erro">
          <AlertCircle size={48} />
          <h2>Ops!</h2>
          <p>{erro}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pagina-aceite-evento">
      <div className="aceite-container">
        {/* Header */}
        <header className="aceite-header">
          <div className="logo">
            <span>GAC</span>
          </div>
          <h1>Autorização para Evento</h1>
        </header>

        {/* Info do Evento */}
        <section className="evento-info">
          <h2>{evento.titulo}</h2>
          <p className="evento-descricao">{evento.descricao}</p>
          
          <div className="evento-detalhes">
            <div className="detalhe">
              <Calendar size={18} />
              <span>{formatarData(evento.dataEvento)}</span>
            </div>
            {evento.localEvento && (
              <div className="detalhe">
                <MapPin size={18} />
                <span>{evento.localEvento}</span>
              </div>
            )}
            <div className="detalhe prazo">
              <Clock size={18} />
              <span>Prazo: {formatarData(evento.dataLimiteAceite)}</span>
            </div>
          </div>
        </section>

        {/* Etapa: Seleção do Responsável */}
        {etapa === 'selecao' && (
          <section className="etapa-selecao">
            <h3>Identificação do Responsável</h3>
            <p>Digite seu CPF para continuar:</p>
            
            <div className="campo-cpf">
              <User size={20} />
              <input
                type="text"
                placeholder="000.000.000-00"
                value={cpfResponsavel}
                onChange={(e) => setCpfResponsavel(formatarCPF(e.target.value))}
                maxLength={14}
              />
            </div>

            {erro && <p className="erro-mensagem">{erro}</p>}

            <button 
              className="botao-continuar"
              onClick={buscarResponsavel}
              disabled={cpfResponsavel.length < 14}
            >
              Continuar
            </button>
          </section>
        )}

        {/* Etapa: Aceite */}
        {etapa === 'aceite' && responsavel && (
          <section className="etapa-aceite">
            <div className="responsavel-info">
              <h3>Olá, {responsavel.pessoa.nome}!</h3>
              <p>Selecione os alunos que deseja autorizar:</p>
            </div>

            <div className="lista-alunos-aceite">
              {responsavel.alunos.map(vinculo => (
                <div 
                  key={vinculo.aluno.id}
                  className={`aluno-item ${alunosSelecionados.includes(vinculo.aluno.id) ? 'selecionado' : ''}`}
                  onClick={() => toggleAluno(vinculo.aluno.id)}
                >
                  <div className="checkbox">
                    {alunosSelecionados.includes(vinculo.aluno.id) && <Check size={16} />}
                  </div>
                  <div className="aluno-dados">
                    <span className="nome">{vinculo.aluno.pessoa.nome}</span>
                    <span className="parentesco">{vinculo.parentesco}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="termo-container">
              <h4><FileText size={18} /> Termo de Autorização</h4>
              <div 
                className="termo-conteudo"
                dangerouslySetInnerHTML={{ __html: evento.termo.conteudo }}
              />
              
              <label className="checkbox-aceite">
                <input
                  type="checkbox"
                  checked={aceiteTermo}
                  onChange={(e) => setAceiteTermo(e.target.checked)}
                />
                <span>Li e aceito os termos acima</span>
              </label>
            </div>

            <button 
              className="botao-confirmar"
              onClick={registrarAceite}
              disabled={!aceiteTermo || alunosSelecionados.length === 0 || enviando}
            >
              {enviando ? 'Registrando...' : 'Confirmar Autorização'}
            </button>
          </section>
        )}

        {/* Etapa: Sucesso */}
        {etapa === 'sucesso' && (
          <section className="etapa-sucesso">
            <CheckCircle size={64} className="icone-sucesso" />
            <h2>Autorização Registrada!</h2>
            <p>Seus aceites foram registrados com sucesso.</p>

            <div className="resultados-lista">
              {resultados.map((resultado, index) => {
                const aluno = responsavel.alunos.find(v => v.aluno.id === resultado.alunoId);
                return (
                  <div 
                    key={index} 
                    className={`resultado-item ${resultado.sucesso ? 'sucesso' : 'erro'}`}
                  >
                    {resultado.sucesso ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    <span>{aluno?.aluno.pessoa.nome}</span>
                    <span className="status">{resultado.mensagem}</span>
                  </div>
                );
              })}
            </div>

            <p className="aviso-final">
              Você pode fechar esta página. Um comprovante foi gerado automaticamente.
            </p>
          </section>
        )}

        {/* Footer */}
        <footer className="aceite-footer">
          <p>Associação Guaraúna de Arte e Cultura</p>
        </footer>
      </div>
    </div>
  );
};

export default PaginaAceiteEvento;
