import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock do AuthContext
const mockUseAuth = vi.fn();
const mockUseToast = vi.fn();

vi.mock('../contexto/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('./useToast', () => ({
  useToast: () => mockUseToast()
}));

// Importar depois dos mocks
import { useSessaoExpirada } from '../hooks/useSessaoExpirada';

describe('useSessaoExpirada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      token: 'token123',
      sair: vi.fn()
    });

    mockUseToast.mockReturnValue({
      erro: vi.fn()
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('deve retornar funções de notificação', () => {
    const { result } = renderHook(() => useSessaoExpirada());

    expect(typeof result.current.notificarSessaoExpirada).toBe('function');
    expect(typeof result.current.fazerLogoutComNotificacao).toBe('function');
  });

  it('deve chamar toast ao notificar sessão expirada', () => {
    const mockErroToast = vi.fn();
    mockUseToast.mockReturnValue({
      erro: mockErroToast
    });

    const { result } = renderHook(() => useSessaoExpirada());

    act(() => {
      result.current.notificarSessaoExpirada();
    });

    expect(mockErroToast).toHaveBeenCalledWith(
      '🔐 Sessão Expirada',
      'Sua sessão expirou. Você será redirecionado para a tela de login em 3 segundos...',
      4000
    );
  });

  it('deve fazer logout após 3 segundos de notificação', async () => {
    vi.useFakeTimers();
    const mockSair = vi.fn();
    const mockErroToast = vi.fn();

    mockUseAuth.mockReturnValue({
      token: 'token123',
      sair: mockSair
    });

    mockUseToast.mockReturnValue({
      erro: mockErroToast
    });

    const { result } = renderHook(() => useSessaoExpirada());

    act(() => {
      result.current.fazerLogoutComNotificacao();
    });

    expect(mockErroToast).toHaveBeenCalled();
    expect(mockSair).not.toHaveBeenCalled();

    // Avançar 3 segundos
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockSair).toHaveBeenCalled();
  });

  it('deve notificar antes de fazer logout', async () => {
    vi.useFakeTimers();
    const mockSair = vi.fn();
    const mockErroToast = vi.fn();

    mockUseAuth.mockReturnValue({
      token: 'token123',
      sair: mockSair
    });

    mockUseToast.mockReturnValue({
      erro: mockErroToast
    });

    const { result } = renderHook(() => useSessaoExpirada());

    act(() => {
      result.current.fazerLogoutComNotificacao();
    });

    // Toast chamado imediatamente
    expect(mockErroToast).toHaveBeenCalledTimes(1);
    
    // Logout não chamado ainda
    expect(mockSair).not.toHaveBeenCalled();

    // Avançar tempo
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Logout agora foi chamado
    expect(mockSair).toHaveBeenCalledTimes(1);
  });
});
