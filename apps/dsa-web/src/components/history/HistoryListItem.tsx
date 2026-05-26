import type React from "react";
import { Group, Text } from "@mantine/core";
import { Badge } from "../common";
import type { HistoryItem } from "../../types/analysis";
import { getSentimentColor } from "../../types/analysis";
import { formatDateTime } from "../../utils/format";
import { truncateStockName, isStockNameTruncated } from "../../utils/stockName";
import { getHistoryResultText } from "./historyListItemUtils";

interface HistoryListItemProps {
  item: HistoryItem;
  isViewing: boolean; // Indicates if this report is currently being viewed in the right panel
  isChecked: boolean; // Indicates if the checkbox is checked for bulk operations
  isDeleting: boolean;
  onToggleChecked: (recordId: number) => void;
  onClick: (recordId: number) => void;
}

export const HistoryListItem: React.FC<HistoryListItemProps> = ({
  item,
  isViewing,
  isChecked,
  isDeleting,
  onToggleChecked,
  onClick,
}) => {
  const sentimentColor =
    item.sentimentScore !== undefined
      ? getSentimentColor(item.sentimentScore)
      : null;
  const stockName = item.stockName || item.stockCode;
  const isTruncated = isStockNameTruncated(stockName);

  return (
    <div className="flex items-start gap-2 group">
      <div className="pt-3.5">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onToggleChecked(item.id)}
          disabled={isDeleting}
          className="h-3.5 w-3.5 cursor-pointer rounded border-subtle-hover bg-transparent accent-primary focus:ring-primary/30 disabled:opacity-50"
        />
      </div>
      <button
        type="button"
        onClick={() => onClick(item.id)}
        className={`history-flat-row group/item flex-1 border-b border-l-2 border-[hsl(var(--border)/0.62)] py-3 pl-3 pr-1 text-left transition-colors last:border-b-0 ${
          isViewing
            ? "history-flat-row-selected border-l-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)]"
            : "border-l-transparent hover:bg-[hsl(var(--foreground)/0.025)]"
        }`}
        aria-label={`查看 ${stockName} 的历史分析`}
      >
        <div
          className={`relative z-10${isTruncated ? " group-hover/item:z-20" : ""}`}
        >
          <Group align="flex-start" gap="sm" wrap="nowrap">
            {sentimentColor && (
              <div
                className="w-1 h-8 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: sentimentColor,
                  boxShadow: `0 0 10px ${sentimentColor}40`,
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <Group
                align="flex-start"
                justify="space-between"
                gap="xs"
                wrap="nowrap"
              >
                <div className="min-w-0 flex-1">
                  <Text className="truncate text-[13px] font-semibold leading-5 text-foreground">
                    <span className="group-hover/item:hidden">
                      {truncateStockName(stockName)}
                    </span>
                    <span className="hidden group-hover/item:inline">
                      {stockName}
                    </span>
                  </Text>
                </div>
                {sentimentColor && (
                  <Badge
                    variant="default"
                    size="sm"
                    className={`home-history-sentiment-badge shrink-0 shadow-none text-[11px] font-semibold leading-none transition-opacity duration-200${isTruncated ? " group-hover/item:opacity-80" : ""}`}
                    style={{
                      color: sentimentColor,
                      borderColor: `${sentimentColor}30`,
                      backgroundColor: `${sentimentColor}10`,
                    }}
                  >
                    {getHistoryResultText(item)}
                  </Badge>
                )}
              </Group>
              <Group gap="xs" className="mt-1.5" wrap="nowrap">
                <Text className="text-[11px] font-medium text-secondary-text">
                  {item.stockCode}
                </Text>
                <span className="w-1 h-1 rounded-full bg-subtle-hover" />
                <Text className="text-[11px] font-medium text-muted-text">
                  {formatDateTime(item.createdAt)}
                </Text>
              </Group>
            </div>
          </Group>
        </div>
      </button>
    </div>
  );
};
