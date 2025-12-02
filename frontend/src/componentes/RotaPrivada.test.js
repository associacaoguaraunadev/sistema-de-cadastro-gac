import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RotaPrivada } from '../src/componentes/RotaPrivada';

// Mocks
const mockUseAuth = vi.fn();
const mockUseToast = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../src/contexto/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('../src/hooks/useToast', () => ({
  useToast: () => mockUseToast()
}));

vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom');
  return {
    ...real,
    useNavigate: () => mockNavigate
  };
});

const renderComRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('RotaPrivada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    
    mockUseAuth.mockReturnValue({
      autenticado: true,
      sessaoExpirada: false,
      setSessaoExpirada: vi.fn()
    });

    mockUseToast.mockReturnValue({
      erro: vi.fn()
    });
  });

  it('deve renderizar children quando autenticado', () => {
    mockUseAuth.mockReturnValue({
      autenticado: true,
      sessaoExpirada: false,
      setSessaoExpirada: vi.fn()
    });

    renderComRouter(
      <RotaPrivada>
        <div>Conteúdo Protegido</div>
      </RotaPrivada>
    );

    expect(screen.getByText('Conteúdo Protegido')).toBeInTheDocument();
  });

  it('deve redirecionar quando não autenticado', async () => {
    mockUseAuth.mockReturnValue({
      autenticado: false,
      sessaoExpirada: false,
      setSessaoExpirada: vi.fn()
    });

    renderComRouter(
      <RotaPrivada>
        <div>Conteúdo Protegido</div>
      </RotaPrivada>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/entrar');
    });
  });

  it('deve notificar e redirecionar quando sessão expirada', async () => {
    vi.useFakeTimers();
    
    const mockSetSessaoExpirada = vi.fn();
    const mockErroToast = vi.fn();

    mockUseAuth.mockReturnValue({
      autenticado: true,
      sessaoExpirada: true,
      setSessaoExpirada: mockSetSessaoExpirada
    });

    mockUseToast.mockReturnValue({
      erro: mockErroToast
    });

    renderComRouter(
      <RotaPrivada>
        <div>Conteúdo Protegido</div>
      </RotaPrivada>
    );

    // Toast deve ser chamado
    expect(mockErroToast).toHaveBeenCalledWith(
      '🔐 Sessão Expirada',
      'Sua sessão expirou. Redirecionando para login...',
      3000
    );

    // setSessaoExpirada deve ser chamado para resetar flag
    expect(mockSetSessaoExpirada).toHaveBeenCalledWith(false);

    // Avançar tempo para redirecionar
    vi.advanceTimersByTime(1500);

    // Redirecionar deve ser chamado
    expect(mockNavigate).toHaveBeenCalledWith('/entrar');

    vi.useRealTimers();
  });

  it('não deve redirecionar se não está autenticado e sessão não expirada', async () => {
    mockUseAuth.mockReturnValue({
      autenticado: true,
      sessaoExpirada: false,
      setSessaoExpirada: vi.fn()
    });

    renderComRouter(
      <RotaPrivada>
        <div>Conteúdo Protegido</div>
      </RotaPrivada>
    );

    // Verificar que navigate não foi chamado
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
