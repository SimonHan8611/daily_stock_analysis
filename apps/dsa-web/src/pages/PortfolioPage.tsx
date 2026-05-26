import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { portfolioApi } from "../api/portfolio";
import type { ParsedApiError } from "../api/error";
import { getParsedApiError } from "../api/error";
import {
  ApiErrorAlert,
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  InlineAlert,
  Input,
  PageHeader,
  Pagination,
  SectionCard,
  Select,
  StatCard,
  Toolbar,
} from "../components/common";
import { toDateInputValue } from "../utils/format";
import type {
  PortfolioAccountItem,
  PortfolioCashDirection,
  PortfolioCashLedgerListItem,
  PortfolioCorporateActionListItem,
  PortfolioCorporateActionType,
  PortfolioCostMethod,
  PortfolioFxRefreshResponse,
  PortfolioImportBrokerItem,
  PortfolioImportCommitResponse,
  PortfolioImportParseResponse,
  PortfolioPositionItem,
  PortfolioRiskResponse,
  PortfolioSide,
  PortfolioSnapshotResponse,
  PortfolioTradeListItem,
} from "../types/portfolio";

const PIE_COLORS = [
  "#00d4ff",
  "#00ff88",
  "#ffaa00",
  "#ff7a45",
  "#7f8cff",
  "#ff4466",
];
const DEFAULT_PAGE_SIZE = 20;
const FALLBACK_BROKERS: PortfolioImportBrokerItem[] = [
  { broker: "huatai", aliases: [], displayName: "华泰" },
  { broker: "citic", aliases: ["zhongxin"], displayName: "中信" },
  { broker: "cmb", aliases: ["cmbchina", "zhaoshang"], displayName: "招商" },
];
const PORTFOLIO_FILE_PICKER_CLASS =
  "input-surface input-focus-glow flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border bg-transparent px-4 text-sm transition-all focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

type AccountOption = "all" | number;
type EventType = "trade" | "cash" | "corporate";

type FlatPosition = PortfolioPositionItem & {
  accountId: number;
  accountName: string;
};

type PendingDelete =
  | { eventType: "trade"; id: number; message: string }
  | { eventType: "cash"; id: number; message: string }
  | { eventType: "corporate"; id: number; message: string };

type FxRefreshFeedback = {
  tone: "neutral" | "success" | "warning";
  text: string;
};

type FxRefreshContext = {
  viewKey: string;
  requestId: number;
};

type PortfolioAlertVariant = "info" | "success" | "warning" | "danger";

function getTodayIso(): string {
  return toDateInputValue(new Date());
}

function formatMoney(
  value: number | undefined | null,
  currency = "CNY",
): string {
  if (value == null || Number.isNaN(value)) return "--";
  return `${currency} ${Number(value).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPct(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return "--";
  return `${value.toFixed(2)}%`;
}

function hasPositionPrice(row: PortfolioPositionItem): boolean {
  return row.priceAvailable !== false && row.priceSource !== "missing";
}

function formatPositionPrice(row: PortfolioPositionItem): string {
  if (!hasPositionPrice(row)) return "--";
  return row.lastPrice.toFixed(4);
}

function formatPositionMoney(
  value: number,
  row: PortfolioPositionItem,
): string {
  if (!hasPositionPrice(row)) return "--";
  return formatMoney(value, row.valuationCurrency);
}

function getPositionPriceLabel(row: PortfolioPositionItem): string {
  if (!hasPositionPrice(row)) return "缺价";
  if (row.priceSource === "realtime_quote") {
    return row.priceProvider ? `实时价 · ${row.priceProvider}` : "实时价";
  }
  if (row.priceSource === "history_close") {
    return row.priceStale && row.priceDate
      ? `收盘价 · ${row.priceDate}`
      : "收盘价";
  }
  return row.priceSource || "未知来源";
}

function formatSideLabel(value: PortfolioSide): string {
  return value === "buy" ? "买入" : "卖出";
}

function formatCashDirectionLabel(value: PortfolioCashDirection): string {
  return value === "in" ? "流入" : "流出";
}

function formatCorporateActionLabel(
  value: PortfolioCorporateActionType,
): string {
  return value === "cash_dividend" ? "现金分红" : "拆并股调整";
}

function formatBrokerLabel(value: string, displayName?: string): string {
  if (displayName && displayName.trim()) {
    return `${value}（${displayName.trim()}）`;
  }
  if (value === "huatai") return "huatai（华泰）";
  if (value === "citic") return "citic（中信）";
  if (value === "cmb") return "cmb（招商）";
  return value;
}

function buildFxRefreshFeedback(
  data: PortfolioFxRefreshResponse,
): FxRefreshFeedback {
  if (data.refreshEnabled === false) {
    return {
      tone: "neutral",
      text: "汇率在线刷新已被禁用。",
    };
  }

  if (data.pairCount === 0) {
    return {
      tone: "neutral",
      text: "当前范围无可刷新的汇率对。",
    };
  }

  if (data.updatedCount > 0 && data.staleCount === 0 && data.errorCount === 0) {
    return {
      tone: "success",
      text: `汇率已刷新，共更新 ${data.updatedCount} 对。`,
    };
  }

  const summary = `更新 ${data.updatedCount} 对，仍过期 ${data.staleCount} 对，失败 ${data.errorCount} 对。`;
  if (data.staleCount > 0) {
    return {
      tone: "warning",
      text: `已尝试刷新，但仍有部分货币对使用 stale/fallback 汇率。${summary}`,
    };
  }

  return {
    tone: "warning",
    text: `在线刷新未完全成功。${summary}`,
  };
}

function getFxRefreshFeedbackVariant(
  tone: FxRefreshFeedback["tone"],
): PortfolioAlertVariant {
  if (tone === "success") return "success";
  if (tone === "warning") return "warning";
  return "info";
}

function getCsvParseVariant(
  result: PortfolioImportParseResponse,
): PortfolioAlertVariant {
  return result.errorCount > 0 || result.skippedCount > 0 ? "warning" : "info";
}

function getCsvCommitVariant(
  result: PortfolioImportCommitResponse,
  isDryRun: boolean,
): PortfolioAlertVariant {
  if (isDryRun) return "info";
  return result.failedCount > 0 || result.duplicateCount > 0
    ? "warning"
    : "success";
}

const PortfolioPage: React.FC = () => {
  useEffect(() => {
    document.title = "持仓分析 - DSA";
  }, []);

  const [accounts, setAccounts] = useState<PortfolioAccountItem[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountOption>("all");
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [accountCreating, setAccountCreating] = useState(false);
  const [accountCreateError, setAccountCreateError] = useState<string | null>(
    null,
  );
  const [accountCreateSuccess, setAccountCreateSuccess] = useState<
    string | null
  >(null);
  const [accountForm, setAccountForm] = useState({
    name: "",
    broker: "Demo",
    market: "cn" as "cn" | "hk" | "us",
    baseCurrency: "CNY",
  });
  const [costMethod, setCostMethod] = useState<PortfolioCostMethod>("fifo");
  const [snapshot, setSnapshot] = useState<PortfolioSnapshotResponse | null>(
    null,
  );
  const [risk, setRisk] = useState<PortfolioRiskResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fxRefreshing, setFxRefreshing] = useState(false);
  const [fxRefreshFeedback, setFxRefreshFeedback] =
    useState<FxRefreshFeedback | null>(null);
  const [error, setError] = useState<ParsedApiError | null>(null);
  const [riskWarning, setRiskWarning] = useState<string | null>(null);
  const [writeWarning, setWriteWarning] = useState<string | null>(null);

  const [brokers, setBrokers] = useState<PortfolioImportBrokerItem[]>([]);
  const [selectedBroker, setSelectedBroker] = useState("huatai");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvDryRun, setCsvDryRun] = useState(true);
  const [csvParsing, setCsvParsing] = useState(false);
  const [csvCommitting, setCsvCommitting] = useState(false);
  const [csvParseResult, setCsvParseResult] =
    useState<PortfolioImportParseResponse | null>(null);
  const [csvCommitResult, setCsvCommitResult] =
    useState<PortfolioImportCommitResponse | null>(null);
  const [brokerLoadWarning, setBrokerLoadWarning] = useState<string | null>(
    null,
  );

  const [eventType, setEventType] = useState<EventType>("trade");
  const [eventDateFrom, setEventDateFrom] = useState("");
  const [eventDateTo, setEventDateTo] = useState("");
  const [eventSymbol, setEventSymbol] = useState("");
  const [eventSide, setEventSide] = useState<"" | PortfolioSide>("");
  const [eventDirection, setEventDirection] = useState<
    "" | PortfolioCashDirection
  >("");
  const [eventActionType, setEventActionType] = useState<
    "" | PortfolioCorporateActionType
  >("");
  const [eventPage, setEventPage] = useState(1);
  const [eventTotal, setEventTotal] = useState(0);
  const [eventLoading, setEventLoading] = useState(false);
  const [tradeEvents, setTradeEvents] = useState<PortfolioTradeListItem[]>([]);
  const [cashEvents, setCashEvents] = useState<PortfolioCashLedgerListItem[]>(
    [],
  );
  const [corporateEvents, setCorporateEvents] = useState<
    PortfolioCorporateActionListItem[]
  >([]);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [tradeForm, setTradeForm] = useState({
    symbol: "",
    tradeDate: getTodayIso(),
    side: "buy" as PortfolioSide,
    quantity: "",
    price: "",
    fee: "",
    tax: "",
    tradeUid: "",
    note: "",
  });
  const [cashForm, setCashForm] = useState({
    eventDate: getTodayIso(),
    direction: "in" as PortfolioCashDirection,
    amount: "",
    currency: "",
    note: "",
  });
  const [corpForm, setCorpForm] = useState({
    symbol: "",
    effectiveDate: getTodayIso(),
    actionType: "cash_dividend" as PortfolioCorporateActionType,
    cashDividendPerShare: "",
    splitRatio: "",
    note: "",
  });

  const queryAccountId =
    selectedAccount === "all" ? undefined : selectedAccount;
  const refreshViewKey = `${selectedAccount === "all" ? "all" : `account:${selectedAccount}`}:cost:${costMethod}`;
  const refreshContextRef = useRef<FxRefreshContext>({
    viewKey: refreshViewKey,
    requestId: 0,
  });
  const hasAccounts = accounts.length > 0;
  const writableAccount =
    selectedAccount === "all"
      ? undefined
      : accounts.find((item) => item.id === selectedAccount);
  const writableAccountId = writableAccount?.id;
  const writeBlocked = !writableAccountId;
  const totalEventPages = Math.max(
    1,
    Math.ceil(eventTotal / DEFAULT_PAGE_SIZE),
  );
  const currentEventCount =
    eventType === "trade"
      ? tradeEvents.length
      : eventType === "cash"
        ? cashEvents.length
        : corporateEvents.length;

  const isActiveRefreshContext = (
    requestedViewKey: string,
    requestedRequestId: number,
  ) => {
    return (
      refreshContextRef.current.viewKey === requestedViewKey &&
      refreshContextRef.current.requestId === requestedRequestId
    );
  };

  const loadAccounts = useCallback(async () => {
    try {
      const response = await portfolioApi.getAccounts(false);
      const items = response.accounts || [];
      setAccounts(items);
      setSelectedAccount((prev) => {
        if (items.length === 0) return "all";
        if (prev !== "all" && !items.some((item) => item.id === prev)) {
          return items[0].id;
        }
        return prev;
      });
      if (items.length === 0) setShowCreateAccount(true);
    } catch (err) {
      setError(getParsedApiError(err));
    }
  }, []);

  const loadBrokers = useCallback(async () => {
    try {
      const response = await portfolioApi.listImportBrokers();
      const brokerItems = response.brokers || [];
      if (brokerItems.length === 0) {
        setBrokers(FALLBACK_BROKERS);
        setBrokerLoadWarning(
          "券商列表接口返回为空，已回退为内置券商列表（华泰/中信/招商）。",
        );
        if (!FALLBACK_BROKERS.some((item) => item.broker === selectedBroker)) {
          setSelectedBroker(FALLBACK_BROKERS[0].broker);
        }
        return;
      }
      setBrokers(brokerItems);
      setBrokerLoadWarning(null);
      if (!brokerItems.some((item) => item.broker === selectedBroker)) {
        setSelectedBroker(brokerItems[0].broker);
      }
    } catch {
      setBrokers(FALLBACK_BROKERS);
      setBrokerLoadWarning(
        "券商列表接口不可用，已回退为内置券商列表（华泰/中信/招商）。",
      );
      if (!FALLBACK_BROKERS.some((item) => item.broker === selectedBroker)) {
        setSelectedBroker(FALLBACK_BROKERS[0].broker);
      }
    }
  }, [selectedBroker]);

  const loadSnapshotAndRisk = useCallback(async () => {
    setIsLoading(true);
    setRiskWarning(null);
    try {
      const snapshotData = await portfolioApi.getSnapshot({
        accountId: queryAccountId,
        costMethod,
      });
      setSnapshot(snapshotData);
      setError(null);

      try {
        const riskData = await portfolioApi.getRisk({
          accountId: queryAccountId,
          costMethod,
        });
        setRisk(riskData);
      } catch (riskErr) {
        setRisk(null);
        const parsed = getParsedApiError(riskErr);
        setRiskWarning(
          parsed.message || "风险数据获取失败，已降级为仅展示快照数据。",
        );
      }
    } catch (err) {
      setSnapshot(null);
      setRisk(null);
      setError(getParsedApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [queryAccountId, costMethod]);

  const loadEventsPage = useCallback(
    async (page: number) => {
      setEventLoading(true);
      try {
        if (eventType === "trade") {
          const response = await portfolioApi.listTrades({
            accountId: queryAccountId,
            dateFrom: eventDateFrom || undefined,
            dateTo: eventDateTo || undefined,
            symbol: eventSymbol || undefined,
            side: eventSide || undefined,
            page,
            pageSize: DEFAULT_PAGE_SIZE,
          });
          setTradeEvents(response.items || []);
          setEventTotal(response.total || 0);
        } else if (eventType === "cash") {
          const response = await portfolioApi.listCashLedger({
            accountId: queryAccountId,
            dateFrom: eventDateFrom || undefined,
            dateTo: eventDateTo || undefined,
            direction: eventDirection || undefined,
            page,
            pageSize: DEFAULT_PAGE_SIZE,
          });
          setCashEvents(response.items || []);
          setEventTotal(response.total || 0);
        } else {
          const response = await portfolioApi.listCorporateActions({
            accountId: queryAccountId,
            dateFrom: eventDateFrom || undefined,
            dateTo: eventDateTo || undefined,
            symbol: eventSymbol || undefined,
            actionType: eventActionType || undefined,
            page,
            pageSize: DEFAULT_PAGE_SIZE,
          });
          setCorporateEvents(response.items || []);
          setEventTotal(response.total || 0);
        }
      } catch (err) {
        setError(getParsedApiError(err));
      } finally {
        setEventLoading(false);
      }
    },
    [
      eventActionType,
      eventDateFrom,
      eventDateTo,
      eventDirection,
      eventSide,
      eventSymbol,
      eventType,
      queryAccountId,
    ],
  );

  const loadEvents = useCallback(async () => {
    await loadEventsPage(eventPage);
  }, [eventPage, loadEventsPage]);

  const refreshPortfolioData = useCallback(
    async (page = eventPage) => {
      await Promise.all([loadSnapshotAndRisk(), loadEventsPage(page)]);
    },
    [eventPage, loadEventsPage, loadSnapshotAndRisk],
  );

  useEffect(() => {
    void loadAccounts();
    void loadBrokers();
  }, [loadAccounts, loadBrokers]);

  useEffect(() => {
    void loadSnapshotAndRisk();
  }, [loadSnapshotAndRisk]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    refreshContextRef.current = {
      viewKey: refreshViewKey,
      requestId: refreshContextRef.current.requestId + 1,
    };
    setFxRefreshing(false);
    setFxRefreshFeedback(null);
  }, [refreshViewKey]);

  useEffect(() => {
    setEventPage(1);
  }, [
    eventActionType,
    eventDateFrom,
    eventDateTo,
    eventDirection,
    eventSide,
    eventSymbol,
    eventType,
    queryAccountId,
  ]);

  useEffect(() => {
    if (!writeBlocked) {
      setWriteWarning(null);
    }
  }, [writeBlocked]);

  const positionRows: FlatPosition[] = useMemo(() => {
    if (!snapshot) return [];
    const rows: FlatPosition[] = [];
    for (const account of snapshot.accounts || []) {
      for (const position of account.positions || []) {
        rows.push({
          ...position,
          accountId: account.accountId,
          accountName: account.accountName,
        });
      }
    }
    rows.sort(
      (a, b) => Number(b.marketValueBase || 0) - Number(a.marketValueBase || 0),
    );
    return rows;
  }, [snapshot]);

  const sectorPieData = useMemo(() => {
    const sectors = risk?.sectorConcentration?.topSectors || [];
    return sectors
      .slice(0, 6)
      .map((item) => ({
        name: item.sector,
        value: Number(item.weightPct || 0),
      }))
      .filter((item) => item.value > 0);
  }, [risk]);

  const positionFallbackPieData = useMemo(() => {
    if (!risk?.concentration?.topPositions?.length) {
      return [];
    }
    return risk.concentration.topPositions
      .slice(0, 6)
      .map((item) => ({
        name: item.symbol,
        value: Number(item.weightPct || 0),
      }))
      .filter((item) => item.value > 0);
  }, [risk]);

  const concentrationPieData =
    sectorPieData.length > 0 ? sectorPieData : positionFallbackPieData;
  const concentrationMode = sectorPieData.length > 0 ? "sector" : "position";

  const handleTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writableAccountId) {
      setWriteWarning("请先在右上角选择具体账户，再进行录入或导入提交。");
      return;
    }
    try {
      setWriteWarning(null);
      await portfolioApi.createTrade({
        accountId: writableAccountId,
        symbol: tradeForm.symbol,
        tradeDate: tradeForm.tradeDate,
        side: tradeForm.side,
        quantity: Number(tradeForm.quantity),
        price: Number(tradeForm.price),
        fee: Number(tradeForm.fee || 0),
        tax: Number(tradeForm.tax || 0),
        tradeUid: tradeForm.tradeUid || undefined,
        note: tradeForm.note || undefined,
      });
      await refreshPortfolioData();
      setTradeForm((prev) => ({
        ...prev,
        symbol: "",
        tradeUid: "",
        note: "",
      }));
    } catch (err) {
      setError(getParsedApiError(err));
    }
  };

  const handleCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writableAccountId) {
      setWriteWarning("请先在右上角选择具体账户，再进行录入或导入提交。");
      return;
    }
    try {
      setWriteWarning(null);
      await portfolioApi.createCashLedger({
        accountId: writableAccountId,
        eventDate: cashForm.eventDate,
        direction: cashForm.direction,
        amount: Number(cashForm.amount),
        currency: cashForm.currency || undefined,
        note: cashForm.note || undefined,
      });
      await refreshPortfolioData();
      setCashForm((prev) => ({ ...prev, note: "" }));
    } catch (err) {
      setError(getParsedApiError(err));
    }
  };

  const handleCorporateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writableAccountId) {
      setWriteWarning("请先在右上角选择具体账户，再进行录入或导入提交。");
      return;
    }
    try {
      setWriteWarning(null);
      await portfolioApi.createCorporateAction({
        accountId: writableAccountId,
        symbol: corpForm.symbol,
        effectiveDate: corpForm.effectiveDate,
        actionType: corpForm.actionType,
        cashDividendPerShare: corpForm.cashDividendPerShare
          ? Number(corpForm.cashDividendPerShare)
          : undefined,
        splitRatio: corpForm.splitRatio
          ? Number(corpForm.splitRatio)
          : undefined,
        note: corpForm.note || undefined,
      });
      await refreshPortfolioData();
      setCorpForm((prev) => ({ ...prev, symbol: "", note: "" }));
    } catch (err) {
      setError(getParsedApiError(err));
    }
  };

  const handleParseCsv = async () => {
    if (!csvFile) return;
    try {
      setCsvParsing(true);
      const parsed = await portfolioApi.parseCsvImport(selectedBroker, csvFile);
      setCsvParseResult(parsed);
      setCsvCommitResult(null);
    } catch (err) {
      setError(getParsedApiError(err));
    } finally {
      setCsvParsing(false);
    }
  };

  const handleCommitCsv = async () => {
    if (!csvFile) return;
    if (!writableAccountId) {
      setWriteWarning("请先在右上角选择具体账户，再进行录入或导入提交。");
      return;
    }
    try {
      setWriteWarning(null);
      setCsvCommitting(true);
      const committed = await portfolioApi.commitCsvImport(
        writableAccountId,
        selectedBroker,
        csvFile,
        csvDryRun,
      );
      setCsvCommitResult(committed);
      if (!csvDryRun) {
        await refreshPortfolioData();
      }
    } catch (err) {
      setError(getParsedApiError(err));
    } finally {
      setCsvCommitting(false);
    }
  };

  const openDeleteDialog = (item: PendingDelete) => {
    if (!writableAccountId) {
      setWriteWarning("请先在右上角选择具体账户，再进行删除修正。");
      return;
    }
    setPendingDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || deleteLoading) return;
    if (!writableAccountId) {
      setWriteWarning("请先在右上角选择具体账户，再进行删除修正。");
      setPendingDelete(null);
      return;
    }

    const nextPage =
      currentEventCount === 1 && eventPage > 1 ? eventPage - 1 : eventPage;
    try {
      setDeleteLoading(true);
      setWriteWarning(null);
      if (pendingDelete.eventType === "trade") {
        await portfolioApi.deleteTrade(pendingDelete.id);
      } else if (pendingDelete.eventType === "cash") {
        await portfolioApi.deleteCashLedger(pendingDelete.id);
      } else {
        await portfolioApi.deleteCorporateAction(pendingDelete.id);
      }
      setPendingDelete(null);
      if (nextPage !== eventPage) {
        setEventPage(nextPage);
      }
      await refreshPortfolioData(nextPage);
    } catch (err) {
      setError(getParsedApiError(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = accountForm.name.trim();
    if (!name) {
      setAccountCreateError("账户名称不能为空。");
      setAccountCreateSuccess(null);
      return;
    }
    try {
      setAccountCreating(true);
      setAccountCreateError(null);
      setAccountCreateSuccess(null);
      const created = await portfolioApi.createAccount({
        name,
        broker: accountForm.broker.trim() || undefined,
        market: accountForm.market,
        baseCurrency: accountForm.baseCurrency.trim() || "CNY",
      });
      await loadAccounts();
      setSelectedAccount(created.id);
      setShowCreateAccount(false);
      setWriteWarning(null);
      setAccountForm({
        name: "",
        broker: "Demo",
        market: accountForm.market,
        baseCurrency: accountForm.baseCurrency,
      });
      setAccountCreateSuccess("账户创建成功，已自动切换到该账户。");
    } catch (err) {
      const parsed = getParsedApiError(err);
      setAccountCreateError(parsed.message || "创建账户失败，请稍后重试。");
      setAccountCreateSuccess(null);
    } finally {
      setAccountCreating(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      loadAccounts(),
      loadSnapshotAndRisk(),
      loadEvents(),
      loadBrokers(),
    ]);
  };

  const reloadSnapshotAndRiskForScope = useCallback(
    async (
      requestedViewKey: string,
      requestedRequestId: number,
      requestedAccountId: number | undefined,
      requestedCostMethod: PortfolioCostMethod,
    ): Promise<boolean> => {
      if (!isActiveRefreshContext(requestedViewKey, requestedRequestId)) {
        return false;
      }

      setRiskWarning(null);

      try {
        const snapshotData = await portfolioApi.getSnapshot({
          accountId: requestedAccountId,
          costMethod: requestedCostMethod,
        });
        if (!isActiveRefreshContext(requestedViewKey, requestedRequestId)) {
          return false;
        }
        setSnapshot(snapshotData);
        setError(null);

        try {
          const riskData = await portfolioApi.getRisk({
            accountId: requestedAccountId,
            costMethod: requestedCostMethod,
          });
          if (!isActiveRefreshContext(requestedViewKey, requestedRequestId)) {
            return false;
          }
          setRisk(riskData);
          setRiskWarning(null);
        } catch (riskErr) {
          if (!isActiveRefreshContext(requestedViewKey, requestedRequestId)) {
            return false;
          }
          setRisk(null);
          const parsed = getParsedApiError(riskErr);
          setRiskWarning(
            parsed.message || "风险数据获取失败，已降级为仅展示快照数据。",
          );
        }
        return true;
      } catch (err) {
        if (!isActiveRefreshContext(requestedViewKey, requestedRequestId)) {
          return false;
        }
        setSnapshot(null);
        setRisk(null);
        setError(getParsedApiError(err));
        return false;
      }
    },
    [],
  );

  const handleRefreshFx = async () => {
    if (!hasAccounts || isLoading || fxRefreshing) {
      return;
    }

    const requestedViewKey = refreshViewKey;
    const requestedAccountId = queryAccountId;
    const requestedCostMethod = costMethod;
    const requestedRequestId = refreshContextRef.current.requestId + 1;
    refreshContextRef.current = {
      viewKey: requestedViewKey,
      requestId: requestedRequestId,
    };

    try {
      setFxRefreshing(true);
      setFxRefreshFeedback(null);
      const result = await portfolioApi.refreshFx({
        accountId: requestedAccountId,
      });
      if (!isActiveRefreshContext(requestedViewKey, requestedRequestId)) {
        return;
      }
      const reloaded = await reloadSnapshotAndRiskForScope(
        requestedViewKey,
        requestedRequestId,
        requestedAccountId,
        requestedCostMethod,
      );
      if (
        !reloaded ||
        !isActiveRefreshContext(requestedViewKey, requestedRequestId)
      ) {
        return;
      }
      setFxRefreshFeedback(buildFxRefreshFeedback(result));
    } catch (err) {
      if (!isActiveRefreshContext(requestedViewKey, requestedRequestId)) {
        return;
      }
      setError(getParsedApiError(err));
    } finally {
      if (isActiveRefreshContext(requestedViewKey, requestedRequestId)) {
        setFxRefreshing(false);
      }
    }
  };

  return (
    <div className="portfolio-page min-h-screen space-y-4 p-4 md:p-6">
      <PageHeader
        eyebrow="Portfolio"
        title="持仓管理"
        description="组合快照、手工录入、CSV 导入与风险分析（支持全组合 / 单账户切换）"
      />

      {hasAccounts ? (
        <Toolbar
          left={
            <>
              <div className="min-w-[240px]">
                <Select
                  label="账户视图"
                  value={String(selectedAccount)}
                  onChange={(value) =>
                    setSelectedAccount(value === "all" ? "all" : Number(value))
                  }
                  options={[
                    { value: "all", label: "全部账户" },
                    ...accounts.map((account) => ({
                      value: String(account.id),
                      label: `${account.name} (#${account.id})`,
                    })),
                  ]}
                />
              </div>
              <div className="min-w-[220px]">
                <Select
                  label="成本口径"
                  value={costMethod}
                  onChange={(value) =>
                    setCostMethod(value as PortfolioCostMethod)
                  }
                  options={[
                    { value: "fifo", label: "先进先出（FIFO）" },
                    { value: "avg", label: "均价成本（AVG）" },
                  ]}
                />
              </div>
            </>
          }
          right={
            <>
              <Button
                type="button"
                variant="settings-secondary"
                onClick={() => {
                  setShowCreateAccount((prev) => !prev);
                  setAccountCreateError(null);
                  setAccountCreateSuccess(null);
                }}
              >
                {showCreateAccount ? "收起新建" : "新建账户"}
              </Button>
              <Button
                type="button"
                variant="settings-secondary"
                onClick={() => void handleRefresh()}
                disabled={isLoading || fxRefreshing}
              >
                {isLoading ? "刷新中..." : "刷新数据"}
              </Button>
            </>
          }
        />
      ) : (
        <InlineAlert
          variant="warning"
          className="inline-block rounded-lg px-3 py-2 text-xs shadow-none"
          message="还没有可用账户，请先创建账户后再录入交易或导入 CSV。"
        />
      )}

      {error ? (
        <ApiErrorAlert error={error} onDismiss={() => setError(null)} />
      ) : null}
      {riskWarning ? (
        <InlineAlert
          variant="warning"
          title="风险模块降级"
          message={riskWarning}
        />
      ) : null}
      {writeWarning ? (
        <InlineAlert
          variant="warning"
          title="操作提示"
          message={writeWarning}
        />
      ) : null}

      {showCreateAccount || !hasAccounts ? (
        <SectionCard
          title="新建账户"
          actions={
            hasAccounts ? (
              <Button
                type="button"
                variant="settings-secondary"
                size="sm"
                onClick={() => {
                  setShowCreateAccount(false);
                  setAccountCreateError(null);
                  setAccountCreateSuccess(null);
                }}
              >
                收起
              </Button>
            ) : (
              <Text className="text-xs text-secondary-text">
                创建后自动切换到该账户
              </Text>
            )
          }
        >
          <Stack gap="sm">
            {accountCreateError ? (
              <InlineAlert
                variant="danger"
                title="创建账户失败"
                message={accountCreateError}
              />
            ) : null}
            {accountCreateSuccess ? (
              <InlineAlert
                variant="success"
                title="创建账户成功"
                message={accountCreateSuccess}
              />
            ) : null}
            <form
              className="grid grid-cols-1 gap-3 md:grid-cols-2"
              onSubmit={handleCreateAccount}
            >
              <div className="md:col-span-2">
                <Input
                  label="账户名称"
                  placeholder="账户名称（必填）"
                  value={accountForm.name}
                  onChange={(e) =>
                    setAccountForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <Input
                label="券商"
                placeholder="券商（可选，如 Demo/华泰）"
                value={accountForm.broker}
                onChange={(e) =>
                  setAccountForm((prev) => ({
                    ...prev,
                    broker: e.target.value,
                  }))
                }
              />
              <Input
                label="基准币"
                placeholder="基准币（如 CNY/USD/HKD）"
                value={accountForm.baseCurrency}
                onChange={(e) =>
                  setAccountForm((prev) => ({
                    ...prev,
                    baseCurrency: e.target.value.toUpperCase(),
                  }))
                }
              />
              <Select
                label="市场"
                value={accountForm.market}
                onChange={(value) =>
                  setAccountForm((prev) => ({
                    ...prev,
                    market: value as "cn" | "hk" | "us",
                  }))
                }
                options={[
                  { value: "cn", label: "市场：A 股（cn）" },
                  { value: "hk", label: "市场：港股（hk）" },
                  { value: "us", label: "市场：美股（us）" },
                ]}
              />
              <div className="md:col-span-2">
                <Button
                  type="submit"
                  variant="settings-primary"
                  isLoading={accountCreating}
                  loadingText="创建中..."
                >
                  创建账户
                </Button>
              </div>
            </form>
          </Stack>
        </SectionCard>
      ) : null}

      <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
        <StatCard
          label="总权益"
          value={formatMoney(
            snapshot?.totalEquity,
            snapshot?.currency || "CNY",
          )}
          tone="primary"
        />
        <StatCard
          label="总市值"
          value={formatMoney(
            snapshot?.totalMarketValue,
            snapshot?.currency || "CNY",
          )}
          tone="primary"
        />
        <StatCard
          label="总现金"
          value={formatMoney(snapshot?.totalCash, snapshot?.currency || "CNY")}
          tone="primary"
        />
        <SectionCard
          title="汇率状态"
          actions={
            <Button
              type="button"
              variant="settings-secondary"
              size="sm"
              onClick={() => void handleRefreshFx()}
              disabled={!hasAccounts || isLoading || fxRefreshing}
            >
              {fxRefreshing ? "刷新中..." : "刷新汇率"}
            </Button>
          }
          className="h-full"
        >
          <Stack gap="sm">
            <div>
              {snapshot?.fxStale ? (
                <Badge variant="warning">过期</Badge>
              ) : (
                <Badge variant="success">最新</Badge>
              )}
            </div>
            {fxRefreshFeedback ? (
              <InlineAlert
                variant={getFxRefreshFeedbackVariant(fxRefreshFeedback.tone)}
                title="汇率刷新结果"
                message={fxRefreshFeedback.text}
                className="text-xs"
              />
            ) : null}
          </Stack>
        </SectionCard>
      </SimpleGrid>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard
          title="持仓明细"
          actions={
            <Text className="text-xs text-secondary-text">
              共 {positionRows.length} 项
            </Text>
          }
          className="xl:col-span-2"
        >
          {positionRows.length === 0 ? (
            <EmptyState
              title="当前无持仓数据"
              description="录入交易或导入 CSV 后，这里会展示按账户汇总的持仓明细。"
              className="border-none bg-transparent px-4 py-8 shadow-none"
            />
          ) : (
            <Paper withBorder radius="xl" p={0} shadow="none">
              <ScrollArea>
                <Table
                  highlightOnHover
                  verticalSpacing="md"
                  horizontalSpacing="sm"
                >
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>账户</Table.Th>
                      <Table.Th>代码</Table.Th>
                      <Table.Th style={{ textAlign: "right" }}>数量</Table.Th>
                      <Table.Th style={{ textAlign: "right" }}>均价</Table.Th>
                      <Table.Th style={{ textAlign: "right" }}>现价</Table.Th>
                      <Table.Th style={{ textAlign: "right" }}>市值</Table.Th>
                      <Table.Th style={{ textAlign: "right" }}>
                        未实现盈亏
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {positionRows.map((row) => (
                      <Table.Tr
                        key={`${row.accountId}-${row.symbol}-${row.market}`}
                      >
                        <Table.Td className="text-secondary-text">
                          {row.accountName}
                        </Table.Td>
                        <Table.Td className="font-mono text-foreground">
                          {row.symbol}
                        </Table.Td>
                        <Table.Td style={{ textAlign: "right" }}>
                          {row.quantity.toFixed(2)}
                        </Table.Td>
                        <Table.Td style={{ textAlign: "right" }}>
                          {row.avgCost.toFixed(4)}
                        </Table.Td>
                        <Table.Td style={{ textAlign: "right" }}>
                          <div>{formatPositionPrice(row)}</div>
                          <Text
                            className={`text-[11px] ${hasPositionPrice(row) ? "text-secondary-text" : "text-warning"}`}
                          >
                            {getPositionPriceLabel(row)}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: "right" }}>
                          {formatPositionMoney(row.marketValueBase, row)}
                        </Table.Td>
                        <Table.Td
                          style={{ textAlign: "right" }}
                          className={
                            hasPositionPrice(row)
                              ? row.unrealizedPnlBase >= 0
                                ? "text-success"
                                : "text-danger"
                              : "text-secondary-text"
                          }
                        >
                          {formatPositionMoney(row.unrealizedPnlBase, row)}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          )}
        </SectionCard>

        <SectionCard
          title={
            concentrationMode === "sector"
              ? "行业集中度分布"
              : "行业数据暂不可用，当前展示个股集中度"
          }
        >
          {concentrationPieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={concentrationPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                  >
                    {concentrationPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${Number(value).toFixed(2)}%`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="暂无集中度数据"
              description="风险模块完成计算后，这里会展示行业或个股维度的集中度分布。"
              className="border-none bg-transparent px-4 py-10 shadow-none"
            />
          )}
          <Stack gap={4}>
            <Text className="text-xs text-secondary-text">
              展示口径:{" "}
              {concentrationMode === "sector"
                ? "行业维度"
                : "个股维度（降级显示）"}
            </Text>
            <Text className="text-xs text-secondary-text">
              板块集中度告警: {risk?.sectorConcentration?.alert ? "是" : "否"}
            </Text>
            <Text className="text-xs text-secondary-text">
              Top1 权重:{" "}
              {formatPct(
                risk?.sectorConcentration?.topWeightPct ??
                  risk?.concentration?.topWeightPct,
              )}
            </Text>
          </Stack>
        </SectionCard>
      </div>

      {writeBlocked && hasAccounts ? (
        <InlineAlert
          variant="warning"
          className="rounded-lg px-3 py-2 text-xs shadow-none"
          message="当前处于“全部账户”视图。为避免误写，请先选择一个具体账户后再进行手工录入或 CSV 提交。"
        />
      ) : null}

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        <StatCard
          label="回撤监控"
          value={formatPct(risk?.drawdown?.maxDrawdownPct)}
          hint={`当前回撤 ${formatPct(risk?.drawdown?.currentDrawdownPct)} · 告警 ${risk?.drawdown?.alert ? "是" : "否"}`}
        />
        <StatCard
          label="止损接近预警"
          value={risk?.stopLoss?.triggeredCount ?? 0}
          hint={`接近数 ${risk?.stopLoss?.nearCount ?? 0} · 告警 ${risk?.stopLoss?.nearAlert ? "是" : "否"}`}
        />
        <StatCard
          label="口径"
          value={snapshot?.accountCount ?? 0}
          hint={`计价币种 ${snapshot?.currency || "CNY"} · 成本法 ${(snapshot?.costMethod || costMethod).toUpperCase()}`}
        />
      </SimpleGrid>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard title="手工录入：交易">
          <form className="space-y-3" onSubmit={handleTradeSubmit}>
            <Input
              label="股票代码"
              placeholder="股票代码（例如 600519）"
              value={tradeForm.symbol}
              onChange={(e) =>
                setTradeForm((prev) => ({ ...prev, symbol: e.target.value }))
              }
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                label="交易日期"
                value={tradeForm.tradeDate}
                onChange={(e) =>
                  setTradeForm((prev) => ({
                    ...prev,
                    tradeDate: e.target.value,
                  }))
                }
                required
              />
              <Select
                label="买卖方向"
                value={tradeForm.side}
                onChange={(value) =>
                  setTradeForm((prev) => ({
                    ...prev,
                    side: value as PortfolioSide,
                  }))
                }
                options={[
                  { value: "buy", label: "买入" },
                  { value: "sell", label: "卖出" },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min="0"
                step="0.0001"
                label="数量"
                placeholder="数量（必填）"
                value={tradeForm.quantity}
                onChange={(e) =>
                  setTradeForm((prev) => ({
                    ...prev,
                    quantity: e.target.value,
                  }))
                }
                required
              />
              <Input
                type="number"
                min="0"
                step="0.0001"
                label="成交价"
                placeholder="成交价（必填）"
                value={tradeForm.price}
                onChange={(e) =>
                  setTradeForm((prev) => ({ ...prev, price: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min="0"
                step="0.0001"
                label="手续费"
                placeholder="手续费（可选）"
                value={tradeForm.fee}
                onChange={(e) =>
                  setTradeForm((prev) => ({ ...prev, fee: e.target.value }))
                }
              />
              <Input
                type="number"
                min="0"
                step="0.0001"
                label="税费"
                placeholder="税费（可选）"
                value={tradeForm.tax}
                onChange={(e) =>
                  setTradeForm((prev) => ({ ...prev, tax: e.target.value }))
                }
              />
            </div>
            <Text className="text-xs text-secondary-text">
              手续费和税费可留空，系统将按 0 处理。
            </Text>
            <Button
              type="submit"
              variant="settings-primary"
              disabled={!writableAccountId}
            >
              提交交易
            </Button>
          </form>
        </SectionCard>

        <SectionCard title="手工录入：资金流水">
          <form className="space-y-3" onSubmit={handleCashSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                label="发生日期"
                value={cashForm.eventDate}
                onChange={(e) =>
                  setCashForm((prev) => ({
                    ...prev,
                    eventDate: e.target.value,
                  }))
                }
                required
              />
              <Select
                label="资金方向"
                value={cashForm.direction}
                onChange={(value) =>
                  setCashForm((prev) => ({
                    ...prev,
                    direction: value as PortfolioCashDirection,
                  }))
                }
                options={[
                  { value: "in", label: "流入" },
                  { value: "out", label: "流出" },
                ]}
              />
            </div>
            <Input
              type="number"
              min="0"
              step="0.0001"
              label="金额"
              placeholder="金额"
              value={cashForm.amount}
              onChange={(e) =>
                setCashForm((prev) => ({ ...prev, amount: e.target.value }))
              }
              required
            />
            <Input
              label="币种"
              placeholder={`币种（可选，默认 ${writableAccount?.baseCurrency || "账户基准币"}）`}
              value={cashForm.currency}
              onChange={(e) =>
                setCashForm((prev) => ({ ...prev, currency: e.target.value }))
              }
            />
            <Button
              type="submit"
              variant="settings-primary"
              disabled={!writableAccountId}
            >
              提交资金流水
            </Button>
          </form>
        </SectionCard>

        <SectionCard title="手工录入：公司行为">
          <form className="space-y-3" onSubmit={handleCorporateSubmit}>
            <Input
              label="股票代码"
              placeholder="股票代码"
              value={corpForm.symbol}
              onChange={(e) =>
                setCorpForm((prev) => ({ ...prev, symbol: e.target.value }))
              }
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                label="生效日期"
                value={corpForm.effectiveDate}
                onChange={(e) =>
                  setCorpForm((prev) => ({
                    ...prev,
                    effectiveDate: e.target.value,
                  }))
                }
                required
              />
              <Select
                label="行为类型"
                value={corpForm.actionType}
                onChange={(value) =>
                  setCorpForm((prev) => ({
                    ...prev,
                    actionType: value as PortfolioCorporateActionType,
                  }))
                }
                options={[
                  { value: "cash_dividend", label: "现金分红" },
                  { value: "split_adjustment", label: "拆并股调整" },
                ]}
              />
            </div>
            {corpForm.actionType === "cash_dividend" ? (
              <Input
                type="number"
                min="0"
                step="0.000001"
                label="每股分红"
                placeholder="每股分红"
                value={corpForm.cashDividendPerShare}
                onChange={(e) =>
                  setCorpForm((prev) => ({
                    ...prev,
                    cashDividendPerShare: e.target.value,
                    splitRatio: "",
                  }))
                }
                required
              />
            ) : (
              <Input
                type="number"
                min="0"
                step="0.000001"
                label="拆并股比例"
                placeholder="拆并股比例"
                value={corpForm.splitRatio}
                onChange={(e) =>
                  setCorpForm((prev) => ({
                    ...prev,
                    splitRatio: e.target.value,
                    cashDividendPerShare: "",
                  }))
                }
                required
              />
            )}
            <Button
              type="submit"
              variant="settings-primary"
              disabled={!writableAccountId}
            >
              提交企业行为
            </Button>
          </form>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="券商 CSV 导入">
          <Stack gap="sm">
            {brokerLoadWarning ? (
              <InlineAlert
                variant="warning"
                className="text-xs"
                message={brokerLoadWarning}
              />
            ) : null}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Select
                label="券商"
                value={selectedBroker}
                onChange={(value) => setSelectedBroker(value)}
                options={(brokers.length > 0 ? brokers : FALLBACK_BROKERS).map(
                  (item) => ({
                    value: item.broker,
                    label: formatBrokerLabel(item.broker, item.displayName),
                  }),
                )}
              />
              <div className="flex flex-col">
                <Text className="mb-2 text-sm font-medium text-foreground">
                  CSV 文件
                </Text>
                <label className={PORTFOLIO_FILE_PICKER_CLASS}>
                  {csvFile ? csvFile.name : "选择 CSV"}
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    aria-label="选择 CSV 文件"
                    onChange={(e) =>
                      setCsvFile(
                        e.target.files && e.target.files[0]
                          ? e.target.files[0]
                          : null,
                      )
                    }
                  />
                </label>
              </div>
            </div>
            <Checkbox
              id="csv-dry-run"
              checked={csvDryRun}
              onChange={(e) => setCsvDryRun(e.target.checked)}
              label="仅预演（不写入）"
            />
            <Group grow>
              <Button
                type="button"
                variant="settings-secondary"
                disabled={!csvFile || csvParsing}
                onClick={() => void handleParseCsv()}
              >
                {csvParsing ? "解析中..." : "解析文件"}
              </Button>
              <Button
                type="button"
                variant="settings-primary"
                disabled={!csvFile || !writableAccountId || csvCommitting}
                onClick={() => void handleCommitCsv()}
              >
                {csvCommitting ? "提交中..." : "提交导入"}
              </Button>
            </Group>
            {csvParseResult ? (
              <InlineAlert
                variant={getCsvParseVariant(csvParseResult)}
                title="CSV 解析结果"
                message={`有效 ${csvParseResult.recordCount} 条，跳过 ${csvParseResult.skippedCount} 条，错误 ${csvParseResult.errorCount} 条。`}
                className="text-xs"
              />
            ) : null}
            {csvCommitResult ? (
              <InlineAlert
                variant={getCsvCommitVariant(csvCommitResult, csvDryRun)}
                title={csvDryRun ? "CSV 预演结果" : "CSV 提交结果"}
                message={`${csvDryRun ? "预演检查" : "实际写入"}：写入 ${csvCommitResult.insertedCount} 条，重复 ${csvCommitResult.duplicateCount} 条，失败 ${csvCommitResult.failedCount} 条。`}
                className="text-xs"
              />
            ) : null}
          </Stack>
        </SectionCard>

        <SectionCard
          title="事件记录"
          actions={
            <Button
              type="button"
              variant="settings-secondary"
              size="sm"
              onClick={() => void loadEvents()}
              disabled={eventLoading}
            >
              {eventLoading ? "加载中..." : "刷新流水"}
            </Button>
          }
        >
          <Stack gap="sm">
            <Select
              label="记录类型"
              value={eventType}
              onChange={(value) => setEventType(value as EventType)}
              options={[
                { value: "trade", label: "交易流水" },
                { value: "cash", label: "资金流水" },
                { value: "corporate", label: "公司行为" },
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                label="开始日期"
                value={eventDateFrom}
                onChange={(e) => setEventDateFrom(e.target.value)}
              />
              <Input
                type="date"
                label="结束日期"
                value={eventDateTo}
                onChange={(e) => setEventDateTo(e.target.value)}
              />
            </div>
            {eventType === "trade" || eventType === "corporate" ? (
              <Input
                label="股票代码"
                placeholder="按股票代码筛选"
                value={eventSymbol}
                onChange={(e) => setEventSymbol(e.target.value)}
              />
            ) : null}
            {eventType === "trade" ? (
              <Select
                label="买卖方向"
                value={eventSide || "__all__"}
                onChange={(value) =>
                  setEventSide(
                    value === "__all__" ? "" : (value as PortfolioSide),
                  )
                }
                options={[
                  { value: "__all__", label: "全部买卖方向" },
                  { value: "buy", label: "买入" },
                  { value: "sell", label: "卖出" },
                ]}
              />
            ) : null}
            {eventType === "cash" ? (
              <Select
                label="资金方向"
                value={eventDirection || "__all__"}
                onChange={(value) =>
                  setEventDirection(
                    value === "__all__"
                      ? ""
                      : (value as PortfolioCashDirection),
                  )
                }
                options={[
                  { value: "__all__", label: "全部资金方向" },
                  { value: "in", label: "流入" },
                  { value: "out", label: "流出" },
                ]}
              />
            ) : null}
            {eventType === "corporate" ? (
              <Select
                label="公司行为"
                value={eventActionType || "__all__"}
                onChange={(value) =>
                  setEventActionType(
                    value === "__all__"
                      ? ""
                      : (value as PortfolioCorporateActionType),
                  )
                }
                options={[
                  { value: "__all__", label: "全部公司行为" },
                  { value: "cash_dividend", label: "现金分红" },
                  { value: "split_adjustment", label: "拆并股调整" },
                ]}
              />
            ) : null}
            <Text className="text-[11px] text-secondary-text">
              {writeBlocked
                ? "删除修正仅在单账户视图可用。请先选择具体账户后再删除错误流水。"
                : "如有错误流水，可直接删除后重新录入。"}
            </Text>
            <Paper withBorder radius="xl" p="sm" shadow="none">
              <ScrollArea h={260}>
                <Stack gap="xs">
                  {eventType === "trade" &&
                    tradeEvents.map((item) => (
                      <Group
                        key={`t-${item.id}`}
                        justify="space-between"
                        align="flex-start"
                        gap="md"
                        className="border-b border-white/5 py-2"
                      >
                        <Text className="min-w-0 text-xs text-secondary-text">
                          {item.tradeDate} {formatSideLabel(item.side)}{" "}
                          {item.symbol} 数量={item.quantity} 价格={item.price}
                        </Text>
                        {!writeBlocked ? (
                          <Button
                            type="button"
                            variant="settings-secondary"
                            size="xsm"
                            onClick={() =>
                              openDeleteDialog({
                                eventType: "trade",
                                id: item.id,
                                message: `确认删除 ${item.tradeDate} 的${formatSideLabel(item.side)}流水 ${item.symbol}（数量 ${item.quantity}，价格 ${item.price}）吗？`,
                              })
                            }
                          >
                            删除
                          </Button>
                        ) : null}
                      </Group>
                    ))}
                  {eventType === "cash" &&
                    cashEvents.map((item) => (
                      <Group
                        key={`c-${item.id}`}
                        justify="space-between"
                        align="flex-start"
                        gap="md"
                        className="border-b border-white/5 py-2"
                      >
                        <Text className="min-w-0 text-xs text-secondary-text">
                          {item.eventDate}{" "}
                          {formatCashDirectionLabel(item.direction)}{" "}
                          {item.amount} {item.currency}
                        </Text>
                        {!writeBlocked ? (
                          <Button
                            type="button"
                            variant="settings-secondary"
                            size="xsm"
                            onClick={() =>
                              openDeleteDialog({
                                eventType: "cash",
                                id: item.id,
                                message: `确认删除 ${item.eventDate} 的资金流水（${formatCashDirectionLabel(item.direction)} ${item.amount} ${item.currency}）吗？`,
                              })
                            }
                          >
                            删除
                          </Button>
                        ) : null}
                      </Group>
                    ))}
                  {eventType === "corporate" &&
                    corporateEvents.map((item) => (
                      <Group
                        key={`ca-${item.id}`}
                        justify="space-between"
                        align="flex-start"
                        gap="md"
                        className="border-b border-white/5 py-2"
                      >
                        <Text className="min-w-0 text-xs text-secondary-text">
                          {item.effectiveDate}{" "}
                          {formatCorporateActionLabel(item.actionType)}{" "}
                          {item.symbol}
                        </Text>
                        {!writeBlocked ? (
                          <Button
                            type="button"
                            variant="settings-secondary"
                            size="xsm"
                            onClick={() =>
                              openDeleteDialog({
                                eventType: "corporate",
                                id: item.id,
                                message: `确认删除 ${item.effectiveDate} 的公司行为 ${formatCorporateActionLabel(item.actionType)}（${item.symbol}）吗？`,
                              })
                            }
                          >
                            删除
                          </Button>
                        ) : null}
                      </Group>
                    ))}
                  {!eventLoading &&
                  ((eventType === "trade" && tradeEvents.length === 0) ||
                    (eventType === "cash" && cashEvents.length === 0) ||
                    (eventType === "corporate" &&
                      corporateEvents.length === 0)) ? (
                    <EmptyState
                      title="暂无流水"
                      description="调整筛选条件或先录入一笔交易、资金流水或公司行为。"
                      className="border-none bg-transparent px-3 py-6 shadow-none"
                    />
                  ) : null}
                </Stack>
              </ScrollArea>
            </Paper>
            <Text className="text-xs text-secondary-text">
              第 {eventPage} / {totalEventPages} 页
            </Text>
            <Pagination
              currentPage={eventPage}
              totalPages={totalEventPages}
              onPageChange={setEventPage}
            />
          </Stack>
        </SectionCard>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="删除错误流水"
        message={pendingDelete?.message || "确认删除这条流水吗？"}
        confirmText={deleteLoading ? "删除中..." : "确认删除"}
        cancelText="取消"
        isDanger
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          if (!deleteLoading) {
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
};

export default PortfolioPage;
