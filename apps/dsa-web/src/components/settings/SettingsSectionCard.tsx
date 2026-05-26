import type React from "react";
import { Group, Paper, Stack, Text, Title } from "@mantine/core";
import { cn } from "../../utils/cn";

interface SettingsSectionCardProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const SettingsSectionCard: React.FC<SettingsSectionCardProps> = ({
  title,
  description,
  actions,
  children,
  className = "",
}) => {
  return (
    <Paper
      radius="xl"
      className={cn(
        "rounded-[1.5rem] border settings-border bg-card/94 p-5 shadow-soft-card-strong backdrop-blur-sm",
        className,
      )}
      shadow="none"
    >
      <Group justify="space-between" align="flex-start" gap="md" mb="lg">
        <Stack gap={4} className="min-w-0">
          <Title
            order={2}
            className="text-sm font-semibold tracking-tight text-foreground uppercase tracking-wider"
          >
            {title}
          </Title>
          {description ? (
            <Text className="text-xs leading-6 text-muted-text">
              {description}
            </Text>
          ) : null}
        </Stack>
        {actions ? (
          <Group gap="xs" wrap="wrap">
            {actions}
          </Group>
        ) : null}
      </Group>
      <Stack gap="lg">{children}</Stack>
    </Paper>
  );
};
