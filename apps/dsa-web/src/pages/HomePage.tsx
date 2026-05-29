import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Center,
  Grid,
  Group,
  Indicator,
  Paper,
  Popover,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  Bell,
  BarChart3,
  CheckCircle2,
  FileText,
  Menu,
  MessageSquare,
  RefreshCw,
  Search,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  ApiErrorAlert,
  Button,
  Checkbox,
  ConfirmDialog,
  Drawer,
  EmptyState,
  InlineAlert,
} from "../components/common";
import { DashboardStateBlock } from "../components/dashboard";
import { HistoryList, HistoryTrendTable } from "../components/history";
import { ReportMarkdown, ReportSummary } from "../components/report";
import { StockAutocomplete } from "../components/StockAutocomplete";
import { TaskPanel } from "../components/tasks";
import { useDashboardLifecycle, useHomeDashboardState } from "../hooks";
import {
  getReportText,
  normalizeReportLanguage,
} from "../utils/reportLanguage";

const STOCK_INPUT_PLACEHOLDER = "输入股票代码或名称，如 600519、贵州茅台、AAPL";

const surfaceClass =
  "border border-[hsl(220_20%_90%)] !bg-white shadow-[0_8px_22px_hsl(220_18%_20%/0.04)]";
const panelTitleClass = "text-[1rem] font-[800] text-[hsl(226_28%_16%)]";

const noticeColorClass = {
  blue: "bg-gradient-to-br from-blue-600 to-cyan-500",
  green: "bg-gradient-to-br from-green-500 to-teal-700",
  red: "bg-gradient-to-br from-red-500 to-red-600",
} as const;

const buildFollowUpChatPath = (
  stockCode: string,
  stockName: string,
  recordId: number,
) =>
  `/chat?stock=${encodeURIComponent(stockCode)}&name=${encodeURIComponent(stockName)}&recordId=${recordId}`;

const formatDashboardTime = (value: Date) =>
  new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [historyTrendDrawerOpen, setHistoryTrendDrawerOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const {
    query,
    inputError,
    duplicateError,
    error,
    isAnalyzing,
    historyItems,
    selectedHistoryIds,
    isDeletingHistory,
    isLoadingHistory,
    isLoadingMore,
    hasMore,
    selectedReport,
    isLoadingReport,
    activeTasks,
    markdownDrawerOpen,
    setQuery,
    clearError,
    loadInitialHistory,
    refreshHistory,
    loadMoreHistory,
    selectHistoryItem,
    toggleHistorySelection,
    toggleSelectAllVisible,
    deleteSelectedHistory,
    submitAnalysis,
    notify,
    setNotify,
    syncTaskCreated,
    syncTaskUpdated,
    syncTaskFailed,
    removeTask,
    openMarkdownDrawer,
    closeMarkdownDrawer,
    selectedIds,
  } = useHomeDashboardState();

  useEffect(() => {
    document.title = "每日选股分析 - DSA";
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useDashboardLifecycle({
    loadInitialHistory,
    refreshHistory,
    syncTaskCreated,
    syncTaskUpdated,
    syncTaskFailed,
    removeTask,
  });

  const reportLanguage = normalizeReportLanguage(
    selectedReport?.meta.reportLanguage,
  );
  const reportText = getReportText(reportLanguage);

  const handleHistoryItemClick = useCallback(
    (recordId: number) => {
      void selectHistoryItem(recordId);
      setSidebarOpen(false);
    },
    [selectHistoryItem],
  );

  const handleSubmitAnalysis = useCallback(
    (
      stockCode?: string,
      stockName?: string,
      selectionSource?: "manual" | "autocomplete" | "import" | "image",
    ) => {
      void submitAnalysis({
        stockCode,
        stockName,
        originalQuery: query,
        selectionSource: selectionSource ?? "manual",
      });
    },
    [query, submitAnalysis],
  );

  const handleAskFollowUp = useCallback(() => {
    if (selectedReport?.meta.id === undefined) {
      return;
    }
    navigate(
      buildFollowUpChatPath(
        selectedReport.meta.stockCode,
        selectedReport.meta.stockName,
        selectedReport.meta.id,
      ),
    );
  }, [navigate, selectedReport]);

  const handleReanalyze = useCallback(() => {
    if (!selectedReport) {
      return;
    }
    void submitAnalysis({
      stockCode: selectedReport.meta.stockCode,
      stockName: selectedReport.meta.stockName,
      originalQuery: selectedReport.meta.stockCode,
      selectionSource: "manual",
      forceRefresh: true,
    });
  }, [selectedReport, submitAnalysis]);

  const handleDeleteSelectedHistory = useCallback(() => {
    void deleteSelectedHistory();
    setShowDeleteConfirm(false);
  }, [deleteSelectedHistory]);

  const sidebarContent = useMemo(
    () => (
      <div className="flex flex-col">
        <TaskPanel tasks={activeTasks} embedded />
        <HistoryList
          items={historyItems}
          isLoading={isLoadingHistory}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          selectedId={selectedReport?.meta.id}
          selectedIds={selectedIds}
          isDeleting={isDeletingHistory}
          onItemClick={handleHistoryItemClick}
          onLoadMore={() => void loadMoreHistory()}
          onToggleItemSelection={toggleHistorySelection}
          onToggleSelectAll={toggleSelectAllVisible}
          onDeleteSelected={() => setShowDeleteConfirm(true)}
          className="pt-2"
          embedded
          useInternalScroll={false}
        />
      </div>
    ),
    [
      activeTasks,
      handleHistoryItemClick,
      hasMore,
      historyItems,
      isDeletingHistory,
      isLoadingHistory,
      isLoadingMore,
      loadMoreHistory,
      selectedIds,
      selectedReport?.meta.id,
      toggleHistorySelection,
      toggleSelectAllVisible,
    ],
  );

  const latestUpdateTime = useMemo(
    () =>
      historyItems[0]?.createdAt ? new Date(historyItems[0].createdAt) : now,
    [historyItems, now],
  );

  const notificationRows = [
    ["系统完成自动分析，发现 312 个投资机会", "15:18", "blue"],
    ["新机会推荐（600580.SH）当前机会强度：高", "15:03", "green"],
    ["您的持仓今日盈亏 +12,654.21 元", "14:58", "red"],
    ["三安光电（002050.SZ）发布业绩公告", "14:32", "blue"],
    ["策略回测任务已完成，点击查看结果", "14:10", "green"],
  ];
  const isDrawerOpen = markdownDrawerOpen || historyTrendDrawerOpen;

  return (
    <div
      data-testid="home-dashboard"
      className="home-workbench-page flex min-h-[calc(100vh-2rem)] w-full flex-col gap-3 bg-[hsl(216_20%_97.5%)] pb-4 text-[hsl(226_43%_14%)]"
    >
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-3 px-3 pt-3 md:px-5 md:pt-4">
        {inputError || duplicateError ? (
          <div className="pb-1">
            {inputError ? (
              <InlineAlert
                variant="danger"
                title="输入有误"
                message={inputError}
                className="rounded-xl px-3 py-2 text-xs shadow-none"
              />
            ) : null}
            {!inputError && duplicateError ? (
              <InlineAlert
                variant="warning"
                title="任务已存在"
                message={duplicateError}
                className="rounded-xl px-3 py-2 text-xs shadow-none"
              />
            ) : null}
          </div>
        ) : null}

        <Paper
          className={`${surfaceClass} overflow-hidden`}
          radius="lg"
          shadow="none"
        >
          <div className="px-4 py-3 md:px-5">
            <Group
              justify="space-between"
              align="center"
              gap="sm"
              wrap="wrap"
              className="mb-2.5"
            >
              <div>
                <Text className="text-[1.08rem] font-[850] leading-none text-[hsl(226_28%_16%)]">
                  市场分析工作台
                </Text>
                <Text
                  mt={5}
                  className="max-w-[42rem] text-[0.8rem] leading-5 text-[hsl(220_16%_48%)]"
                >
                  聚合大盘、机会、持仓与报告入口，让首页更像一个干净的分析面板。
                </Text>
              </div>
              <Group
                gap="sm"
                wrap="nowrap"
                className="max-sm:w-full max-sm:justify-between"
              >
                <div className="inline-flex items-center gap-[0.45rem] whitespace-nowrap text-[0.84rem] font-semibold text-[hsl(220_16%_38%)]">
                  <CheckCircle2 size={14} className="text-[hsl(151_74%_40%)]" />
                  已更新 {formatDashboardTime(latestUpdateTime).slice(0, 5)}
                </div>
                <Popover
                  opened={notificationsOpen}
                  onChange={setNotificationsOpen}
                  position="bottom-end"
                  radius="lg"
                  shadow="lg"
                  width={380}
                >
                  <Popover.Target>
                    <Indicator
                      label="12"
                      color="red"
                      size={18}
                      offset={4}
                      inline
                      withBorder
                      disabled={isDrawerOpen}
                    >
                      <ActionIcon
                        className="border border-[hsl(220_18%_91%)] bg-[hsl(220_20%_99%)] text-[hsl(220_20%_34%)]"
                        variant="subtle"
                        size={42}
                        aria-label="通知"
                        onClick={() => setNotificationsOpen((open) => !open)}
                      >
                        <Bell size={18} />
                      </ActionIcon>
                    </Indicator>
                  </Popover.Target>
                  <Popover.Dropdown className="w-[23.75rem] border border-[hsl(216_24%_88%)] p-3">
                    <Text className="mb-3 text-[1rem] font-[800] text-[hsl(226_28%_16%)]">
                      通知中心
                    </Text>
                    <ScrollArea.Autosize mah="17rem" type="auto">
                      <Stack gap={6} pr={4}>
                        {notificationRows.map((row) => (
                          <div
                            key={row[0]}
                            className="flex min-h-9 items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-[hsl(216_28%_97%)]"
                          >
                            <ThemeIcon
                              size="1.45rem"
                              radius="xl"
                              className={
                                noticeColorClass[
                                  row[2] as keyof typeof noticeColorClass
                                ]
                              }
                            >
                              {row[2] === "red" ? (
                                <WalletCards size={14} />
                              ) : (
                                <Bell size={14} />
                              )}
                            </ThemeIcon>
                            <Text
                              className="min-w-0 flex-1"
                              size="sm"
                              c="dimmed"
                              truncate
                            >
                              {row[0]}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {row[1]}
                            </Text>
                          </div>
                        ))}
                      </Stack>
                    </ScrollArea.Autosize>
                  </Popover.Dropdown>
                </Popover>
              </Group>
            </Group>

            <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="dsa-search-wrap relative w-full">
                <Search
                  className="absolute left-[1.05rem] top-1/2 z-[2] -translate-y-1/2 text-[hsl(220_20%_42%)]"
                  size={19}
                  aria-hidden="true"
                />
                <StockAutocomplete
                  value={query}
                  onChange={setQuery}
                  onSubmit={(stockCode, stockName, selectionSource) => {
                    handleSubmitAnalysis(stockCode, stockName, selectionSource);
                  }}
                  placeholder={STOCK_INPUT_PLACEHOLDER}
                  disabled={isAnalyzing}
                  className={inputError ? "border-danger/50" : undefined}
                />
              </div>
              <Group
                gap="sm"
                wrap="nowrap"
                className="items-center max-xl:flex-wrap"
              >
                <Checkbox
                  checked={notify}
                  onChange={(e) => setNotify(e.target.checked)}
                  label="推送通知"
                  containerClassName="flex h-[3.25rem] items-center justify-center rounded-[0.8rem] border border-[hsl(220_18%_91%)] bg-[hsl(220_20%_99%)] px-3"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void refreshHistory()}
                  className="h-[3.25rem] whitespace-nowrap rounded-[0.8rem] px-4"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  刷新
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSubmitAnalysis()}
                  disabled={!query || isAnalyzing}
                  variant="primary"
                  isLoading={isAnalyzing}
                  loadingText="分析中"
                  className="h-[3.25rem] whitespace-nowrap rounded-[0.8rem] px-4 shadow-none"
                >
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                  立即分析
                </Button>
                <ActionIcon
                  onClick={() => setSidebarOpen(true)}
                  variant="subtle"
                  size="lg"
                  hiddenFrom="xl"
                  aria-label="历史记录"
                  className="border border-[hsl(220_18%_91%)] bg-[hsl(220_20%_99%)]"
                >
                  <Menu size={18} />
                </ActionIcon>
              </Group>
            </div>
          </div>
        </Paper>

        {error ? (
          <ApiErrorAlert
            error={error}
            onDismiss={clearError}
            className="rounded-xl shadow-none"
          />
        ) : null}

        <Grid
          gap="md"
          align="stretch"
          className="home-workbench-main-grid overflow-x-hidden"
        >
          {sidebarOpen ? (
            <div
              className="fixed inset-0 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <div className="page-drawer-overlay absolute inset-0" />
              <div
                className="dashboard-card absolute bottom-0 left-0 top-0 flex w-72 flex-col overflow-hidden !rounded-none !rounded-r-xl p-3 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                {sidebarContent}
              </div>
            </div>
          ) : null}

          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Paper
              className={`${surfaceClass} flex min-h-[20rem] flex-col overflow-hidden px-4 py-2.5 lg:sticky lg:top-4 lg:h-[calc(100vh-13.5rem)]`}
              radius="lg"
              shadow="none"
            >
              <Group
                justify="space-between"
                align="flex-start"
                gap="sm"
                className="border-b border-[hsl(220_18%_90%)] pb-1.5"
                wrap="nowrap"
              >
                <div className="min-w-0">
                  <Text className="text-[0.9rem] font-semibold tracking-[-0.015em] text-foreground">
                    任务与历史
                  </Text>
                  <Text className="mt-0.5 text-[10px] font-medium leading-4 text-muted-text">
                    继续分析任务并回看每次股票结论
                  </Text>
                </div>
                <Stack gap={0} className="shrink-0 text-right">
                  <Text size="xs" c="dimmed">
                    {activeTasks.length} 个任务
                  </Text>
                  <Text size="xs" c="dimmed">
                    {historyItems.length} 条历史
                  </Text>
                </Stack>
              </Group>

              <div className="min-h-0 h-full flex-1 overflow-y-auto overflow-x-hidden pt-2 pr-1 custom-scrollbar">
                {sidebarContent}
              </div>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Paper
              className={`${surfaceClass} flex min-h-[32rem] flex-col overflow-hidden`}
              radius="lg"
              shadow="none"
            >
              <Group
                justify="space-between"
                gap="sm"
                className="border-b border-[hsl(220_18%_90%)] px-4 py-3"
                wrap="wrap"
              >
                <div>
                  <Text className={panelTitleClass}>分析结果</Text>
                  <Text size="xs" c="dimmed" mt={3}>
                    {selectedReport
                      ? `${selectedReport.meta.stockName || selectedReport.meta.stockCode} 的历史报告`
                      : "输入股票代码开始分析，或从左侧选择历史报告。"}
                  </Text>
                </div>

                <Group gap="xs" wrap="wrap">
                  <Button
                    variant="home-action-ai"
                    size="sm"
                    onClick={() => {
                      setNotificationsOpen(false);
                      setHistoryTrendDrawerOpen(true);
                    }}
                    disabled={!selectedReport}
                    className="h-8 px-2.5 text-xs"
                  >
                    <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                    历史分析
                  </Button>
                  <Button
                    variant="home-action-ai"
                    size="sm"
                    disabled={
                      selectedReport ? isAnalyzing : !query || isAnalyzing
                    }
                    onClick={
                      selectedReport
                        ? handleReanalyze
                        : () => handleSubmitAnalysis()
                    }
                    className="h-8 px-2.5 text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    {selectedReport ? reportText.reanalyze : "重新分析"}
                  </Button>
                  <Button
                    variant="home-action-ai"
                    size="sm"
                    onClick={handleAskFollowUp}
                    disabled={!selectedReport}
                    className="h-8 px-2.5 text-xs"
                  >
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    追问 AI
                  </Button>
                  <Button
                    variant="home-action-report"
                    size="sm"
                    onClick={() => {
                      setNotificationsOpen(false);
                      openMarkdownDrawer();
                    }}
                    disabled={!selectedReport}
                    className="h-8 px-2.5 text-xs"
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    {selectedReport ? reportText.fullReport : "完整分析报告"}
                  </Button>
                </Group>
              </Group>

              <ScrollArea
                className="min-h-0"
                classNames={{ root: "overflow-visible", viewport: "overflow-visible" }}
                type="auto"
              >
                <div className="px-4 py-4">
                  {isLoadingReport ? (
                    <Center className="min-h-[24rem]">
                      <DashboardStateBlock title="加载报告中..." loading />
                    </Center>
                  ) : selectedReport ? (
                    <ReportSummary data={selectedReport} isHistory />
                  ) : (
                    <Center className="min-h-[24rem]">
                      <EmptyState
                        title="开始分析"
                        description="输入股票代码进行分析，或从左侧选择历史报告查看。"
                        className="max-w-xl border-dashed"
                      />
                    </Center>
                  )}
                </div>
              </ScrollArea>
            </Paper>
          </Grid.Col>
        </Grid>
      </div>

      {markdownDrawerOpen && selectedReport?.meta.id ? (
        <ReportMarkdown
          recordId={selectedReport.meta.id}
          stockName={selectedReport.meta.stockName || ""}
          stockCode={selectedReport.meta.stockCode}
          reportLanguage={reportLanguage}
          onClose={closeMarkdownDrawer}
        />
      ) : null}

      {selectedReport ? (
        <Drawer
          isOpen={historyTrendDrawerOpen}
          onClose={() => setHistoryTrendDrawerOpen(false)}
          title={`${selectedReport.meta.stockName || selectedReport.meta.stockCode} 历史分析`}
          width="max-w-3xl"
          side="right"
        >
          <HistoryTrendTable
            stockCode={selectedReport.meta.stockCode}
            stockName={selectedReport.meta.stockName}
            className="mt-0"
          />
        </Drawer>
      ) : null}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="删除历史记录"
        message={
          selectedHistoryIds.length === 1
            ? "确认删除这条历史记录吗？删除后将不可恢复。"
            : `确认删除选中的 ${selectedHistoryIds.length} 条历史记录吗？删除后将不可恢复。`
        }
        confirmText={isDeletingHistory ? "删除中..." : "确认删除"}
        cancelText="取消"
        isDanger={true}
        onConfirm={handleDeleteSelectedHistory}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};

export default HomePage;
