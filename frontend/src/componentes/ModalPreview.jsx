import React, { useEffect, useState } from 'react';
import { X, Calendar, Phone, Mail, MapPin, Home, Building2 } from 'lucide-react';
import { usePusher } from '../contexto/PusherContext';
import { useAuth } from '../contexto/AuthContext';
import { obterPessoa } from '../servicos/api';
import './ModalPreview.css';

const ModalPreview = ({ pessoa, idade, isOpen, onClose, onPessoaDeletada }) => {
  const [pessoaAtualizada, setPessoaAtualizada] = useState(pessoa);
  const [idadeAtualizada, setIdadeAtualizada] = useState(idade);
  const [pessoaDeletada, setPessoaDeletada] = useState(false);
  const [pessoaIdFixo, setPessoaIdFixo] = useState(pessoa?.id);
  const [camposAtualizados, setCamposAtualizados] = useState(new Set());
  const [mostrarToastAtualizacao, setMostrarToastAtualizacao] = useState(false);
  const { registrarCallback } = usePusher();
  const { usuario, token } = useAuth();
 
  // Atualizar dados APENAS quando o modal abre pela primeira vez
  useEffect(() => {
    if (isOpen && pessoa) {
      console.log(`🔄 ModalPreview: Modal abrindo com pessoa`, pessoa);
      setPessoaAtualizada(pessoa);
      setIdadeAtualizada(idade);
      // IMPORTANTE: Só resetar pessoaDeletada quando o modal ABRE, não quando pessoa muda
      setPessoaDeletada(false);
      setPessoaIdFixo(pessoa.id);
    }
  }, [isOpen]); // ⚠️ MUDANÇA CRÍTICA: Dependência apenas de isOpen, não de pessoa/idade

  // ⚡ Sistema PUSHER em TEMPO REAL com callbacks imediatos
  useEffect(() => {
    if (!isOpen || !pessoaIdFixo) return;

    console.log(`⚙️ ModalPreview: Registrando callbacks para pessoa ${pessoaIdFixo}`);

    // Callback para quando pessoa for atualizada
    const unsubAtualizacao = registrarCallback('pessoaAtualizada', (evento) => {
      if (String(evento.pessoa.id) === String(pessoaIdFixo)) {
        console.log(`✏️ ModalPreview: Pessoa ${pessoaIdFixo} foi atualizada por ${evento.autorFuncao}`);
        
        // ⚡ Filtrar: NÃO mostrar toast para quem executou a ação
        const mostrarFeedback = evento.autorId !== usuario?.id;
        
        if (mostrarFeedback) {
          console.log(`🔄 Atualizando preview com feedback visual`);
        } else {
          console.log(`🔇 Atualizando preview silenciosamente (autor da ação)`);
        }
        
        // Buscar dados atualizados imediatamente COM TOKEN
        if (!token) {
          console.error('❌ Token não disponível para buscar dados');
          return;
        }
        
        obterPessoa(token, pessoaIdFixo)
          .then(dadosAtualizados => {
            console.log(`✅ Dados atualizados recebidos:`, dadosAtualizados);
            console.log(`🔒 Modal PERMANECE ABERTO`);
            
            // Detectar campos que mudaram
            const camposMudados = new Set();
            if (pessoaAtualizada) {
              Object.keys(dadosAtualizados).forEach(campo => {
                if (JSON.stringify(pessoaAtualizada[campo]) !== JSON.stringify(dadosAtualizados[campo])) {
                  camposMudados.add(campo);
                  console.log(`🔄 Campo "${campo}" foi alterado`);
                }
              });
            }
            
            console.log(`📊 Total de campos alterados: ${camposMudados.size}`);
            
            // Atualizar dados
            setPessoaAtualizada(dadosAtualizados);
            
            // Recalcular idade corretamente (considerando mês/dia)
            if (dadosAtualizados.dataNascimento) {
              const hoje = new Date();
              const nascimento = new Date(dadosAtualizados.dataNascimento);
              let novaIdade = hoje.getFullYear() - nascimento.getFullYear();
              const mes = hoje.getMonth() - nascimento.getMonth();
              if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
                novaIdade--;
              }
              setIdadeAtualizada(Math.max(0, novaIdade));
            } else if (dadosAtualizados.idade !== undefined) {
              // Fallback: usar idade calculada pelo backend
              setIdadeAtualizada(dadosAtualizados.idade);
            }
            
            // Mostrar feedback visual apenas se não for o autor
            if (mostrarFeedback && camposMudados.size > 0) {
              console.log(`🎨 Aplicando feedback visual em ${camposMudados.size} campos`);
              setCamposAtualizados(camposMudados);
              setMostrarToastAtualizacao(true);
              
              // Remover destaque após 3 segundos
              setTimeout(() => {
                console.log(`🧹 Removendo destaque dos campos`);
                setCamposAtualizados(new Set());
              }, 3000);
              
              // Esconder toast após 4 segundos
              setTimeout(() => {
                setMostrarToastAtualizacao(false);
              }, 4000);
            }
            
            console.log(`✅ Preview atualizado com sucesso - modal permanece aberto`);
          })
          .catch(erro => {
            console.error('❌ Erro ao atualizar preview:', erro);
            console.log(`🔒 Mesmo com erro, modal PERMANECE ABERTO`);
          });
      }
    });

    // Callback para quando pessoa for deletada
    const unsubDelecao = registrarCallback('pessoaDeletada', (evento) => {
      console.log(`🔔 ModalPreview: Evento pessoaDeletada recebido`);
      console.log(`🔍 evento.pessoa.id: ${evento.pessoa.id}, pessoaIdFixo: ${pessoaIdFixo}`);
      
      if (String(evento.pessoa.id) === String(pessoaIdFixo)) {
        console.log(`🗑️ ModalPreview: Pessoa ${pessoaIdFixo} foi deletada por ${evento.autorFuncao}`);
        console.log(`🔒 Marcando como deletada - modal PERMANECE ABERTO`);
        console.log(`⚠️ Banner de exclusão deve aparecer agora`);
        
        setPessoaDeletada(true);
        
        console.log(`✅ Estado pessoaDeletada alterado para true`);

        // Atualizar lista no fundo
        if (onPessoaDeletada) {
          console.log(`🔄 Chamando callback onPessoaDeletada para recarregar lista`);
          onPessoaDeletada();
        }
      } else {
        console.log(`⏭️ Pessoa diferente, ignorando evento de deleção`);
      }
    });

    // Limpar callbacks ao fechar modal
    return () => {
      unsubAtualizacao();
      unsubDelecao();
    };

  }, [isOpen, pessoaIdFixo, registrarCallback, onPessoaDeletada]);

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

  // Função helper para adicionar classe de destaque em campos atualizados
  const getClasseCampo = (nomeCampo) => {
    return camposAtualizados.has(nomeCampo) ? 'campo-preview campo-atualizado' : 'campo-preview';
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

        {/* Toast discreto de atualização */}
        {mostrarToastAtualizacao && (
          <div className="toast-atualizacao-preview">
            <span className="toast-icone">👁️</span>
            <span className="toast-texto">Dados atualizados em tempo real</span>
          </div>
        )}

        {/* Alerta de cadastro excluído (se deletado) */}
        {pessoaDeletada && (
          <div className="banner-exclusao-preview">
            <div className="banner-icone">🗑️</div>
            <div className="banner-texto">
              <strong>Este cadastro foi removido do sistema</strong>
              <br />
              <small>Os dados abaixo são apenas para referência histórica.</small>
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
                <div className={getClasseCampo('dataNascimento')}>
                  <div className="campo-label">
                    <Calendar size={16} />
                    Data de Nascimento
                  </div>
                  <div className="campo-valor campo-nascimento">
                    {calcularDataNascimento() || 'Não informado'}
                    {pessoaAtualizada.dataNascimento && (
                      <span className="badge-idade-preview">
                        {idadeAtualizada} anos
                      </span>
                    )}
                  </div>
                </div>

                <div className={getClasseCampo('cpf')}>
                  <div className="campo-label">CPF</div>
                  <div className="campo-valor">{formatarCPF(pessoaAtualizada.cpf)}</div>
                </div>

                {pessoaAtualizada.sexo && (
                  <div className={getClasseCampo('sexo')}>
                    <div className="campo-label">Sexo</div>
                    <div className="campo-valor">{pessoaAtualizada.sexo}</div>
                  </div>
                )}

                {pessoaAtualizada.estadoCivil && (
                  <div className={getClasseCampo('estadoCivil')}>
                    <div className="campo-label">Estado Civil</div>
                    <div className="campo-valor">{pessoaAtualizada.estadoCivil}</div>
                  </div>
                )}

                {pessoaAtualizada.nomeMae && (
                  <div className={getClasseCampo('nomeMae')}>
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
                    <div className="campo-valor">{pessoaAtualizada.rg || pessoaAtualizada.pessoa?.rg}</div>
                  </div>
                )}

                {(
                  pessoaAtualizada.nis || pessoaAtualizada.pessoa?.nis
                ) && (
                  <div className="campo-preview">
                    <div className="campo-label">NIS</div>
                    <div className="campo-valor">{pessoaAtualizada.nis || pessoaAtualizada.pessoa?.nis}</div>
                  </div>
                )}

                {(
                  pessoaAtualizada.cor || pessoaAtualizada.pessoa?.cor
                ) && (
                  <div className="campo-preview">
                    <div className="campo-label">Cor / Raça</div>
                    <div className="campo-valor">{pessoaAtualizada.cor || pessoaAtualizada.pessoa?.cor}</div>
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
