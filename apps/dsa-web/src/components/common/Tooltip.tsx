import type React from 'react';
import { Box, Tooltip as MantineTooltip } from '@mantine/core';
import { cn } from '../../utils/cn';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom';
  focusable?: boolean;
  className?: string;
  contentClassName?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  focusable = false,
  className = '',
  contentClassName = '',
}) => {
  if (!content) {
    return <>{children}</>;
  }

  return (
    <MantineTooltip
      label={content}
      position={side}
      multiline
      withArrow
      transitionProps={{ transition: 'fade', duration: 120 }}
      classNames={{
        tooltip: cn(
          'min-w-max max-w-[18rem] rounded-xl border border-border/70 bg-elevated/95 px-3 py-1.5 text-xs leading-5 text-foreground shadow-[0_16px_40px_rgba(3,8,20,0.18)] backdrop-blur-xl',
          contentClassName,
        ),
      }}
    >
      <Box
        component="span"
        className={cn('inline-flex', className)}
        tabIndex={focusable ? 0 : undefined}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.currentTarget.blur();
          }
        }}
      >
        {children}
      </Box>
    </MantineTooltip>
  );
};
