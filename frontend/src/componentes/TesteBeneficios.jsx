import React, { useState, useEffect } from 'react';

// Componente de teste simples para debugar os benefícios GAC
const TesteBeneficios = () => {
  const [tipos, setTipos] = useState(() => {
    const salvo = localStorage.getItem('beneficiosGACTipos');
    if (salvo) {
      return JSON.parse(salvo);
    }
    const defaults = ['Cesta Básica', 'Auxílio Alimentação', 'Auxílio Financeiro', 'Bolsa Cultura', 'Outro'];
    localStorage.setItem('beneficiosGACTipos', JSON.stringify(defaults));
    return defaults;
  });

  useEffect(() => {
    console.log('Tipos carregados:', tipos);
  }, [tipos]);

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
      <h3>Teste de Benefícios GAC</h3>
      <p>Quantidade de tipos: {tipos.length}</p>
      <select>
        <option value="">Selecione um tipo</option>
        {tipos.map((tipo, index) => (
          <option key={index} value={tipo}>{tipo}</option>
        ))}
      </select>
      <div style={{ marginTop: '10px' }}>
        <strong>Tipos disponíveis:</strong>
        <ul>
          {tipos.map((tipo, index) => (
            <li key={index}>{tipo}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TesteBeneficios;