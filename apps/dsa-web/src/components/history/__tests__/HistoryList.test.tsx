import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import { HistoryList } from "../HistoryList";
import type { HistoryItem } from "../../../types/analysis";

const baseProps = {
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  selectedIds: new Set<number>(),
  onItemClick: vi.fn(),
  onLoadMore: vi.fn(),
  onToggleItemSelection: vi.fn(),
  onToggleSelectAll: vi.fn(),
  onDeleteSelected: vi.fn(),
};

const items: HistoryItem[] = [
  {
    id: 1,
    queryId: "q-1",
    stockCode: "600519",
    stockName: "贵州茅台",
    sentimentScore: 82,
    operationAdvice: "买入",
    createdAt: "2026-03-15T08:00:00Z",
  },
];

const longChineseNameItem: HistoryItem = {
  id: 2,
  queryId: "q-2",
  stockCode: "600519",
  stockName: "贵州茅台股票股份有限公司",
  sentimentScore: 75,
  operationAdvice: "持有",
  createdAt: "2026-03-16T08:00:00Z",
};

const groupedItems: HistoryItem[] = [
  {
    id: 11,
    queryId: "q-11",
    stockCode: "AAPL",
    stockName: "Apple",
    sentimentScore: 91,
    operationAdvice: "买入",
    createdAt: "2026-03-17T08:00:00Z",
  },
  {
    id: 12,
    queryId: "q-12",
    stockCode: "AAPL",
    stockName: "Apple",
    sentimentScore: 66,
    operationAdvice: "观望",
    createdAt: "2026-03-16T08:00:00Z",
  },
];

const renderWithMantine = (ui: React.ReactNode) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("HistoryList", () => {
  it("shows the empty state copy when no history exists", () => {
    const { container } = renderWithMantine(
      <HistoryList {...baseProps} items={[]} />,
    );

    expect(screen.getByText("暂无历史分析记录")).toBeInTheDocument();
    expect(
      screen.getByText("完成首次分析后，这里会保留最近结果。"),
    ).toBeInTheDocument();
    expect(screen.getByText("历史分析")).toBeInTheDocument();
    expect(container.querySelector(".glass-card")).toBeTruthy();
  });

  it("renders selected count and forwards item interactions", () => {
    const onItemClick = vi.fn();
    const onToggleItemSelection = vi.fn();

    renderWithMantine(
      <HistoryList
        {...baseProps}
        items={items}
        selectedIds={new Set([1])}
        selectedId={1}
        onItemClick={onItemClick}
        onToggleItemSelection={onToggleItemSelection}
      />,
    );

    expect(screen.getAllByText("已选 1").length).toBeGreaterThan(0);
    expect(screen.getByText("买入 82")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /查看 600519/i }));
    expect(onItemClick).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    expect(onToggleItemSelection).toHaveBeenCalledWith(1);
  });

  it("toggles select-all when clicking the label text", () => {
    const onToggleSelectAll = vi.fn();

    renderWithMantine(
      <HistoryList
        {...baseProps}
        items={items}
        onToggleSelectAll={onToggleSelectAll}
      />,
    );

    fireEvent.click(screen.getByText("全选当前"));

    expect(onToggleSelectAll).toHaveBeenCalledTimes(1);
  });

  it("disables delete when nothing is selected", () => {
    renderWithMantine(<HistoryList {...baseProps} items={items} />);

    expect(screen.getByRole("button", { name: "删除" })).toBeDisabled();
  });

  it("truncates long stock names with trailing dot", () => {
    renderWithMantine(
      <HistoryList {...baseProps} items={[longChineseNameItem]} />,
    );

    // '贵州茅台股票股份有限公司' (12 Chinese chars) should be truncated to '贵州茅台股票股份.' (8 chars + dot)
    // The full name exists in a hidden span, visible on hover
    expect(screen.getByText("贵州茅台股票股份.")).toBeInTheDocument();
    expect(
      screen.queryByText("贵州茅台股票股份有限公司"),
    ).not.toBeInTheDocument();
  });

  it("generates unique select-all ids across multiple instances", () => {
    const { container } = renderWithMantine(
      <>
        <HistoryList {...baseProps} items={items} />
        <HistoryList {...baseProps} items={items} />
      </>,
    );

    const labels = container.querySelectorAll("label[for]");
    const ids = Array.from(labels).map((label) => label.getAttribute("for"));

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("renders embedded mode without extra glass card wrapper", () => {
    const { container } = renderWithMantine(
      <HistoryList {...baseProps} items={items} embedded />,
    );

    expect(screen.getByText("历史分析")).toBeInTheDocument();
    expect(container.querySelector(".glass-card")).toBeFalsy();
  });

  it("groups repeated stock codes into an expandable list and keeps child interactions working", () => {
    const onItemClick = vi.fn();
    const onToggleItemSelection = vi.fn();

    const { container } = renderWithMantine(
      <HistoryList
        {...baseProps}
        items={groupedItems}
        onItemClick={onItemClick}
        onToggleItemSelection={onToggleItemSelection}
      />,
    );

    expect(screen.getByText("2 次")).toBeInTheDocument();
    expect(screen.getAllByText("买入 91").length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", { name: "展开 AAPL 的历史记录" }),
    );

    expect(screen.getByText("第 1 次查询")).toBeInTheDocument();
    expect(screen.getByText("第 2 次查询")).toBeInTheDocument();
    expect(screen.getByText("观望 66")).toBeInTheDocument();

    const groupedHistoryButtons = container.querySelectorAll(
      'div[role="button"][aria-label*="查看 AAPL"]',
    );
    expect(groupedHistoryButtons.length).toBeGreaterThan(0);

    fireEvent.click(groupedHistoryButtons[0]);
    expect(onItemClick).toHaveBeenCalledWith(11);

    fireEvent.click(screen.getByLabelText("全选 AAPL 的历史记录"));
    expect(onToggleItemSelection).toHaveBeenCalledWith(11);
    expect(onToggleItemSelection).toHaveBeenCalledWith(12);

    const groupedCheckboxes = container.querySelectorAll(
      'input[aria-label*="第"]',
    );
    fireEvent.click(groupedCheckboxes[0]);
    expect(onToggleItemSelection).toHaveBeenCalledWith(11);
  });
});
