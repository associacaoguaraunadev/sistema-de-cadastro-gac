import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import Pusher from 'pusher-js';
import { useAuth } from './AuthContext';

/**
 * Contexto Pusher Real-Time para compartilhamento de eventos
 * Suporta 100 conexões simultâneas (perfeito para 90 funcionários)
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
      console.log('🔒 Pusher: Token ou usuário não disponível');
      return;
    }

    try {
      console.log('🚀 Pusher: Tentando conectar...');

      // Desconectar instância anterior se existir
      if (eventSourceRef.current) {
        eventSourceRef.current.disconnect();
      }

      // Criar instância Pusher
      console.log('🔑 Pusher KEY:', import.meta.env.VITE_PUSHER_KEY);
      console.log('🌍 Pusher CLUSTER:', import.meta.env.VITE_PUSHER_CLUSTER);
      console.log('👤 Usuário conectando:', usuario.nome, '| Função:', usuario.funcao);
      
      const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
        cluster: import.meta.env.VITE_PUSHER_CLUSTER || 'us2',
        encrypted: true
      });

      eventSourceRef.current = pusher;

      // Monitorar conexão
      pusher.connection.bind('connected', () => {
        console.log('✅ Pusher: Conectado com sucesso');
        console.log('👤 Conectado como:', usuario.nome, '(', usuario.funcao, ')');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
      });

      pusher.connection.bind('disconnected', () => {
        console.log('🔌 Pusher: Desconectado');
        setIsConnected(false);
        setConnectionStatus('disconnected');
      });

      pusher.connection.bind('error', (error) => {
        console.error('❌ Pusher: Erro na conexão:', error);
        setConnectionStatus('error');
      });

      // Assinar canal 'gac-realtime'
      const channel = pusher.subscribe('gac-realtime');

      channel.bind('pusher:subscription_succeeded', () => {
        console.log('📡 Pusher: Inscrito no canal gac-realtime');
      });

      // ⚡ EVENTO: Pessoa Cadastrada
      channel.bind('pessoaCadastrada', (data) => {
        console.log('👤 Pusher: Pessoa cadastrada em tempo real:', data.pessoa.nome);
        console.log('📊 Dados do evento:', JSON.stringify(data));
        console.log('🔔 Total de callbacks registrados:', callbacksRef.current.pessoaCadastrada.length);

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
      channel.bind('pessoaAtualizada', (data) => {
        console.log('✏️ Pusher: Pessoa atualizada em tempo real:', data.pessoa.nome);
        console.log('📊 Dados do evento:', JSON.stringify(data));
        console.log('🔔 Total de callbacks registrados:', callbacksRef.current.pessoaAtualizada.length);

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
      channel.bind('pessoaDeletada', (data) => {
        console.log('🗑️ Pusher: Pessoa deletada em tempo real:', data.pessoa.nome);
        console.log('📊 Dados do evento:', JSON.stringify(data));
        console.log('🔔 Total de callbacks registrados:', callbacksRef.current.pessoaDeletada.length);

        // Executar TODOS os callbacks registrados imediatamente
        callbacksRef.current.pessoaDeletada.forEach(callback => {
          try {
            callback(data);
          } catch (erro) {
            console.error('Erro ao executar callback pessoaDeletada:', erro);
          }
        });
      }); }
        });
      });

    } catch (error) {
      console.error('❌ Pusher: Erro ao criar conexão:', error);
      reconectar();
    }
  };

  const reconectar = () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log('❌ Pusher: Máximo de tentativas de reconexão atingido');
      setConnectionStatus('failed');
      return;
    }

    reconnectAttempts.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    console.log(`⏳ Pusher: Tentativa ${reconnectAttempts.current}/${maxReconnectAttempts} em ${delay}ms`);

    setConnectionStatus('reconnecting');

    reconnectTimeoutRef.current = setTimeout(() => {
      conectar();
    }, delay);
  };

  const desconectar = () => {
    console.log('🔌 Pusher: Desconectando...');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.disconnect();
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