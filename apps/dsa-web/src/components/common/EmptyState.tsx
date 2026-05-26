import type React from 'react';
import { Paper, Stack, Text } from '@mantine/core';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  return (
    <Paper
      className={cn('rounded-2xl border border-dashed border-border/60 bg-card/50 px-6 py-10 text-center shadow-soft-card', className)}
      radius="xl"
      shadow="none"
    >
      <Stack align="center" gap="sm">
        {icon ? <div className="mb-1 flex justify-center text-cyan">{icon}</div> : null}
        <Text size="md" fw={600} className="text-foreground">
          {title}
        </Text>
        {description ? (
          <Text className="mx-auto max-w-md text-sm text-secondary-text">
            {description}
          </Text>
        ) : null}
        {action ? <div className="mt-2 flex justify-center">{action}</div> : null}
      </Stack>
    </Paper>
  );
};
