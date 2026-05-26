import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { Group, Paper, ScrollArea, Stack, Table, Text } from "@mantine/core";
import { Check, Minus, X } from "lucide-react";
import { backtestApi } from "../api/backtest";
import type { ParsedApiError } from "../api/error";
import { getParsedApiError } from "../api/error";
import {
  ApiErrorAlert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Pagination,
  SectionCard,
  StatusDot,
  Tooltip,
  Toolbar,
} from "../components/common";
import type {
  BacktestResultItem,
  BacktestRunResponse,
  PerformanceMetrics,
} from "../types/backtest";

// ============ Helpers ============

function pct(value?: number | null): string {
  if (value == null) return "--";
  return `${value.toFixed(1)}%`;
}

function outcomeBadge(outcome?: string) {
  if (!outcome) return <Badge variant="default">--</Badge>;
  switch (outcome) {
    case "win":
      return (
        <Badge variant="success" glow>
          盈利
        </Badge>
      );
    case "loss":
      return (
        <Badge variant="danger" glow>
          亏损
        </Badge>
      );
    case "neutral":
      return <Badge variant="warning">持平</Badge>;
    default:
      return <Badge variant="default">{outcome}</Badge>;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge variant="success">完成</Badge>;
    case "insufficient":
    case "insufficient_data":
      return <Badge variant="warning">数据不足</Badge>;
    case "error":
      return <Badge variant="danger">错误</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

function actualMovementBadge(movement?: string | null) {
  switch (movement) {
    case "up":
      return <Badge variant="success">上涨</Badge>;
    case "down":
      return <Badge variant="danger">下跌</Badge>;
    case "flat":
      return <Badge variant="warning">横盘</Badge>;
    default:
      return <Badge variant="default">--</Badge>;
  }
}

function boolIcon(value?: boolean | null) {
  if (value === true) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success/10 px-2 py-1 text-success"
        aria-label="是"
      >
        <StatusDot tone="success" className="h-2 w-2" />
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (value === false) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-danger/25 bg-danger/10 px-2 py-1 text-danger"
        aria-label="否"
      >
        <StatusDot tone="danger" className="h-2 w-2" />
        <X className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2 py-1 text-secondary-text"
      aria-label="未知"
    >
      <StatusDot tone="neutral" className="h-2 w-2" />
      <Minus className="h-3.5 w-3.5" />
    </span>
  );
}

// ============ Metric Row ============

const MetricRow: React.FC<{
  label: string;
  value: string;
  accent?: boolean;
}> = ({ label, value, accent }) => (
  <Group justify="space-between" gap="sm" wrap="nowrap">
    <Text className="text-xs text-secondary-text">{label}</Text>
    <Text
      className={`text-sm font-mono ${accent ? "text-cyan" : "text-foreground"}`}
    >
      {value}
    </Text>
  </Group>
);

// ============ Performance Card ============

const PerformanceCard: React.FC<{
  metrics: PerformanceMetrics;
  title: string;
}> = ({ metrics, title }) => (
  <Card variant="gradient" padding="md" className="animate-fade-in">
    <Stack gap="sm">
      <div>
        <span className="label-uppercase">{title}</span>
      </div>
      <MetricRow
        label="方向准确率"
        value={pct(metrics.directionAccuracyPct)}
        accent
      />
      <MetricRow label="胜率" value={pct(metrics.winRatePct)} accent />
      <MetricRow
        label="模拟收益均值"
        value={pct(metrics.avgSimulatedReturnPct)}
      />
      <MetricRow
        label="股票收益均值"
        value={pct(metrics.avgStockReturnPct)}
      />
      <MetricRow
        label="止损触发率"
        value={pct(metrics.stopLossTriggerRate)}
      />
      <MetricRow
        label="止盈触发率"
        value={pct(metrics.takeProfitTriggerRate)}
      />
      <MetricRow
        label="平均命中天数"
        value={
          metrics.avgDaysToFirstHit != null
            ? metrics.avgDaysToFirstHit.toFixed(1)
            : "--"
        }
      />
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <Text className="text-xs text-muted-text">有效评估</Text>
        <Text className="text-xs font-mono text-secondary-text">
          {Number(metrics.completedCount)} / {Number(metrics.totalEvaluations)}
        </Text>
      </Group>
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <Text className="text-xs text-muted-text">盈 / 亏 / 平</Text>
        <Text className="text-xs font-mono">
          <span className="text-success">{metrics.winCount}</span>
          {" / "}
          <span className="text-danger">{metrics.lossCount}</span>
          {" / "}
          <span className="text-warning">{metrics.neutralCount}</span>
        </Text>
      </Group>
    </Stack>
  </Card>
);

// ============ Run Summary ============

const RunSummary: React.FC<{ data: BacktestRunResponse }> = ({ data }) => (
  <Paper
    radius="xl"
    className="glass-panel px-4 py-3 animate-fade-in"
    shadow="none"
  >
    <Group gap="lg" wrap="wrap">
      <Text className="text-sm text-secondary-text">
        <span>已处理：</span>{" "}
        <span className="font-semibold text-foreground">{data.processed}</span>
      </Text>
      <Text className="text-sm text-secondary-text">
        <span>已保存：</span>{" "}
        <span className="font-semibold text-cyan">{data.saved}</span>
      </Text>
      <Text className="text-sm text-secondary-text">
        <span>已完成：</span>{" "}
        <span className="font-semibold text-success">{data.completed}</span>
      </Text>
      <Text className="text-sm text-secondary-text">
        <span>数据不足：</span>{" "}
        <span className="font-semibold text-warning">{data.insufficient}</span>
      </Text>
      {data.errors > 0 ? (
        <Text className="text-sm text-secondary-text">
          <span>错误：</span>{" "}
          <span className="font-semibold text-danger">{data.errors}</span>
        </Text>
      ) : null}
    </Group>
  </Paper>
);

// ============ Main Page ============

const BacktestPage: React.FC = () => {
  useEffect(() => {
    document.title = "策略回测 - DSA";
  }, []);

  const [codeFilter, setCodeFilter] = useState("");
  const [analysisDateFrom, setAnalysisDateFrom] = useState("");
  const [analysisDateTo, setAnalysisDateTo] = useState("");
  const [evalDays, setEvalDays] = useState("");
  const [forceRerun, setForceRerun] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<BacktestRunResponse | null>(null);
  const [runError, setRunError] = useState<ParsedApiError | null>(null);
  const [pageError, setPageError] = useState<ParsedApiError | null>(null);

  const [results, setResults] = useState<BacktestResultItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const pageSize = 20;

  const [overallPerf, setOverallPerf] = useState<PerformanceMetrics | null>(
    null,
  );
  const [stockPerf, setStockPerf] = useState<PerformanceMetrics | null>(null);
  const [isLoadingPerf, setIsLoadingPerf] = useState(false);
  const effectiveWindowDays = evalDays
    ? parseInt(evalDays, 10)
    : overallPerf?.evalWindowDays;
  const isNextDayValidation = effectiveWindowDays === 1;
  const showNextDayActualColumns = isNextDayValidation;

  const fetchResults = useCallback(
    async (
      page = 1,
      code?: string,
      windowDays?: number,
      startDate?: string,
      endDate?: string,
    ) => {
      setIsLoadingResults(true);
      try {
        const response = await backtestApi.getResults({
          code: code || undefined,
          evalWindowDays: windowDays,
          analysisDateFrom: startDate || undefined,
          analysisDateTo: endDate || undefined,
          page,
          limit: pageSize,
        });
        setResults(response.items);
        setTotalResults(response.total);
        setCurrentPage(response.page);
        setPageError(null);
      } catch (err) {
        console.error("Failed to fetch backtest results:", err);
        setPageError(getParsedApiError(err));
      } finally {
        setIsLoadingResults(false);
      }
    },
    [],
  );

  const fetchPerformance = useCallback(
    async (
      code?: string,
      windowDays?: number,
      startDate?: string,
      endDate?: string,
    ) => {
      setIsLoadingPerf(true);
      try {
        const overall = await backtestApi.getOverallPerformance({
          evalWindowDays: windowDays,
          analysisDateFrom: startDate || undefined,
          analysisDateTo: endDate || undefined,
        });
        setOverallPerf(overall);

        if (code) {
          const stock = await backtestApi.getStockPerformance(code, {
            evalWindowDays: windowDays,
            analysisDateFrom: startDate || undefined,
            analysisDateTo: endDate || undefined,
          });
          setStockPerf(stock);
        } else {
          setStockPerf(null);
        }
        setPageError(null);
      } catch (err) {
        console.error("Failed to fetch performance:", err);
        setPageError(getParsedApiError(err));
      } finally {
        setIsLoadingPerf(false);
      }
    },
    [],
  );

  useEffect(() => {
    const init = async () => {
      const overall = await backtestApi.getOverallPerformance();
      setOverallPerf(overall);
      const windowDays = overall?.evalWindowDays;
      if (windowDays && !evalDays) {
        setEvalDays(String(windowDays));
      }
      fetchResults(1, undefined, windowDays, undefined, undefined);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRun = async () => {
    setIsRunning(true);
    setRunResult(null);
    setRunError(null);
    try {
      const code = codeFilter.trim() || undefined;
      const evalWindowDays = evalDays ? parseInt(evalDays, 10) : undefined;
      const response = await backtestApi.run({
        code,
        force: forceRerun || undefined,
        minAgeDays: forceRerun ? 0 : undefined,
        evalWindowDays,
      });
      setRunResult(response);
      fetchResults(
        1,
        codeFilter.trim() || undefined,
        evalWindowDays,
        analysisDateFrom,
        analysisDateTo,
      );
      fetchPerformance(
        codeFilter.trim() || undefined,
        evalWindowDays,
        analysisDateFrom,
        analysisDateTo,
      );
    } catch (err) {
      setRunError(getParsedApiError(err));
    } finally {
      setIsRunning(false);
    }
  };

  const handleFilter = () => {
    const code = codeFilter.trim() || undefined;
    const windowDays = evalDays ? parseInt(evalDays, 10) : undefined;
    setCurrentPage(1);
    fetchResults(1, code, windowDays, analysisDateFrom, analysisDateTo);
    fetchPerformance(code, windowDays, analysisDateFrom, analysisDateTo);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleFilter();
    }
  };

  const handleShowNextDay = () => {
    const code = codeFilter.trim() || undefined;
    setEvalDays("1");
    setCurrentPage(1);
    fetchResults(1, code, 1, analysisDateFrom, analysisDateTo);
    fetchPerformance(code, 1, analysisDateFrom, analysisDateTo);
  };

  const totalPages = Math.ceil(totalResults / pageSize);
  const handlePageChange = (page: number) => {
    const windowDays = evalDays ? parseInt(evalDays, 10) : undefined;
    fetchResults(
      page,
      codeFilter.trim() || undefined,
      windowDays,
      analysisDateFrom,
      analysisDateTo,
    );
  };

  return (
    <div className="min-h-full space-y-4 rounded-[1.5rem] bg-transparent p-4 md:p-6">
      <Toolbar
        left={
          <>
            <div className="min-w-[240px]">
              <Input
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="输入股票代码，留空则筛选全部"
                disabled={isRunning}
              />
            </div>
            <div className="w-24">
              <Input
                type="number"
                min={1}
                max={120}
                value={evalDays}
                onChange={(e) => setEvalDays(e.target.value)}
                placeholder="10"
                disabled={isRunning}
                aria-label="评估窗口"
              />
            </div>
            <div className="w-40">
              <Input
                type="date"
                aria-label="分析开始日期"
                value={analysisDateFrom}
                onChange={(e) => setAnalysisDateFrom(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isRunning}
              />
            </div>
            <div className="w-40">
              <Input
                type="date"
                aria-label="分析结束日期"
                value={analysisDateTo}
                onChange={(e) => setAnalysisDateTo(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isRunning}
              />
            </div>
          </>
        }
        right={
          <>
            <Button
              type="button"
              variant="settings-secondary"
              onClick={handleFilter}
              disabled={isLoadingResults}
            >
              筛选
            </Button>
            <Button
              type="button"
              variant={
                isNextDayValidation ? "settings-primary" : "settings-secondary"
              }
              onClick={handleShowNextDay}
              disabled={isLoadingResults || isLoadingPerf}
            >
              次日验证
            </Button>
            <Button
              type="button"
              variant={forceRerun ? "settings-primary" : "settings-secondary"}
              onClick={() => setForceRerun(!forceRerun)}
              disabled={isRunning}
            >
              强制重跑
            </Button>
            <Button
              type="button"
              variant="settings-primary"
              onClick={handleRun}
              disabled={isRunning}
              isLoading={isRunning}
              loadingText="回测中..."
            >
              运行回测
            </Button>
          </>
        }
      />

      {runResult ? <RunSummary data={runResult} /> : null}
      {runError ? <ApiErrorAlert error={runError} /> : null}
      <Text className="text-xs text-muted-text">
        {isNextDayValidation
          ? "次日验证模式会用下一个交易日收盘表现校验 AI 判断。"
          : "评估窗口设为 1 时，可查看 AI 判断与次日收盘表现的匹配情况。"}
      </Text>

      <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4">
          {isLoadingPerf ? (
            <Card padding="md">
              <div className="flex items-center justify-center py-8">
                <div className="backtest-spinner sm" />
              </div>
            </Card>
          ) : overallPerf ? (
            <PerformanceCard
              metrics={overallPerf}
              title="整体表现"
            />
          ) : (
            <EmptyState
              title="暂无指标"
              description="运行一次回测后，将生成整体表现指标。"
              className="h-full min-h-[12rem] border-dashed bg-card/45 shadow-none"
            />
          )}

          {stockPerf ? (
            <PerformanceCard
              metrics={stockPerf}
              title={`${stockPerf.code || codeFilter}`}
            />
          ) : null}
        </div>

        <SectionCard
          title="回测结果"
          actions={
            <Text className="text-xs text-secondary-text">
              {codeFilter.trim()
                ? `股票 ${codeFilter.trim()}`
                : "全部股票"}
              {evalDays ? ` · ${evalDays} 天窗口` : ""}
              {analysisDateFrom ? ` · 自 ${analysisDateFrom}` : ""}
              {analysisDateTo ? ` · 至 ${analysisDateTo}` : ""}
            </Text>
          }
        >
          {pageError ? (
            <ApiErrorAlert error={pageError} className="mb-3" />
          ) : null}
          {isLoadingResults ? (
            <div className="flex h-64 flex-col items-center justify-center">
              <div className="backtest-spinner md" />
              <p className="mt-3 text-sm text-secondary-text">
                正在加载回测结果...
              </p>
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              title="暂无结果"
              description="运行回测后可评估历史分析准确性"
              className="border-dashed"
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              }
            />
          ) : (
            <Stack gap="md" className="animate-fade-in">
              <Group justify="space-between" gap="md" wrap="wrap">
                <div>
                  <span className="label-uppercase">
                    {isNextDayValidation ? "次日验证" : "结果集"}
                  </span>
                </div>
                <Text className="text-xs text-secondary-text">
                  小屏下可横向查看完整列
                </Text>
              </Group>

              <Paper withBorder radius="xl" p={0} shadow="none">
                <ScrollArea>
                  <Table
                    className="min-w-[840px]"
                    highlightOnHover
                    verticalSpacing="md"
                    horizontalSpacing="sm"
                  >
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>股票</Table.Th>
                        <Table.Th>分析日期</Table.Th>
                        <Table.Th>AI 判断</Table.Th>
                        <Table.Th>
                          {showNextDayActualColumns
                            ? "实际走势"
                            : "窗口收益"}
                        </Table.Th>
                        <Table.Th>
                          {showNextDayActualColumns
                            ? "准确性"
                            : "方向匹配"}
                        </Table.Th>
                        <Table.Th>结果</Table.Th>
                        <Table.Th>状态</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {results.map((row) => (
                        <Table.Tr key={row.analysisHistoryId}>
                          <Table.Td>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                {row.code}
                              </span>
                              <span className="text-xs text-muted-text">
                                {row.stockName || "--"}
                              </span>
                            </div>
                          </Table.Td>
                          <Table.Td className="text-secondary-text">
                            {row.analysisDate || "--"}
                          </Table.Td>
                          <Table.Td className="max-w-[220px] text-foreground">
                            {row.trendPrediction || row.operationAdvice ? (
                              <Tooltip
                                content={[
                                  row.trendPrediction,
                                  row.operationAdvice,
                                ]
                                  .filter(Boolean)
                                  .join(" / ")}
                                focusable
                              >
                                <div className="flex flex-col gap-1">
                                  <span className="block truncate">
                                    {row.trendPrediction || "--"}
                                  </span>
                                  <span className="block truncate text-xs text-secondary-text">
                                    {row.operationAdvice || "--"}
                                  </span>
                                </div>
                              </Tooltip>
                            ) : (
                              "--"
                            )}
                          </Table.Td>
                          <Table.Td>
                            <div className="flex items-center gap-2">
                              {actualMovementBadge(row.actualMovement)}
                              <span
                                className={
                                  row.actualReturnPct != null
                                    ? row.actualReturnPct > 0
                                      ? "text-success"
                                      : row.actualReturnPct < 0
                                        ? "text-danger"
                                        : "text-secondary-text"
                                    : "text-muted-text"
                                }
                              >
                                {pct(row.actualReturnPct)}
                              </span>
                            </div>
                          </Table.Td>
                          <Table.Td>
                            <span className="flex items-center gap-2">
                              {boolIcon(row.directionCorrect)}
                              <span className="text-muted-text">
                                {row.directionExpected || ""}
                              </span>
                            </span>
                          </Table.Td>
                          <Table.Td>{outcomeBadge(row.outcome)}</Table.Td>
                          <Table.Td>{statusBadge(row.evalStatus)}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </Paper>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />

              <Text className="text-center text-xs text-muted-text">
                共 {totalResults} 条结果 · 第 {currentPage} /{" "}
                {Math.max(totalPages, 1)} 页
              </Text>
            </Stack>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default BacktestPage;
