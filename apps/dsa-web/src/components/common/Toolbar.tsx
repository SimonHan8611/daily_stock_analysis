import type React from 'react';
import { Group, Paper } from '@mantine/core';
import { cn } from '../../utils/cn';

interface ToolbarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({ left, right, className = '' }) => {
  return (
    <Paper className={cn('glass-panel px-4 py-3', className)} radius="xl" shadow="none">
      <Group justify="space-between" gap="md" align="center">
        <Group gap="xs" wrap="wrap">{left}</Group>
        <Group gap="xs" wrap="wrap" justify="flex-end">{right}</Group>
      </Group>
    </Paper>
  );
};
