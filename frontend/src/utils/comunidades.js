// Utilitários para gerenciamento de comunidades

export const COMUNIDADES_INICIAIS = [
  'Jardim Guarauna',
  'Vila Novo Eldorado', 
  'Jardim Apura',
  'Vila Cheba',
  'Morro da Vila',
  'Barragem',
  'Parque Centenario'
];

export const inicializarComunidades = () => {
  const comunidadesExistentes = JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
  
  if (comunidadesExistentes.length === 0) {
    localStorage.setItem('comunidadesCustomizadas', JSON.stringify([...COMUNIDADES_INICIAIS]));
    return [...COMUNIDADES_INICIAIS];
  }
  
  return comunidadesExistentes;
};

export const obterTodasComunidades = () => {
  return JSON.parse(localStorage.getItem('comunidadesCustomizadas') || '[]');
};

export const adicionarComunidade = (nomeComunidade) => {
  const comunidades = obterTodasComunidades();
  if (!comunidades.includes(nomeComunidade)) {
    const novasComunidades = [...comunidades, nomeComunidade].sort();
    localStorage.setItem('comunidadesCustomizadas', JSON.stringify(novasComunidades));
    
    // Disparar evento para atualizar outros componentes
    window.dispatchEvent(new CustomEvent('comunidadesAtualizadas'));
    
    return novasComunidades;
  }
  return comunidades;
};

export const removerComunidade = (nomeComunidade) => {
  const comunidades = obterTodasComunidades();
  const novasComunidades = comunidades.filter(c => c !== nomeComunidade);
  localStorage.setItem('comunidadesCustomizadas', JSON.stringify(novasComunidades));
  
  // Disparar evento para atualizar outros componentes
  window.dispatchEvent(new CustomEvent('comunidadesAtualizadas'));
  
  return novasComunidades;
};

export const editarComunidade = (nomeAntigo, nomeNovo) => {
  const comunidades = obterTodasComunidades();
  const novasComunidades = comunidades.map(c => c === nomeAntigo ? nomeNovo : c).sort();
  localStorage.setItem('comunidadesCustomizadas', JSON.stringify(novasComunidades));
  
  // Disparar evento para atualizar outros componentes
  window.dispatchEvent(new CustomEvent('comunidadesAtualizadas'));
  
  return novasComunidades;
};