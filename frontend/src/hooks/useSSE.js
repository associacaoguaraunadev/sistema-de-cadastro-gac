import { useEffect, useRef } from 'react';
import { useAuth } from '../contexto/AuthContext';

/**
 * Hook para gerenciar conexões Server-Sent Events (SSE)
 * Substitui o sistema anterior de CustomEvents para funcionar entre dispositivos
 */
export const useSSE = (onEvent) => {
  const { token } = useAuth();
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const conectar = () => {
    if (!token) return;

    try {
      console.log('🔗 Conectando ao SSE...');
      
      const baseURL = import.meta.env.VITE_API_URL || 
        (window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api');
      const eventSource = new EventSource(`${baseURL.replace('/api', '')}/api/eventos/sse?token=${encodeURIComponent(token)}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ SSE conectado com sucesso');
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 Evento SSE recebido:', event.type, data);
          
          if (onEvent) {
            onEvent(event.type, data);
          }
        } catch (erro) {
          console.error('Erro ao processar evento SSE:', erro);
        }
      };

      // Eventos específicos
      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        console.log('🎯 SSE conectado:', data.message);
      });

      eventSource.addEventListener('pessoaCadastrada', (event) => {
        const data = JSON.parse(event.data);
        console.log('👤 Pessoa cadastrada via SSE:', data);
        if (onEvent) onEvent('pessoaCadastrada', data);
      });

      eventSource.addEventListener('pessoaAtualizada', (event) => {
        const data = JSON.parse(event.data);
        console.log('✏️ Pessoa atualizada via SSE:', data);
        if (onEvent) onEvent('pessoaAtualizada', data);
      });

      eventSource.addEventListener('pessoaDeletada', (event) => {
        const data = JSON.parse(event.data);
        console.log('🗑️ Pessoa deletada via SSE:', data);
        if (onEvent) onEvent('pessoaDeletada', data);
      });

      eventSource.addEventListener('keepalive', () => {
        // Keepalive - não precisa fazer nada
      });

      eventSource.onerror = (erro) => {
        console.error('❌ Erro no SSE:', erro);
        
        // Tentar reconectar apenas se não foi fechamento intencional
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('🔄 SSE foi fechado, tentando reconectar...');
          reconectar();
        }
      };

    } catch (erro) {
      console.error('Erro ao criar conexão SSE:', erro);
      reconectar();
    }
  };

  const reconectar = () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log('❌ Máximo de tentativas de reconexão SSE atingido');
      return;
    }

    reconnectAttempts.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Backoff exponencial, máx 30s
    
    console.log(`⏳ Tentativa ${reconnectAttempts.current}/${maxReconnectAttempts} de reconexão SSE em ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      conectar();
    }, delay);
  };

  const desconectar = () => {
    console.log('🔌 Desconectando SSE...');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  useEffect(() => {
    if (token) {
      conectar();
    }

    return () => {
      desconectar();
    };
  }, [token]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      desconectar();
    };
  }, []);

  return {
    conectar,
    desconectar,
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN
  };
};