// Sistema de Graduação Oficial - Associação Guaraúna de Arte e Cultura

export const graduacoesInfantil = [
  { valor: 'crua-ponta-cinza', label: 'Crua/Ponta Cinza - 05 anos', idade: 5 },
  { valor: 'crua-ponta-amarela', label: 'Crua/Ponta Amarela - 06 anos', idade: 6 },
  { valor: 'crua-ponta-laranja', label: 'Crua/Ponta Laranja - 07 anos', idade: 7 },
  { valor: 'crua-ponta-azul', label: 'Crua/Ponta Azul - 08 anos', idade: 8 },
  { valor: 'crua-ponta-verde', label: 'Crua/Ponta Verde - 09 anos', idade: 9 },
  { valor: 'crua-ponta-roxa', label: 'Crua/Ponta Roxa - 10 anos', idade: 10 },
  { valor: 'crua-e-cinza', label: 'Crua e Cinza - 11 anos', idade: 11 },
  { valor: 'crua-e-laranja', label: 'Crua e Laranja - 12 anos', idade: 12 },
  { valor: 'crua-e-azul', label: 'Crua e Azul - 13 anos', idade: 13 },
  { valor: 'crua-e-verde', label: 'Crua e Verde - 14 anos', idade: 14 },
  { valor: 'crua-e-roxa', label: 'Crua e Roxa - 15 anos', idade: 15 }
];

export const graduacoesAdulto = {
  aluno: [
    { valor: 'crua', label: 'Crua' },
    { valor: 'crua-e-amarela', label: 'Crua e Amarela' },
    { valor: 'amarela', label: 'Amarela' },
    { valor: 'amarela-e-laranja', label: 'Amarela e Laranja' },
    { valor: 'laranja', label: 'Laranja' },
    { valor: 'laranja-e-azul', label: 'Laranja e Azul' }
  ],
  graduado: [
    { valor: 'azul', label: 'Azul' },
    { valor: 'azul-e-verde', label: 'Azul e Verde' },
    { valor: 'verde', label: 'Verde' },
    { valor: 'verde-e-roxa', label: 'Verde e Roxa' }
  ],
  instrutor: [
    { valor: 'roxa', label: 'Roxa' },
    { valor: 'roxa-e-marrom', label: 'Roxa e Marrom' }
  ],
  professor: [
    { valor: 'marrom', label: 'Marrom' },
    { valor: 'marrom-e-vermelho', label: 'Marrom e Vermelho' }
  ],
  mestrando: [
    { valor: 'vermelho', label: 'Vermelho' }
  ],
  mestre: [
    { valor: 'branco-e-vermelho', label: 'Branco e Vermelho' },
    { valor: 'branco', label: 'Branco' }
  ]
};

// Todas as graduações em uma lista plana para uso em filtros
export const todasGraduacoes = [
  ...graduacoesInfantil,
  ...graduacoesAdulto.aluno,
  ...graduacoesAdulto.graduado,
  ...graduacoesAdulto.instrutor,
  ...graduacoesAdulto.professor,
  ...graduacoesAdulto.mestrando,
  ...graduacoesAdulto.mestre
];

// Função para obter o label de uma graduação pelo valor
export const getGraduacaoLabel = (valor) => {
  const graduacao = todasGraduacoes.find(g => g.valor === valor);
  return graduacao?.label || valor;
};

// Alias para compatibilidade
export const getGraduacaoNome = getGraduacaoLabel;

// GRADUACOES_ADULTO formatado para uso em optgroups
export const GRADUACOES_ADULTO = [
  { categoria: 'aluno', label: '🥋 Aluno', itens: graduacoesAdulto.aluno },
  { categoria: 'graduado', label: '🎓 Graduado', itens: graduacoesAdulto.graduado },
  { categoria: 'instrutor', label: '📚 Instrutor', itens: graduacoesAdulto.instrutor },
  { categoria: 'professor', label: '👨‍🏫 Professor', itens: graduacoesAdulto.professor },
  { categoria: 'mestrando', label: '🔶 Mestrando', itens: graduacoesAdulto.mestrando },
  { categoria: 'mestre', label: '⭐ Mestre', itens: graduacoesAdulto.mestre }
];

// Função para obter a categoria de uma graduação
export const getCategoria = (valor) => {
  if (graduacoesInfantil.find(g => g.valor === valor)) return 'Infantil';
  if (graduacoesAdulto.aluno.find(g => g.valor === valor)) return 'Aluno';
  if (graduacoesAdulto.graduado.find(g => g.valor === valor)) return 'Graduado';
  if (graduacoesAdulto.instrutor.find(g => g.valor === valor)) return 'Instrutor';
  if (graduacoesAdulto.professor.find(g => g.valor === valor)) return 'Professor';
  if (graduacoesAdulto.mestrando.find(g => g.valor === valor)) return 'Mestrando';
  if (graduacoesAdulto.mestre.find(g => g.valor === valor)) return 'Mestre';
  return '';
};

// Componente de select de graduação com optgroups
export const GraduacaoSelectOptions = () => (
  <>
    <option value="">Selecione a graduação</option>
    <optgroup label="🧒 Graduação Infantil (por idade)">
      {graduacoesInfantil.map(g => (
        <option key={g.valor} value={g.valor}>{g.label}</option>
      ))}
    </optgroup>
    <optgroup label="🥋 Aluno">
      {graduacoesAdulto.aluno.map(g => (
        <option key={g.valor} value={g.valor}>{g.label}</option>
      ))}
    </optgroup>
    <optgroup label="🎓 Graduado">
      {graduacoesAdulto.graduado.map(g => (
        <option key={g.valor} value={g.valor}>{g.label}</option>
      ))}
    </optgroup>
    <optgroup label="📚 Instrutor">
      {graduacoesAdulto.instrutor.map(g => (
        <option key={g.valor} value={g.valor}>{g.label}</option>
      ))}
    </optgroup>
    <optgroup label="👨‍🏫 Professor">
      {graduacoesAdulto.professor.map(g => (
        <option key={g.valor} value={g.valor}>{g.label}</option>
      ))}
    </optgroup>
    <optgroup label="🔶 Mestrando">
      {graduacoesAdulto.mestrando.map(g => (
        <option key={g.valor} value={g.valor}>{g.label}</option>
      ))}
    </optgroup>
    <optgroup label="⭐ Mestre">
      {graduacoesAdulto.mestre.map(g => (
        <option key={g.valor} value={g.valor}>{g.label}</option>
      ))}
    </optgroup>
  </>
);
