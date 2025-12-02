import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexto/AuthContext';
import { useToast } from './useToast';

/**
 * 🔍 Hook para detectar sessão expirada
 * Valida token periodicamente e notifica quando expirado
 */
export const useSessaoExpirada = () => {
  const { sair, token } = useAuth();
  const { erro: erroToast } = useToast();

  const notificarSessaoExpirada = useCallback(() => {
    erroToast(
      '🔐 Sessão Expirada',
      'Sua sessão expirou. Você será redirecionado para a tela de login em 3 segundos...',
      4000
    );
  }, [erroToast]);

  const fazerLogoutComNotificacao = useCallback(() => {
    notificarSessaoExpirada();
    
    // Aguardar 3 segundos antes de fazer logout (tempo para ler a mensagem)
    setTimeout(() => {
      sair();
    }, 3000);
  }, [notificarSessaoExpirada, sair]);

  return {
    notificarSessaoExpirada,
    fazerLogoutComNotificacao
  };
};

/**
 * ⏰ Hook para validar token e detectar expiração
 * Verifica periodicamente se token é válido
 */
export const useValidarTokenPeriodicamente = (intervaloMs = 60000) => {
  const { token } = useAuth();
  const { fazerLogoutComNotificacao } = useSessaoExpirada();

  useEffect(() => {
    if (!token) return;

    const validarToken = async () => {
      try {
        const resposta = await fetch(
          'http://localhost:3001/api/autenticacao/validar-token',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (resposta.status === 401) {
          fazerLogoutComNotificacao();
        }
      } catch (erro) {
        // Erro de conexão, não fazer nada
        console.error('Erro ao validar token:', erro.message);
      }
    };

    // Executar validação imediatamente
    validarToken();

    // Configurar validação periódica
    const intervalo = setInterval(validarToken, intervaloMs);

    return () => clearInterval(intervalo);
  }, [token, fazerLogoutComNotificacao, intervaloMs]);
};
