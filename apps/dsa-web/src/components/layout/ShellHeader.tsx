import type React from "react";
import {
  ActionIcon,
  Box,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import {
  BarChart3,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { ThemeToggle } from "../theme/ThemeToggle";

type ShellHeaderProps = {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileNav: () => void;
};

const TITLES: Record<string, { title: string; description: string }> = {
  "/": { title: "工作台", description: "股票分析与历史报告工作台" },
  "/chat": { title: "Agent 问股", description: "多轮策略问答与历史会话管理" },
  "/backtest": { title: "策略回测", description: "回测任务与结果浏览" },
  "/portfolio": { title: "持仓管理", description: "持仓与风险工作台" },
  "/settings": { title: "系统设置", description: "系统配置、模型与认证管理" },
};

export const ShellHeader: React.FC<ShellHeaderProps> = ({
  collapsed,
  onToggleSidebar,
  onOpenMobileNav,
}) => {
  const location = useLocation();
  const current = TITLES[location.pathname] ?? {
    title: "每日选股分析",
    description: "Web 工作台",
  };

  return (
    <Box pos="sticky" top={0} style={{ zIndex: 120 }}>
      <Paper
        className="shell-header-surface"
        radius={0}
        px="lg"
        py="sm"
        shadow="none"
      >
        <Group justify="space-between" gap="sm" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <ActionIcon
              type="button"
              variant="subtle"
              size="lg"
              hiddenFrom="lg"
              onClick={onOpenMobileNav}
              aria-label="打开导航菜单"
            >
              <Menu size={18} />
            </ActionIcon>

            <ActionIcon
              type="button"
              variant="subtle"
              size="lg"
              visibleFrom="lg"
              onClick={onToggleSidebar}
              aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
            >
              {collapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </ActionIcon>

            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon size={32} radius="md" variant="light" color="cyan">
                <BarChart3 size={16} />
              </ThemeIcon>
              <Stack gap={2} miw={0}>
                <Text fw={700} size="lg" truncate>
                  {current.title}
                </Text>
                <Text c="dimmed" size="xs" truncate visibleFrom="md">
                  {current.description}
                </Text>
              </Stack>
            </Group>
          </Group>

          <Group gap="sm" wrap="nowrap">
            <TextInput
              className="shell-header-search"
              placeholder="Search"
              leftSection={<Search size={16} />}
              readOnly
              aria-label="全局搜索"
              visibleFrom="sm"
            />
            <ThemeToggle compact />
          </Group>
        </Group>
      </Paper>
    </Box>
  );
};
