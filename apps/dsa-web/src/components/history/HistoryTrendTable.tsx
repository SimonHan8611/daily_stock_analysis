import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Center,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { BarChart3 } from "lucide-react";
import { historyApi } from "../../api/history";
import type { HistoryTrendItem } from "../../types/analysis";

interface HistoryTrendTableProps {
  stockCode: string;
  stockName?: string;
  limit?: number;
  className?: string;
}

const formatDate = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const formatSignedPercent = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
};

const formatMetric = (value?: number, suffix = "") => {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  return `${value.toFixed(2)}${suffix}`;
};

const getValueColorClass = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "text-[hsl(220_10%_56%)]";
  }
  if (value > 0) return "text-red-500";
  if (value < 0) return "text-emerald-600";
  return "text-[hsl(226_28%_18%)]";
};

const resultTone = (item: HistoryTrendItem) => {
  const text = `${item.analysisResult || ""}${item.operationAdvice || ""}`;
  if (text.includes("买") || text.includes("持有")) {
    return "green";
  }
  if (text.includes("卖") || text.includes("减仓")) {
    return "red";
  }
  return "yellow";
};

export function HistoryTrendTable({
  stockCode,
  stockName,
  limit = 20,
  className = "mt-4",
}: HistoryTrendTableProps) {
  const requestKey = `${stockCode}:${limit}`;
  const [items, setItems] = useState<HistoryTrendItem[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{
    key: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    historyApi
      .getTrend(stockCode, limit)
      .then((response) => {
        if (!cancelled) {
          setItems(response.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrorState({
            key: requestKey,
            message: "历史趋势加载失败",
          });
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadedKey(requestKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [limit, requestKey, stockCode]);

  const visibleItems = useMemo(() => items.slice(0, limit), [items, limit]);
  const isLoading = loadedKey !== requestKey;
  const error = !isLoading && errorState?.key === requestKey
    ? errorState.message
    : null;

  return (
    <Paper
      radius="lg"
      shadow="none"
      className={`${className} border border-[hsl(220_18%_89%)] bg-white p-4`}
    >
      <Group justify="space-between" align="center" gap="sm" mb="sm">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon
            radius="xl"
            size={34}
            className="bg-cyan-50 text-cyan-600"
          >
            <BarChart3 size={18} />
          </ThemeIcon>
          <div className="min-w-0">
            <Text className="text-[0.98rem] font-extrabold text-[hsl(226_32%_14%)]">
              历史趋势
            </Text>
            <Text size="xs" c="dimmed" className="truncate">
              {stockName || stockCode} 近 {visibleItems.length || limit} 次分析
            </Text>
          </div>
        </Group>
        <Badge variant="light" color="cyan" radius="xl">
          {stockCode}
        </Badge>
      </Group>

      {isLoading ? (
        <Stack gap="xs">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={34} radius="md" />
          ))}
        </Stack>
      ) : error ? (
        <Center className="min-h-[5.5rem] rounded-xl border border-dashed border-[hsl(220_18%_88%)]">
          <Text size="sm" c="dimmed">
            {error}
          </Text>
        </Center>
      ) : visibleItems.length === 0 ? (
        <Center className="min-h-[5.5rem] rounded-xl border border-dashed border-[hsl(220_18%_88%)]">
          <Text size="sm" c="dimmed">
            暂无该股票的历史趋势
          </Text>
        </Center>
      ) : (
        <>
          <div className="hidden grid-cols-[1fr_1.35fr_0.55fr_0.72fr_0.62fr_0.62fr] border-b border-[hsl(220_18%_90%)] px-3 py-2 text-xs font-bold text-[hsl(222_20%_46%)] md:grid">
            <span>时间</span>
            <span>分析结果</span>
            <span className="text-right">分数</span>
            <span className="text-right">涨跌幅</span>
            <span className="text-right">量比</span>
            <span className="text-right">换手率</span>
          </div>
          <Stack gap={0}>
            {visibleItems.map((item) => (
              <div
                key={item.id || item.queryId}
                className="grid gap-2 border-b border-[hsl(220_18%_92%)] px-3 py-2.5 last:border-b-0 md:grid-cols-[1fr_1.35fr_0.55fr_0.72fr_0.62fr_0.62fr] md:items-center"
              >
                <Text size="sm" className="font-medium text-[hsl(225_20%_34%)]">
                  {formatDate(item.createdAt)}
                </Text>
                <Group gap="xs" wrap="nowrap" className="min-w-0">
                  <Badge
                    size="sm"
                    radius="xl"
                    color={resultTone(item)}
                    variant="light"
                    className="shrink-0"
                  >
                    {item.analysisResult || "--"}
                  </Badge>
                </Group>
                <Text className="text-sm font-extrabold text-[hsl(226_28%_18%)] md:text-right">
                  {item.sentimentScore ?? "--"}
                </Text>
                <Text
                  className={`text-sm font-semibold md:text-right ${getValueColorClass(item.changePct)}`}
                >
                  {formatSignedPercent(item.changePct)}
                </Text>
                <Text className="text-sm font-semibold text-[hsl(226_24%_22%)] md:text-right">
                  {formatMetric(item.volumeRatio)}
                </Text>
                <Text className="text-sm font-semibold text-[hsl(226_24%_22%)] md:text-right">
                  {formatMetric(item.turnoverRate, "%")}
                </Text>
              </div>
            ))}
          </Stack>
        </>
      )}
    </Paper>
  );
}
