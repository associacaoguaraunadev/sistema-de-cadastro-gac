import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

/**
 * Contexto SSE Global para compartilhamento de eventos em tempo real
 * Permite que todos os componentes recebam eventos SSE de forma centralizada
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

  // Estado para armazenar os últimos eventos por tipo
  const [ultimosEventos, setUltimosEventos] = useState({
    pessoaCadastrada: null,
    pessoaAtualizada: null,
    pessoaDeletada: null
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

      eventSource.onmessage = (event) => {
        console.log('📨 SSE Global: Mensagem recebida:', event);
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
        const data = JSON.parse(event.data);
        console.log('💓 SSE Global: Heartbeat:', data.instanciaId);
        setConnectionStatus('connected');
      });

      // Eventos de pessoas
      eventSource.addEventListener('pessoaCadastrada', (event) => {
        const data = JSON.parse(event.data);
        console.log('👤 SSE Global: Pessoa cadastrada:', data);

        setUltimosEventos(prev => ({
          ...prev,
          pessoaCadastrada: { ...data, timestamp: Date.now() }
        }));

        // Disparar evento global para outros componentes
        window.dispatchEvent(new CustomEvent('sse:pessoaCadastrada', { detail: data }));
      });

      eventSource.addEventListener('pessoaAtualizada', (event) => {
        const data = JSON.parse(event.data);
        console.log('✏️ SSE Global: Pessoa atualizada:', data);

        setUltimosEventos(prev => ({
          ...prev,
          pessoaAtualizada: { ...data, timestamp: Date.now() }
        }));

        // Disparar evento global para outros componentes
        window.dispatchEvent(new CustomEvent('sse:pessoaAtualizada', { detail: data }));
      });

      eventSource.addEventListener('pessoaDeletada', (event) => {
        const data = JSON.parse(event.data);
        console.log('🗑️ SSE Global: Pessoa deletada:', data);

        setUltimosEventos(prev => ({
          ...prev,
          pessoaDeletada: { ...data, timestamp: Date.now() }
        }));

        // Disparar evento global para outros componentes
        window.dispatchEvent(new CustomEvent('sse:pessoaDeletada', { detail: data }));
      });

      eventSource.addEventListener('keepalive', () => {
        // Keepalive - apenas manter conexão
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
    ultimosEventos,
    conectar,
    desconectar
  };

  return (
    <SSEContext.Provider value={value}>
      {children}
    </SSEContext.Provider>
  );
};