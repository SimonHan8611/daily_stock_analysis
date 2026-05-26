import type React from 'react';
import { Group, Progress, Stack, Text } from '@mantine/core';
import { RefreshCw } from 'lucide-react';
import { Badge, Card, StatusDot } from '../common';
import { DashboardPanelHeader } from '../dashboard';
import type { TaskInfo } from '../../types/analysis';

/**
 * 任务项组件属性
 */
interface TaskItemProps {
  task: TaskInfo;
  embedded?: boolean;
}

/**
 * 单个任务项
 */
const TaskItem: React.FC<TaskItemProps> = ({ task, embedded = false }) => {
  const isPending = task.status === 'pending';
  const isProcessing = task.status === 'processing';
  const statusLabel = isProcessing ? '分析中' : '等待中';
  const statusVariant = isProcessing ? 'info' : 'default';
  const statusTone = isProcessing ? 'info' : 'neutral';
  const progress = Math.max(0, Math.min(100, task.progress || 0));

  return (
    <div
      className={
        embedded
          ? 'border-b border-[hsl(var(--border)/0.62)] py-3 last:border-b-0 last:pb-0 first:pt-0'
          : 'home-subpanel px-3 py-2.5'
      }
    >
      <Group align="flex-start" gap="sm" wrap="nowrap">
        <div className="shrink-0 pt-1">
          {isProcessing ? (
            <StatusDot tone="info" pulse className="h-2.5 w-2.5" aria-label="任务进行中" />
          ) : isPending ? (
            <StatusDot tone="neutral" className="h-2.5 w-2.5" aria-label="任务等待中" />
          ) : null}
        </div>

        <Stack gap={7} className="min-w-0 flex-1">
          <Group gap="xs" wrap="nowrap">
            <Text className="truncate text-[13px] font-semibold leading-5 text-foreground">
              {task.stockName || task.stockCode}
            </Text>
            <Text className="shrink-0 text-[11px] font-medium text-muted-text">
              {task.stockCode}
            </Text>
          </Group>
          {task.message ? (
            <Text className="truncate text-[12px] font-medium leading-5 text-secondary-text">
              {task.message}
            </Text>
          ) : null}
          <Group gap="xs" wrap="nowrap">
            <Progress
              value={progress}
              size="sm"
              radius="xl"
              color="cyan"
              className="flex-1"
            />
            <Text className="shrink-0 text-[11px] font-medium text-muted-text tabular-nums">
              {progress}%
            </Text>
          </Group>
        </Stack>

        <div className="flex-shrink-0 pt-0.5">
          <Badge
            variant={statusVariant}
            className="min-w-[4.75rem] justify-center gap-1.5 shadow-none"
            aria-label={`任务状态：${statusLabel}`}
          >
            <StatusDot tone={statusTone} pulse={isProcessing} className="h-1.5 w-1.5" />
            {statusLabel}
          </Badge>
        </div>
      </Group>
    </div>
  );
};

/**
 * 任务面板属性
 */
interface TaskPanelProps {
  /** 任务列表 */
  tasks: TaskInfo[];
  /** 是否显示 */
  visible?: boolean;
  /** 标题 */
  title?: string;
  /** 自定义类名 */
  className?: string;
  /** 是否以内嵌 section 渲染 */
  embedded?: boolean;
}

/**
 * 任务面板组件
 * 显示进行中的分析任务列表
 */
export const TaskPanel: React.FC<TaskPanelProps> = ({
  tasks,
  visible = true,
  title = '分析任务',
  className = '',
  embedded = false,
}) => {
  // 筛选活跃任务（pending 和 processing）
  const activeTasks = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'processing'
  );

  // 无任务或不可见时不渲染
  if (!visible || activeTasks.length === 0) {
    return null;
  }

  const pendingCount = activeTasks.filter((t) => t.status === 'pending').length;
  const processingCount = activeTasks.filter((t) => t.status === 'processing').length;

  const content = (
    <>
      <div className={embedded ? '' : 'border-b border-subtle px-3 py-3'}>
        <DashboardPanelHeader
          className="mb-0"
          title={title}
          titleClassName="text-[13px] font-semibold tracking-[-0.01em]"
          leading={(
            <RefreshCw className="h-4 w-4 text-cyan" strokeWidth={2} aria-hidden="true" />
          )}
          headingClassName="items-center"
          actions={(
            <div className="flex items-center gap-3 text-[11px] font-medium text-muted-text">
              {processingCount > 0 && (
                <span className="flex items-center gap-1">
                  <StatusDot tone="info" pulse className="h-1.5 w-1.5" aria-label="进行中任务" />
                  {processingCount} 进行中
                </span>
              )}
              {pendingCount > 0 ? (
                <span className="flex items-center gap-1">
                  <StatusDot tone="neutral" className="h-1.5 w-1.5" aria-label="等待中任务" />
                  {pendingCount} 等待中
                </span>
              ) : null}
            </div>
          )}
        />
      </div>

      <div className={embedded ? 'mt-3' : 'max-h-64 overflow-y-auto p-2'}>
        <div className={embedded ? '' : 'space-y-2'}>
          {activeTasks.map((task) => (
            <TaskItem key={task.taskId} task={task} embedded={embedded} />
          ))}
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <section className={className}>{content}</section>;
  }

  return (
    <Card
      variant="bordered"
      padding="none"
      className={`home-panel-card overflow-hidden ${className}`}
    >
      {content}
    </Card>
  );
};

export default TaskPanel;
