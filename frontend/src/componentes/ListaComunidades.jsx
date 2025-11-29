import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { obterComunidades } from '../servicos/api';
import { LogOut, Plus, ChevronDown, ChevronUp, Baby, User, Heart } from 'lucide-react';
import './ListaComunidades.css';

export const ListaComunidades = () => {
  const [comunidades, setComunidades] = useState([]);
  const [expandidas, setExpandidas] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  
  const { token, usuario, sair } = useAuth();
  const navegar = useNavigate();

  useEffect(() => {
    if (token) {
      carregarComunidades();
    }
  }, [token]);

  const carregarComunidades = async () => {
    try {
      setCarregando(true);
      const data = await obterComunidades(token);
      setComunidades(data);
      // Expande a primeira comunidade por padrão
      if (data.length > 0) {
        setExpandidas({ [data[0].id]: true });
      }
    } catch (erro) {
      setErro('Erro ao carregar comunidades: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  };

  const toggleComunidade = (comunidadeId) => {
    setExpandidas(prev => ({
      ...prev,
      [comunidadeId]: !prev[comunidadeId]
    }));
  };

  const agruparPorFaixaEtaria = (pessoas) => {
    return {
      criancas: pessoas.filter(p => p.idade !== null && p.idade < 18),
      adultos: pessoas.filter(p => p.idade !== null && p.idade >= 18 && p.idade < 60),
      idosos: pessoas.filter(p => p.idade !== null && p.idade >= 60)
    };
  };

  const handleSair = () => {
    if (window.confirm('Deseja sair do sistema?')) {
      sair();
      navegar('/entrar');
    }
  };

  if (carregando) {
    return <div className="container-comunidades carregando">Carregando comunidades...</div>;
  }

  if (erro) {
    return <div className="container-comunidades erro">{erro}</div>;
  }

  return (
    <div className="container-comunidades">
      {/* Navbar */}
      <nav className="navbar-comunidades">
        <div className="logo-comunidades">
          <button 
            className="marca-circulo-pequeno-clicavel" 
            onClick={() => navegar('/')}
            title="Voltar para lista de pessoas"
          >
            GAC
          </button>
        </div>
        <h1>Sistema de Cadastro de Beneficiários</h1>
        <div className="navbar-direita">
          <span className="usuario-info">{usuario?.nome || 'Admin'}</span>
          <button className="botao-sair" onClick={handleSair} title="Sair do sistema">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <div className="conteudo-comunidades">
        <header className="header-comunidades">
          <h2>Comunidades</h2>
          <button 
            className="botao-nova-comunidade"
            onClick={() => navegar('/comunidades/nova')}
          >
            <Plus size={18} />
            Nova Comunidade
          </button>
        </header>

        {comunidades.length === 0 ? (
          <div className="vazio-comunidades">
            <Plus size={48} />
            <h3>Nenhuma comunidade cadastrada</h3>
            <p>Comece criando uma comunidade para organizar seus beneficiários</p>
          </div>
        ) : (
          <div className="lista-comunidades">
            {comunidades.map(comunidade => {
              const pessoas = comunidade.pessoas || [];
              const faixas = agruparPorFaixaEtaria(pessoas);
              const expandida = expandidas[comunidade.id];
              const totalPessoas = pessoas.length;

              return (
                <div key={comunidade.id} className="card-comunidade">
                  <button 
                    className="header-card-comunidade"
                    onClick={() => toggleComunidade(comunidade.id)}
                  >
                    <div className="info-comunidade">
                      <div className="icone-comunidade" style={{ backgroundColor: comunidade.cor }}>
                        {comunidade.icon}
                      </div>
                      <div className="titulo-comunidade">
                        <h3>{comunidade.nome}</h3>
                        {comunidade.descricao && (
                          <p className="desc-comunidade">{comunidade.descricao}</p>
                        )}
                      </div>
                    </div>
                    <div className="stats-comunidade">
                      <span className="badge-total">
                        {totalPessoas} {totalPessoas === 1 ? 'beneficiário' : 'beneficiários'}
                      </span>
                      {expandida ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>

                  {expandida && (
                    <div className="conteudo-comunidade">
                      {totalPessoas === 0 ? (
                        <div className="secao-vazia">
                          <p>Nenhuma pessoa cadastrada nesta comunidade</p>
                        </div>
                      ) : (
                        <>
                          {/* Crianças e Adolescentes */}
                          {faixas.criancas.length > 0 && (
                            <section className="secao-faixa-etaria">
                              <div className="header-faixa-etaria">
                                <Baby size={20} color="#3b82f6" />
                                <h4>Crianças e Adolescentes (0-17 anos)</h4>
                                <span className="contador-faixa">{faixas.criancas.length}</span>
                              </div>
                              <div className="lista-faixa-etaria">
                                {faixas.criancas.map(pessoa => (
                                  <div 
                                    key={pessoa.id} 
                                    className="card-pessoa-mini"
                                    onClick={() => navegar(`/pessoas/${pessoa.id}`)}
                                  >
                                    <div className="avatar-mini">
                                      {pessoa.nome.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="info-pessoa-mini">
                                      <strong>{pessoa.nome}</strong>
                                      <small>{pessoa.idade} anos • {pessoa.tipoBeneficio}</small>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {/* Adultos */}
                          {faixas.adultos.length > 0 && (
                            <section className="secao-faixa-etaria">
                              <div className="header-faixa-etaria">
                                <User size={20} color="#10b981" />
                                <h4>Adultos (18-59 anos)</h4>
                                <span className="contador-faixa">{faixas.adultos.length}</span>
                              </div>
                              <div className="lista-faixa-etaria">
                                {faixas.adultos.map(pessoa => (
                                  <div 
                                    key={pessoa.id} 
                                    className="card-pessoa-mini"
                                    onClick={() => navegar(`/pessoas/${pessoa.id}`)}
                                  >
                                    <div className="avatar-mini">
                                      {pessoa.nome.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="info-pessoa-mini">
                                      <strong>{pessoa.nome}</strong>
                                      <small>{pessoa.idade} anos • {pessoa.tipoBeneficio}</small>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {/* Idosos */}
                          {faixas.idosos.length > 0 && (
                            <section className="secao-faixa-etaria">
                              <div className="header-faixa-etaria">
                                <Heart size={20} color="#ef4444" />
                                <h4>Idosos (60+ anos)</h4>
                                <span className="contador-faixa">{faixas.idosos.length}</span>
                              </div>
                              <div className="lista-faixa-etaria">
                                {faixas.idosos.map(pessoa => (
                                  <div 
                                    key={pessoa.id} 
                                    className="card-pessoa-mini"
                                    onClick={() => navegar(`/pessoas/${pessoa.id}`)}
                                  >
                                    <div className="avatar-mini">
                                      {pessoa.nome.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="info-pessoa-mini">
                                      <strong>{pessoa.nome}</strong>
                                      <small>{pessoa.idade} anos • {pessoa.tipoBeneficio}</small>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListaComunidades;
