import React, { useState } from "react";
import { authApi } from "../../api/auth";
import {
  createParsedApiError,
  getParsedApiError,
  type ParsedApiError,
} from "../../api/error";
import { useAuth } from "../../contexts/AuthContext";
import { ApiErrorAlert, Button, Input } from "../common";
import { SettingsAlert } from "./SettingsAlert";
import { SettingsSectionCard } from "./SettingsSectionCard";

function localizePasswordChangeError(error: unknown): ParsedApiError {
  const parsed = getParsedApiError(error);
  const matchText = [parsed.title, parsed.message, parsed.rawMessage]
    .filter(Boolean)
    .join(" | ")
    .toLowerCase();

  if (
    matchText.includes("invalid_current_password") ||
    matchText.includes("current password is incorrect")
  ) {
    return createParsedApiError({
      title: "当前密码不正确",
      message: "请输入正确的当前密码后再试。",
      rawMessage: parsed.rawMessage,
      status: parsed.status,
      category: parsed.category,
    });
  }

  if (
    matchText.includes("password_mismatch") ||
    matchText.includes("new passwords do not match")
  ) {
    return createParsedApiError({
      title: "新密码不一致",
      message: "两次输入的新密码不一致，请重新确认。",
      rawMessage: parsed.rawMessage,
      status: parsed.status,
      category: parsed.category,
    });
  }

  if (
    matchText.includes("password_unchanged") ||
    matchText.includes("must be different from current password")
  ) {
    return createParsedApiError({
      title: "新密码不能重复",
      message: "新密码不能与当前密码相同，请换一个密码。",
      rawMessage: parsed.rawMessage,
      status: parsed.status,
      category: parsed.category,
    });
  }

  if (parsed.status === 401) {
    return createParsedApiError({
      title: "登录状态已失效",
      message: "请重新登录后再修改密码。",
      rawMessage: parsed.rawMessage,
      status: parsed.status,
      category: parsed.category,
    });
  }

  return createParsedApiError({
    title: "修改失败",
    message: "密码修改失败，请稍后重试。",
    rawMessage: parsed.rawMessage,
    status: parsed.status,
    category: parsed.category,
  });
}

export const AccountSecurityCard: React.FC = () => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ParsedApiError | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage("");

    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      setError(
        createParsedApiError({
          title: "缺少必填项",
          message: "请完整填写当前密码、新密码和确认新密码。",
          category: "http_error",
        }),
      );
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setError(
        createParsedApiError({
          title: "两次密码不一致",
          message: "请确认两次输入的新密码完全一致。",
          category: "http_error",
        }),
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authApi.changePassword(
        currentPassword,
        newPassword,
        newPasswordConfirm,
      );
      setSuccessMessage(
        result.message === "Password updated successfully"
          ? "修改成功"
          : result.message || "修改成功",
      );
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (submitError: unknown) {
      setError(localizePasswordChangeError(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SettingsSectionCard
      title="账号安全"
      description="查看当前登录账号，并修改当前账号密码。"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border settings-border bg-background/40 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
              当前用户名
            </p>
            <p className="mt-2 break-all text-sm font-medium text-foreground">
              {user?.username || "-"}
            </p>
          </div>
          <div className="rounded-2xl border settings-border bg-background/40 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
              当前邮箱
            </p>
            <p className="mt-2 break-all text-sm font-medium text-foreground">
              {user?.email || "未设置"}
            </p>
          </div>
          <div className="rounded-2xl border settings-border bg-background/40 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
              当前角色
            </p>
            <p className="mt-2 break-all text-sm font-medium text-foreground">
              {user?.role || "-"}
            </p>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              id="current-password"
              label="当前密码"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              allowTogglePassword
              iconType="password"
            />
            <div className="hidden md:block" />
            <Input
              id="new-password"
              label="新密码"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              allowTogglePassword
              iconType="password"
              hint="至少 6 位，且不能与当前密码相同。"
            />
            <Input
              id="new-password-confirm"
              label="确认新密码"
              type="password"
              value={newPasswordConfirm}
              onChange={(event) => setNewPasswordConfirm(event.target.value)}
              autoComplete="new-password"
              allowTogglePassword
              iconType="password"
            />
          </div>

          {error ? <ApiErrorAlert error={error} /> : null}
          {!error && successMessage ? (
            <SettingsAlert
              title="修改成功"
              message={successMessage}
              variant="success"
            />
          ) : null}

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="settings-primary"
              isLoading={isSubmitting}
              loadingText="提交中..."
            >
              修改密码
            </Button>
          </div>
        </form>
      </div>
    </SettingsSectionCard>
  );
};
