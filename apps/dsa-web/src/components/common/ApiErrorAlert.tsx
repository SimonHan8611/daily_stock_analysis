import type React from 'react';
import { Alert, Button, Group, Text } from '@mantine/core';
import type { ParsedApiError } from '../../api/error';

interface ApiErrorAlertProps {
  error: ParsedApiError;
  className?: string;
  actionLabel?: string;
  onAction?: () => void;
  dismissLabel?: string;
  onDismiss?: () => void;
}

export const ApiErrorAlert: React.FC<ApiErrorAlertProps> = ({
  error,
  className = '',
  actionLabel,
  onAction,
  dismissLabel = '关闭',
  onDismiss,
}) => {
  const showDetails = error.rawMessage.trim() && error.rawMessage.trim() !== error.message.trim();

  return (
    <Alert
      className={`rounded-xl border border-[hsl(var(--color-danger-alert-border)/0.3)] bg-[hsl(var(--color-danger-alert-bg)/0.1)] px-4 py-3 text-[hsl(var(--color-danger-alert-text))] ${className}`}
      role="alert"
      radius="xl"
      variant="light"
    >
      <Group align="flex-start" justify="space-between" gap="md">
        <div className="min-w-0">
          <Text size="sm" fw={600}>{error.title}</Text>
          <Text size="xs" mt={4} className="opacity-90">{error.message}</Text>
        </div>
        {onDismiss ? (
          <Button
            type="button"
            size="compact-xs"
            variant="light"
            color="red"
            onClick={onDismiss}
          >
            {dismissLabel}
          </Button>
        ) : null}
      </Group>
      {showDetails ? (
        <details className="mt-3 rounded-lg border border-subtle bg-surface-2 px-3 py-2">
          <summary className="cursor-pointer text-xs text-[hsl(var(--color-danger-alert-text))] opacity-90">查看详情</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-5 text-[hsl(var(--color-danger-alert-text))] opacity-85">
            {error.rawMessage}
          </pre>
        </details>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          type="button"
          mt="md"
          size="xs"
          variant="light"
          color="red"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </Alert>
  );
};
