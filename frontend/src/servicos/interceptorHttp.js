/**
 * 🔐 Interceptor HTTP para detecção de token expirado
 * Detecta respostas 401 e notifica sobre expiração de sessão
 */

export const criarInterceptor = (axios, sair, notificarSessaoExpirada) => {
  axios.interceptors.response.use(
    (resposta) => resposta,
    (erro) => {
      // Detectar token expirado (401)
      if (erro.response?.status === 401) {
        const ehErroTokenExpirado = 
          erro.config.url?.includes('/api/') && 
          !erro.config.url?.includes('entrar') &&
          !erro.config.url?.includes('registrar');

        if (ehErroTokenExpirado) {
          // Notificar usuário
          notificarSessaoExpirada();
          
          // Fazer logout
          sair();
          
          // Redirecionar será feito pela RotaPrivada
        }
      }

      return Promise.reject(erro);
    }
  );
};

/**
 * Remove interceptor quando necessário
 */
export const removerInterceptor = (axios) => {
  // axios.interceptors.response.handlers = [];
  // Nota: axios não expõe um método limpo para remover todos os interceptors
  // Por isso, a melhor prática é usar a instância axios criada localmente
};
