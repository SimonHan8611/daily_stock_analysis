import type React from 'react';
import { Group, Paper, Stack, Text, Title } from '@mantine/core';
import { cn } from '../../utils/cn';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  actions,
  className = '',
}) => {
  return (
    <Paper component="header" className={cn('glass-panel-lg px-5 py-5', className)} radius="xl" shadow="none">
      <Group align="flex-end" justify="space-between" gap="lg">
        <Stack gap="sm">
          {eyebrow ? <Text className="label-uppercase">{eyebrow}</Text> : null}
          <Title order={1} className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {title}
          </Title>
          {description ? (
            <Text className="mt-2 max-w-2xl text-sm text-secondary-text md:text-base">
              {description}
            </Text>
          ) : null}
        </Stack>
        {actions ? <Group gap="xs" wrap="wrap">{actions}</Group> : null}
      </Group>
    </Paper>
  );
};
