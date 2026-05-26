import type React from 'react';
import { Box, Paper, Stack, Text, Title } from '@mantine/core';
import { cn } from '../../utils/cn';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'bordered' | 'gradient';
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Card component with terminal-inspired variants and optional hover styling.
 */
export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  style,
  variant = 'default',
  hoverable = false,
  padding = 'md',
}) => {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  const variantStyles = {
    default: 'terminal-card',
    bordered: 'terminal-card',
    gradient: 'gradient-border-card',
  };

  const hoverStyles = hoverable ? 'terminal-card-hover cursor-pointer' : '';
  const header = title || subtitle ? (
    <Stack gap={4} mb="md">
      {subtitle ? <Text className="label-uppercase">{subtitle}</Text> : null}
      {title ? (
        <Title order={3} className="mt-1 text-lg font-semibold text-foreground">
          {title}
        </Title>
      ) : null}
    </Stack>
  ) : null;

  if (variant === 'gradient') {
    return (
      <Box className={cn(variantStyles.gradient, className)} style={style}>
        <Paper className={cn('gradient-border-card-inner', paddingStyles[padding])} radius="xl" shadow="none">
          {header}
          {children}
        </Paper>
      </Box>
    );
  }

  return (
    <Paper
      style={style}
      className={cn('rounded-2xl', variantStyles[variant], hoverStyles, paddingStyles[padding], className)}
      radius="xl"
      shadow="none"
    >
      {header}
      {children}
    </Paper>
  );
};
