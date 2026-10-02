"""Aggregation helpers shared by the stats and investigation endpoints."""

from collections.abc import Iterable
from datetime import datetime, timedelta

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import Alert, AlertStatus, LoginEvent, Severity
from app.schemas import EntitySummary, TimelinePoint

# range -> (span, bucket size in minutes)
RANGES: dict[str, tuple[timedelta, int]] = {
    "1h": (timedelta(hours=1), 5),
    "24h": (timedelta(hours=24), 60),
    "7d": (timedelta(days=7), 360),
}

RISK_WEIGHTS = {Severity.CRITICAL: 40, Severity.HIGH: 25, Severity.MEDIUM: 10, Severity.LOW: 5}

_EPOCH = datetime(1970, 1, 1)

failed_sum = func.sum(case((LoginEvent.success.is_(False), 1), else_=0))
success_sum = func.sum(case((LoginEvent.success.is_(True), 1), else_=0))


def floor_time(ts: datetime, minutes: int) -> datetime:
    step = minutes * 60
    seconds = int((ts - _EPOCH).total_seconds())
    return _EPOCH + timedelta(seconds=seconds - seconds % step)


def build_timeline(
    rows: Iterable[tuple[datetime, bool]], start: datetime, end: datetime, bucket_minutes: int
) -> list[TimelinePoint]:
    step = timedelta(minutes=bucket_minutes)
    buckets: dict[datetime, list[int]] = {}
    t = floor_time(start, bucket_minutes)
    while t <= end:
        buckets[t] = [0, 0]
        t += step
    for ts, ok in rows:
        counts = buckets.get(floor_time(ts, bucket_minutes))
        if counts is not None:
            counts[0 if ok else 1] += 1
    return [TimelinePoint(bucket=b, success=s, failed=f) for b, (s, f) in buckets.items()]


def risk_score(alerts: Iterable[Alert]) -> int:
    score = sum(RISK_WEIGHTS[Severity(a.severity)] for a in alerts if a.status != AlertStatus.RESOLVED)
    return min(100, score)


def entity_summary(db: Session, condition, alerts: list[Alert]) -> EntitySummary:
    attempts, failed, first, last = db.execute(
        select(func.count(), failed_sum, func.min(LoginEvent.timestamp), func.max(LoginEvent.timestamp)).where(
            condition
        )
    ).one()
    failed = failed or 0
    return EntitySummary(
        attempts=attempts,
        failed=failed,
        successful=attempts - failed,
        first_seen=first,
        last_seen=last,
        risk_score=risk_score(alerts),
        open_alerts=sum(1 for a in alerts if a.status == AlertStatus.OPEN),
    )
