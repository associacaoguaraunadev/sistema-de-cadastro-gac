import React, { useEffect, useState } from 'react';
import { X, Calendar, Phone, Mail, MapPin, Home, Building2 } from 'lucide-react';
import { useSSEGlobal } from '../contexto/SSEContext';
import { obterPessoa } from '../servicos/api';
import { useGlobalToast } from '../contexto/ToastContext';
import './ModalPreview.css';

const ModalPreview = ({ pessoa, idade, isOpen, onClose, onPessoaDeletada }) => {
  const [pessoaAtualizada, setPessoaAtualizada] = useState(pessoa);
  const [idadeAtualizada, setIdadeAtualizada] = useState(idade);
  const { ultimosEventos } = useSSEGlobal();
  const { erro, aviso } = useGlobalToast();

  // Atualizar dados quando props mudam
  useEffect(() => {
    setPessoaAtualizada(pessoa);
    setIdadeAtualizada(idade);
  }, [pessoa, idade]);

  // Sistema SSE para atualização em tempo real
  useEffect(() => {
    if (!isOpen || !pessoaAtualizada?.id || !ultimosEventos) return;

    const eventoAtualizacao = ultimosEventos.pessoaAtualizada;
    const eventoDelecao = ultimosEventos.pessoaDeletada;

    // Verificar se houve atualização desta pessoa
    if (eventoAtualizacao?.pessoa?.id &&
        String(eventoAtualizacao.pessoa.id) === String(pessoaAtualizada.id)) {

      console.log('🔄 ModalPreview: Atualizando dados em tempo real');
      
      // Mostrar aviso sutil de atualização
      aviso(`Pessoa "${eventoAtualizacao.pessoa.nome}" foi atualizada por outro usuário`);
      
      // Buscar dados atualizados da pessoa
      obterPessoa(pessoaAtualizada.id)
        .then(dadosAtualizados => {
          setPessoaAtualizada(dadosAtualizados);
          // Recalcular idade se necessário
          if (dadosAtualizados.dataNascimento) {
            const hoje = new Date();
            const nascimento = new Date(dadosAtualizados.dataNascimento);
            const novaIdade = hoje.getFullYear() - nascimento.getFullYear();
            setIdadeAtualizada(novaIdade);
          }
        })
        .catch(erro => {
          console.error('Erro ao atualizar preview:', erro);
        });
    }

    // Verificar se a pessoa foi excluída - manter modal aberto mas atualizar lista
    if (eventoDelecao?.pessoa?.id &&
        String(eventoDelecao.pessoa.id) === String(pessoaAtualizada.id)) {

      console.log('🗑️ ModalPreview: Pessoa excluída, mantendo modal aberto e atualizando lista');
      
      // Mostrar aviso global
      erro(`Pessoa "${eventoDelecao.pessoa.nome}" foi removida do sistema por outro usuário`);
      
      // Atualizar lista
      if (onPessoaDeletada) {
        onPessoaDeletada();
      }
      
      // Marcar como deletada no preview
      setPessoaAtualizada(prev => ({
        ...prev,
        _deletada: true,
        _mensagemDelecao: 'Esta pessoa foi removida do sistema por outro usuário'
      }));
    }

  }, [isOpen, pessoaAtualizada?.id, ultimosEventos, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // Prevenir scroll do body quando modal está aberto
    document.body.style.overflow = 'hidden';

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatarCPF = (cpf) => {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const calcularDataNascimento = () => {
    if (!pessoaAtualizada.dataNascimento) return '';
    const data = new Date(pessoaAtualizada.dataNascimento);
    return data.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Função helper para garantir que benefícios são arrays
  const garantirArray = (valor) => {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor;
    if (typeof valor === 'string') {
      try {
        const parsed = JSON.parse(valor);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  return (
    <div className="modal-preview-overlay" onClick={onClose}>
      <div 
        className="modal-preview-container" 
        onClick={(e) => e.stopPropagation()}
        data-modal="preview"
        data-pessoa-id={pessoaAtualizada?.id}
      >
        {/* Botão fechar */}
        <button className="modal-close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        {/* Header com gradiente */}
        <div className="modal-header">
          <div className="modal-header-content">
            <div className="modal-avatar">
              {pessoaAtualizada.nome ? pessoaAtualizada.nome.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="modal-header-info">
              <h2 className="modal-nome">{pessoaAtualizada.nome}</h2>
              <p className="modal-idade">{idadeAtualizada} anos</p>
            </div>
          </div>
          {pessoaAtualizada.tipoBeneficio && (
            <div className="modal-badge-beneficio">{pessoaAtualizada.tipoBeneficio}</div>
          )}
        </div>

        {/* Aviso de pessoa deletada */}
        {pessoaAtualizada._deletada && (
          <div className="modal-aviso-delecao">
            <div className="aviso-icone">⚠️</div>
            <div className="aviso-texto">
              {pessoaAtualizada._mensagemDelecao}
            </div>
          </div>
        )}

        {/* Conteúdo principal */}
        <div className="modal-content">
          <div className="modal-secoes">
            {/* Seção Pessoal */}
            <div className="modal-secao">
              <h3 className="secao-titulo">Informações Pessoais</h3>
              <div className="secao-conteudo">
                <div className="campo-preview">
                  <div className="campo-label">
                    <Calendar size={16} />
                    Data de Nascimento
                  </div>
                  <div className="campo-valor">
                    {calcularDataNascimento() || 'Não informado'}
                  </div>
                </div>

                <div className="campo-preview">
                  <div className="campo-label">CPF</div>
                  <div className="campo-valor">{formatarCPF(pessoaAtualizada.cpf)}</div>
                </div>

                {pessoaAtualizada.sexo && (
                  <div className="campo-preview">
                    <div className="campo-label">Sexo</div>
                    <div className="campo-valor">{pessoaAtualizada.sexo}</div>
                  </div>
                )}

                {pessoaAtualizada.estadoCivil && (
                  <div className="campo-preview">
                    <div className="campo-label">Estado Civil</div>
                    <div className="campo-valor">{pessoaAtualizada.estadoCivil}</div>
                  </div>
                )}

                {pessoaAtualizada.nomeMae && (
                  <div className="campo-preview">
                    <div className="campo-label">Nome da Mãe</div>
                    <div className="campo-valor">{pessoaAtualizada.nomeMae}</div>
                  </div>
                )}

                {pessoaAtualizada.naturalidade && (
                  <div className="campo-preview">
                    <div className="campo-label">Naturalidade</div>
                    <div className="campo-valor">{pessoaAtualizada.naturalidade}</div>
                  </div>
                )}

                {pessoaAtualizada.uf && (
                  <div className="campo-preview">
                    <div className="campo-label">UF Naturalidade</div>
                    <div className="campo-valor">{pessoaAtualizada.uf}</div>
                  </div>
                )}

                {pessoaAtualizada.rg && (
                  <div className="campo-preview">
                    <div className="campo-label">RG</div>
                    <div className="campo-valor">{pessoaAtualizada.rg}</div>
                  </div>
                )}

                {pessoaAtualizada.orgaoExpedidor && (
                  <div className="campo-preview">
                    <div className="campo-label">Órgão Expedidor RG</div>
                    <div className="campo-valor">{pessoaAtualizada.orgaoExpedidor}</div>
                  </div>
                )}

                {pessoaAtualizada.dataExpedicao && (
                  <div className="campo-preview">
                    <div className="campo-label">Data de Expedição RG</div>
                    <div className="campo-valor">
                      {new Date(pessoaAtualizada.dataExpedicao).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Seção Contato */}
            <div className="modal-secao">
              <h3 className="secao-titulo">Contato</h3>
              <div className="secao-conteudo">
                {pessoaAtualizada.telefone && (
                  <div className="campo-preview">
                    <div className="campo-label">
                      <Phone size={16} />
                      Telefone
                    </div>
                    <div className="campo-valor">{pessoaAtualizada.telefone}</div>
                  </div>
                )}

                {pessoaAtualizada.celular && (
                  <div className="campo-preview">
                    <div className="campo-label">
                      <Phone size={16} />
                      Celular
                    </div>
                    <div className="campo-valor">{pessoaAtualizada.celular}</div>
                  </div>
                )}

                {pessoaAtualizada.email && (
                  <div className="campo-preview">
                    <div className="campo-label">
                      <Mail size={16} />
                      Email
                    </div>
                    <div className="campo-valor">{pessoaAtualizada.email}</div>
                  </div>
                )}

                {!pessoaAtualizada.telefone && !pessoaAtualizada.celular && !pessoaAtualizada.email && (
                  <p className="sem-informacao">Nenhuma informação de contato</p>
                )}
              </div>
            </div>

            {/* Seção Endereço */}
            <div className="modal-secao">
              <h3 className="secao-titulo">Endereço</h3>
              <div className="secao-conteudo">
                {pessoaAtualizada.endereco && (
                  <div className="campo-preview">
                    <div className="campo-label">
                      <Home size={16} />
                      Endereço
                    </div>
                    <div className="campo-valor">{pessoaAtualizada.endereco}</div>
                  </div>
                )}

                {pessoaAtualizada.numero && (
                  <div className="campo-preview">
                    <div className="campo-label">Número</div>
                    <div className="campo-valor">{pessoaAtualizada.numero}</div>
                  </div>
                )}

                {pessoaAtualizada.complemento && (
                  <div className="campo-preview">
                    <div className="campo-label">Complemento</div>
                    <div className="campo-valor">{pessoaAtualizada.complemento}</div>
                  </div>
                )}

                {pessoaAtualizada.bairro && (
                  <div className="campo-preview">
                    <div className="campo-label">
                      <Building2 size={16} />
                      Bairro
                    </div>
                    <div className="campo-valor">{pessoaAtualizada.bairro}</div>
                  </div>
                )}

                {pessoaAtualizada.cidade && (
                  <div className="campo-preview">
                    <div className="campo-label">
                      <MapPin size={16} />
                      Localização
                    </div>
                    <div className="campo-valor">
                      {pessoaAtualizada.cidade}
                      {pessoaAtualizada.estado ? ` - ${pessoaAtualizada.estado}` : ''}
                    </div>
                  </div>
                )}

                {pessoaAtualizada.cep && (
                  <div className="campo-preview">
                    <div className="campo-label">CEP</div>
                    <div className="campo-valor">{pessoaAtualizada.cep}</div>
                  </div>
                )}

                {pessoaAtualizada.ponto_referencia && (
                  <div className="campo-preview">
                    <div className="campo-label">Ponto de Referência</div>
                    <div className="campo-valor">{pessoaAtualizada.ponto_referencia}</div>
                  </div>
                )}

                {!pessoaAtualizada.endereco && !pessoaAtualizada.bairro && !pessoaAtualizada.cidade && (
                  <p className="sem-informacao">Nenhuma informação de endereço</p>
                )}
              </div>
            </div>

            {/* Seção Benefícios GAC */}
            <div className="modal-secao">
              <h3 className="secao-titulo">Benefícios GAC</h3>
              <div className="secao-conteudo">
                {(() => {
                  const benefGac = garantirArray(pessoaAtualizada.beneficiosGAC);
                  return benefGac.length > 0 ? (
                    benefGac.map((b, i) => (
                      <div key={i} className="campo-preview">
                        <div className="campo-label">{b.tipo}</div>
                        <div className="campo-valor">
                          {b.dataInicio && <div>Início: {new Date(b.dataInicio).toLocaleDateString('pt-BR')}</div>}
                          {b.dataFinal && <div>Fim: {new Date(b.dataFinal).toLocaleDateString('pt-BR')}</div>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      fontSize: '12px',
                      fontStyle: 'italic',
                      color: '#95a5a6',
                      padding: '8px 0'
                    }}>
                      Não possui benefícios
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Seção Benefícios do Governo */}
            <div className="modal-secao">
              <h3 className="secao-titulo">Benefícios do Governo</h3>
              <div className="secao-conteudo">
                {(() => {
                  const benefGov = garantirArray(pessoaAtualizada.beneficiosGoverno);
                  return benefGov.length > 0 ? (
                    benefGov.map((b, i) => (
                      <div key={i} className="campo-preview">
                        <div className="campo-label">{b.nome}</div>
                        {b.valor && (
                          <div className="campo-valor">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(b.valor)}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{
                      fontSize: '12px',
                      fontStyle: 'italic',
                      color: '#95a5a6',
                      padding: '8px 0'
                    }}>
                      Não possui benefícios
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Seção Renda Familiar */}
            <div className="modal-secao">
              <h3 className="secao-titulo">Renda Familiar</h3>
              <div className="secao-conteudo">
                {pessoaAtualizada.rendaFamiliar ? (
                  <div className="campo-preview">
                    <div className="campo-label">Renda Total</div>
                    <div className="campo-valor">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(pessoaAtualizada.rendaFamiliar)}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    fontSize: '12px',
                    fontStyle: 'italic',
                    color: '#95a5a6',
                    padding: '8px 0'
                  }}>
                    Não informado
                  </div>
                )}

                {pessoaAtualizada.numeroMembros && (
                  <div className="campo-preview">
                    <div className="campo-label">Número de Membros</div>
                    <div className="campo-valor">{pessoaAtualizada.numeroMembros}</div>
                  </div>
                )}

                {pessoaAtualizada.dependentes && (
                  <div className="campo-preview">
                    <div className="campo-label">Dependentes</div>
                    <div className="campo-valor">{pessoaAtualizada.dependentes}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Seção Situação */}
            <div className="modal-secao">
              <h3 className="secao-titulo">Situação</h3>
              <div className="secao-conteudo">
                {pessoaAtualizada.situacao && (
                  <div className="campo-preview">
                    <div className="campo-label">Situação</div>
                    <div className="campo-valor">{pessoaAtualizada.situacao}</div>
                  </div>
                )}

                {pessoaAtualizada.comunidade && (
                  <div className="campo-preview">
                    <div className="campo-label">Comunidade</div>
                    <div className="campo-valor">{pessoaAtualizada.comunidade}</div>
                  </div>
                )}

                {pessoaAtualizada.responsavel && (
                  <div className="campo-preview">
                    <div className="campo-label">Responsável</div>
                    <div className="campo-valor">{pessoaAtualizada.responsavel}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Observações */}
            {pessoaAtualizada.observacoes && (
              <div className="modal-secao">
                <h3 className="secao-titulo">Observações</h3>
                <div className="secao-conteudo">
                  <div className="campo-preview campo-preview-full">
                    <div className="campo-valor observacoes-texto">
                      {pessoaAtualizada.observacoes}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Datas de Registro */}
            <div className="modal-secao">
              <h3 className="secao-titulo">Registro</h3>
              <div className="secao-conteudo">
                {pessoaAtualizada.dataCriacao && (
                  <div className="campo-preview">
                    <div className="campo-label">Data de Criação</div>
                    <div className="campo-valor">
                      {new Date(pessoaAtualizada.dataCriacao).toLocaleDateString('pt-BR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                )}

                {pessoaAtualizada.dataAtualizacao && (
                  <div className="campo-preview">
                    <div className="campo-label">Última Atualização</div>
                    <div className="campo-valor">
                      {new Date(pessoaAtualizada.dataAtualizacao).toLocaleDateString('pt-BR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ModalPreview);
