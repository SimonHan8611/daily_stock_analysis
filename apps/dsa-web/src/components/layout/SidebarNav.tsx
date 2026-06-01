import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Divider,
  Group,
  NavLink as MantineNavLink,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Home,
  LogOut,
  MessageSquareQuote,
  Repeat2,
  Search,
  Settings2,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  ALPHASIFT_CONFIG_CHANGED_EVENT,
  SYSTEM_CONFIG_CHANGED_EVENT,
  alphasiftApi,
} from "../../api/alphasift";
import { useAuth } from "../../contexts/AuthContext";
import { useAgentChatStore } from "../../stores/agentChatStore";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { StatusDot } from "../common/StatusDot";
import { ThemeToggle } from "../theme/ThemeToggle";

type SidebarNavProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

type NavItem = {
  key: string;
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  exact?: boolean;
  badge?: "completion";
  section: "workspace" | "system";
};

const NAV_ITEMS: NavItem[] = [
  {
    key: "home",
    label: "工作台",
    to: "/",
    icon: Home,
    exact: true,
    section: "workspace",
  },
  {
    key: "chat",
    label: "Agent 问股",
    to: "/chat",
    icon: MessageSquareQuote,
    badge: "completion",
    section: "workspace",
  },
  {
    key: "backtest",
    label: "回测验证",
    to: "/backtest",
    icon: BarChart3,
    section: "workspace",
  },
  {
    key: "portfolio",
    label: "持仓管理",
    to: "/portfolio",
    icon: BriefcaseBusiness,
    section: "workspace",
  },
  {
    key: "screening",
    label: "AlphaSift 选股",
    to: "/screening",
    icon: Search,
    section: "workspace",
  },
  {
    key: "alerts",
    label: "告警中心",
    to: "/alerts",
    icon: Bell,
    section: "workspace",
  },
  {
    key: "settings",
    label: "系统设置",
    to: "/settings",
    icon: Settings2,
    section: "system",
  },
];

export const SidebarNav: React.FC<SidebarNavProps> = ({
  collapsed = false,
  onNavigate,
}) => {
  const { authEnabled, logout, user } = useAuth();
  const location = useLocation();
  const completionBadge = useAgentChatStore((state) => state.completionBadge);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAlphaSiftNav, setShowAlphaSiftNav] = useState(false);

  useEffect(() => {
    let active = true;

    const refreshAlphaSiftStatus = async () => {
      try {
        const status = await alphasiftApi.getStatus();
        if (active) {
          setShowAlphaSiftNav(status.enabled);
        }
      } catch {
        if (active) {
          setShowAlphaSiftNav(false);
        }
      }
    };

    void refreshAlphaSiftStatus();
    window.addEventListener(ALPHASIFT_CONFIG_CHANGED_EVENT, refreshAlphaSiftStatus);
    window.addEventListener(SYSTEM_CONFIG_CHANGED_EVENT, refreshAlphaSiftStatus);

    return () => {
      active = false;
      window.removeEventListener(ALPHASIFT_CONFIG_CHANGED_EVENT, refreshAlphaSiftStatus);
      window.removeEventListener(SYSTEM_CONFIG_CHANGED_EVENT, refreshAlphaSiftStatus);
    };
  }, []);

  const navItems = showAlphaSiftNav
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.key !== "screening");

  const workspaceItems = navItems.filter(
    (item) => item.section === "workspace",
  );
  const systemItems = navItems.filter((item) => item.section === "system");

  const isItemActive = (item: NavItem) => {
    if (item.exact || item.to === "/") {
      return location.pathname === item.to;
    }

    return (
      location.pathname === item.to ||
      location.pathname.startsWith(`${item.to}/`)
    );
  };

  const renderNavItems = (items: NavItem[]) =>
    items.map((item) => {
      const { key, label, to, icon: Icon, badge } = item;
      const isActive = isItemActive(item);

      return (
        <MantineNavLink
          key={key}
          component={Link}
          to={to}
          active={isActive}
          variant="filled"
          onClick={onNavigate}
          aria-label={label}
          aria-current={isActive ? "page" : undefined}
          leftSection={
            <Box pos="relative">
              <Icon size={18} />
              {badge === "completion" && completionBadge ? (
                <StatusDot
                  tone="info"
                  data-testid="chat-completion-badge"
                  style={{
                    position: "absolute",
                    right: collapsed ? -4 : -10,
                    top: -4,
                  }}
                  aria-label="问股有新消息"
                />
              ) : null}
            </Box>
          }
          label={collapsed ? undefined : label}
          className="sidebar-nav-link"
          styles={(theme) => ({
            root: {
              borderRadius: 14,
              paddingInline: collapsed ? 10 : 14,
              minHeight: 46,
              justifyContent: collapsed ? "center" : undefined,
              backgroundColor: isActive ? "var(--nav-active-bg)" : "transparent",
              border: `1px solid ${isActive ? "var(--nav-active-border)" : "transparent"}`,
              color: isActive
                ? "var(--nav-icon-active)"
                : "hsl(var(--secondary-text))",
              boxShadow: isActive
                ? "0 10px 20px hsl(var(--primary) / 0.08)"
                : "none",
            },
            section: {
              marginInlineEnd: collapsed ? 0 : undefined,
            },
            body: {
              display: collapsed ? "none" : "block",
            },
            label: {
              fontWeight: 600,
              fontSize: theme.fontSizes.sm,
            },
          })}
        />
      );
    });

  return (
    <Stack
      h="100%"
      mih={0}
      gap="md"
      className="shell-sidebar-root overflow-hidden"
      p="lg"
    >
      <Group
        className="shell-sidebar-brand-block"
        gap="sm"
        wrap="nowrap"
        justify={collapsed ? "center" : "flex-start"}
      >
        <ThemeIcon
          className="shell-sidebar-logo"
          size={collapsed ? 42 : 46}
          radius="md"
        >
          <BarChart3 size={collapsed ? 20 : 22} />
        </ThemeIcon>
        {collapsed ? null : (
          <Box miw={0}>
            <Text fw={800} size="lg" lh={1.1}>
              DSA
            </Text>
            <Text size="xs" c="dimmed" mt={3}>
              股票分析系统
            </Text>
          </Box>
        )}
      </Group>

      <Box
        component="nav"
        aria-label="主导航"
        className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-1"
      >
        <Stack gap="md">
          <Paper
            className="shell-sidebar-section"
            radius="lg"
            p="xs"
            shadow="none"
          >
            {collapsed ? null : (
              <Text className="shell-sidebar-caption">Workspace</Text>
            )}
            <Stack gap={4}>{renderNavItems(workspaceItems)}</Stack>
          </Paper>

          <Paper
            className="shell-sidebar-section"
            radius="lg"
            p="xs"
            shadow="none"
          >
            {collapsed ? null : (
              <Text className="shell-sidebar-caption">System</Text>
            )}
            <Stack gap={4}>{renderNavItems(systemItems)}</Stack>
          </Paper>
        </Stack>
      </Box>

      <Paper className="shell-sidebar-section" radius="lg" p="xs" shadow="none">
        <ThemeToggle variant="nav" collapsed={collapsed} />
      </Paper>

      {!collapsed && user ? (
        <Paper className="shell-sidebar-user" radius="lg" p="sm" shadow="none">
          <Group align="center" gap="sm" wrap="nowrap">
            <ThemeIcon size={40} radius="xl" variant="light" color="brand">
              {user.username.slice(0, 1).toUpperCase()}
            </ThemeIcon>
            <Box miw={0}>
              <Text size="sm" fw={600} truncate>
                {user.username}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {user.role === "admin" ? "系统管理员" : "投资分析用户"}
              </Text>
            </Box>
          </Group>
          <Divider my="sm" />
          <Button
            type="button"
            variant="subtle"
            color="red"
            justify="flex-start"
            leftSection={<LogOut size={18} />}
            onClick={() => setShowLogoutConfirm(true)}
            aria-label="退出"
            px={8}
          >
            退出
          </Button>
        </Paper>
      ) : null}

      {!collapsed && !user ? (
        <Paper className="shell-sidebar-user" radius="lg" p="sm" shadow="none">
          <Group align="center" gap="sm" wrap="nowrap">
            <ThemeIcon size={46} radius="xl" variant="light" color="blue">
              <Repeat2 size={18} />
            </ThemeIcon>
            <Box miw={0}>
              <Text size="sm" fw={700} truncate>
                张三
              </Text>
              <Text size="xs" c="dimmed" truncate>
                量化分析师
              </Text>
            </Box>
          </Group>
          <Divider my="sm" />
          <Button
            type="button"
            variant="subtle"
            color="gray"
            justify="flex-start"
            leftSection={<LogOut size={18} />}
            onClick={() => setShowLogoutConfirm(true)}
            aria-label="退出登录"
            px={8}
          >
            退出登录
          </Button>
        </Paper>
      ) : null}

      {authEnabled && (collapsed || !user) ? (
        <Button
          type="button"
          variant="subtle"
          color="red"
          justify={collapsed ? "center" : "flex-start"}
          leftSection={<LogOut size={18} />}
          onClick={() => setShowLogoutConfirm(true)}
          aria-label="退出"
        >
          {collapsed ? null : "退出"}
        </Button>
      ) : null}

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="退出登录"
        message="确认退出当前登录状态吗？退出后需要重新输入密码。"
        confirmText="确认退出"
        cancelText="取消"
        isDanger
        onConfirm={() => {
          setShowLogoutConfirm(false);
          onNavigate?.();
          void logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </Stack>
  );
};
