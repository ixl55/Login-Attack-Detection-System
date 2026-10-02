from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Alert, AlertStatus, AlertType, Severity
from app.schemas import AlertOut, AlertUpdate, Page

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=Page[AlertOut])
def list_alerts(
    type: AlertType | None = None,
    severity: Severity | None = None,
    status: AlertStatus | None = None,
    username: str | None = None,
    ip: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    conditions = []
    if type:
        conditions.append(Alert.type == type)
    if severity:
        conditions.append(Alert.severity == severity)
    if status:
        conditions.append(Alert.status == status)
    if username:
        conditions.append(Alert.username == username)
    if ip:
        conditions.append(Alert.ip_address == ip)

    total = db.scalar(select(func.count()).select_from(Alert).where(*conditions))
    items = db.scalars(
        select(Alert).where(*conditions).order_by(Alert.last_seen.desc(), Alert.id.desc()).limit(limit).offset(offset)
    ).all()
    return Page(items=items, total=total)


def _get_alert(db: Session, alert_id: int) -> Alert:
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(404, "Alert not found")
    return alert


@router.get("/{alert_id}", response_model=AlertOut)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    return _get_alert(db, alert_id)


@router.patch("/{alert_id}", response_model=AlertOut)
def update_alert(alert_id: int, payload: AlertUpdate, db: Session = Depends(get_db)):
    alert = _get_alert(db, alert_id)
    alert.status = payload.status
    db.commit()
    db.refresh(alert)
    return alert
