from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_engine, require_api_key
from app.database import get_db
from app.detection import DetectionEngine
from app.models import LoginEvent
from app.schemas import BatchIngestResult, IngestResult, LoginEventIn, LoginEventOut, Page, to_naive_utc

router = APIRouter(prefix="/api/events", tags=["events"])


@router.post("", response_model=IngestResult, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_api_key)])
def ingest_event(
    payload: LoginEventIn, db: Session = Depends(get_db), engine: DetectionEngine = Depends(get_engine)
):
    """Record one login attempt and return any alerts it raised or updated."""
    event, alerts = engine.ingest(db, payload)
    return IngestResult(event=event, alerts=alerts)


@router.post("/batch", response_model=BatchIngestResult, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_api_key)])
def ingest_batch(
    payload: list[LoginEventIn],
    db: Session = Depends(get_db),
    engine: DetectionEngine = Depends(get_engine),
):
    count, alerts = engine.ingest_many(db, payload[:5000])
    return BatchIngestResult(ingested=count, alerts=alerts)


@router.get("", response_model=Page[LoginEventOut])
def list_events(
    username: str | None = None,
    ip: str | None = None,
    success: bool | None = None,
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    conditions = []
    if username:
        conditions.append(LoginEvent.username == username.strip())
    if ip:
        conditions.append(LoginEvent.ip_address == ip.strip())
    if success is not None:
        conditions.append(LoginEvent.success.is_(success))
    if from_:
        conditions.append(LoginEvent.timestamp >= to_naive_utc(from_))
    if to:
        conditions.append(LoginEvent.timestamp <= to_naive_utc(to))

    total = db.scalar(select(func.count()).select_from(LoginEvent).where(*conditions))
    items = db.scalars(
        select(LoginEvent)
        .where(*conditions)
        .order_by(LoginEvent.timestamp.desc(), LoginEvent.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return Page(items=items, total=total)
