import type React from "react";
import { Button, Group, Menu, Text, UnstyledButton } from "@mantine/core";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

type ThemeOption = "light" | "dark" | "system";
type ThemeToggleVariant = "default" | "nav";

const THEME_OPTIONS: Array<{
  value: ThemeOption;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "跟随系统", icon: Monitor },
];

function resolveThemeLabel(theme: string | undefined) {
  switch (theme) {
    case "light":
      return "浅色";
    case "dark":
      return "深色";
    default:
      return "跟随系统";
  }
}

interface ThemeToggleProps {
  variant?: ThemeToggleVariant;
  collapsed?: boolean;
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = "default",
  collapsed = false,
  compact = false,
}) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const activeTheme = (theme as ThemeOption | undefined) ?? "system";
  const visualTheme = resolvedTheme ?? "dark";
  const TriggerIcon = visualTheme === "light" ? Sun : Moon;
  const isNavVariant = variant === "nav";

  return (
    <Menu
      withinPortal={false}
      position={isNavVariant ? "top-start" : "bottom-end"}
      offset={8}
      shadow="md"
      width={180}
    >
      <Menu.Target>
        {isNavVariant ? (
          <UnstyledButton
            type="button"
            aria-label={collapsed ? "切换主题(折叠)" : "切换主题"}
            w="100%"
            px={collapsed ? 8 : "md"}
            py="sm"
            style={(theme) => ({
              borderRadius: theme.radius.xl,
              border: "1px solid transparent",
            })}
          >
            <Group
              gap="sm"
              justify={collapsed ? "center" : "space-between"}
              wrap="nowrap"
            >
              <Group gap="sm" wrap="nowrap">
                <TriggerIcon size={18} />
                {collapsed ? null : (
                  <Text size="sm" fw={600}>
                    主题
                  </Text>
                )}
              </Group>
              {collapsed ? null : (
                <Text size="xs" c="dimmed">
                  {resolveThemeLabel(activeTheme)}
                </Text>
              )}
            </Group>
          </UnstyledButton>
        ) : (
          <Button
            type="button"
            variant={compact ? "subtle" : "default"}
            leftSection={compact ? undefined : <TriggerIcon size={16} />}
            aria-label="切换主题"
            px={compact ? 0 : undefined}
            miw={compact ? 40 : undefined}
          >
            {compact ? (
              <TriggerIcon size={16} />
            ) : (
              resolveThemeLabel(activeTheme)
            )}
          </Button>
        )}
      </Menu.Target>

      <Menu.Dropdown aria-label="主题模式">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
          const isActive = activeTheme === value;

          return (
            <Menu.Item
              key={value}
              role="menuitemradio"
              aria-checked={isActive}
              leftSection={<Icon size={16} />}
              rightSection={isActive ? <Check size={16} /> : null}
              onClick={() => setTheme(value)}
            >
              {label}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
};
