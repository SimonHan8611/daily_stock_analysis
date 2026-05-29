from datetime import date
from types import SimpleNamespace

from src.services.history_auto_analysis_service import HistoryAutoAnalysisService
from src.services.task_queue import DuplicateTaskError


class FakeDb:
    def __init__(self, stocks, existing_today=None):
        self.stocks = stocks
        self.existing_today = set(existing_today or [])

    def get_distinct_history_stocks(self, limit=200):
        return self.stocks[:limit]

    def has_analysis_history_on_date(self, code, target_date):
        return code in self.existing_today


class FakeQueue:
    def __init__(self, duplicate_codes=None):
        self.duplicate_codes = set(duplicate_codes or [])
        self.submitted = []

    def submit_task(self, **kwargs):
        if kwargs["stock_code"] in self.duplicate_codes:
            raise DuplicateTaskError(kwargs["stock_code"], "existing-task")
        self.submitted.append(kwargs)


def build_config(**overrides):
    values = {
        "auto_history_analysis_enabled": True,
        "auto_history_analysis_time": "14:45",
        "auto_history_analysis_limit": 20,
        "auto_history_analysis_report_type": "detailed",
        "auto_history_analysis_notify": False,
        "trading_day_check_enabled": False,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_run_once_submits_distinct_history_stocks():
    db = FakeDb([
        {"code": "600519", "name": "贵州茅台"},
        {"code": "002015", "name": "协鑫能科"},
    ])
    queue = FakeQueue()
    service = HistoryAutoAnalysisService(
        config=build_config(),
        db_manager=db,
        task_queue=queue,
    )

    result = service.run_once(date(2026, 5, 29))

    assert result["submitted"] == ["600519", "002015"]
    assert [item["stock_code"] for item in queue.submitted] == ["600519", "002015"]
    assert all(item["force_refresh"] is True for item in queue.submitted)
    assert all(item["notify"] is False for item in queue.submitted)


def test_run_once_skips_existing_today_and_duplicates():
    db = FakeDb(
        [
            {"code": "600519", "name": "贵州茅台"},
            {"code": "002015", "name": "协鑫能科"},
            {"code": "600584", "name": "长电科技"},
        ],
        existing_today={"600519"},
    )
    queue = FakeQueue(duplicate_codes={"002015"})
    service = HistoryAutoAnalysisService(
        config=build_config(auto_history_analysis_notify=True),
        db_manager=db,
        task_queue=queue,
    )

    result = service.run_once(date(2026, 5, 29))

    assert result["skipped_today"] == ["600519"]
    assert result["duplicates"] == ["002015"]
    assert result["submitted"] == ["600584"]
    assert queue.submitted[0]["notify"] is True
