import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from '../Pagination';

describe('Pagination', () => {
  it('does not render when there is only one page', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders controls and triggers page change', () => {
    const handlePageChange = vi.fn();

    render(
      <Pagination currentPage={2} totalPages={6} onPageChange={handlePageChange} />,
    );

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });
});
