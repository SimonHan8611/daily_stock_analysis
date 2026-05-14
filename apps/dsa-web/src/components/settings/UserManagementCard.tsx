import React, { useEffect, useState } from "react";
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
      <div className="space-y-4">
        {loading ? (
          <div className="text-sm text-secondary-text">加载中...</div>
        ) : error ? (
          <div className="text-sm text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/50 text-secondary-text">
                <tr>
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">用户名</th>
                  <th className="pb-2 font-medium">角色</th>
                  <th className="pb-2 font-medium">状态</th>
                  <th className="pb-2 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="group transition-colors hover:bg-hover/50"
                  >
                    <td className="py-3 text-secondary-text">#{user.id}</td>
                    <td className="py-3 font-medium text-foreground">
                      {user.username}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-text">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <StatusDot
                          tone={user.is_active ? "success" : "neutral"}
                        />
                        <span className="text-secondary-text">
                          {user.is_active ? "正常" : "禁用"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      {user.role !== "admin" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(user.id, user.is_active)}
                        >
                          {user.is_active ? "禁用" : "启用"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SettingsSectionCard>
  );
};
