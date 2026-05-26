import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it } from "vitest";
import { TaskPanel } from "../TaskPanel";
import type { TaskInfo } from "../../../types/analysis";

const baseTask: TaskInfo = {
  taskId: "task-1",
  stockCode: "600519",
  stockName: "贵州茅台",
  status: "processing",
  progress: 40,
  message: "正在抓取最新行情",
  reportType: "detailed",
  createdAt: "2026-03-21T08:00:00Z",
};

const renderWithMantine = (ui: React.ReactNode) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("TaskPanel", () => {
  it("renders active tasks with preserved dashboard panel styling", () => {
    const { container } = renderWithMantine(
      <TaskPanel
        tasks={[
          baseTask,
          {
            ...baseTask,
            taskId: "task-2",
            stockCode: "AAPL",
            stockName: "Apple",
            status: "pending",
            message: "等待分析队列",
          },
        ]}
      />,
    );

    expect(screen.getByText("分析任务")).toBeInTheDocument();
    expect(screen.getByText("1 进行中")).toBeInTheDocument();
    expect(screen.getByText("1 等待中")).toBeInTheDocument();
    expect(screen.getByText("贵州茅台")).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByLabelText("任务状态：分析中")).toBeInTheDocument();
    expect(container.querySelector(".home-panel-card")).toBeTruthy();
    expect(container.querySelector(".home-subpanel")).toBeTruthy();
  });

  it("does not render when there are no active tasks", () => {
    renderWithMantine(
      <TaskPanel
        tasks={[
          {
            ...baseTask,
            status: "completed",
          },
        ]}
      />,
    );

    expect(screen.queryByText("分析任务")).not.toBeInTheDocument();
  });

  it("renders embedded mode without nested card wrappers", () => {
    const { container } = renderWithMantine(
      <TaskPanel tasks={[baseTask]} embedded />,
    );

    expect(screen.getByText("分析任务")).toBeInTheDocument();
    expect(container.querySelector(".home-panel-card")).toBeFalsy();
    expect(container.querySelector(".home-subpanel")).toBeFalsy();
  });
});
