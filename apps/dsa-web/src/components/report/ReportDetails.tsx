import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Group, Paper, ScrollArea, Stack, Text } from "@mantine/core";
import { ChevronDown } from "lucide-react";
import type {
  ReportDetails as ReportDetailsType,
  ReportLanguage,
} from "../../types/analysis";
import { Card } from "../common";
import { DashboardPanelHeader } from "../dashboard";
import {
  getReportText,
  normalizeReportLanguage,
} from "../../utils/reportLanguage";

interface ReportDetailsProps {
  details?: ReportDetailsType;
  recordId?: number; // 分析历史记录主键 ID
  language?: ReportLanguage;
}

/**
 * 透明度与追溯区组件 - 终端风格
 */
export const ReportDetails: React.FC<ReportDetailsProps> = ({
  details,
  recordId,
  language = "zh",
}) => {
  type JsonPanel = "raw" | "snapshot";
  type CopiedPanelState = Record<JsonPanel, boolean>;

  const reportLanguage = normalizeReportLanguage(language);
  const text = getReportText(reportLanguage);
  const [showRaw, setShowRaw] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [copiedPanels, setCopiedPanels] = useState<CopiedPanelState>({
    raw: false,
    snapshot: false,
  });
  const copyResetTimerRef = useRef<Partial<Record<JsonPanel, number>>>({});

  useEffect(() => {
    return () => {
      Object.values(copyResetTimerRef.current).forEach((timerId) => {
        if (timerId !== undefined) {
          window.clearTimeout(timerId);
        }
      });
      copyResetTimerRef.current = {};
    };
  }, []);

  if (!details?.rawResult && !details?.contextSnapshot && !recordId) {
    return null;
  }

  const copyToClipboard = async (content: string, panel: JsonPanel) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedPanels((prev) => ({
        ...prev,
        [panel]: true,
      }));
      const existingTimer = copyResetTimerRef.current[panel];
      if (existingTimer !== undefined) {
        window.clearTimeout(existingTimer);
      }
      copyResetTimerRef.current[panel] = window.setTimeout(() => {
        setCopiedPanels((prev) => ({
          ...prev,
          [panel]: false,
        }));
        delete copyResetTimerRef.current[panel];
      }, 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const renderJson = (data: unknown, panel: JsonPanel) => {
    const jsonStr = JSON.stringify(data, null, 2);
    return (
      <Paper
        radius="lg"
        shadow="none"
        className="relative overflow-hidden border border-subtle bg-base/70"
      >
        <span className="absolute right-2 top-2 z-10 inline-flex">
          <button
            type="button"
            onClick={() => copyToClipboard(jsonStr, panel)}
            className="home-accent-link text-xs text-muted-text"
            aria-label={copiedPanels[panel] ? text.copied : text.copy}
          >
            {copiedPanels[panel] ? text.copied : text.copy}
          </button>
        </span>
        <ScrollArea.Autosize mah={320}>
          <pre className="home-trace-pre home-trace-pre-content w-0 min-w-full overflow-x-auto bg-base p-3 text-left font-mono text-xs text-foreground">
            {jsonStr}
          </pre>
        </ScrollArea.Autosize>
      </Paper>
    );
  };

  return (
    <Card variant="bordered" padding="md" className="home-panel-card text-left">
      <DashboardPanelHeader
        eyebrow={text.transparency}
        title={text.traceability}
        className="mb-3"
      />

      {/* Record ID */}
      {recordId && (
        <Group
          gap="xs"
          className="home-divider mb-3 border-b pb-3 text-xs text-muted-text"
          wrap="wrap"
        >
          <Text className="text-xs text-muted-text">{text.recordId}:</Text>
          <code className="home-accent-chip px-1.5 py-0.5 font-mono text-xs">
            {recordId}
          </code>
        </Group>
      )}

      {/* 折叠区域 */}
      <Stack gap="sm">
        {/* 原始分析结果 */}
        {details?.rawResult && (
          <div>
            <button
              type="button"
              onClick={() => setShowRaw(!showRaw)}
              className="home-surface-button home-trace-toggle flex w-full items-center justify-between rounded-lg p-2.5"
            >
              <Text className="text-xs text-foreground">{text.rawResult}</Text>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted-text transition-transform ${showRaw ? "rotate-180" : ""}`}
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>
            {showRaw && (
              <div className="mt-2 animate-fade-in min-w-0 overflow-hidden">
                {renderJson(details.rawResult, "raw")}
              </div>
            )}
          </div>
        )}

        {/* 分析快照 */}
        {details?.contextSnapshot && (
          <div>
            <button
              type="button"
              onClick={() => setShowSnapshot(!showSnapshot)}
              className="home-surface-button home-trace-toggle flex w-full items-center justify-between rounded-lg p-2.5"
            >
              <Text className="text-xs text-foreground">
                {text.analysisSnapshot}
              </Text>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted-text transition-transform ${showSnapshot ? "rotate-180" : ""}`}
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>
            {showSnapshot && (
              <div className="mt-2 animate-fade-in min-w-0 overflow-hidden">
                {renderJson(details.contextSnapshot, "snapshot")}
              </div>
            )}
          </div>
        )}
      </Stack>
    </Card>
  );
};
