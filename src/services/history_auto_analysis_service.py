# -*- coding: utf-8 -*-
"""Daily scheduler for re-analyzing stocks that appear in history."""

from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from src.config import Config, get_config
from src.core.trading_calendar import get_market_for_stock, is_market_open
from src.services.task_queue import DuplicateTaskError, get_task_queue
from src.storage import DatabaseManager

logger = logging.getLogger(__name__)


def _parse_daily_time(value: str, default: str = "14:45") -> tuple[int, int]:
    candidate = (value or default).strip()
    try:
        hour_text, minute_text = candidate.split(":", 1)
        hour = int(hour_text)
        minute = int(minute_text)
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return hour, minute
    except (TypeError, ValueError):
        pass
    logger.warning("AUTO_HISTORY_ANALYSIS_TIME=%r 无效，回退到 %s", value, default)
    fallback_hour, fallback_minute = default.split(":", 1)
    return int(fallback_hour), int(fallback_minute)


class HistoryAutoAnalysisService:
    """Submit one analysis task per distinct historical stock on a daily schedule."""

    def __init__(
        self,
        config: Optional[Config] = None,
        db_manager: Optional[DatabaseManager] = None,
        task_queue: Optional[Any] = None,
    ) -> None:
        self.config = config or get_config()
        self.db = db_manager or DatabaseManager.get_instance()
        self.task_queue = task_queue or get_task_queue()
        self._task: Optional[asyncio.Task] = None
        self._stop_event: Optional[asyncio.Event] = None
        self._last_run_date: Optional[date] = None

    @property
    def enabled(self) -> bool:
        return bool(getattr(self.config, "auto_history_analysis_enabled", False))

    def start(self) -> None:
        """Start the background scheduler task in the current event loop."""
        if not self.enabled:
            logger.info("[AutoHistoryAnalysis] 未启用，跳过启动")
            return
        if self._task and not self._task.done():
            return
        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(
            self.run_forever(),
            name="auto-history-analysis-scheduler",
        )
        logger.info(
            "[AutoHistoryAnalysis] 已启动，每日 %s 执行",
            getattr(self.config, "auto_history_analysis_time", "14:45"),
        )

    async def stop(self) -> None:
        """Stop the background scheduler task."""
        if self._stop_event:
            self._stop_event.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    def _seconds_until_next_run(self, now: Optional[datetime] = None) -> float:
        current = now or datetime.now()
        hour, minute = _parse_daily_time(
            getattr(self.config, "auto_history_analysis_time", "14:45")
        )
        run_at = current.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if run_at <= current:
            run_at += timedelta(days=1)
        return max(0.0, (run_at - current).total_seconds())

    async def run_forever(self) -> None:
        """Run the daily scheduler loop."""
        if self._stop_event is None:
            self._stop_event = asyncio.Event()

        while not self._stop_event.is_set():
            wait_seconds = self._seconds_until_next_run()
            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=wait_seconds)
                break
            except asyncio.TimeoutError:
                pass

            today = datetime.now().date()
            if self._last_run_date == today:
                continue

            await asyncio.to_thread(self.run_once, today)
            self._last_run_date = today

    def _should_skip_for_trading_day(self, stock_code: str, target_date: date) -> bool:
        if not getattr(self.config, "trading_day_check_enabled", True):
            return False
        market = get_market_for_stock(stock_code)
        if market is None:
            return False
        return not is_market_open(market, target_date)

    def _load_history_stocks(self) -> List[Dict[str, Optional[str]]]:
        limit = int(getattr(self.config, "auto_history_analysis_limit", 20) or 20)
        return self.db.get_distinct_history_stocks(limit=limit)

    def run_once(self, target_date: Optional[date] = None) -> Dict[str, Any]:
        """Submit tasks for all eligible historical stocks once."""
        run_date = target_date or datetime.now().date()
        stocks = self._load_history_stocks()
        submitted: List[str] = []
        skipped_today: List[str] = []
        skipped_market: List[str] = []
        duplicates: List[str] = []
        failed: List[Dict[str, str]] = []

        report_type = getattr(self.config, "auto_history_analysis_report_type", "detailed")
        notify = bool(getattr(self.config, "auto_history_analysis_notify", False))

        for stock in stocks:
            code = (stock.get("code") or "").strip()
            if not code:
                continue
            try:
                if self._should_skip_for_trading_day(code, run_date):
                    skipped_market.append(code)
                    continue
                if self.db.has_analysis_history_on_date(code, run_date):
                    skipped_today.append(code)
                    continue

                self.task_queue.submit_task(
                    stock_code=code,
                    stock_name=stock.get("name"),
                    original_query=code,
                    selection_source="manual",
                    report_type=report_type,
                    force_refresh=True,
                    notify=notify,
                )
                submitted.append(code)
            except DuplicateTaskError:
                duplicates.append(code)
            except Exception as exc:
                logger.warning("[AutoHistoryAnalysis] 提交 %s 失败: %s", code, exc)
                failed.append({"code": code, "error": str(exc)})

        summary = {
            "date": run_date.isoformat(),
            "total": len(stocks),
            "submitted": submitted,
            "skipped_today": skipped_today,
            "skipped_market": skipped_market,
            "duplicates": duplicates,
            "failed": failed,
        }
        logger.info(
            "[AutoHistoryAnalysis] 执行完成: total=%s submitted=%s skipped_today=%s "
            "skipped_market=%s duplicates=%s failed=%s",
            summary["total"],
            len(submitted),
            len(skipped_today),
            len(skipped_market),
            len(duplicates),
            len(failed),
        )
        return summary
