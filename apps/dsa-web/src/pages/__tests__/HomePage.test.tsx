import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analysisApi, DuplicateTaskError } from "../../api/analysis";
import { historyApi } from "../../api/history";
import { stocksApi } from "../../api/stocks";
import { ThemeProvider } from "../../components/theme/ThemeProvider";
import { useStockPoolStore } from "../../stores";
import {
  getReportText,
  normalizeReportLanguage,
} from "../../utils/reportLanguage";
import HomePage from "../HomePage";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../../api/history", () => ({
  historyApi: {
    getList: vi.fn(),
    getDetail: vi.fn(),
    deleteRecords: vi.fn(),
    getNews: vi.fn().mockResolvedValue({ total: 0, items: [] }),
    getMarkdown: vi.fn().mockResolvedValue("# report"),
  },
}));

vi.mock("../../api/analysis", async () => {
  const actual =
    await vi.importActual<typeof import("../../api/analysis")>(
      "../../api/analysis",
    );
  return {
    ...actual,
    analysisApi: {
      analyzeAsync: vi.fn(),
    },
  };
});

vi.mock("../../api/stocks", () => ({
  stocksApi: {
    getHistory: vi.fn(),
  },
}));

vi.mock("../../hooks/useTaskStream", () => ({
  useTaskStream: vi.fn(),
}));

const historyItem = {
  id: 1,
  queryId: "q-1",
  stockCode: "600519",
  stockName: "贵州茅台",
  sentimentScore: 82,
  operationAdvice: "买入",
  createdAt: "2026-03-18T08:00:00Z",
};

const historyReport = {
  meta: {
    id: 1,
    queryId: "q-1",
    stockCode: "600519",
    stockName: "贵州茅台",
    reportType: "detailed" as const,
    reportLanguage: "zh" as const,
    createdAt: "2026-03-18T08:00:00Z",
  },
  summary: {
    analysisSummary: "趋势维持强势",
    operationAdvice: "继续观察买点",
    trendPrediction: "短线震荡偏强",
    sentimentScore: 78,
  },
};

describe("HomePage", () => {
  const renderHome = () =>
    render(
      <ThemeProvider>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </ThemeProvider>,
    );

  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    vi.mocked(stocksApi.getHistory).mockResolvedValue({
      stockCode: "600519.SH",
      stockName: "贵州茅台",
      period: "daily",
      data: [
        {
          date: "2026-03-14",
          open: 1680,
          high: 1690,
          low: 1670,
          close: 1682,
        },
        {
          date: "2026-03-15",
          open: 1682,
          high: 1700,
          low: 1680,
          close: 1698,
        },
      ],
    });
    useStockPoolStore.getState().resetDashboardState();
  });

  it("renders the dashboard workspace and auto-loads the first report", async () => {
    vi.mocked(historyApi.getList).mockResolvedValue({
      total: 1,
      page: 1,
      limit: 20,
      items: [historyItem],
    });
    vi.mocked(historyApi.getDetail).mockResolvedValue(historyReport);
    vi.mocked(analysisApi.analyzeAsync).mockResolvedValue({
      taskId: "task-1",
      status: "pending",
    });

    renderHome();

    const dashboard = await screen.findByTestId("home-dashboard");
    expect(dashboard).toBeInTheDocument();
    expect(dashboard.className).toContain("home-workbench-page");
    expect(dashboard.className).not.toContain("h-[calc(100vh-5rem)]");
    expect(
      dashboard.querySelector('[data-testid="home-workbench-overview-grid"]'),
    ).toBeNull();
    expect(dashboard.querySelector(".home-workbench-main-grid")).toBeTruthy();
    expect(
      screen.getByPlaceholderText(
        "输入股票代码或名称，如 600519、贵州茅台、AAPL",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("市场分析工作台")).toBeInTheDocument();
    expect(screen.getByText("任务与历史")).toBeInTheDocument();
    expect(screen.getByText("分析结果")).toBeInTheDocument();
    expect((await screen.findAllByText(/贵州茅台/)).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", {
        name: getReportText(
          normalizeReportLanguage(historyReport.meta.reportLanguage),
        ).fullReport,
      }),
    ).toBeInTheDocument();
  });

  it("shows the empty report workspace when history is empty", async () => {
    vi.mocked(historyApi.getList).mockResolvedValue({
      total: 0,
      page: 1,
      limit: 20,
      items: [],
    });

    renderHome();

    expect(await screen.findByText("市场分析工作台")).toBeInTheDocument();
    expect(screen.getByText("任务与历史")).toBeInTheDocument();
    expect(screen.getByText("分析结果")).toBeInTheDocument();
    expect(screen.getByText("开始分析")).toBeInTheDocument();
    expect(screen.getByText("暂无历史分析记录")).toBeInTheDocument();
  });

  it("surfaces duplicate task warnings from dashboard submission", async () => {
    vi.mocked(historyApi.getList).mockResolvedValue({
      total: 0,
      page: 1,
      limit: 20,
      items: [],
    });
    vi.mocked(analysisApi.analyzeAsync).mockRejectedValue(
      new DuplicateTaskError("600519", "task-1", "股票 600519 正在分析中"),
    );

    renderHome();

    const input = await screen.findByPlaceholderText(
      "输入股票代码或名称，如 600519、贵州茅台、AAPL",
    );
    fireEvent.change(input, { target: { value: "600519" } });
    fireEvent.click(screen.getByRole("button", { name: "立即分析" }));

    await waitFor(() => {
      expect(screen.getByText(/股票 600519 正在分析中/)).toBeInTheDocument();
    });
    expect(
      screen.getByText(/股票 600519 正在分析中/).closest('[role="alert"]'),
    ).toBeInTheDocument();
  });

  it("navigates to chat with report context when asking a follow-up question", async () => {
    vi.mocked(historyApi.getList).mockResolvedValue({
      total: 1,
      page: 1,
      limit: 20,
      items: [historyItem],
    });
    vi.mocked(historyApi.getDetail).mockResolvedValue(historyReport);

    renderHome();

    const followUpButton = await screen.findByRole("button", {
      name: "追问 AI",
    });
    fireEvent.click(followUpButton);

    expect(navigateMock).toHaveBeenCalledWith(
      "/chat?stock=600519&name=%E8%B4%B5%E5%B7%9E%E8%8C%85%E5%8F%B0&recordId=1",
    );
  });

  it("confirms and deletes selected history from the dashboard state flow", async () => {
    vi.mocked(historyApi.getList).mockResolvedValue({
      total: 1,
      page: 1,
      limit: 20,
      items: [historyItem],
    });
    vi.mocked(historyApi.getDetail).mockResolvedValue(historyReport);
    vi.mocked(historyApi.deleteRecords).mockResolvedValue({ deleted: 1 });

    useStockPoolStore.setState({
      historyItems: [historyItem],
      selectedHistoryIds: [1],
      selectedReport: historyReport,
    });

    renderHome();

    fireEvent.click(await screen.findByRole("button", { name: "删除" }));

    expect(
      await screen.findByText("确认删除这条历史记录吗？删除后将不可恢复。"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    await waitFor(() => {
      expect(historyApi.deleteRecords).toHaveBeenCalledWith([1]);
    });
  });

  it("opens and closes the mobile history drawer through the overlay without changing dashboard styles", async () => {
    vi.mocked(historyApi.getList).mockResolvedValue({
      total: 0,
      page: 1,
      limit: 20,
      items: [],
    });

    const { container } = render(
      <ThemeProvider>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    const trigger = await screen.findByRole("button", { name: "历史记录" });
    fireEvent.click(trigger);

    expect(container.querySelector(".page-drawer-overlay")).toBeTruthy();
    expect(container.querySelector(".dashboard-card")).toBeTruthy();

    fireEvent.click(
      container.querySelector(".page-drawer-overlay") as HTMLElement,
    );

    await waitFor(() => {
      expect(container.querySelector(".page-drawer-overlay")).toBeFalsy();
    });
  });

  it("renders active task panel content from dashboard state", async () => {
    vi.mocked(historyApi.getList).mockResolvedValue({
      total: 0,
      page: 1,
      limit: 20,
      items: [],
    });

    useStockPoolStore.setState({
      activeTasks: [
        {
          taskId: "task-1",
          stockCode: "600519",
          stockName: "贵州茅台",
          status: "processing",
          progress: 45,
          message: "正在抓取最新行情",
          reportType: "detailed",
          createdAt: "2026-03-18T08:00:00Z",
        },
      ],
    });

    renderHome();

    expect(await screen.findByText("分析任务")).toBeInTheDocument();
    expect(screen.getByText("正在抓取最新行情")).toBeInTheDocument();
  });

  it("triggers reanalyze for the current report even if the search input has other text", async () => {
    vi.mocked(historyApi.getList).mockResolvedValue({
      total: 1,
      page: 1,
      limit: 20,
      items: [historyItem],
    });
    vi.mocked(historyApi.getDetail).mockResolvedValue(historyReport);
    vi.mocked(analysisApi.analyzeAsync).mockResolvedValue({
      taskId: "task-re-1",
      status: "pending",
    });

    renderHome();

    // Wait for the report to load
    expect((await screen.findAllByText(/贵州茅台/)).length).toBeGreaterThan(0);

    // Type something else in the search box
    const input = screen.getByPlaceholderText(
      "输入股票代码或名称，如 600519、贵州茅台、AAPL",
    );
    fireEvent.change(input, { target: { value: "AAPL" } });

    // Click "Reanalyze"
    const reanalyzeButton = screen.getByRole("button", { name: "重新分析" });
    fireEvent.click(reanalyzeButton);

    // Verify that analyzeAsync is called with the report's stock code, not the search box text
    expect(analysisApi.analyzeAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        stockCode: "600519",
        originalQuery: "600519",
        forceRefresh: true,
      }),
    );
  });
});
