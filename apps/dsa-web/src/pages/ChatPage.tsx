import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  ActionIcon,
  Group,
  Paper,
  Radio,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  ChevronRight,
  Download,
  History,
  Lightbulb,
  Menu,
  Plus,
  Search,
  Send,
  Trash2,
  Zap,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../utils/cn";
import { agentApi } from "../api/agent";
import {
  ApiErrorAlert,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  InlineAlert,
  ScrollArea,
  Tooltip,
} from "../components/common";
import { getParsedApiError } from "../api/error";
import type { SkillInfo } from "../api/agent";
import { DashboardStateBlock } from "../components/dashboard";
import {
  useAgentChatStore,
  type Message,
  type ProgressStep,
} from "../stores/agentChatStore";
import { downloadSession, formatSessionAsMarkdown } from "../utils/chatExport";
import type { ChatFollowUpContext } from "../utils/chatFollowUp";
import {
  buildFollowUpPrompt,
  parseFollowUpRecordId,
  resolveChatFollowUpContext,
  sanitizeFollowUpStockCode,
  sanitizeFollowUpStockName,
} from "../utils/chatFollowUp";
import { isNearBottom } from "../utils/chatScroll";
import {
  showErrorNotification,
  showSuccessNotification,
} from "../utils/notifications";
import { getReportText } from "../utils/reportLanguage";

// Quick question examples shown on empty state
const QUICK_QUESTIONS = [
  { label: "用缠论分析茅台", skill: "chan_theory" },
  { label: "波浪理论看宁德时代", skill: "wave_theory" },
  { label: "分析比亚迪趋势", skill: "bull_trend" },
  { label: "箱体震荡技能看中芯国际", skill: "box_oscillation" },
  { label: "分析腾讯 hk00700", skill: "bull_trend" },
  { label: "用情绪周期分析东方财富", skill: "emotion_cycle" },
];

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ChatPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState("");
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(
    new Set(),
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [isFollowUpContextLoading, setIsFollowUpContextLoading] =
    useState(false);
  const [copiedMessages, setCopiedMessages] = useState<Set<string>>(new Set());
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const copyResetTimerRef = useRef<Partial<Record<string, number>>>({});
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const sessionListViewportRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isMountedRef = useRef(true);
  const followUpHydrationTokenRef = useRef(0);
  const followUpContextRef = useRef<ChatFollowUpContext | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const pendingScrollBehaviorRef = useRef<ScrollBehavior>("auto");

  // Get localized text (default to Chinese)
  const text = getReportText("zh");

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = copyResetTimerRef.current;
    return () => {
      Object.values(timers).forEach((timerId) => {
        if (timerId !== undefined) {
          window.clearTimeout(timerId);
        }
      });
    };
  }, []);

  // Set page title
  useEffect(() => {
    document.title = "问股 - DSA";
  }, []);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const {
    messages,
    loading,
    progressSteps,
    sessionId,
    sessions,
    sessionsLoading,
    chatError,
    loadSessions,
    loadInitialSession,
    switchSession,
    startStream,
    clearCompletionBadge,
  } = useAgentChatStore();

  const syncScrollState = useCallback(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    const nearBottom = isNearBottom({
      scrollTop: viewport.scrollTop,
      clientHeight: viewport.clientHeight,
      scrollHeight: viewport.scrollHeight,
    });
    shouldStickToBottomRef.current = nearBottom;
    setShowJumpToBottom((prev) => (nearBottom ? false : prev));
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const requestScrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      shouldStickToBottomRef.current = true;
      pendingScrollBehaviorRef.current = behavior;
      setShowJumpToBottom(false);
    },
    [],
  );

  const handleMessagesScroll = useCallback(() => {
    syncScrollState();
  }, [syncScrollState]);

  useEffect(() => {
    syncScrollState();
  }, [syncScrollState, sessionId]);

  useEffect(() => {
    const behavior = pendingScrollBehaviorRef.current;
    const shouldAutoScroll = shouldStickToBottomRef.current;
    if (!shouldAutoScroll) {
      if (messages.length > 0 || progressSteps.length > 0 || loading) {
        setShowJumpToBottom(true);
      }
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollToBottom(behavior);
      pendingScrollBehaviorRef.current = loading ? "auto" : "smooth";
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, progressSteps, loading, sessionId, scrollToBottom]);

  useEffect(() => {
    if (!loading) {
      pendingScrollBehaviorRef.current = "smooth";
    }
  }, [loading]);

  useEffect(() => {
    clearCompletionBadge();
  }, [clearCompletionBadge]);

  useEffect(() => {
    loadInitialSession();
  }, [loadInitialSession]);

  useEffect(() => {
    agentApi
      .getSkills()
      .then((res) => {
        setSkills(res.skills);
        const defaultId = res.default_skill_id || res.skills[0]?.id || "";
        setSelectedSkill(defaultId);
      })
      .catch((error) => {
        console.error("Failed to load chat skills:", error);
      });
  }, []);

  const availableSkillIds = new Set(skills.map((skill) => skill.id));
  const quickQuestions = QUICK_QUESTIONS.filter(
    (question) =>
      availableSkillIds.size === 0 || availableSkillIds.has(question.skill),
  );

  const normalizedSessionSearch = sessionSearch.trim().toLowerCase();
  const filteredSessions = useMemo(() => {
    if (!normalizedSessionSearch) {
      return sessions;
    }

    return sessions.filter((session) => {
      const dateText = session.last_active
        ? new Date(session.last_active).toLocaleDateString("zh-CN", {
            month: "short",
            day: "numeric",
          })
        : "";

      const haystack = [
        session.title,
        `${session.message_count} 条对话`,
        dateText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSessionSearch);
    });
  }, [normalizedSessionSearch, sessions]);

  const renderHighlightedText = useCallback(
    (value: string) => {
      const keyword = sessionSearch.trim();
      if (!keyword) {
        return value;
      }

      const pattern = new RegExp(`(${escapeRegExp(keyword)})`, "ig");
      const parts = value.split(pattern);

      return parts.map((part, index) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={`${part}-${index}`} className="session-search-highlight">
            {part}
          </mark>
        ) : (
          <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
        ),
      );
    },
    [sessionSearch],
  );

  const handleStartNewChat = useCallback(() => {
    followUpContextRef.current = null;
    requestScrollToBottom("auto");
    useAgentChatStore.getState().startNewChat();
    setSidebarOpen(false);
  }, [requestScrollToBottom]);

  const handleSwitchSession = useCallback(
    (targetSessionId: string) => {
      requestScrollToBottom("auto");
      switchSession(targetSessionId);
      setSidebarOpen(false);
    },
    [requestScrollToBottom, switchSession],
  );

  const confirmDelete = useCallback(() => {
    if (!deleteConfirmId) return;
    agentApi
      .deleteChatSession(deleteConfirmId)
      .then(() => {
        loadSessions();
        if (deleteConfirmId === sessionId) {
          handleStartNewChat();
        }
      })
      .catch((error) => {
        console.error("Failed to delete chat session:", error);
      });
    setDeleteConfirmId(null);
  }, [deleteConfirmId, sessionId, loadSessions, handleStartNewChat]);

  // Handle follow-up from report page: ?stock=600519&name=贵州茅台&recordId=xxx
  useEffect(() => {
    const stock = sanitizeFollowUpStockCode(searchParams.get("stock"));
    const name = sanitizeFollowUpStockName(searchParams.get("name"));
    const recordId = parseFollowUpRecordId(searchParams.get("recordId"));

    if (!stock) {
      setSearchParams({}, { replace: true });
      return;
    }

    const hydrationToken = ++followUpHydrationTokenRef.current;
    setInput(buildFollowUpPrompt(stock, name));
    followUpContextRef.current = {
      stock_code: stock,
      stock_name: name,
    };
    if (recordId !== undefined) {
      setIsFollowUpContextLoading(true);
    }
    void resolveChatFollowUpContext({
      stockCode: stock,
      stockName: name,
      recordId,
    })
      .then((context) => {
        if (
          !isMountedRef.current ||
          followUpHydrationTokenRef.current !== hydrationToken
        ) {
          return;
        }
        followUpContextRef.current = context;
      })
      .finally(() => {
        if (
          isMountedRef.current &&
          followUpHydrationTokenRef.current === hydrationToken
        ) {
          setIsFollowUpContextLoading(false);
        }
      });
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSend = useCallback(
    async (overrideMessage?: string, overrideSkill?: string) => {
      const msgText = overrideMessage || input.trim();
      if (!msgText || loading) return;
      const usedSkill = overrideSkill || selectedSkill;
      const usedSkillName =
        skills.find((s) => s.id === usedSkill)?.name ||
        (usedSkill ? usedSkill : "通用");

      const payload = {
        message: msgText,
        session_id: sessionId,
        skills: usedSkill ? [usedSkill] : undefined,
        context: followUpContextRef.current ?? undefined,
      };
      followUpHydrationTokenRef.current += 1;
      followUpContextRef.current = null;
      setIsFollowUpContextLoading(false);

      setInput("");
      requestScrollToBottom("smooth");
      await startStream(payload, { skillName: usedSkillName });
    },
    [
      input,
      loading,
      requestScrollToBottom,
      selectedSkill,
      skills,
      sessionId,
      startStream,
    ],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickQuestion = (q: (typeof QUICK_QUESTIONS)[0]) => {
    setSelectedSkill(q.skill);
    handleSend(q.label, q.skill);
  };

  const showSendFeedback = useCallback(
    (
      nextToast: { type: "success" | "error"; message: string },
      durationMs: number,
    ) => {
      if (nextToast.type === "success") {
        showSuccessNotification({
          title: "发送成功",
          message: nextToast.message,
          autoClose: durationMs,
        });
        return;
      }

      showErrorNotification({
        title: "发送失败",
        message: nextToast.message,
        autoClose: durationMs,
      });
    },
    [],
  );

  const scrollActiveSessionIntoView = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const viewport = sessionListViewportRef.current;
      if (!viewport || !sessionId) {
        return;
      }

      const target = sessionItemRefs.current[sessionId];
      if (!target) {
        return;
      }

      const viewportRect = viewport.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetTop = targetRect.top - viewportRect.top + viewport.scrollTop;
      const targetBottom = targetTop + targetRect.height;
      const viewportTop = viewport.scrollTop;
      const viewportBottom = viewportTop + viewport.clientHeight;
      const padding = 20;

      const isVisible =
        targetTop >= viewportTop + padding &&
        targetBottom <= viewportBottom - padding;

      if (isVisible) {
        return;
      }

      const nextTop =
        targetTop - viewport.clientHeight / 2 + targetRect.height / 2;

      viewport.scrollTo({
        top: Math.max(0, nextTop),
        behavior,
      });
    },
    [sessionId],
  );

  useEffect(() => {
    if (sessionsLoading || !sessionId) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollActiveSessionIntoView("smooth");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    sessionId,
    sessions.length,
    sessionsLoading,
    scrollActiveSessionIntoView,
  ]);

  const toggleThinking = (msgId: string) => {
    setExpandedThinking((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const copyMessageToClipboard = async (msgId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessages((prev) => new Set(prev).add(msgId));
      const existingTimer = copyResetTimerRef.current[msgId];
      if (existingTimer !== undefined) {
        window.clearTimeout(existingTimer);
      }
      copyResetTimerRef.current[msgId] = window.setTimeout(() => {
        setCopiedMessages((prev) => {
          const next = new Set(prev);
          next.delete(msgId);
          return next;
        });
        delete copyResetTimerRef.current[msgId];
      }, 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const downloadMessageAsMarkdown = useCallback((msg: Message) => {
    const heading =
      msg.role === "user"
        ? "# 用户消息"
        : `# AI 回复${msg.skillName ? ` · ${msg.skillName}` : ""}`;
    const content = [heading, "", msg.content].join("\n");
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${msg.role === "user" ? "user" : "assistant"}-message-${msg.id}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, []);

  const getCurrentStage = (steps: ProgressStep[]): string => {
    if (steps.length === 0) return "正在连接...";
    const last = steps[steps.length - 1];
    if (last.type === "thinking") return last.message || "AI 正在思考...";
    if (last.type === "tool_start")
      return `${last.display_name || last.tool}...`;
    if (last.type === "tool_done")
      return `${last.display_name || last.tool} 完成`;
    if (last.type === "generating")
      return last.message || "正在生成最终分析...";
    return "处理中...";
  };

  const renderThinkingBlock = (msg: Message) => {
    if (!msg.thinkingSteps || msg.thinkingSteps.length === 0) return null;
    const isExpanded = expandedThinking.has(msg.id);
    const toolSteps = msg.thinkingSteps.filter((s) => s.type === "tool_done");
    const totalDuration = toolSteps.reduce(
      (sum, s) => sum + (s.duration || 0),
      0,
    );
    const summary = `${toolSteps.length} 个工具调用 · ${totalDuration.toFixed(1)}s`;

    return (
      <button
        onClick={() => toggleThinking(msg.id)}
        className="mt-1 flex w-full items-center gap-2 text-left text-xs text-muted-text transition-colors hover:text-secondary-text"
      >
        <ChevronRight
          className={`w-3 h-3 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
          strokeWidth={2}
          aria-hidden="true"
        />
        <span className="flex items-center gap-1.5">
          <span className="opacity-60">思考过程</span>
          <span className="text-muted-text/50">·</span>
          <span className="opacity-50">{summary}</span>
        </span>
      </button>
    );
  };

  const renderThinkingDetails = (steps: ProgressStep[]) => (
    <div className="mb-3 pl-5 border-l border-border/40 space-y-1.5 animate-fade-in">
      {steps.map((step, idx) => {
        let statusClass = "chat-progress-item-muted";
        let iconClass = "chat-progress-dot-muted";
        let text = "";
        if (step.type === "thinking") {
          text = step.message || `第 ${step.step} 步：思考`;
          statusClass = "chat-progress-item-thinking";
          iconClass = "chat-progress-dot-thinking";
        } else if (step.type === "tool_start") {
          text = `${step.display_name || step.tool}...`;
          statusClass = "chat-progress-item-tool";
          iconClass = "chat-progress-dot-tool";
        } else if (step.type === "tool_done") {
          text = `${step.display_name || step.tool} (${step.duration}s)`;
          statusClass = step.success
            ? "chat-progress-item-success"
            : "chat-progress-item-danger";
          iconClass = step.success
            ? "chat-progress-dot-success"
            : "chat-progress-dot-danger";
        } else if (step.type === "generating") {
          text = step.message || "生成分析";
          statusClass = "chat-progress-item-generating";
          iconClass = "chat-progress-dot-generating";
        }
        return (
          <div key={idx} className={cn("chat-progress-item", statusClass)}>
            <span className={cn("chat-progress-dot", iconClass)} />
            <span className="leading-relaxed">{text}</span>
          </div>
        );
      })}
    </div>
  );

  const sidebarContent = (
    <>
      <Group
        justify="space-between"
        align="center"
        className="chat-session-header"
      >
        <Title order={2} className="chat-session-title">
          <History className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
          历史对话
        </Title>
        <ActionIcon
          variant="subtle"
          radius="lg"
          onClick={handleStartNewChat}
          aria-label="开启新对话"
          className="chat-session-action"
        >
          <Plus className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
        </ActionIcon>
      </Group>
      <div className="chat-session-search">
        <div className="chat-session-search-icon" aria-hidden="true">
          <Search className="h-3.5 w-3.5" strokeWidth={2} />
        </div>
        <input
          type="text"
          value={sessionSearch}
          onChange={(event) => setSessionSearch(event.target.value)}
          placeholder="搜索历史对话"
          className="chat-session-search-input"
          aria-label="搜索历史对话"
        />
      </div>
      <ScrollArea
        testId="chat-session-list-scroll"
        viewportClassName="p-3"
        viewportRef={sessionListViewportRef}
      >
        {sessionsLoading ? (
          <DashboardStateBlock
            loading
            compact
            title="加载对话中..."
            className="rounded-2xl border border-dashed border-border/50 bg-surface/30"
          />
        ) : sessions.length === 0 ? (
          <DashboardStateBlock
            compact
            title="暂无历史对话"
            description="开始提问后，这里会保留会话记录。"
            className="rounded-2xl border border-dashed border-border/50 bg-surface/30"
          />
        ) : filteredSessions.length === 0 ? (
          <DashboardStateBlock
            compact
            title="没有匹配结果"
            description="试试更短的关键词，或清空搜索后查看全部历史对话。"
            className="rounded-2xl border border-dashed border-border/50 bg-surface/30"
          />
        ) : (
          <div className="space-y-2">
            {filteredSessions.map((s) => {
              const formattedLastActive = s.last_active
                ? new Date(s.last_active).toLocaleDateString("zh-CN", {
                    month: "short",
                    day: "numeric",
                  })
                : "";

              return (
                <div key={s.session_id} className="session-item-row">
                <button
                  ref={(node) => {
                    sessionItemRefs.current[s.session_id] = node;
                  }}
                  type="button"
                  onClick={() => handleSwitchSession(s.session_id)}
                  className={`session-item ${s.session_id === sessionId ? "active" : ""}`}
                  aria-label={`切换到对话 ${s.title}`}
                  aria-current={s.session_id === sessionId ? "page" : undefined}
                >
                  <div className="indicator" />
                  <div className="content">
                    <span className="title">
                      {renderHighlightedText(s.title)}
                    </span>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="meta">
                        {renderHighlightedText(`${s.message_count} 条对话`)}
                      </span>
                      {formattedLastActive && (
                        <>
                          <span className="separator" />
                          <span className="meta">
                            {renderHighlightedText(formattedLastActive)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => {
                    setDeleteConfirmId(s.session_id);
                  }}
                  aria-label={`删除对话 ${s.title}`}
                >
                  <Trash2
                    className="w-3.5 h-3.5"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </button>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </>
  );

  return (
    <div
      data-testid="chat-workspace"
      className="chat-layout-shell flex min-h-full w-full min-w-0 gap-4 overflow-hidden"
    >
      {/* Desktop sidebar */}
      <Paper
        radius="xl"
        shadow="none"
        className="chat-sidebar-shell home-workbench-card hidden h-full w-[18.5rem] flex-shrink-0 flex-col overflow-hidden md:flex"
      >
        {sidebarContent}
      </Paper>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="page-drawer-overlay absolute inset-0" />
          <div
            className="absolute left-0 top-0 bottom-0 w-72 flex flex-col overflow-hidden border-r border-white/10 bg-card/96 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        title="删除对话"
        message="删除后，该对话将不可恢复，确认删除吗？"
        confirmText="删除"
        cancelText="取消"
        isDanger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* Main chat area */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <Paper
          radius="xl"
          shadow="none"
          className="chat-header-card home-workbench-card mb-4 flex-shrink-0 px-5 py-4"
        >
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start" gap="md">
              <Group align="center" gap="sm" wrap="nowrap" className="min-w-0">
                <ActionIcon
                  variant="subtle"
                  radius="lg"
                  onClick={() => setSidebarOpen(true)}
                  className="chat-session-action md:hidden -ml-1"
                  aria-label="历史对话"
                >
                  <Menu
                    className="w-5 h-5"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </ActionIcon>
                <Title
                  order={1}
                  className="flex items-center gap-2 text-[1.85rem] font-bold text-foreground"
                >
                  <Lightbulb
                    className="w-6 h-6 text-cyan"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  问股
                </Title>
              </Group>
              {messages.length > 0 && (
                <Group
                  gap="xs"
                  className="chat-header-actions flex-shrink-0"
                  justify="flex-end"
                >
                  <Tooltip content="导出会话为 Markdown 文件">
                    <span className="inline-flex">
                      <Button
                        variant="action-primary"
                        size="sm"
                        onClick={() => downloadSession(messages)}
                        aria-label="导出会话为 Markdown 文件"
                      >
                        <Download
                          className="w-4 h-4"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        导出会话
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip content="发送到已配置的通知机器人/邮箱">
                    <span className="inline-flex">
                      <Button
                        variant="action-primary"
                        size="sm"
                        disabled={sending}
                        onClick={async () => {
                          if (sending) return;
                          setSending(true);
                          try {
                            const content = formatSessionAsMarkdown(messages);
                            await agentApi.sendChat(content);
                            showSendFeedback(
                              { type: "success", message: "已发送到通知渠道" },
                              3000,
                            );
                          } catch (err) {
                            const parsed = getParsedApiError(err);
                            showSendFeedback(
                              {
                                type: "error",
                                message: parsed.message || "发送失败",
                              },
                              5000,
                            );
                          } finally {
                            setSending(false);
                          }
                        }}
                        aria-label="发送到已配置的通知机器人/邮箱"
                      >
                        {sending ? (
                          <div
                            className="h-4 w-4 animate-spin rounded-full border-2 border-current/25 border-t-current"
                            aria-hidden="true"
                          />
                        ) : (
                          <Send
                            className="w-4 h-4"
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        )}
                        发送
                      </Button>
                    </span>
                  </Tooltip>
                </Group>
              )}
            </Group>
            <Text className="text-sm text-secondary-text">
              向 AI 询问个股分析，获取基于技能视角的交易建议与实时决策报告。
            </Text>
            <Group gap="xs" className="chat-header-meta">
              <Badge variant="default" className="shadow-none">
                多轮问答
              </Badge>
              <Badge variant="default" className="shadow-none">
                技能路由
              </Badge>
              <Badge variant="default" className="shadow-none">
                会话管理
              </Badge>
            </Group>
          </Stack>
        </Paper>

        <Paper
          radius="xl"
          shadow="none"
          className="chat-main-shell home-workbench-card relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {/* Messages */}
          <ScrollArea
            className="relative z-10 flex-1"
            viewportRef={messagesViewportRef}
            onScroll={handleMessagesScroll}
            viewportClassName="p-4 md:p-6"
            testId="chat-message-scroll"
          >
            <div className="chat-messages-inner mx-auto flex w-full max-w-[58rem] flex-col gap-6">
              {messages.length === 0 && !loading ? (
                <div className="flex min-h-full items-center justify-center py-8">
                  <EmptyState
                    title="开始问股"
                    description="输入「分析 600519」或「茅台现在能买吗」，AI 将调用实时数据工具为您生成决策报告。"
                    className="chat-empty-state max-w-3xl border-dashed bg-card/55"
                    icon={
                      <Lightbulb
                        className="h-8 w-8"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    }
                    action={
                      <Group gap="xs" justify="center" className="max-w-xl">
                        {quickQuestions.map((q, i) => (
                          <Button
                            key={i}
                            onClick={() => handleQuickQuestion(q)}
                            variant="secondary"
                            size="sm"
                            className="quick-question-btn"
                          >
                            {q.label}
                          </Button>
                        ))}
                      </Group>
                    }
                  />
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-sm transition-all",
                        msg.role === "user"
                          ? "chat-avatar-user"
                          : "chat-avatar-ai",
                      )}
                    >
                      {msg.role === "user" ? "U" : "AI"}
                    </div>
                    <div
                      className={cn(
                        "group/message min-w-0 w-fit max-w-[min(100%,52rem)] overflow-hidden px-5 py-3.5 transition-colors",
                        msg.role === "user"
                          ? "chat-bubble-user"
                          : "chat-bubble-ai",
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <div className="space-y-2.5">
                          <div className="chat-message-meta-row">
                            <div className="min-w-0 flex-1">
                              {msg.skillName ? (
                                <Badge
                                  variant="info"
                                  className="chat-skill-badge shadow-none"
                                  aria-label={`技能 ${msg.skillName}`}
                                >
                                  <Zap
                                    className="w-3 h-3"
                                    strokeWidth={2}
                                    aria-hidden="true"
                                  />
                                  {msg.skillName}
                                </Badge>
                              ) : null}
                              {renderThinkingBlock(msg)}
                            </div>
                            <div className="chat-message-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  copyMessageToClipboard(msg.id, msg.content)
                                }
                                className="chat-copy-btn"
                                aria-label={
                                  copiedMessages.has(msg.id)
                                    ? text.copied
                                    : text.copy
                                }
                              >
                                {copiedMessages.has(msg.id)
                                  ? text.copied
                                  : text.copy}
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadMessageAsMarkdown(msg)}
                                className="chat-copy-btn"
                                aria-label="导出此条消息为 Markdown"
                              >
                                导出
                              </button>
                            </div>
                          </div>
                          {expandedThinking.has(msg.id) &&
                            msg.thinkingSteps &&
                            renderThinkingDetails(msg.thinkingSteps)}
                          <div className="chat-prose">
                            <Markdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </Markdown>
                          </div>
                        </div>
                      ) : (
                        msg.content.split("\n").map((line, i) => (
                          <p key={i} className="mb-1 last:mb-0 leading-relaxed">
                            {line || "\u00A0"}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-elevated text-foreground flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    AI
                  </div>
                  <Paper
                    radius="xl"
                    shadow="none"
                    className="min-w-[200px] max-w-[min(100%,52rem)] overflow-hidden rounded-tl-sm border border-white/6 bg-card/72 px-5 py-4"
                  >
                    <Group
                      gap="sm"
                      className="text-sm text-secondary-text"
                      wrap="nowrap"
                    >
                      <div className="relative w-4 h-4 flex-shrink-0">
                        <div className="absolute inset-0 rounded-full border-2 border-cyan/20" />
                        <div className="absolute inset-0 rounded-full border-2 border-cyan border-t-transparent animate-spin" />
                      </div>
                      <Text className="text-secondary-text">
                        {getCurrentStage(progressSteps)}
                      </Text>
                    </Group>
                  </Paper>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {showJumpToBottom && (
            <div className="pointer-events-none absolute bottom-[5.75rem] right-4 z-20 md:bottom-24 md:right-6">
              <button
                type="button"
                className="pointer-events-auto chat-copy-btn shadow-soft-card"
                onClick={() => {
                  requestScrollToBottom("smooth");
                  scrollToBottom("smooth");
                }}
                aria-label="查看最新消息"
              >
                <Download
                  className="h-3.5 w-3.5"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                有新消息
              </button>
            </div>
          )}

          {/* Input area */}
          <div className="chat-composer-area relative z-20 border-t border-white/6 p-4 md:p-5">
            <div className="chat-composer-shell">
              <Stack gap="sm">
                {chatError ? <ApiErrorAlert error={chatError} /> : null}
                {isFollowUpContextLoading ? (
                  <InlineAlert
                    variant="info"
                    title="追问上下文加载中"
                    message="正在加载历史分析上下文；现在可直接发送追问。"
                    className="rounded-xl px-3 py-2 text-xs shadow-none"
                  />
                ) : null}
                {skills.length > 0 && (
                  <Stack gap="xs">
                    <Text className="chat-skill-label text-xs font-medium uppercase tracking-wider text-muted-text">
                      策略
                    </Text>
                    <Radio.Group
                      value={selectedSkill}
                      onChange={setSelectedSkill}
                      name="skill"
                    >
                      <Group gap="md">
                        <Radio
                          value=""
                          label="通用分析"
                          classNames={{
                            root: "mt-0.5",
                            body: "items-center gap-1.5",
                            label: cn(
                              "text-sm transition-colors",
                              selectedSkill === ""
                                ? "font-medium text-foreground"
                                : "text-secondary-text",
                            ),
                            radio: "chat-skill-radio",
                          }}
                        />
                        {skills.map((s) => (
                          <Tooltip
                            key={s.id}
                            content={
                              s.description ? (
                                <div>
                                  <p className="skill-title">{s.name}</p>
                                  <p>{s.description}</p>
                                </div>
                              ) : null
                            }
                          >
                            <div className="inline-flex">
                              <Radio
                                value={s.id}
                                label={s.name}
                                classNames={{
                                  root: "mt-0.5",
                                  body: "items-center gap-1.5",
                                  label: cn(
                                    "text-sm transition-colors",
                                    selectedSkill === s.id
                                      ? "font-medium text-foreground"
                                      : "text-secondary-text",
                                  ),
                                  radio: "chat-skill-radio",
                                }}
                              />
                            </div>
                          </Tooltip>
                        ))}
                      </Group>
                    </Radio.Group>
                  </Stack>
                )}

                <Group align="flex-end" gap="md" wrap="nowrap">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="例如：分析 600519 / 茅台现在适合买入吗？ (Enter 发送, Shift+Enter 换行)"
                    disabled={loading}
                    rows={1}
                    className="input-surface input-focus-glow flex-1 min-h-[44px] max-h-[200px] rounded-xl border bg-transparent px-4 py-2.5 text-sm transition-all focus:outline-none resize-none disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ height: "auto" }}
                    onInput={(e) => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = "auto";
                      t.style.height = `${Math.min(t.scrollHeight, 200)}px`;
                    }}
                  />
                  <Button
                    variant="primary"
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading}
                    isLoading={loading}
                    className="btn-primary flex-shrink-0"
                  >
                    发送
                  </Button>
                </Group>
              </Stack>
            </div>
          </div>
        </Paper>
      </div>
    </div>
  );
};

export default ChatPage;
