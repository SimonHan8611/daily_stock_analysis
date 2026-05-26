import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders content with the selected variant metadata classes', () => {
    render(<Badge variant="success">已完成</Badge>);

    const badge = screen.getByText('已完成');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('text-success');
  });

  it('supports medium size and optional glow styling', () => {
    render(
      <Badge variant="info" size="md" glow>
        运行中
      </Badge>,
    );

    const badge = screen.getByText('运行中');
    expect(badge.className).toContain('text-sm');
    expect(badge.className).toContain('shadow-lg');
  });
});
