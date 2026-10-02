from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.analytics import RANGES, build_timeline, failed_sum
from app.database import get_db
from app.models import Alert, AlertStatus, AlertType, LoginEvent, Severity, utcnow
from app.schemas import SeverityCount, StatsOut, StatsRange, TopIp, TopUser, Totals, TypeCount

router = APIRouter(prefix="/api/stats", tags=["stats"])

TOP_N = 5


def _totals(db: Session, start: datetime, end: datetime) -> Totals:
    attempts, failed = db.execute(
        select(func.count(), failed_sum).where(LoginEvent.timestamp >= start, LoginEvent.timestamp < end)
    ).one()
    failed = failed or 0
    new_alerts = db.scalar(
        select(func.count()).select_from(Alert).where(Alert.created_at >= start, Alert.created_at < end)
    )
    return Totals(
        attempts=attempts,
        failed=failed,
        successful=attempts - failed,
        failure_rate=round(failed / attempts, 4) if attempts else 0.0,
        new_alerts=new_alerts,
    )


@router.get("", response_model=StatsOut)
def get_stats(range: StatsRange = "24h", db: Session = Depends(get_db)):
    span, bucket_minutes = RANGES[range]
    now = utcnow()
    start = now - span
    in_range = (LoginEvent.timestamp >= start, LoginEvent.timestamp <= now)

    timeline_rows = db.execute(select(LoginEvent.timestamp, LoginEvent.success).where(*in_range)).all()

    alert_in_range = Alert.last_seen >= start
    by_type = dict(db.execute(select(Alert.type, func.count()).where(alert_in_range).group_by(Alert.type)).all())
    by_severity = dict(
        db.execute(select(Alert.severity, func.count()).where(alert_in_range).group_by(Alert.severity)).all()
    )

    attempts = func.count().label("attempts")
    failed = failed_sum.label("failed")
    top_ips = db.execute(
        select(LoginEvent.ip_address, attempts, failed, func.count(func.distinct(LoginEvent.username)))
        .where(*in_range)
        .group_by(LoginEvent.ip_address)
        .order_by(failed.desc(), attempts.desc())
        .limit(TOP_N)
    ).all()
    top_users = db.execute(
        select(LoginEvent.username, attempts, failed, func.count(func.distinct(LoginEvent.ip_address)))
        .where(*in_range)
        .group_by(LoginEvent.username)
        .order_by(failed.desc(), attempts.desc())
        .limit(TOP_N)
    ).all()

    return StatsOut(
        range=range,
        generated_at=now,
        bucket_minutes=bucket_minutes,
        totals=_totals(db, start, now),
        previous=_totals(db, start - span, start),
        open_alerts=db.scalar(select(func.count()).select_from(Alert).where(Alert.status == AlertStatus.OPEN)),
        critical_open_alerts=db.scalar(
            select(func.count())
            .select_from(Alert)
            .where(Alert.status == AlertStatus.OPEN, Alert.severity == Severity.CRITICAL)
        ),
        timeline=build_timeline(timeline_rows, start, now, bucket_minutes),
        alerts_by_type=[TypeCount(type=t, count=by_type.get(t, 0)) for t in AlertType],
        alerts_by_severity=[SeverityCount(severity=s, count=by_severity.get(s, 0)) for s in Severity],
        top_ips=[
            TopIp(ip_address=ip, attempts=a, failed=f or 0, failure_rate=round((f or 0) / a, 4), distinct_users=u)
            for ip, a, f, u in top_ips
            if f
        ],
        top_users=[
            TopUser(username=n, attempts=a, failed=f or 0, failure_rate=round((f or 0) / a, 4), distinct_ips=i)
            for n, a, f, i in top_users
            if f
        ],
    )
