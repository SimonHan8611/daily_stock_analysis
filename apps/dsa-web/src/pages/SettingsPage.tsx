import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  Box,
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useAuth } from "../contexts/AuthContext";
import { useSystemConfig } from "../hooks";
import {
  createParsedApiError,
  getParsedApiError,
  type ParsedApiError,
} from "../api/error";
import { systemConfigApi } from "../api/systemConfig";
import {
  ApiErrorAlert,
  Button,
  ConfirmDialog,
  EmptyState,
} from "../components/common";
import {
  AccountSecurityCard,
  IntelligentImport,
  LLMChannelEditor,
  SettingsCategoryNav,
  SettingsAlert,
  SettingsField,
  SettingsLoading,
  SettingsSectionCard,
  UserManagementCard,
} from "../components/settings";
import { WEB_BUILD_INFO } from "../utils/constants";
import {
  showApiErrorNotification,
  showSuccessNotification,
} from "../utils/notifications";
import { getCategoryDescriptionZh } from "../utils/systemConfigI18n";
import type { SystemConfigCategory } from "../types/systemConfig";

type DesktopWindow = Window & {
  dsaDesktop?: {
    version?: unknown;
    getUpdateState?: () => Promise<RawDesktopUpdateState>;
    checkForUpdates?: () => Promise<RawDesktopUpdateState>;
    openReleasePage?: (releaseUrl?: string) => Promise<boolean>;
    onUpdateStateChange?: (
      listener: (state: RawDesktopUpdateState) => void,
    ) => (() => void) | void;
  };
};

type DesktopUpdateState = {
  status?: string;
  currentVersion?: string;
  latestVersion?: string;
  releaseUrl?: string;
  checkedAt?: string;
  publishedAt?: string;
  message?: string;
  releaseName?: string;
  tagName?: string;
};

type RawDesktopUpdateState = {
  status?: unknown;
  currentVersion?: unknown;
  latestVersion?: unknown;
  releaseUrl?: unknown;
  checkedAt?: unknown;
  publishedAt?: unknown;
  message?: unknown;
  releaseName?: unknown;
  tagName?: unknown;
};

const NON_ADMIN_ALLOWED_CATEGORY_KEYS = new Set([
  "base",
  "data_source",
  "notification",
  "backtest",
  "agent",
]);

function trimDesktopRuntimeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getDesktopRuntimeApi() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (window as DesktopWindow).dsaDesktop;
}

function getDesktopAppVersion() {
  return trimDesktopRuntimeString(getDesktopRuntimeApi()?.version);
}

function normalizeDesktopUpdateState(
  state: RawDesktopUpdateState | null | undefined,
) {
  if (!state || typeof state !== "object") {
    return null;
  }

  return {
    status: trimDesktopRuntimeString(state.status) || "idle",
    currentVersion: trimDesktopRuntimeString(state.currentVersion),
    latestVersion: trimDesktopRuntimeString(state.latestVersion),
    releaseUrl: trimDesktopRuntimeString(state.releaseUrl),
    checkedAt: trimDesktopRuntimeString(state.checkedAt),
    publishedAt: trimDesktopRuntimeString(state.publishedAt),
    message: trimDesktopRuntimeString(state.message),
    releaseName: trimDesktopRuntimeString(state.releaseName),
    tagName: trimDesktopRuntimeString(state.tagName),
  };
}

function getDesktopUpdateNotice(state: DesktopUpdateState | null) {
  if (!state) {
    return null;
  }

  if (state.status === "update-available") {
    const latestLabel = state.latestVersion || state.tagName || "最新版本";
    const currentLabel =
      state.currentVersion || getDesktopAppVersion() || "当前版本";
    return {
      title: "发现新版本",
      message: `当前 ${currentLabel}，最新 ${latestLabel}。${state.message || "可前往 GitHub Releases 下载更新。"}`,
      variant: "warning" as const,
      actionLabel: "前往下载",
    };
  }

  if (state.status === "up-to-date") {
    return {
      title: "已是最新版本",
      message: state.message || "当前桌面端已是最新版本。",
      variant: "success" as const,
    };
  }

  if (state.status === "checking") {
    return {
      title: "正在检查更新",
      message: state.message || "正在检查 GitHub Releases 中是否有可用新版本。",
      variant: "warning" as const,
    };
  }

  if (state.status === "error") {
    return {
      title: "检查更新失败",
      message: state.message || "无法完成更新检查，请稍后重试。",
      variant: "error" as const,
    };
  }

  return null;
}

function formatDesktopEnvFilename() {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `dsa-desktop-env_${date}_${time}.env`;
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [desktopActionError, setDesktopActionError] =
    useState<ParsedApiError | null>(null);
  const [desktopActionSuccess, setDesktopActionSuccess] = useState<string>("");
  const [isExportingEnv, setIsExportingEnv] = useState(false);
  const [isImportingEnv, setIsImportingEnv] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [desktopUpdateState, setDesktopUpdateState] =
    useState<DesktopUpdateState | null>(null);
  const [isCheckingDesktopUpdate, setIsCheckingDesktopUpdate] = useState(false);
  const desktopImportRef = useRef<HTMLInputElement | null>(null);
  const desktopRuntimeApi = getDesktopRuntimeApi();
  const isDesktopRuntime = Boolean(desktopRuntimeApi);
  const canCheckDesktopUpdate = Boolean(
    desktopRuntimeApi?.getUpdateState &&
    desktopRuntimeApi?.checkForUpdates &&
    desktopRuntimeApi?.openReleasePage,
  );
  const desktopAppVersion = getDesktopAppVersion();
  const shouldShowDesktopVersionCard = Boolean(desktopAppVersion);

  // Set page title
  useEffect(() => {
    document.title = "系统设置 - DSA";
  }, []);

  const {
    categories: allCategories,
    itemsByCategory,
    issueByKey,
    activeCategory,
    setActiveCategory,
    hasDirty,
    dirtyCount,
    toast,
    clearToast,
    isLoading,
    isSaving,
    loadError,
    saveError,
    retryAction,
    load,
    retry,
    save,
    resetDraft,
    setDraftValue,
    refreshAfterExternalSave,
    configVersion,
    maskToken,
  } = useSystemConfig();

  const categories = isAdmin
    ? allCategories
    : allCategories.filter((c) =>
        NON_ADMIN_ALLOWED_CATEGORY_KEYS.has(c.category),
      );

  useEffect(() => {
    if (
      !isAdmin &&
      activeCategory &&
      !NON_ADMIN_ALLOWED_CATEGORY_KEYS.has(activeCategory)
    ) {
      setActiveCategory("base");
    }
  }, [isAdmin, activeCategory, setActiveCategory]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    if (toast.type === "success") {
      showSuccessNotification({
        title: "操作成功",
        message: toast.message,
        autoClose: 3200,
      });
    } else {
      showApiErrorNotification(toast.error, { autoClose: 4200 });
    }
    clearToast();
  }, [clearToast, toast]);

  useEffect(() => {
    if (!canCheckDesktopUpdate) {
      setDesktopUpdateState(null);
      setIsCheckingDesktopUpdate(false);
      return;
    }

    let active = true;

    const syncDesktopUpdateState = async () => {
      try {
        const state = await desktopRuntimeApi?.getUpdateState?.();
        if (active) {
          setDesktopUpdateState(normalizeDesktopUpdateState(state));
        }
      } catch (error: unknown) {
        if (!active) {
          return;
        }
        setDesktopUpdateState({
          status: "error",
          message:
            error instanceof Error ? error.message : "读取桌面端更新状态失败。",
        });
      }
    };

    void syncDesktopUpdateState();

    const unsubscribe = desktopRuntimeApi?.onUpdateStateChange?.((state) => {
      if (!active) {
        return;
      }
      setDesktopUpdateState(normalizeDesktopUpdateState(state));
      setIsCheckingDesktopUpdate(false);
    });

    return () => {
      active = false;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [canCheckDesktopUpdate, desktopRuntimeApi]);

  const rawActiveItems = itemsByCategory[activeCategory] || [];
  const rawActiveItemMap = new Map(
    rawActiveItems.map((item) => [item.key, String(item.value ?? "")]),
  );
  const hasConfiguredChannels = Boolean(
    (rawActiveItemMap.get("LLM_CHANNELS") || "").trim(),
  );
  const hasLitellmConfig = Boolean(
    (rawActiveItemMap.get("LITELLM_CONFIG") || "").trim(),
  );

  // Hide channel-managed and legacy provider-specific LLM keys from the
  // generic form only when channel config is the active runtime source.
  const LLM_CHANNEL_KEY_RE =
    /^LLM_[A-Z0-9]+_(PROTOCOL|BASE_URL|API_KEY|API_KEYS|MODELS|EXTRA_HEADERS|ENABLED)$/;
  const AI_MODEL_HIDDEN_KEYS = new Set([
    "LLM_CHANNELS",
    "LLM_TEMPERATURE",
    "LITELLM_MODEL",
    "AGENT_LITELLM_MODEL",
    "LITELLM_FALLBACK_MODELS",
    "AIHUBMIX_KEY",
    "DEEPSEEK_API_KEY",
    "DEEPSEEK_API_KEYS",
    "GEMINI_API_KEY",
    "GEMINI_API_KEYS",
    "GEMINI_MODEL",
    "GEMINI_MODEL_FALLBACK",
    "GEMINI_TEMPERATURE",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_API_KEYS",
    "ANTHROPIC_MODEL",
    "ANTHROPIC_TEMPERATURE",
    "ANTHROPIC_MAX_TOKENS",
    "OPENAI_API_KEY",
    "OPENAI_API_KEYS",
    "OPENAI_BASE_URL",
    "OPENAI_MODEL",
    "OPENAI_VISION_MODEL",
    "OPENAI_TEMPERATURE",
    "VISION_MODEL",
  ]);
  const SYSTEM_HIDDEN_KEYS = new Set(["ADMIN_AUTH_ENABLED"]);
  const AGENT_HIDDEN_KEYS = new Set<string>();
  const activeItems =
    activeCategory === "ai_model"
      ? rawActiveItems.filter((item) => {
          if (hasConfiguredChannels && LLM_CHANNEL_KEY_RE.test(item.key)) {
            return false;
          }
          if (
            hasConfiguredChannels &&
            !hasLitellmConfig &&
            AI_MODEL_HIDDEN_KEYS.has(item.key)
          ) {
            return false;
          }
          return true;
        })
      : activeCategory === "system"
        ? rawActiveItems.filter((item) => !SYSTEM_HIDDEN_KEYS.has(item.key))
        : activeCategory === "agent"
          ? rawActiveItems.filter((item) => !AGENT_HIDDEN_KEYS.has(item.key))
          : rawActiveItems;
  const desktopActionDisabled =
    isLoading || isSaving || isExportingEnv || isImportingEnv;

  const downloadDesktopEnv = async () => {
    setDesktopActionError(null);
    setDesktopActionSuccess("");
    setIsExportingEnv(true);
    try {
      const payload = await systemConfigApi.exportDesktopEnv();
      const blob = new Blob([payload.content], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = formatDesktopEnvFilename();
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setDesktopActionSuccess("已导出当前已保存的 .env 备份。");
    } catch (error: unknown) {
      setDesktopActionError(getParsedApiError(error));
    } finally {
      setIsExportingEnv(false);
    }
  };

  const beginDesktopImport = () => {
    setDesktopActionError(null);
    setDesktopActionSuccess("");
    if (hasDirty) {
      setShowImportConfirm(true);
      return;
    }
    desktopImportRef.current?.click();
  };

  const handleDesktopImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setShowImportConfirm(false);
    if (!file) {
      return;
    }

    setDesktopActionError(null);
    setDesktopActionSuccess("");
    setIsImportingEnv(true);
    try {
      const content = await file.text();
      await systemConfigApi.importDesktopEnv({
        configVersion,
        content,
        reloadNow: true,
      });
      const reloaded = await load();
      if (!reloaded) {
        setDesktopActionError(
          createParsedApiError({
            title: "配置已导入但刷新失败",
            message: "备份已导入，但重新加载配置失败，请手动重载页面。",
            rawMessage:
              "Desktop env import succeeded but config refresh failed",
            category: "http_error",
          }),
        );
        return;
      }
      setDesktopActionSuccess("已导入 .env 备份并重新加载配置。");
    } catch (error: unknown) {
      setDesktopActionError(getParsedApiError(error));
    } finally {
      setIsImportingEnv(false);
    }
  };

  const handleDesktopUpdateCheck = async () => {
    if (!desktopRuntimeApi?.checkForUpdates) {
      return;
    }

    setIsCheckingDesktopUpdate(true);
    setDesktopUpdateState((current) => ({
      ...(current || {}),
      status: "checking",
      message: "正在检查 GitHub Releases 中是否有可用新版本。",
    }));

    try {
      const state = await desktopRuntimeApi.checkForUpdates();
      setDesktopUpdateState(normalizeDesktopUpdateState(state));
    } catch (error: unknown) {
      setDesktopUpdateState({
        status: "error",
        message:
          error instanceof Error ? error.message : "检查更新失败，请稍后重试。",
      });
    } finally {
      setIsCheckingDesktopUpdate(false);
    }
  };

  const openDesktopReleasePage = async () => {
    if (!desktopRuntimeApi?.openReleasePage) {
      return;
    }

    await desktopRuntimeApi.openReleasePage(desktopUpdateState?.releaseUrl);
  };

  const desktopUpdateNotice = getDesktopUpdateNotice(desktopUpdateState);

  return (
    <Box className="settings-page min-h-full px-4 pb-6 pt-4 md:px-6">
      <Paper
        radius="xl"
        className="mb-5 rounded-[1.5rem] border settings-border bg-card/94 px-5 py-5 shadow-soft-card-strong backdrop-blur-sm"
        shadow="none"
      >
        <Group justify="space-between" align="center" gap="md">
          <Stack gap={4}>
            <Title
              order={1}
              className="text-xl font-semibold tracking-tight text-foreground"
            >
              系统设置
            </Title>
            <Text className="text-xs leading-6 text-muted-text">
              统一管理模型、数据源、通知、安全认证与导入能力。
            </Text>
          </Stack>

          <Group gap="xs" wrap="wrap">
            <Button
              type="button"
              variant="settings-secondary"
              onClick={resetDraft}
              disabled={isLoading || isSaving}
            >
              重置
            </Button>
            <Button
              type="button"
              variant="settings-primary"
              onClick={() => void save()}
              disabled={!hasDirty || isSaving || isLoading}
              isLoading={isSaving}
              loadingText="保存中..."
            >
              {isSaving
                ? "保存中..."
                : `保存配置${dirtyCount ? ` (${dirtyCount})` : ""}`}
            </Button>
          </Group>
        </Group>

        {saveError ? (
          <ApiErrorAlert
            className="mt-3"
            error={saveError}
            actionLabel={retryAction === "save" ? "重试保存" : undefined}
            onAction={retryAction === "save" ? () => void retry() : undefined}
          />
        ) : null}
      </Paper>

      {loadError ? (
        <ApiErrorAlert
          error={loadError}
          actionLabel={retryAction === "load" ? "重试加载" : "重新加载"}
          onAction={() => void retry()}
          className="mb-4"
        />
      ) : null}

      {isLoading ? (
        <SettingsLoading />
      ) : (
        <Grid className="gap-y-4">
          <Grid.Col span={{ base: 12, lg: 3 }}>
            <aside className="lg:sticky lg:top-4 lg:self-start">
              <SettingsCategoryNav
                categories={categories}
                itemsByCategory={itemsByCategory}
                activeCategory={activeCategory}
                onSelect={setActiveCategory}
              />
            </aside>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 9 }}>
            <Stack gap="md">
              {activeCategory === "base" ? <AccountSecurityCard /> : null}
              {activeCategory === "system" ? <UserManagementCard /> : null}
              {activeCategory === "system" ? (
                <SettingsSectionCard
                  title="版本信息"
                  description="用于确认当前 WebUI 静态资源是否已经切换到最新构建。"
                >
                  <SimpleGrid
                    cols={{ base: 1, md: shouldShowDesktopVersionCard ? 4 : 3 }}
                    spacing="sm"
                  >
                    <Paper
                      radius="xl"
                      className="rounded-2xl border settings-border bg-background/40 px-4 py-3"
                      shadow="none"
                    >
                      <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
                        WebUI 版本
                      </Text>
                      <Text className="mt-2 break-all font-mono text-sm text-foreground">
                        {WEB_BUILD_INFO.version}
                      </Text>
                    </Paper>
                    <Paper
                      radius="xl"
                      className="rounded-2xl border settings-border bg-background/40 px-4 py-3"
                      shadow="none"
                    >
                      <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
                        构建标识
                      </Text>
                      <Text className="mt-2 break-all font-mono text-sm text-foreground">
                        {WEB_BUILD_INFO.buildId}
                      </Text>
                    </Paper>
                    <Paper
                      radius="xl"
                      className="rounded-2xl border settings-border bg-background/40 px-4 py-3"
                      shadow="none"
                    >
                      <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
                        构建时间
                      </Text>
                      <Text className="mt-2 break-all font-mono text-sm text-foreground">
                        {WEB_BUILD_INFO.buildTime}
                      </Text>
                    </Paper>
                    {shouldShowDesktopVersionCard ? (
                      <Paper
                        radius="xl"
                        className="rounded-2xl border settings-border bg-background/40 px-4 py-3"
                        shadow="none"
                      >
                        <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
                          桌面端版本
                        </Text>
                        <Text className="mt-2 break-all font-mono text-sm text-foreground">
                          {desktopAppVersion}
                        </Text>
                      </Paper>
                    ) : null}
                  </SimpleGrid>
                  <Text className="text-xs leading-6 text-muted-text">
                    重新执行前端构建或 Docker
                    镜像构建后，此处的构建标识和构建时间会更新，可用来确认当前页面资源是否已切换。
                  </Text>
                  {canCheckDesktopUpdate ? (
                    <Paper
                      radius="xl"
                      className="mt-4 rounded-2xl border settings-border bg-background/30 px-4 py-4"
                      shadow="none"
                    >
                      <Stack gap="md">
                        <Group justify="space-between" align="center" gap="md">
                          <Stack gap={4}>
                            <Text className="text-sm font-medium text-foreground">
                              桌面端更新
                            </Text>
                            <Text className="text-xs leading-6 text-muted-text">
                              启动后会自动检查 GitHub Releases
                              最新正式版；发现更新时仅提醒并跳转下载页，不会静默下载或自动安装。
                            </Text>
                          </Stack>
                          <Button
                            type="button"
                            variant="settings-secondary"
                            onClick={() => void handleDesktopUpdateCheck()}
                            disabled={isCheckingDesktopUpdate}
                            isLoading={isCheckingDesktopUpdate}
                            loadingText="检查中..."
                          >
                            检查更新
                          </Button>
                        </Group>
                        {desktopUpdateNotice ? (
                          <SettingsAlert
                            title={desktopUpdateNotice.title}
                            message={desktopUpdateNotice.message}
                            variant={desktopUpdateNotice.variant}
                            actionLabel={desktopUpdateNotice.actionLabel}
                            onAction={
                              desktopUpdateNotice.actionLabel
                                ? () => {
                                    void openDesktopReleasePage();
                                  }
                                : undefined
                            }
                          />
                        ) : (
                          <Text className="text-xs leading-6 text-muted-text">
                            当前尚无更新状态，应用启动后会在后台自动检查。
                          </Text>
                        )}
                      </Stack>
                    </Paper>
                  ) : null}
                  {WEB_BUILD_INFO.isFallbackVersion ? (
                    <Text className="text-xs leading-6 text-amber-700 dark:text-amber-300">
                      当前 package.json 仍为占位版本
                      0.0.0，页面已自动回退展示构建标识，避免误判旧资源仍在生效。
                    </Text>
                  ) : null}
                </SettingsSectionCard>
              ) : null}
              {activeCategory === "system" && isDesktopRuntime ? (
                <SettingsSectionCard
                  title="配置备份"
                  description="导出当前已保存的 .env 备份，或从备份文件恢复桌面端配置。导入会覆盖备份中出现的键并立即重载。"
                >
                  <Stack gap="md">
                    <Group gap="sm" wrap="wrap">
                      <Button
                        type="button"
                        variant="settings-secondary"
                        onClick={() => void downloadDesktopEnv()}
                        disabled={desktopActionDisabled}
                        isLoading={isExportingEnv}
                        loadingText="导出中..."
                      >
                        导出 .env
                      </Button>
                      <Button
                        type="button"
                        variant="settings-primary"
                        onClick={beginDesktopImport}
                        disabled={desktopActionDisabled}
                        isLoading={isImportingEnv}
                        loadingText="导入中..."
                      >
                        导入 .env
                      </Button>
                      <input
                        ref={desktopImportRef}
                        type="file"
                        accept=".env,.txt"
                        className="hidden"
                        onChange={(event) => {
                          void handleDesktopImportFile(event);
                        }}
                      />
                    </Group>
                    <Text className="text-xs leading-6 text-muted-text">
                      导出内容仅包含当前已保存配置，不包含页面上尚未保存的本地草稿。
                    </Text>
                    {desktopActionError ? (
                      <ApiErrorAlert
                        error={desktopActionError}
                        actionLabel={
                          desktopActionError.status === 409
                            ? "重新加载"
                            : undefined
                        }
                        onAction={
                          desktopActionError.status === 409
                            ? () => void load()
                            : undefined
                        }
                      />
                    ) : null}
                    {!desktopActionError && desktopActionSuccess ? (
                      <SettingsAlert
                        title="操作成功"
                        message={desktopActionSuccess}
                        variant="success"
                      />
                    ) : null}
                  </Stack>
                </SettingsSectionCard>
              ) : null}
              {activeCategory === "base" ? (
                <SettingsSectionCard
                  title="智能导入"
                  description="从图片、文件或剪贴板中提取股票代码，并合并到自选股列表。"
                >
                  <IntelligentImport
                    stockListValue={
                      (activeItems.find((i) => i.key === "STOCK_LIST")
                        ?.value as string) ?? ""
                    }
                    configVersion={configVersion}
                    maskToken={maskToken}
                    onMerged={async () => {
                      await refreshAfterExternalSave(["STOCK_LIST"]);
                    }}
                    disabled={isSaving || isLoading}
                  />
                </SettingsSectionCard>
              ) : null}
              {activeCategory === "ai_model" ? (
                <SettingsSectionCard
                  title="AI 模型接入"
                  description="统一管理模型渠道、基础地址、API Key、主模型与备选模型。"
                >
                  <LLMChannelEditor
                    items={rawActiveItems}
                    configVersion={configVersion}
                    maskToken={maskToken}
                    onSaved={async (updatedItems) => {
                      await refreshAfterExternalSave(
                        updatedItems.map((item) => item.key),
                      );
                    }}
                    disabled={isSaving || isLoading}
                  />
                </SettingsSectionCard>
              ) : null}
              {activeItems.length ? (
                <SettingsSectionCard
                  title="当前分类配置项"
                  description={
                    getCategoryDescriptionZh(
                      activeCategory as SystemConfigCategory,
                      "",
                    ) || "使用统一字段卡片维护当前分类的系统配置。"
                  }
                >
                  {activeItems.map((item) => (
                    <SettingsField
                      key={item.key}
                      item={item}
                      value={item.value}
                      disabled={isSaving}
                      onChange={setDraftValue}
                      issues={issueByKey[item.key] || []}
                    />
                  ))}
                </SettingsSectionCard>
              ) : (
                <EmptyState
                  title="当前分类下暂无配置项"
                  description="当前分类没有可编辑字段；可切换左侧分类继续查看其它系统配置。"
                  className="settings-surface-panel settings-border-strong border-none bg-transparent shadow-none"
                />
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      )}

      <ConfirmDialog
        isOpen={showImportConfirm}
        title="导入会覆盖当前草稿"
        message="当前页面还有未保存修改。继续导入会丢弃这些本地草稿，并立即用备份文件中的键值更新已保存配置。"
        confirmText="继续导入"
        cancelText="取消"
        onConfirm={() => {
          setShowImportConfirm(false);
          desktopImportRef.current?.click();
        }}
        onCancel={() => {
          setShowImportConfirm(false);
        }}
      />
    </Box>
  );
};

export default SettingsPage;
