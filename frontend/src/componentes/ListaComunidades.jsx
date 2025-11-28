import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { obterComunidades, obterPessoas } from '../servicos/api';
import { Users, Baby, User, Heart, LogOut, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import './ListaComunidades.css';

export const ListaComunidades = () => {
  const [comunidades, setComunidades] = useState([]);
  const [pessoasPorComunidade, setPessoasPorComunidade] = useState({});
  const [comunidadesExpandidas, setComunidadesExpandidas] = useState({});
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
      const comunidadesData = await obterComunidades(token);
      setComunidades(comunidadesData);
      
      // Carregar pessoas para cada comunidade
      const pessoas = {};
      for (const comunidade of comunidadesData) {
        const pessoasData = await obterPessoas(token, {
          pagina: 1,
          limite: 1000,
          status: 'ativo'
        });
        
        pessoas[comunidade.id] = pessoasData.pessoas.filter(p => p.comunidadeId === comunidade.id);
        // Expande a primeira comunidade por padrão
        if (comunidades.length === 0) {
          setComunidadesExpandidas(prev => ({...prev, [comunidade.id]: true}));
        }
      }
      
      setPessoasPorComunidade(pessoas);
    } catch (erro) {
      setErro('Erro ao carregar comunidades: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  };

  const toggleComunidade = (comunidadeId) => {
    setComunidadesExpandidas(prev => ({
      ...prev,
      [comunidadeId]: !prev[comunidadeId]
    }));
  };

  const obterFaixaEtaria = (idade) => {
    if (idade < 18) return 'criancas';
    if (idade < 60) return 'adultos';
    return 'idosos';
  };

  const segmentarPessoas = (pessoas) => {
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
          <div className="marca-circulo-pequeno">GAC</div>
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
            <Users size={48} />
            <h3>Nenhuma comunidade cadastrada</h3>
            <p>Comece criando uma comunidade para organizar seus beneficiários</p>
          </div>
        ) : (
          <div className="lista-comunidades">
            {comunidades.map(comunidade => {
              const pessoas = pessoasPorComunidade[comunidade.id] || [];
              const segmentado = segmentarPessoas(pessoas);
              const expandida = comunidadesExpandidas[comunidade.id];

              return (
                <div key={comunidade.id} className="card-comunidade">
                  <button 
                    className="header-card-comunidade"
                    onClick={() => toggleComunidade(comunidade.id)}
                  >
                    <div className="info-comunidade">
                      <div className="icone-comunidade" style={{ backgroundColor: comunidade.cor }}>
                        <Users size={24} color="white" />
                      </div>
                      <div className="titulo-comunidade">
                        <h3>{comunidade.nome}</h3>
                        {comunidade.descricao && <p className="desc-comunidade">{comunidade.descricao}</p>}
                      </div>
                    </div>
                    <div className="stats-comunidade">
                      <span className="badge-total">{pessoas.length} beneficiários</span>
                      {expandida ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>

                  {expandida && (
                    <div className="conteudo-comunidade">
                      {/* Crianças e Adolescentes */}
                      {segmentado.criancas.length > 0 && (
                        <section className="secao-faixa-etaria">
                          <div className="header-faixa-etaria">
                            <Baby size={20} />
                            <h4>Crianças e Adolescentes (0-17 anos)</h4>
                            <span className="contador-faixa">{segmentado.criancas.length}</span>
                          </div>
                          <div className="lista-faixa-etaria">
                            {segmentado.criancas.map(pessoa => (
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
                      {segmentado.adultos.length > 0 && (
                        <section className="secao-faixa-etaria">
                          <div className="header-faixa-etaria">
                            <User size={20} />
                            <h4>Adultos (18-59 anos)</h4>
                            <span className="contador-faixa">{segmentado.adultos.length}</span>
                          </div>
                          <div className="lista-faixa-etaria">
                            {segmentado.adultos.map(pessoa => (
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
                      {segmentado.idosos.length > 0 && (
                        <section className="secao-faixa-etaria">
                          <div className="header-faixa-etaria">
                            <Heart size={20} />
                            <h4>Idosos (60+ anos)</h4>
                            <span className="contador-faixa">{segmentado.idosos.length}</span>
                          </div>
                          <div className="lista-faixa-etaria">
                            {segmentado.idosos.map(pessoa => (
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

                      {pessoas.length === 0 && (
                        <div className="vazio-faixa">
                          <p>Nenhuma pessoa cadastrada nesta comunidade</p>
                        </div>
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
