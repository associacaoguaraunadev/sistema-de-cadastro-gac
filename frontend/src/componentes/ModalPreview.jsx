import React, { useEffect } from 'react';
import { X, Calendar, Phone, Mail, MapPin, Home, Building2 } from 'lucide-react';
import './ModalPreview.css';

const ModalPreview = ({ pessoa, idade, isOpen, onClose }) => {
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
    if (!pessoa.dataNascimento) return '';
    const data = new Date(pessoa.dataNascimento);
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
      <div className="modal-preview-container" onClick={(e) => e.stopPropagation()}>
        {/* Botão fechar */}
        <button className="modal-close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        {/* Header com gradiente */}
        <div className="modal-header">
          <div className="modal-header-content">
            <div className="modal-avatar">
              {pessoa.nome.charAt(0).toUpperCase()}
            </div>
            <div className="modal-header-info">
              <h2 className="modal-nome">{pessoa.nome}</h2>
              <p className="modal-idade">{idade} anos</p>
            </div>
          </div>
          {pessoa.tipoBeneficio && (
            <div className="modal-badge-beneficio">{pessoa.tipoBeneficio}</div>
          )}
        </div>

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
                  <div className="campo-valor">{formatarCPF(pessoa.cpf)}</div>
                </div>

                {pessoa.sexo && (
                  <div className="campo-preview">
                    <div className="campo-label">Sexo</div>
                    <div className="campo-valor">{pessoa.sexo}</div>
                  </div>
                )}

                {pessoa.estadoCivil && (
                  <div className="campo-preview">
                    <div className="campo-label">Estado Civil</div>
                    <div className="campo-valor">{pessoa.estadoCivil}</div>
                  </div>
                )}

                {pessoa.nomeMae && (
                  <div className="campo-preview">
                    <div className="campo-label">Nome da Mãe</div>
                    <div className="campo-valor">{pessoa.nomeMae}</div>
                  </div>
                )}

                {pessoa.naturalidade && (
                  <div className="campo-preview">
                    <div className="campo-label">Naturalidade</div>
                    <div className="campo-valor">{pessoa.naturalidade}</div>
                  </div>
                )}

                {pessoa.uf && (
                  <div className="campo-preview">
                    <div className="campo-label">UF Naturalidade</div>
                    <div className="campo-valor">{pessoa.uf}</div>
                  </div>
                )}

                {pessoa.rg && (
                  <div className="campo-preview">
                    <div className="campo-label">RG</div>
                    <div className="campo-valor">{pessoa.rg}</div>
                  </div>
                )}

                {pessoa.orgaoExpedidor && (
                  <div className="campo-preview">
                    <div className="campo-label">Órgão Expedidor RG</div>
                    <div className="campo-valor">{pessoa.orgaoExpedidor}</div>
                  </div>
                )}

                {pessoa.dataExpedicao && (
                  <div className="campo-preview">
                    <div className="campo-label">Data de Expedição RG</div>
                    <div className="campo-valor">
                      {new Date(pessoa.dataExpedicao).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Seção Contato */}
            <div className="modal-secao">
              <h3 className="secao-titulo">Contato</h3>
              <div className="secao-conteudo">
                {pessoa.telefone && (
                  <div className="campo-preview">
                    <div className="campo-label">
                      <Phone size={16} />
                      Telefone
                    </div>
                    <div className="campo-valor">{pessoa.telefone}</div>
                  </div>
                )}

                {pessoa.celular && (
                  <div className="campo-preview">
                    <div className="campo-label">
                      <Phone size={16} />
                      Celular
                    </div>
                    <div className="campo-valor">{pessoa.celular}</div>
                  </div>
                )}

                {pessoa.email && (
                  <div className="campo-preview">
                    <div className="campo-label">
                      <Mail size={16} />
                      Email
                    </div>
                    <div className="campo-valor">{pessoa.email}</div>
                  </div>
                )}

                {!pessoa.telefone && !pessoa.celular && !pessoa.email && (
                  <p className="sem-informacao">Nenhuma informação de contato</p>
                )}
              </div>
            </div>

            {/* Seção Endereço */}
            <div className="modal-secao">
              <h3 className="secao-titulo">Endereço</h3>
              <div className="secao-conteudo">
                {pessoa.endereco && (
                  <div className="campo-preview">
                    <div className="campo-label">
                      <Home size={16} />
                      Endereço
                    </div>
                    <div className="campo-valor">{pessoa.endereco}</div>
                  </div>
                )}

                {pessoa.numero && (
                  <div className="campo-preview">
                    <div className="campo-label">Número</div>
                    <div className="campo-valor">{pessoa.numero}</div>
                  </div>
                )}

                {pessoa.complemento && (
                  <div className="campo-preview">
                    <div className="campo-label">Complemento</div>
                    <div className="campo-valor">{pessoa.complemento}</div>
                  </div>
                )}

                {pessoa.bairro && (
                  <div className="campo-preview">
                    <div className="campo-label">
                      <Building2 size={16} />
                      Bairro
                    </div>
                    <div className="campo-valor">{pessoa.bairro}</div>
                  </div>
                )}

                {pessoa.cidade && (
                  <div className="campo-preview">
                    <div className="campo-label">
                      <MapPin size={16} />
                      Localização
                    </div>
                    <div className="campo-valor">
                      {pessoa.cidade}
                      {pessoa.estado ? ` - ${pessoa.estado}` : ''}
                    </div>
                  </div>
                )}

                {pessoa.cep && (
                  <div className="campo-preview">
                    <div className="campo-label">CEP</div>
                    <div className="campo-valor">{pessoa.cep}</div>
                  </div>
                )}

                {pessoa.ponto_referencia && (
                  <div className="campo-preview">
                    <div className="campo-label">Ponto de Referência</div>
                    <div className="campo-valor">{pessoa.ponto_referencia}</div>
                  </div>
                )}

                {!pessoa.endereco && !pessoa.bairro && !pessoa.cidade && (
                  <p className="sem-informacao">Nenhuma informação de endereço</p>
                )}
              </div>
            </div>

            {/* Seção Benefícios GAC */}
            <div className="modal-secao">
              <h3 className="secao-titulo">Benefícios GAC</h3>
              <div className="secao-conteudo">
                {(() => {
                  const benefGac = garantirArray(pessoa.beneficiosGAC);
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
                  const benefGov = garantirArray(pessoa.beneficiosGoverno);
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
                {pessoa.rendaFamiliar ? (
                  <div className="campo-preview">
                    <div className="campo-label">Renda Total</div>
                    <div className="campo-valor">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(pessoa.rendaFamiliar)}
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

                {pessoa.numeroMembros && (
                  <div className="campo-preview">
                    <div className="campo-label">Número de Membros</div>
                    <div className="campo-valor">{pessoa.numeroMembros}</div>
                  </div>
                )}

                {pessoa.dependentes && (
                  <div className="campo-preview">
                    <div className="campo-label">Dependentes</div>
                    <div className="campo-valor">{pessoa.dependentes}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Seção Situação */}
            <div className="modal-secao">
              <h3 className="secao-titulo">Situação</h3>
              <div className="secao-conteudo">
                {pessoa.situacao && (
                  <div className="campo-preview">
                    <div className="campo-label">Situação</div>
                    <div className="campo-valor">{pessoa.situacao}</div>
                  </div>
                )}

                {pessoa.comunidade && (
                  <div className="campo-preview">
                    <div className="campo-label">Comunidade</div>
                    <div className="campo-valor">{pessoa.comunidade}</div>
                  </div>
                )}

                {pessoa.responsavel && (
                  <div className="campo-preview">
                    <div className="campo-label">Responsável</div>
                    <div className="campo-valor">{pessoa.responsavel}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Observações */}
            {pessoa.observacoes && (
              <div className="modal-secao">
                <h3 className="secao-titulo">Observações</h3>
                <div className="secao-conteudo">
                  <div className="campo-preview campo-preview-full">
                    <div className="campo-valor observacoes-texto">
                      {pessoa.observacoes}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Datas de Registro */}
            <div className="modal-secao">
              <h3 className="secao-titulo">Registro</h3>
              <div className="secao-conteudo">
                {pessoa.dataCriacao && (
                  <div className="campo-preview">
                    <div className="campo-label">Data de Criação</div>
                    <div className="campo-valor">
                      {new Date(pessoa.dataCriacao).toLocaleDateString('pt-BR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                )}

                {pessoa.dataAtualizacao && (
                  <div className="campo-preview">
                    <div className="campo-label">Última Atualização</div>
                    <div className="campo-valor">
                      {new Date(pessoa.dataAtualizacao).toLocaleDateString('pt-BR', {
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
