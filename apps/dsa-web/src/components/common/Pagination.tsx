import type React from 'react';
import { Pagination as MantinePagination } from '@mantine/core';
import { cn } from '../../utils/cn';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Pagination component with terminal-inspired styling.
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}) => {
  if (totalPages <= 1) return null;

  return (
    <MantinePagination
      value={currentPage}
      total={totalPages}
      onChange={onPageChange}
      className={cn('flex items-center justify-center', className)}
      radius="xl"
      withControls
      siblings={2}
      boundaries={1}
    />
  );
};
