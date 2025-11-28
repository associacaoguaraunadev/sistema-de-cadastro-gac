import validador from 'validator';

export const validarCPF = (cpf) => {
  if (!cpf) return false;
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  
  let soma = 0;
  let resto;
  
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  
  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  
  return true;
};

export const validarTelefone = (telefone) => {
  if (!telefone) return true; // Telefone é opcional
  const apenasNumeros = telefone.replace(/\D/g, '');
  return apenasNumeros.length >= 10 && apenasNumeros.length <= 11;
};

export const validarDadosPessoa = (dados) => {
  const erros = [];

  if (!dados.nome || dados.nome.trim().length < 3) {
    erros.push('Nome deve ter pelo menos 3 caracteres');
  }

  if (!dados.cpf || !validarCPF(dados.cpf)) {
    erros.push('CPF inválido');
  }

  if (!dados.endereco || dados.endereco.trim().length < 5) {
    erros.push('Endereço deve ter pelo menos 5 caracteres');
  }

  if (!dados.tipoBeneficio || dados.tipoBeneficio.trim().length === 0) {
    erros.push('Tipo de benefício é obrigatório');
  }

  if (dados.email && !validador.isEmail(dados.email)) {
    erros.push('Email inválido');
  }

  if (dados.telefone && !validarTelefone(dados.telefone)) {
    erros.push('Telefone deve ter entre 10 e 11 dígitos');
  }

  return erros;
};

export const validarDadosUsuario = (dados) => {
  const erros = [];

  if (!dados.email || !validador.isEmail(dados.email)) {
    erros.push('Email inválido');
  }

  if (!dados.senha || dados.senha.length < 8) {
    erros.push('Senha deve ter pelo menos 8 caracteres');
  }

  if (!dados.nome || dados.nome.trim().length < 3) {
    erros.push('Nome deve ter pelo menos 3 caracteres');
  }

  return erros;
};
