import type React from 'react';
import { Group, Stack, Text, Title } from '@mantine/core';
import { Card } from './Card';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  actions,
  children,
  className = '',
}) => {
  return (
    <Card className={className} padding="md" variant="bordered">
      <Group align="flex-start" justify="space-between" gap="md" mb="md" wrap="nowrap">
        <Stack gap={4}>
          {subtitle ? <Text className="label-uppercase">{subtitle}</Text> : null}
          <Title order={2} className="mt-1 text-lg font-semibold text-foreground">
            {title}
          </Title>
        </Stack>
        {actions ? <Group gap="xs" wrap="wrap">{actions}</Group> : null}
      </Group>
      {children}
    </Card>
  );
};
