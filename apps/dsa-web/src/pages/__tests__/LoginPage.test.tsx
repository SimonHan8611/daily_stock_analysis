import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../LoginPage';
import { ThemeProvider } from '../../components/theme/ThemeProvider';

const { navigate, useSearchParamsMock, useAuthMock } = vi.hoisted(() => ({
  navigate: vi.fn(),
  useSearchParamsMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock('../../hooks', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
    useSearchParams: () => useSearchParamsMock(),
  };
});

const renderLoginPage = () => render(
  <ThemeProvider>
    <LoginPage />
  </ThemeProvider>,
);

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.className = 'light';
    useSearchParamsMock.mockReturnValue([new URLSearchParams('redirect=%2Fsettings')]);
  });

  it('blocks registration when confirmation does not match', async () => {
    const login = vi.fn();
    const register = vi.fn();
    useAuthMock.mockReturnValue({
      login,
      register,
    });

    renderLoginPage();

    fireEvent.click(screen.getByRole('button', { name: /点击注册/i }));
    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'tester' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'passwd6' } });
    fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: 'passwd7' } });
    fireEvent.click(screen.getByRole('button', { name: '完成注册并登录' }));

    expect(await screen.findByText('两次输入的密码不一致')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
    expect(login).not.toHaveBeenCalled();
    expect(screen.getByLabelText('密码')).toHaveAttribute('data-appearance', 'login');
    expect(screen.getByLabelText('确认密码')).toHaveAttribute('data-appearance', 'login');
  });

  it('navigates to redirect after a successful login', async () => {
    const login = vi.fn().mockResolvedValue({ success: true });
    useAuthMock.mockReturnValue({
      login,
      register: vi.fn(),
    });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'tester' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'passwd6' } });
    fireEvent.click(screen.getByRole('button', { name: '授权进入工作台' }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('tester', 'passwd6'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/settings', { replace: true }));
    expect(screen.getByLabelText('密码')).toHaveAttribute('data-appearance', 'login');
  });

  it('logs in automatically after a successful registration', async () => {
    const register = vi.fn().mockResolvedValue({ success: true });
    const login = vi.fn().mockResolvedValue({ success: true });
    useAuthMock.mockReturnValue({
      login,
      register,
    });

    renderLoginPage();

    fireEvent.click(screen.getByRole('button', { name: /点击注册/i }));
    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'tester' } });
    fireEvent.change(screen.getByLabelText('邮箱（可选）'), { target: { value: 'tester@example.com' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'passwd6' } });
    fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: 'passwd6' } });
    fireEvent.click(screen.getByRole('button', { name: '完成注册并登录' }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith('tester', 'passwd6', 'passwd6', 'tester@example.com');
    });
    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('tester', 'passwd6');
    });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/settings', { replace: true }));
  });

  it('does not override login theme tokens inline so light mode can take effect', () => {
    useAuthMock.mockReturnValue({
      login: vi.fn(),
      register: vi.fn(),
    });

    const { container } = renderLoginPage();
    const pageRoot = container.firstElementChild as HTMLElement | null;

    expect(pageRoot).not.toBeNull();
    expect(pageRoot?.getAttribute('style') ?? '').not.toContain('--login-bg-main');
  });
});
