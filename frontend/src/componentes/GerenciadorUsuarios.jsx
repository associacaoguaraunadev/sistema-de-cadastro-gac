import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexto/AuthContext';
import { useGlobalToast } from '../contexto/ToastContext';
import { ModalConfirmacao } from './ModalConfirmacao';
import { Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import './GerenciadorUsuarios.css';

const API_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api');

export const GerenciadorUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalConfirmacao, setModalConfirmacao] = useState(null);
  const [processando, setProcessando] = useState(false);
  
  const { usuario: usuarioLogado } = useAuth();
  const { sucesso, erro: erroToast } = useGlobalToast();

  // Debug: Monitorar mudanças no modalConfirmacao
  useEffect(() => {
    console.log('🔵 [DEBUG] modalConfirmacao atualizado:', modalConfirmacao);
  }, [modalConfirmacao]);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      setCarregando(true);
      const token = localStorage.getItem('token');
      
      console.log('🔍 [DEBUG] Carregando usuários...');
      console.log('🔍 [DEBUG] API_URL:', API_URL);
      console.log('🔍 [DEBUG] Token:', token ? 'Existe' : 'Não existe');
      
      const resposta = await fetch(`${API_URL}/autenticacao/listar`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('🔍 [DEBUG] Status da resposta:', resposta.status);

      if (!resposta.ok) {
        const erro = await resposta.json();
        console.error('❌ Erro na resposta:', erro);
        throw new Error(erro.erro || 'Erro ao carregar usuários');
      }

      const dados = await resposta.json();
      console.log('✅ [DEBUG] Usuários carregados:', dados.length, 'usuários');
      console.log('✅ [DEBUG] Dados:', dados);
      setUsuarios(dados);
    } catch (erro) {
      console.error('❌ Erro ao carregar usuários:', erro);
      erroToast('Erro', 'Não foi possível carregar a lista de usuários: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  };

  const confirmarDeletar = (usuario) => {
    console.log('🔴 [DEBUG] confirmarDeletar chamado:', usuario);
    
    // Usar env variable para super admin
    const emailSuperAdmin = 'associacaoguarauna@gmail.com'; // Será checado no backend também
    
    if (usuario.email === emailSuperAdmin) {
      console.log('❌ [DEBUG] Bloqueado: conta principal');
      erroToast('Ação Bloqueada', 'Este usuário não pode ser deletado (conta principal do sistema)');
      return;
    }

    if (usuario.id === usuarioLogado?.id) {
      console.log('❌ [DEBUG] Bloqueado: próprio usuário');
      erroToast('Ação Bloqueada', 'Você não pode deletar sua própria conta');
      return;
    }

    console.log('✅ [DEBUG] Abrindo modal de confirmação para deletar');
    setModalConfirmacao({
      tipo: 'deletar',
      usuario,
      titulo: 'Confirmar Exclusão',
      mensagem: `Tem certeza que deseja deletar o usuário "${usuario.nome}" (${usuario.email})? Esta ação não pode ser desfeita. As pessoas cadastradas por este usuário serão automaticamente transferidas para o administrador principal do sistema.`,
      textoConfirmar: 'Deletar',
      classeBotao: 'botao-perigo'
    });
  };

  const confirmarAlterarFuncao = (usuario, novaFuncao) => {
    console.log('🔵 [DEBUG] confirmarAlterarFuncao chamado:', { usuario, novaFuncao });
    
    // Usar env variable para super admin
    const emailSuperAdmin = 'associacaoguarauna@gmail.com'; // Será checado no backend também
    
    if (usuario.email === emailSuperAdmin) {
      console.log('❌ [DEBUG] Bloqueado: conta principal');
      erroToast('Ação Bloqueada', 'Este usuário não pode ter sua função alterada (conta principal do sistema)');
      return;
    }

    if (usuario.id === usuarioLogado?.id) {
      console.log('❌ [DEBUG] Bloqueado: próprio usuário');
      erroToast('Ação Bloqueada', 'Você não pode alterar sua própria função');
      return;
    }

    const funcaoTexto = novaFuncao === 'admin' ? 'Administrador' : 'Funcionário';
    
    console.log('✅ [DEBUG] Abrindo modal de confirmação:', funcaoTexto);
    setModalConfirmacao({
      tipo: 'alterarFuncao',
      usuario,
      novaFuncao,
      titulo: 'Confirmar Alteração de Função',
      mensagem: `Deseja alterar a função de "${usuario.nome}" para ${funcaoTexto}?`,
      textoConfirmar: 'Confirmar',
      classeBotao: 'botao-primario'
    });
  };

  const deletarUsuario = async (idUsuario) => {
    try {
      setProcessando(true);
      const token = localStorage.getItem('token');
      
      const resposta = await fetch(`${API_URL}/usuarios/${idUsuario}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Erro ao deletar usuário');
      }

      sucesso('Usuário Deletado', dados.mensagem || 'Usuário deletado com sucesso');
      await carregarUsuarios();
    } catch (erro) {
      console.error('Erro ao deletar usuário:', erro);
      erroToast('Erro', erro.message);
    } finally {
      setProcessando(false);
      setModalConfirmacao(null);
    }
  };

  const alterarFuncao = async (idUsuario, novaFuncao) => {
    try {
      setProcessando(true);
      const token = localStorage.getItem('token');
      
      const resposta = await fetch(`${API_URL}/usuarios/${idUsuario}/funcao`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ funcao: novaFuncao })
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Erro ao alterar função');
      }

      sucesso('Função Alterada', dados.mensagem || 'Função alterada com sucesso');
      await carregarUsuarios();
    } catch (erro) {
      console.error('Erro ao alterar função:', erro);
      erroToast('Erro', erro.message);
    } finally {
      setProcessando(false);
      setModalConfirmacao(null);
    }
  };

  const confirmarModal = () => {
    if (modalConfirmacao.tipo === 'deletar') {
      deletarUsuario(modalConfirmacao.usuario.id);
    } else if (modalConfirmacao.tipo === 'alterarFuncao') {
      alterarFuncao(modalConfirmacao.usuario.id, modalConfirmacao.novaFuncao);
    }
  };

  const getBadgeFuncao = (funcao) => {
    if (funcao === 'admin') {
      return <span className="badge badge-admin">Admin</span>;
    }
    return <span className="badge badge-funcionario">Funcionário</span>;
  };

  const getStatusBadge = (ativo) => {
    if (ativo) {
      return <span className="badge badge-ativo">Ativo</span>;
    }
    return <span className="badge badge-inativo">Inativo</span>;
  };

  if (carregando) {
    console.log('🔄 [DEBUG] Ainda carregando...');
    return (
      <div className="gerenciador-usuarios">
        <div className="carregando">
          <div className="spinner"></div>
          <p>Carregando usuários...</p>
        </div>
      </div>
    );
  }

  console.log('🎨 [DEBUG] Renderizando tabela com', usuarios.length, 'usuários');

  return (
    <div className="gerenciador-usuarios">
      <div className="header-gerenciador">
        <div className="info-header">
          <h2>Gerenciamento de Usuários</h2>
          <p className="descricao">
            Total de {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} no sistema
          </p>
        </div>
      </div>

      <div className="lista-usuarios">
        {usuarios.length === 0 ? (
          <div className="vazio">
            <p>Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="tabela-container">
            <table className="tabela-usuarios">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Função</th>
                  <th>Status</th>
                  <th className="coluna-acoes">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => {
                  const ehContaPrincipal = usuario.email === 'associacaoguarauna@gmail.com';
                  const ehUsuarioLogado = usuario.id === usuarioLogado?.id;
                  const podeEditar = !ehContaPrincipal && !ehUsuarioLogado;

                  return (
                    <tr key={usuario.id} className={ehContaPrincipal ? 'usuario-protegido' : ''}>
                      <td>
                        <div className="nome-usuario">
                          {usuario.nome}
                          {ehContaPrincipal && (
                            <span className="badge badge-principal">Principal</span>
                          )}
                          {ehUsuarioLogado && (
                            <span className="badge badge-voce">Você</span>
                          )}
                        </div>
                      </td>
                      <td>{usuario.email}</td>
                      <td>{getBadgeFuncao(usuario.funcao)}</td>
                      <td>{getStatusBadge(usuario.ativo)}</td>
                      <td className="coluna-acoes">
                        {podeEditar ? (
                          <div className="acoes-usuario">
                            {usuario.funcao === 'admin' ? (
                              <button
                                className="botao-acao botao-rebaixar"
                                onClick={(e) => {
                                  console.log('🟠 [DEBUG] Clique no botão REBAIXAR:', usuario);
                                  e.preventDefault();
                                  e.stopPropagation();
                                  confirmarAlterarFuncao(usuario, 'funcionario');
                                }}
                                title="Alterar para Funcionário"
                                disabled={processando}
                              >
                                <ChevronDown size={14} /> Funcionário
                              </button>
                            ) : (
                              <button
                                className="botao-acao botao-promover"
                                onClick={(e) => {
                                  console.log('🟢 [DEBUG] Clique no botão PROMOVER:', usuario);
                                  e.preventDefault();
                                  e.stopPropagation();
                                  confirmarAlterarFuncao(usuario, 'admin');
                                }}
                                title="Promover para Admin"
                                disabled={processando}
                              >
                                <ChevronUp size={14} /> Admin
                              </button>
                            )}
                            <button
                              className="botao-acao botao-deletar"
                              onClick={(e) => {
                                console.log('🔴 [DEBUG] Clique no botão DELETAR:', usuario);
                                e.preventDefault();
                                e.stopPropagation();
                                confirmarDeletar(usuario);
                              }}
                              title="Deletar Usuário"
                              disabled={processando}
                            >
                              <Trash2 size={14} /> Deletar
                            </button>
                          </div>
                        ) : (
                          <span className="texto-sem-acoes">
                            {ehContaPrincipal ? 'Protegido' : 'Você'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalConfirmacao
        aberto={!!modalConfirmacao}
        titulo={modalConfirmacao?.titulo || 'Confirmar'}
        mensagem={modalConfirmacao?.mensagem || ''}
        botaoPrincipalTexto={modalConfirmacao?.textoConfirmar || 'Confirmar'}
        botaoCancelarTexto="Cancelar"
        onConfirmar={confirmarModal}
        onCancelar={() => setModalConfirmacao(null)}
        tipo={modalConfirmacao?.tipo === 'deletar' ? 'deletar' : 'alerta'}
        carregando={processando}
      />
    </div>
  );
};

export default GerenciadorUsuarios;
