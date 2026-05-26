import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { Anchor, Group, Loader, Paper, Stack, Text } from "@mantine/core";
import { ExternalLink, Newspaper } from "lucide-react";
import type { ParsedApiError } from "../../api/error";
import { getParsedApiError } from "../../api/error";
import { ApiErrorAlert, Card } from "../common";
import { DashboardPanelHeader, DashboardStateBlock } from "../dashboard";
import { historyApi } from "../../api/history";
import type { NewsIntelItem, ReportLanguage } from "../../types/analysis";
import {
  getReportText,
  normalizeReportLanguage,
} from "../../utils/reportLanguage";

interface ReportNewsProps {
  recordId?: number; // 分析历史记录主键 ID
  limit?: number;
  language?: ReportLanguage;
}

/**
 * 资讯区组件 - 终端风格
 */
export const ReportNews: React.FC<ReportNewsProps> = ({
  recordId,
  limit = 8,
  language = "zh",
}) => {
  const reportLanguage = normalizeReportLanguage(language);
  const text = getReportText(reportLanguage);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<NewsIntelItem[]>([]);
  const [error, setError] = useState<ParsedApiError | null>(null);

  const fetchNews = useCallback(async () => {
    if (!recordId) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await historyApi.getNews(recordId, limit);
      setItems(response.items || []);
    } catch (err) {
      setError(getParsedApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [recordId, limit]);

  useEffect(() => {
    setItems([]);
    setError(null);

    if (recordId) {
      fetchNews();
    }
  }, [recordId, fetchNews]);

  if (!recordId) {
    return null;
  }

  return (
    <Card variant="bordered" padding="md" className="home-panel-card">
      <DashboardPanelHeader
        eyebrow={text.newsFeed}
        title={text.relatedNews}
        actions={
          <Group gap="xs" wrap="nowrap">
            {isLoading ? (
              <Loader size="xs" color="cyan" aria-hidden="true" />
            ) : null}
            <button
              type="button"
              onClick={() => void fetchNews()}
              className="home-accent-link text-xs"
              aria-label={text.refresh}
            >
              {text.refresh}
            </button>
          </Group>
        }
      />

      {error && !isLoading && (
        <ApiErrorAlert
          error={error}
          actionLabel={text.retry}
          onAction={() => void fetchNews()}
          dismissLabel={text.dismiss}
        />
      )}

      {isLoading && !error && (
        <DashboardStateBlock compact loading title={text.loadingNews} />
      )}

      {!isLoading && !error && items.length === 0 && (
        <DashboardStateBlock
          compact
          title={text.noNews}
          description={text.noNewsDescription}
          icon={
            <Newspaper
              className="h-4 w-4"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          }
        />
      )}

      {!isLoading && !error && items.length > 0 && (
        <Stack gap="sm" className="text-left">
          {items.map((item, index) => (
            <Paper
              key={`${item.title}-${index}`}
              className="home-subpanel home-news-item group p-4"
              radius="lg"
              shadow="none"
            >
              <Group
                align="flex-start"
                justify="space-between"
                gap="md"
                wrap="nowrap"
              >
                <div className="min-w-0 flex-1 text-left">
                  <Text className="home-news-title text-left text-sm font-medium leading-6 text-foreground">
                    {item.title}
                  </Text>
                  {item.snippet && (
                    <Text className="home-news-snippet mt-2 overflow-hidden text-left text-sm leading-6 text-secondary-text [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                      {item.snippet}
                    </Text>
                  )}
                </div>
                {item.url && (
                  <Anchor
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="home-accent-pill-link shrink-0 whitespace-nowrap px-2.5 py-1 text-xs"
                    aria-label={text.openLink}
                    underline="never"
                  >
                    {text.openLink}
                    <ExternalLink
                      className="w-3.5 h-3.5"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </Anchor>
                )}
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Card>
  );
};
