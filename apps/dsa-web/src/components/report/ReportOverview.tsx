import type React from "react";
import { Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { CalendarDays, ClipboardCheck, TrendingUp } from "lucide-react";
import type {
  ReportDetails as ReportDetailsType,
  ReportMeta,
  ReportSummary as ReportSummaryType,
} from "../../types/analysis";
import { Badge, Card, ScoreGauge } from "../common";
import { formatDateTime } from "../../utils/format";
import {
  getReportText,
  normalizeReportLanguage,
} from "../../utils/reportLanguage";

interface ReportOverviewProps {
  meta: ReportMeta;
  summary: ReportSummaryType;
  details?: ReportDetailsType;
  isHistory?: boolean;
}

type BoardStatus = "leading" | "lagging";

type BoardSignal = {
  status: BoardStatus;
  changePct?: number;
};

const normalizeBoardName = (value?: string): string =>
  (value || "").trim().replace(/\s+/g, " ");

const coerceFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/%$/, "");
    if (!trimmed) {
      return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const buildBoardSignalMap = (
  details?: ReportDetailsType,
): Map<string, BoardSignal> => {
  const signalMap = new Map<string, BoardSignal>();
  const topBoards = Array.isArray(details?.sectorRankings?.top)
    ? details.sectorRankings.top
    : [];
  const bottomBoards = Array.isArray(details?.sectorRankings?.bottom)
    ? details.sectorRankings.bottom
    : [];

  topBoards.forEach((item) => {
    const normalizedName = normalizeBoardName(item?.name);
    if (!normalizedName) {
      return;
    }
    signalMap.set(normalizedName, {
      status: "leading",
      changePct: coerceFiniteNumber(item.changePct),
    });
  });

  bottomBoards.forEach((item) => {
    const normalizedName = normalizeBoardName(item?.name);
    if (!normalizedName) {
      return;
    }
    signalMap.set(normalizedName, {
      status: "lagging",
      changePct: coerceFiniteNumber(item.changePct),
    });
  });

  return signalMap;
};

/**
 * 报告概览区组件 - 终端风格
 */
export const ReportOverview: React.FC<ReportOverviewProps> = ({
  meta,
  summary,
  details,
}) => {
  const reportLanguage = normalizeReportLanguage(meta.reportLanguage);
  const text = getReportText(reportLanguage);
  const relatedBoards = (
    Array.isArray(details?.belongBoards) ? details.belongBoards : []
  )
    .filter((board) => normalizeBoardName(board?.name).length > 0)
    .slice(0, 3);
  const boardSignals = buildBoardSignalMap(details);

  const getPriceChangeStyle = (
    changePct: number | undefined,
  ): React.CSSProperties | undefined => {
    if (changePct === undefined || changePct === null) {
      return undefined;
    }

    if (changePct > 0) {
      return { color: "var(--home-price-up)" };
    }

    if (changePct < 0) {
      return { color: "var(--home-price-down)" };
    }

    return undefined;
  };

  const formatChangePct = (changePct: number | undefined): string => {
    if (changePct === undefined || changePct === null) return "--";
    const sign = changePct > 0 ? "+" : "";
    return `${sign}${changePct.toFixed(2)}%`;
  };

  const getBoardStatusLabel = (status: BoardStatus): string => {
    if (status === "leading") {
      return text.leadingBoard;
    }
    return text.laggingBoard;
  };

  const getBoardStatusVariant = (status: BoardStatus): "success" | "danger" => {
    if (status === "leading") {
      return "success";
    }
    return "danger";
  };

  return (
    <Stack gap="lg">
      {/* 主信息区 - 两列布局，items-stretch 确保右侧与左侧同高 */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
        {/* 左侧：股票信息与结论 */}
        <Stack gap="lg" className="lg:col-span-2">
          {/* 股票头部 */}
          <Card variant="gradient" padding="md" className="home-report-hero">
            <Stack gap="lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Group align="center" gap="md" wrap="wrap">
                    <Title
                      order={2}
                      className="text-[28px] font-bold leading-tight text-foreground"
                    >
                      {meta.stockName || meta.stockCode}
                    </Title>
                    {/* 价格和涨跌幅 */}
                    {meta.currentPrice != null && (
                      <Group align="baseline" gap="sm" wrap="nowrap">
                        <Text
                          className="text-xl font-bold font-mono"
                          style={getPriceChangeStyle(meta.changePct)}
                        >
                          {meta.currentPrice.toFixed(2)}
                        </Text>
                        <Text
                          className="text-sm font-semibold font-mono"
                          style={getPriceChangeStyle(meta.changePct)}
                        >
                          {formatChangePct(meta.changePct)}
                        </Text>
                      </Group>
                    )}
                  </Group>
                  <Group gap="sm" className="mt-1.5" wrap="wrap">
                    <span className="home-accent-chip px-2 py-0.5 font-mono text-xs">
                      {meta.stockCode}
                    </span>
                    <Text className="flex items-center gap-1 text-xs text-muted-text">
                      <CalendarDays
                        className="h-3.5 w-3.5"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      {formatDateTime(meta.createdAt)}
                    </Text>
                  </Group>
                </div>
              </div>

              {/* 关键结论 */}
              <div className="home-divider border-t pt-5">
                <Text className="label-uppercase">{text.keyInsights}</Text>
                <Text className="mt-2 max-w-[62ch] whitespace-pre-wrap text-left text-[15px] leading-7 text-foreground">
                  {summary.analysisSummary || text.noAnalysisSummary}
                </Text>
              </div>
            </Stack>
          </Card>

          {/* 操作建议和趋势预测 */}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {/* 操作建议 */}
            <Card
              variant="bordered"
              padding="sm"
              hoverable
              className="home-panel-card home-insight-card"
              style={{
                ["--home-insight-tone" as string]: "var(--home-strategy-buy)",
              }}
            >
              <Group align="flex-start" gap="md" wrap="nowrap">
                <div className="home-insight-icon w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck
                    className="w-4 h-4 text-success"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
                <Stack gap={6}>
                  <Text className="home-insight-title text-[11px] font-medium uppercase tracking-[0.16em]">
                    {text.actionAdvice}
                  </Text>
                  <Text className="home-insight-body text-sm leading-6">
                    {summary.operationAdvice || text.noAdvice}
                  </Text>
                </Stack>
              </Group>
            </Card>

            {/* 趋势预测 */}
            <Card
              variant="bordered"
              padding="sm"
              hoverable
              className="home-panel-card home-insight-card"
              style={{
                ["--home-insight-tone" as string]: "var(--home-strategy-take)",
              }}
            >
              <Group align="flex-start" gap="md" wrap="nowrap">
                <div className="home-insight-icon w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp
                    className="w-4 h-4 text-warning"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
                <Stack gap={6}>
                  <Text className="home-insight-title text-[11px] font-medium uppercase tracking-[0.16em]">
                    {text.trendPrediction}
                  </Text>
                  <Text className="home-insight-body text-sm leading-6">
                    {summary.trendPrediction || text.noPrediction}
                  </Text>
                </Stack>
              </Group>
            </Card>
          </SimpleGrid>

          {relatedBoards.length > 0 && (
            <Card
              variant="bordered"
              padding="sm"
              className="home-panel-card text-left"
            >
              <Group align="baseline" gap="sm" className="mb-3" wrap="wrap">
                <Text className="label-uppercase">{text.boardLinkage}</Text>
                <Title
                  order={3}
                  className="mt-0.5 text-base font-semibold text-foreground"
                >
                  {text.relatedBoards}
                </Title>
              </Group>

              <Stack gap="sm">
                {relatedBoards.map((board, index) => {
                  const boardName = normalizeBoardName(board.name);
                  const signal = boardSignals.get(boardName);
                  return (
                    <Paper
                      key={`${boardName}-${board.code || index}`}
                      className="home-subpanel px-3 py-2.5 text-sm"
                      radius="lg"
                      shadow="none"
                    >
                      <Group gap="xs" wrap="wrap">
                        <span className="home-accent-chip px-2 py-0.5 text-xs font-medium">
                          {boardName}
                        </span>
                        {board.type && (
                          <span className="home-board-pill rounded-full px-2 py-0.5 text-xs">
                            {board.type}
                          </span>
                        )}
                        {signal && (
                          <Badge
                            variant={getBoardStatusVariant(signal.status)}
                            className="home-board-status-badge shadow-none"
                          >
                            {getBoardStatusLabel(signal.status)}
                          </Badge>
                        )}
                        {signal &&
                          signal.changePct !== undefined &&
                          signal.changePct !== null && (
                            <Text
                              className="text-xs font-mono"
                              style={getPriceChangeStyle(signal.changePct)}
                            >
                              {formatChangePct(signal.changePct)}
                            </Text>
                          )}
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>
            </Card>
          )}
        </Stack>

        {/* 右侧：情绪指标 - 填满格子高度，消除与 STRATEGY POINTS 之间的空隙 */}
        <div className="flex flex-col self-stretch min-h-full">
          <Card
            variant="bordered"
            padding="md"
            className="home-panel-card home-rail-card !overflow-visible flex-1 flex flex-col min-h-0"
          >
            <div className="text-center flex-1 flex flex-col justify-center">
              <Text className="mb-5 text-sm font-medium tracking-wide text-foreground">
                {text.marketSentiment}
              </Text>
              <ScoreGauge
                score={summary.sentimentScore}
                size="lg"
                language={reportLanguage}
              />
            </div>
          </Card>
        </div>
      </div>
    </Stack>
  );
};
