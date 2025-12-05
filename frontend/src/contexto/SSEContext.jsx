import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

/**
 * Contexto SSE Global para compartilhamento de eventos em tempo real
 * Implementa callbacks imediatos para cada tipo de evento
 */
const SSEContext = createContext();

export const useSSEGlobal = () => {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSEGlobal deve ser usado dentro de um SSEProvider');
  }
  return context;
};

export const SSEProvider = ({ children }) => {
  const { token, usuario } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  // Callbacks para cada tipo de evento (em vez de apenas armazenar eventos)
  const callbacksRef = useRef({
    pessoaCadastrada: [],
    pessoaAtualizada: [],
    pessoaDeletada: []
  });

  const conectar = () => {
    if (!token || !usuario?.id) {
      console.log('🔒 SSE: Token ou usuário não disponível');
      return;
    }

    try {
      console.log('🔗 SSE Global: Tentando conectar...');

      // Fechar conexão anterior se existir
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const sseUrl = `${baseUrl}/eventos/sse?token=${encodeURIComponent(token)}`;

      console.log('📍 SSE Global: URL:', sseUrl);

      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ SSE Global: Conectado com sucesso');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE Global: Erro na conexão:', error);
        setIsConnected(false);
        setConnectionStatus('error');

        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('🔌 SSE Global: Conexão fechada, tentando reconectar...');
          reconectar();
        }
      };

      // Eventos específicos
      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        console.log('🎯 SSE Global: Conexão estabelecida:', data);
        setConnectionStatus('connected');
      });

      eventSource.addEventListener('heartbeat', (event) => {
        console.log('💓 SSE Global: Heartbeat recebido');
        setConnectionStatus('connected');
      });

      // ⚡ EVENTO: Pessoa Cadastrada
      eventSource.addEventListener('pessoaCadastrada', (event) => {
        const data = JSON.parse(event.data);
        console.log('👤 SSE Global: Pessoa cadastrada em tempo real:', data.pessoa.nome);

        // Executar TODOS os callbacks registrados imediatamente
        callbacksRef.current.pessoaCadastrada.forEach(callback => {
          try {
            callback(data);
          } catch (erro) {
            console.error('Erro ao executar callback pessoaCadastrada:', erro);
          }
        });
      });

      // ⚡ EVENTO: Pessoa Atualizada
      eventSource.addEventListener('pessoaAtualizada', (event) => {
        const data = JSON.parse(event.data);
        console.log('✏️ SSE Global: Pessoa atualizada em tempo real:', data.pessoa.nome);

        // Executar TODOS os callbacks registrados imediatamente
        callbacksRef.current.pessoaAtualizada.forEach(callback => {
          try {
            callback(data);
          } catch (erro) {
            console.error('Erro ao executar callback pessoaAtualizada:', erro);
          }
        });
      });

      // ⚡ EVENTO: Pessoa Deletada
      eventSource.addEventListener('pessoaDeletada', (event) => {
        const data = JSON.parse(event.data);
        console.log('🗑️ SSE Global: Pessoa deletada em tempo real:', data.pessoa.nome);

        // Executar TODOS os callbacks registrados imediatamente
        callbacksRef.current.pessoaDeletada.forEach(callback => {
          try {
            callback(data);
          } catch (erro) {
            console.error('Erro ao executar callback pessoaDeletada:', erro);
          }
        });
      });

      eventSource.addEventListener('keepalive', () => {
        setConnectionStatus('connected');
      });

    } catch (error) {
      console.error('❌ SSE Global: Erro ao criar conexão:', error);
      reconectar();
    }
  };

  const reconectar = () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log('❌ SSE Global: Máximo de tentativas de reconexão atingido');
      setConnectionStatus('failed');
      return;
    }

    reconnectAttempts.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    console.log(`⏳ SSE Global: Tentativa ${reconnectAttempts.current}/${maxReconnectAttempts} em ${delay}ms`);

    setConnectionStatus('reconnecting');

    reconnectTimeoutRef.current = setTimeout(() => {
      conectar();
    }, delay);
  };

  const desconectar = () => {
    console.log('🔌 SSE Global: Desconectando...');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
  };

  // Função para registrar callbacks
  const registrarCallback = useCallback((tipo, callback) => {
    if (!callbacksRef.current[tipo]) {
      console.error(`Tipo de evento inválido: ${tipo}`);
      return () => {};
    }

    callbacksRef.current[tipo].push(callback);
    console.log(`✅ Callback registrado para: ${tipo} (Total: ${callbacksRef.current[tipo].length})`);

    // Retornar função para remover callback
    return () => {
      const index = callbacksRef.current[tipo].indexOf(callback);
      if (index > -1) {
        callbacksRef.current[tipo].splice(index, 1);
        console.log(`❌ Callback removido para: ${tipo} (Total: ${callbacksRef.current[tipo].length})`);
      }
    };
  }, []);

  // Conectar quando token estiver disponível
  useEffect(() => {
    if (token && usuario?.id) {
      conectar();
    } else {
      desconectar();
    }

    return () => {
      desconectar();
    };
  }, [token, usuario?.id]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      desconectar();
    };
  }, []);

  const value = {
    isConnected,
    connectionStatus,
    registrarCallback,
    conectar,
    desconectar
  };

  return (
    <SSEContext.Provider value={value}>
      {children}
    </SSEContext.Provider>
  );
};