import { describe, it, expect, beforeEach, vi } from 'vitest';
import { criarInterceptor, removerInterceptor } from '../src/servicos/interceptorHttp';

describe('interceptorHttp', () => {
  let axiosMock;
  let sairMock;
  let notificarMock;

  beforeEach(() => {
    // Mock do axios
    axiosMock = {
      interceptors: {
        response: {
          use: vi.fn((sucesso, erro) => {
            axiosMock._errorHandler = erro;
          })
        }
      }
    };

    // Mocks das funções
    sairMock = vi.fn();
    notificarMock = vi.fn();
  });

  describe('criarInterceptor', () => {
    it('deve criar interceptor de resposta', () => {
      criarInterceptor(axiosMock, sairMock, notificarMock);

      expect(axiosMock.interceptors.response.use).toHaveBeenCalled();
    });

    it('deve notificar e fazer logout quando status 401', () => {
      criarInterceptor(axiosMock, sairMock, notificarMock);

      const erroHandler = axiosMock._errorHandler;
      const erro = {
        response: { status: 401 },
        config: { url: '/api/pessoas' }
      };

      // Executar handler de erro
      try {
        erroHandler(erro);
      } catch (e) {
        // Esperado que lance o erro
      }

      expect(notificarMock).toHaveBeenCalled();
      expect(sairMock).toHaveBeenCalled();
    });

    it('não deve fazer logout em rotas de autenticação', () => {
      criarInterceptor(axiosMock, sairMock, notificarMock);

      const erroHandler = axiosMock._errorHandler;
      const erroLogin = {
        response: { status: 401 },
        config: { url: '/api/autenticacao/entrar' }
      };

      try {
        erroHandler(erroLogin);
      } catch (e) {
        // Esperado
      }

      expect(sairMock).not.toHaveBeenCalled();
    });

    it('não deve fazer logout em erros que não sejam 401', () => {
      criarInterceptor(axiosMock, sairMock, notificarMock);

      const erroHandler = axiosMock._errorHandler;
      const erroServidor = {
        response: { status: 500 },
        config: { url: '/api/pessoas' }
      };

      try {
        erroHandler(erroServidor);
      } catch (e) {
        // Esperado
      }

      expect(sairMock).not.toHaveBeenCalled();
    });

    it('deve lançar erro para que aplicação possa capturar', () => {
      criarInterceptor(axiosMock, sairMock, notificarMock);

      const erroHandler = axiosMock._errorHandler;
      const erro = {
        response: { status: 401 },
        config: { url: '/api/pessoas' }
      };

      expect(() => {
        erroHandler(erro);
      }).toThrow();
    });
  });

  describe('removerInterceptor', () => {
    it('deve ter função removerInterceptor disponível', () => {
      expect(typeof removerInterceptor).toBe('function');
    });
  });
});
