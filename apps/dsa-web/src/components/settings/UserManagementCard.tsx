import React, { useEffect, useState } from "react";
import { Alert, Badge, Group, Loader, Paper, ScrollArea, Stack, Table, Text } from "@mantine/core";
import { SettingsSectionCard } from "./SettingsSectionCard";
import { Button } from "../common/Button";
import { StatusDot } from "../common/StatusDot";
import apiClient from "../../api";

type UserInfo = {
  id: number;
  username: string;
  email: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
};

export const UserManagementCard: React.FC = () => {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<UserInfo[]>("/api/v1/auth/users");
      setUsers(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : String(err) || "获取用户列表失败",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const toggleStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await apiClient.patch(`/api/v1/auth/users/${userId}/status`, {
        is_active: !currentStatus,
      });
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, is_active: !currentStatus } : u,
        ),
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err) || "更新状态失败");
    }
  };

  return (
    <SettingsSectionCard
      title="用户管理"
      description="管理系统注册用户及账号状态"
    >
      <Stack gap="md">
        {loading ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
            <Text className="text-sm text-secondary-text">加载中...</Text>
          </Group>
        ) : error ? (
          <Alert color="red" variant="light" radius="xl">
            {error}
          </Alert>
        ) : (
          <Paper radius="xl" withBorder p={0} shadow="none">
            <ScrollArea>
              <Table highlightOnHover striped={false} verticalSpacing="md" horizontalSpacing="md">
                <Table.Thead>
                  <Table.Tr className="text-secondary-text">
                    <Table.Th>ID</Table.Th>
                    <Table.Th>用户名</Table.Th>
                    <Table.Th>角色</Table.Th>
                    <Table.Th>状态</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>操作</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                {users.map((user) => (
                  <Table.Tr
                    key={user.id}
                    className="group transition-colors hover:bg-hover/50"
                  >
                    <Table.Td className="text-secondary-text">#{user.id}</Table.Td>
                    <Table.Td className="font-medium text-foreground">
                      {user.username}
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" radius="xl">
                        {user.role}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <StatusDot
                          tone={user.is_active ? "success" : "neutral"}
                        />
                        <Text className="text-secondary-text">
                          {user.is_active ? "正常" : "禁用"}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>
                      {user.role !== "admin" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(user.id, user.is_active)}
                        >
                          {user.is_active ? "禁用" : "启用"}
                        </Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Paper>
        )}
      </Stack>
    </SettingsSectionCard>
  );
};
