import React from "react";
import {
  useRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { Paper, Text } from "@mantine/core";
import { ChevronDown, Clock3, Trash2 } from "lucide-react";
import type { HistoryItem } from "../../types/analysis";
import { getSentimentColor } from "../../types/analysis";
import { formatDateTime } from "../../utils/format";
import { isStockNameTruncated, truncateStockName } from "../../utils/stockName";
import { Badge, ScrollArea } from "../common";
import { DashboardStateBlock } from "../dashboard";
import { getHistoryResultText } from "./historyListItemUtils";

interface HistoryListProps {
  items: HistoryItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  selectedId?: number; // 当前选中的历史记录 ID
  selectedIds: Set<number>;
  isDeleting?: boolean;
  onItemClick: (recordId: number) => void; // 点击记录的回调
  onLoadMore: () => void;
  onToggleItemSelection: (recordId: number) => void;
  onToggleSelectAll: () => void;
  onDeleteSelected: () => void;
  className?: string;
  embedded?: boolean;
  useInternalScroll?: boolean;
}

interface HistoryGroup {
  key: string;
  stockCode: string;
  stockName: string;
  items: HistoryItem[];
}

/**
 * 历史记录列表组件 (升级版)
 * 使用新设计系统组件实现，支持批量选择和滚动加载
 */
export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  isLoading,
  isLoadingMore,
  hasMore,
  selectedId,
  selectedIds,
  isDeleting = false,
  onItemClick,
  onLoadMore,
  onToggleItemSelection,
  onToggleSelectAll,
  onDeleteSelected,
  className = "",
  embedded = false,
  useInternalScroll = true,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const selectAllId = useId();
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<string[]>([]);

  const selectedCount = items.filter((item) => selectedIds.has(item.id)).length;
  const allVisibleSelected = items.length > 0 && selectedCount === items.length;
  const someVisibleSelected = selectedCount > 0 && !allVisibleSelected;
  const historyGroups = useMemo<HistoryGroup[]>(() => {
    const groupMap = new Map<string, HistoryGroup>();

    items.forEach((item) => {
      const normalizedCode = item.stockCode.trim().toUpperCase();
      const groupKey = normalizedCode || `record-${item.id}`;
      const existingGroup = groupMap.get(groupKey);

      if (existingGroup) {
        existingGroup.items.push(item);
        return;
      }

      groupMap.set(groupKey, {
        key: groupKey,
        stockCode: item.stockCode,
        stockName: item.stockName || item.stockCode,
        items: [item],
      });
    });

    return Array.from(groupMap.values());
  }, [items]);

  const groupedKeys = useMemo(
    () =>
      new Set(
        historyGroups
          .filter((group) => group.items.length > 1)
          .map((group) => group.key),
      ),
    [historyGroups],
  );
  const selectedGroupKey = useMemo(() => {
    if (selectedId === undefined) {
      return undefined;
    }

    return historyGroups.find(
      (group) =>
        group.items.length > 1 &&
        group.items.some((item) => item.id === selectedId),
    )?.key;
  }, [historyGroups, selectedId]);
  const accordionValue = useMemo(() => {
    const nextKeys = expandedGroupKeys.filter((key) => groupedKeys.has(key));

    if (selectedGroupKey && !nextKeys.includes(selectedGroupKey)) {
      nextKeys.push(selectedGroupKey);
    }

    return nextKeys;
  }, [expandedGroupKeys, groupedKeys, selectedGroupKey]);
  const expandedKeySet = useMemo(
    () => new Set(accordionValue),
    [accordionValue],
  );

  // 使用 IntersectionObserver 检测滚动到底部
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isLoading && !isLoadingMore) {
        const container = scrollContainerRef.current;
        if (container && container.scrollHeight > container.clientHeight) {
          onLoadMore();
        }
      }
    },
    [hasMore, isLoading, isLoadingMore, onLoadMore],
  );

  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    const container = scrollContainerRef.current;
    if (!trigger || !container) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: container,
      rootMargin: "20px",
      threshold: 0.1,
    });

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [handleObserver]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  const handleGroupSelectionToggle = useCallback(
    (groupItems: HistoryItem[]) => {
      const allSelectedInGroup = groupItems.every((item) =>
        selectedIds.has(item.id),
      );

      groupItems.forEach((item) => {
        const isSelected = selectedIds.has(item.id);
        const shouldToggle = allSelectedInGroup ? isSelected : !isSelected;

        if (shouldToggle) {
          onToggleItemSelection(item.id);
        }
      });
    },
    [onToggleItemSelection, selectedIds],
  );

  const handleGroupExpandToggle = useCallback((groupKey: string) => {
    setExpandedGroupKeys((currentKeys) =>
      currentKeys.includes(groupKey)
        ? currentKeys.filter((key) => key !== groupKey)
        : [...currentKeys, groupKey],
    );
  }, []);

  const renderGroupedHistoryItems = () => (
    <div className="px-0.5 py-1">
      <div className="space-y-2">
        {historyGroups.map((group) => {
          const latestItem = group.items[0];
          const latestSentimentColor =
            latestItem.sentimentScore !== undefined
              ? getSentimentColor(latestItem.sentimentScore)
              : null;
          const hasMultipleRecords = group.items.length > 1;
          const selectedInGroupCount = group.items.filter((item) =>
            selectedIds.has(item.id),
          ).length;
          const allSelectedInGroup =
            group.items.length > 0 &&
            selectedInGroupCount === group.items.length;
          const someSelectedInGroup =
            selectedInGroupCount > 0 && !allSelectedInGroup;
          const stockName = group.stockName || group.stockCode;
          const isTruncated = isStockNameTruncated(stockName);
          const isExpanded = hasMultipleRecords
            ? expandedKeySet.has(group.key)
            : false;

          return (
            <div key={group.key}>
              <div className="flex items-center gap-2">
                <input
                  ref={(node) => {
                    if (node) {
                      node.indeterminate = someSelectedInGroup;
                    }
                  }}
                  type="checkbox"
                  checked={allSelectedInGroup}
                  onChange={() => handleGroupSelectionToggle(group.items)}
                  disabled={isDeleting}
                  aria-label={
                    hasMultipleRecords
                      ? `全选 ${group.stockCode} 的历史记录`
                      : `选择 ${group.stockCode} 的历史记录`
                  }
                  className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-subtle-hover bg-transparent accent-primary focus:ring-primary/30 disabled:opacity-50"
                />

                <div
                  role="button"
                  tabIndex={0}
                  aria-label={
                    hasMultipleRecords
                      ? `展开 ${group.stockCode} 的历史记录`
                      : `查看 ${group.stockCode} 的历史分析`
                  }
                  aria-expanded={hasMultipleRecords ? isExpanded : undefined}
                  onClick={() => {
                    if (!hasMultipleRecords) {
                      onItemClick(latestItem.id);
                      return;
                    }

                    handleGroupExpandToggle(group.key);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") {
                      return;
                    }

                    event.preventDefault();

                    if (!hasMultipleRecords) {
                      onItemClick(latestItem.id);
                      return;
                    }

                    handleGroupExpandToggle(group.key);
                  }}
                  className={`group flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.2)] ${
                    selectedId === latestItem.id
                      ? "border-[hsl(204_88%_78%)] bg-transparent shadow-[0_0_0_1px_hsl(203_88%_84%/0.12)]"
                      : "border-[hsl(220_18%_86%)] bg-transparent hover:bg-transparent"
                  }`}
                >
                  {latestSentimentColor ? (
                    <div
                      className="h-9 w-1 rounded-full shrink-0"
                      style={{
                        backgroundColor: latestSentimentColor,
                        boxShadow: `0 0 10px ${latestSentimentColor}25`,
                      }}
                    />
                  ) : (
                    <div className="h-9 w-1 rounded-full shrink-0 bg-[hsl(var(--primary)/0.24)]" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Text
                          className="truncate text-[13px] font-[800] leading-5 text-[hsl(226_30%_16%)]"
                          title={isTruncated ? stockName : undefined}
                        >
                          {truncateStockName(stockName)}
                        </Text>
                        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[hsl(225_18%_41%)]">
                          <span>{group.stockCode}</span>
                          <span className="h-1 w-1 shrink-0 rounded-full bg-[hsl(220_16%_82%)]" />
                          <span className="truncate">{formatDateTime(latestItem.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <Badge
                          variant="default"
                          size="sm"
                          className="home-history-sentiment-badge min-w-[4.85rem] justify-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold leading-none shadow-none"
                          style={
                            latestSentimentColor
                              ? {
                                  color: latestSentimentColor,
                                  borderColor: `${latestSentimentColor}30`,
                                  backgroundColor: `${latestSentimentColor}10`,
                                }
                              : undefined
                          }
                        >
                          {getHistoryResultText(latestItem)}
                        </Badge>
                        {selectedInGroupCount > 0 ? (
                          <Badge
                            variant="info"
                            size="sm"
                            className="shrink-0 text-[10px] font-semibold"
                          >
                            已选 {selectedInGroupCount}
                          </Badge>
                        ) : null}
                        {hasMultipleRecords ? (
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-[hsl(225_18%_33%)]">
                            <span>{group.items.length} 次</span>
                            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[hsl(220_18%_88%)]">
                              <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                aria-hidden="true"
                              />
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {hasMultipleRecords && isExpanded ? (
                <div className="ml-3 border-l border-[hsl(220_18%_86%)] pl-3 pt-1.5">
                  <div className="space-y-1.5">
                  {group.items.map((item, index) => {
                    const isViewing = selectedId === item.id;
                    const isChecked = selectedIds.has(item.id);
                    const sentimentColor =
                      item.sentimentScore !== undefined
                        ? getSentimentColor(item.sentimentScore)
                        : null;

                    return (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleItemSelection(item.id)}
                          disabled={isDeleting}
                          aria-label={`选择 ${group.stockCode} 的第 ${index + 1} 条历史记录`}
                          className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-subtle-hover bg-transparent accent-primary focus:ring-primary/30 disabled:opacity-50"
                        />

                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`查看 ${group.stockCode} 在 ${formatDateTime(item.createdAt)} 的分析结果`}
                          onClick={() => onItemClick(item.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onItemClick(item.id);
                            }
                          }}
                          className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.18)] ${
                            isViewing
                              ? "border-[hsl(204_88%_78%)] bg-transparent shadow-[0_0_0_1px_hsl(203_88%_84%/0.12)]"
                              : "border-[hsl(220_18%_86%)] bg-transparent hover:bg-transparent"
                          }`}
                        >
                          {sentimentColor ? (
                            <div
                              className="h-8 w-1 rounded-full shrink-0"
                              style={{
                                backgroundColor: sentimentColor,
                                boxShadow: `0 0 10px ${sentimentColor}22`,
                              }}
                            />
                          ) : (
                            <div className="h-8 w-1 rounded-full shrink-0 bg-[hsl(var(--primary)/0.24)]" />
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <Text className="text-[13px] font-[800] leading-5 text-[hsl(226_30%_16%)]">
                                  第 {index + 1} 次查询
                                </Text>
                                <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[hsl(225_18%_41%)]">
                                  <span>{group.stockCode}</span>
                                  <span className="h-1 w-1 shrink-0 rounded-full bg-[hsl(220_16%_82%)]" />
                                  <span className="truncate">{formatDateTime(item.createdAt)}</span>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-1.5">
                                <Badge
                                  variant="default"
                                  size="sm"
                                  className="home-history-sentiment-badge min-w-[4.85rem] justify-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold leading-none shadow-none"
                                  style={
                                    sentimentColor
                                      ? {
                                          color: sentimentColor,
                                          borderColor: `${sentimentColor}30`,
                                          backgroundColor: `${sentimentColor}10`,
                                        }
                                      : undefined
                                  }
                                >
                                  {getHistoryResultText(item)}
                                </Badge>
                                <div className="text-right text-[11px] font-medium text-muted-text">
                                  {isViewing ? "当前查看" : ""}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div ref={loadMoreTriggerRef} className="h-4" />

      {isLoadingMore && (
        <div className="flex justify-center py-2">
          <div className="home-spinner h-5 w-5 animate-spin border-2" />
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <div className="py-2 text-center">
          <span className="text-[10px] text-secondary-text uppercase tracking-[0.2em]">
            已到底部
          </span>
        </div>
      )}
    </div>
  );

  const content = (
    <>
      <div className="mb-2">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(220_100%_97%)] text-[hsl(223_91%_60%)]">
              <Clock3 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            </div>
            <Text className="text-[0.88rem] font-[700] tracking-[-0.015em] text-[hsl(226_28%_16%)]">
              历史分析
            </Text>
          </div>
          {selectedCount > 0 ? (
            <div className="text-[12px] font-medium text-[hsl(223_22%_49%)]">
              已选 {selectedCount} 条
            </div>
          ) : null}
        </div>
        {items.length > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[hsl(220_20%_91%)] bg-white px-2.5 py-1.5">
            <label
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1"
              htmlFor={selectAllId}
            >
              <input
                id={selectAllId}
                ref={selectAllRef}
                type="checkbox"
                checked={allVisibleSelected}
                onChange={onToggleSelectAll}
                disabled={isDeleting}
                aria-label="全选当前已加载历史记录"
                className="history-select-all-checkbox h-3.5 w-3.5 cursor-pointer bg-transparent accent-primary focus:ring-primary/30 disabled:opacity-50"
              />
              <span className="select-none text-[12px] font-semibold text-[hsl(225_18%_33%)]">
                全选当前
              </span>
            </label>
            <button
              type="button"
              onClick={onDeleteSelected}
              disabled={selectedCount === 0 || isDeleting}
              className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-[12px] font-semibold text-[hsl(1_88%_66%)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {isDeleting ? "删除中" : "删除"}
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <DashboardStateBlock loading compact title="加载历史记录中..." />
      ) : items.length === 0 ? (
        <DashboardStateBlock
          title="暂无历史分析记录"
          description="完成首次分析后，这里会保留最近结果。"
          icon={
            <Clock3 className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
          }
        />
      ) : (
        renderGroupedHistoryItems()
      )}
    </>
  );

  if (embedded) {
    if (!useInternalScroll) {
      return <section className={className}>{content}</section>;
    }

    return (
      <section className={`min-h-0 flex flex-col ${className}`}>
        <ScrollArea
          viewportRef={scrollContainerRef}
          viewportClassName="pr-1"
          testId="home-history-list-scroll"
        >
          {content}
        </ScrollArea>
      </section>
    );
  }

  return (
    <Paper
      component="aside"
      className={`glass-card overflow-hidden flex flex-col ${className}`}
      radius="xl"
      shadow="none"
    >
      <ScrollArea
        viewportRef={scrollContainerRef}
        viewportClassName="p-4"
        testId="home-history-list-scroll"
      >
        {content}
      </ScrollArea>
    </Paper>
  );
};
