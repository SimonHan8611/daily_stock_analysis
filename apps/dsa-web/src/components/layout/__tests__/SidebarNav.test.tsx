import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { SidebarNav } from '../SidebarNav';

const mockLogout = vi.fn().mockResolvedValue(undefined);
const mockThemeToggle = vi.fn(({ collapsed }: { collapsed?: boolean }) => (
  <button type="button">{collapsed ? '切换主题(折叠)' : '切换主题'}</button>
));

const completionBadgeState = { value: true };

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    authEnabled: true,
    logout: mockLogout,
  }),
}));

vi.mock('../../../stores/agentChatStore', () => ({
  useAgentChatStore: (selector: (state: { completionBadge: boolean }) => unknown) =>
    selector({ completionBadge: completionBadgeState.value }),
}));

vi.mock('../../theme/ThemeToggle', () => ({
  ThemeToggle: (props: { collapsed?: boolean }) => mockThemeToggle(props),
}));

describe('SidebarNav', () => {
  const renderSidebar = (ui: React.ReactElement, route = '/') =>
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </ThemeProvider>,
    );

  it('shows the shared completion badge only when chat completion is pending', () => {
    completionBadgeState.value = true;

    const { rerender } = renderSidebar(<SidebarNav />, '/chat');

    expect(screen.getByTestId('chat-completion-badge')).toBeInTheDocument();
    expect(screen.getByLabelText('问股有新消息')).toBeInTheDocument();

    completionBadgeState.value = false;
    rerender(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/chat']}>
        <SidebarNav />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.queryByTestId('chat-completion-badge')).not.toBeInTheDocument();
  });

  it('renders the collapsed theme toggle variant when the sidebar is collapsed', () => {
    renderSidebar(<SidebarNav collapsed />);

    expect(mockThemeToggle).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'nav', collapsed: true }),
    );
    expect(screen.getByRole('button', { name: '切换主题(折叠)' })).toBeInTheDocument();
  });

  it('keeps existing route paths unchanged', () => {
    renderSidebar(<SidebarNav />, '/portfolio');

    expect(screen.getByRole('link', { name: '工作台' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Agent 问股' })).toHaveAttribute('href', '/chat');
    expect(screen.getByRole('link', { name: '持仓管理' })).toHaveAttribute('href', '/portfolio');
    expect(screen.getByRole('link', { name: '回测验证' })).toHaveAttribute('href', '/backtest');
    expect(screen.getByRole('link', { name: '系统设置' })).toHaveAttribute('href', '/settings');
  });

  it('only renders navigation entries backed by real pages', () => {
    renderSidebar(<SidebarNav />);

    expect(screen.queryByRole('link', { name: '自动分析' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '大盘复盘' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '自选股' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '历史报告' })).not.toBeInTheDocument();
  });

  it('opens the logout confirmation and confirms logout', async () => {
    renderSidebar(<SidebarNav />, '/chat');

    fireEvent.click(screen.getByRole('button', { name: '退出' }));

    expect(await screen.findByRole('heading', { name: '退出登录' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认退出' }));
    expect(mockLogout).toHaveBeenCalled();
  });
});
