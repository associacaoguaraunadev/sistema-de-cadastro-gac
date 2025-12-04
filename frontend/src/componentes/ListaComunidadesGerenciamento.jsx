import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Users, AlertTriangle, Check, Save } from 'lucide-react';
import { useGlobalToast } from '../contexto/ToastContext';
import { useAuth } from '../contexto/AuthContext';
import { obterTotaisPorComunidade, atualizarComunidadeEmLote } from '../servicos/api';
import './ListaComunidadesGerenciamento.css';

const ListaComunidadesGerenciamento = () => {
  const [comunidades, setComunidades] = useState([]);
  const [novaComunidade, setNovaComunidade] = useState('');
  const [editando, setEditando] = useState(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [contadorPorComunidade, setContadorPorComunidade] = useState({});
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(null);
  
  const { sucesso, erro } = useGlobalToast();
  const { token } = useAuth();

  useEffect(() => {
    carregarComunidades();
    carregarContadores();
  }, [token]);

  // Atualizar contadores a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      carregarContadores();
    }, 30000);

    return () => clearInterval(interval);
  }, [token]);

  const carregarComunidades = () => {
    // Garantir que as comunidades iniciais existam
    let todasComunidades = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
    
    // Comunidades iniciais padrão
    const comunidadesIniciais = [
      'Jardim Guarauna',
      'Vila Novo Eldorado', 
      'Jardim Apura',
      'Vila Cheba',
      'Morro da Vila',
      'Barragem',
      'Parque Centenario'
    ];

    if (todasComunidades.length === 0) {
      todasComunidades = [...comunidadesIniciais];
      localStorage.setItem('comunidadesCustomizadas', JSON.stringify(todasComunidades));
    }

    const comunidadesFormatadas = todasComunidades
      .map(nome => ({ nome, tipo: 'editavel' }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
    
    setComunidades(comunidadesFormatadas);
  };

  const carregarContadores = async () => {
    if (!token) return;
    
    try {
      const dados = await obterTotaisPorComunidade(token);
      setContadorPorComunidade(dados.totalPorComunidade || {});
    } catch (error) {
      console.error('Erro ao carregar contadores:', error);
    }
  };

  const notificarAtualizacao = () => {
    // Disparar evento personalizado para atualizar outros componentes
    window.dispatchEvent(new CustomEvent('comunidadesAtualizadas'));
  };

  const adicionarComunidade = () => {
    const nome = novaComunidade.trim();
    if (!nome) {
      erro('Campo obrigatório', 'Digite o nome da comunidade');
      return;
    }

    const comunidadesExistentes = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
    
    if (comunidadesExistentes.includes(nome)) {
      erro('Comunidade já existe', `A comunidade "${nome}" já está cadastrada`);
      return;
    }

    const novasComunidades = [...comunidadesExistentes, nome].sort();
    localStorage.setItem('comunidadesCustomizadas', JSON.stringify(novasComunidades));
    
    carregarComunidades();
    setNovaComunidade('');
    sucesso('Comunidade adicionada', `A comunidade "${nome}" foi criada com sucesso`);
    notificarAtualizacao();
  };

  const iniciarEdicao = (comunidade) => {
    setEditando(comunidade.nome);
    setNomeEditado(comunidade.nome);
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setNomeEditado('');
  };

  const salvarEdicao = async () => {
    const nomeAntigo = editando;
    const nomeNovo = nomeEditado.trim();
    
    if (!nomeNovo) {
      erro('Campo obrigatório', 'Digite o nome da comunidade');
      return;
    }

    if (nomeAntigo === nomeNovo) {
      cancelarEdicao();
      return;
    }

    const comunidadesExistentes = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
    
    if (comunidadesExistentes.includes(nomeNovo)) {
      erro('Comunidade já existe', `A comunidade "${nomeNovo}" já está cadastrada`);
      return;
    }

    setCarregando(true);

    try {
      // Atualizar no localStorage
      const novasComunidades = comunidadesExistentes.map(nome => 
        nome === nomeAntigo ? nomeNovo : nome
      ).sort();
      localStorage.setItem('comunidadesCustomizadas', JSON.stringify(novasComunidades));
      
      // Atualizar na base de dados
      await atualizarComunidadeEmLote(token, nomeAntigo, nomeNovo);
      
      carregarComunidades();
      carregarContadores();
      cancelarEdicao();
      sucesso('Comunidade atualizada', `Nome alterado de "${nomeAntigo}" para "${nomeNovo}"`);
      notificarAtualizacao();
      
    } catch (error) {
      console.error('Erro ao atualizar comunidade:', error);
      erro('Erro ao atualizar', 'Não foi possível alterar o nome da comunidade');
    } finally {
      setCarregando(false);
    }
  };

  const confirmarExclusao = (comunidade) => {
    const contador = contadorPorComunidade[comunidade.nome] || 0;
    if (contador > 0) {
      erro(
        'Não é possível excluir',
        `A comunidade "${comunidade.nome}" possui ${contador} pessoa(s) cadastrada(s). Transfira ou remova essas pessoas antes de excluir a comunidade.`
      );
      return;
    }
    setConfirmandoExclusao(comunidade.nome);
  };

  const excluirComunidade = () => {
    const nome = confirmandoExclusao;
    const comunidadesExistentes = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
    const novasComunidades = comunidadesExistentes.filter(c => c !== nome);
    
    localStorage.setItem('comunidadesCustomizadas', JSON.stringify(novasComunidades));
    
    carregarComunidades();
    setConfirmandoExclusao(null);
    sucesso('Comunidade excluída', `A comunidade "${nome}" foi removida com sucesso`);
    notificarAtualizacao();
  };

  return (
    <div className="lista-comunidades-gerenciamento">
      {/* Seção de Adicionar Nova Comunidade */}
      <div className="secao-adicionar">
        <div className="campo-grupo">
          <label htmlFor="nova-comunidade">Nova Comunidade</label>
          <div className="input-com-botao">
            <input
              id="nova-comunidade"
              type="text"
              value={novaComunidade}
              onChange={(e) => setNovaComunidade(e.target.value)}
              placeholder="Digite o nome da nova comunidade"
              onKeyPress={(e) => e.key === 'Enter' && adicionarComunidade()}
            />
            <button 
              type="button"
              onClick={adicionarComunidade}
              className="botao-adicionar"
              disabled={!novaComunidade.trim()}
            >
              <Plus size={20} />
              Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Comunidades */}
      <div className="lista-comunidades">
        <div className="cabecalho-lista">
          <h3>Comunidades Cadastradas ({comunidades.length})</h3>
        </div>

        {comunidades.length === 0 ? (
          <div className="lista-vazia">
            <p>Nenhuma comunidade cadastrada</p>
          </div>
        ) : (
          <div className="grid-comunidades">
            {comunidades.map((comunidade) => (
              <div key={comunidade.nome} className="card-comunidade">
                {editando === comunidade.nome ? (
                  <div className="edicao-comunidade">
                    <input
                      type="text"
                      value={nomeEditado}
                      onChange={(e) => setNomeEditado(e.target.value)}
                      className="input-edicao"
                      onKeyPress={(e) => e.key === 'Enter' && salvarEdicao()}
                      placeholder="Nome da comunidade"
                      autoFocus
                    />
                    <div className="acoes-edicao">
                      <button 
                        type="button"
                        onClick={salvarEdicao}
                        className="botao-salvar"
                        disabled={carregando || !nomeEditado.trim()}
                      >
                        {carregando ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button 
                        type="button"
                        onClick={cancelarEdicao}
                        className="botao-cancelar"
                        disabled={carregando}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="info-comunidade">
                      <h4>{comunidade.nome}</h4>
                      <div className="contador-pessoas">
                        <Users size={16} />
                        <span>{contadorPorComunidade[comunidade.nome] || 0} pessoas</span>
                        <div className="badge-contador">{contadorPorComunidade[comunidade.nome] || 0}</div>
                      </div>
                    </div>
                    
                    <div className="acoes-comunidade">
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(comunidade)}
                        className="botao-editar"
                        title="Editar nome da comunidade"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmarExclusao(comunidade)}
                        className="botao-excluir"
                        title="Excluir comunidade"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {confirmandoExclusao && (
        <div className="modal-overlay">
          <div className="modal-confirmacao">
            <div className="icone-aviso">
              <AlertTriangle size={48} />
            </div>
            <h3>Confirmar Exclusão</h3>
            <p>
              Tem certeza que deseja excluir a comunidade <strong>"{confirmandoExclusao}"</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="acoes-confirmacao">
              <button 
                type="button"
                onClick={() => setConfirmandoExclusao(null)}
                className="botao-cancelar"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={excluirComunidade}
                className="botao-confirmar"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaComunidadesGerenciamento;