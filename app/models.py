from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import JSON, Boolean, DateTime, Float, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AlertType(StrEnum):
    BRUTE_FORCE = "brute_force"
    PASSWORD_SPRAYING = "password_spraying"
    IMPOSSIBLE_TRAVEL = "impossible_travel"
    SUSPICIOUS_IP = "suspicious_ip"


class Severity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(StrEnum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


SEVERITY_RANK = {Severity.LOW: 0, Severity.MEDIUM: 1, Severity.HIGH: 2, Severity.CRITICAL: 3}


class LoginEvent(Base):
    """A single login attempt reported by a client application. Timestamps are naive UTC."""

    __tablename__ = "login_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)
    username: Mapped[str] = mapped_column(String(255))
    ip_address: Mapped[str] = mapped_column(String(45))
    success: Mapped[bool] = mapped_column(Boolean)
    user_agent: Mapped[str | None] = mapped_column(String(512))
    source_app: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str | None] = mapped_column(String(100))
    city: Mapped[str | None] = mapped_column(String(100))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    __table_args__ = (
        Index("ix_events_username_ts", "username", "timestamp"),
        Index("ix_events_ip_ts", "ip_address", "timestamp"),
    )


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(32), index=True)
    severity: Mapped[str] = mapped_column(String(16), index=True)
    username: Mapped[str | None] = mapped_column(String(255), index=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), index=True)
    description: Mapped[str] = mapped_column(String(500))
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    event_count: Mapped[int] = mapped_column(Integer, default=1)
    first_seen: Mapped[datetime] = mapped_column(DateTime)
    last_seen: Mapped[datetime] = mapped_column(DateTime, index=True)
    status: Mapped[str] = mapped_column(String(16), default=AlertStatus.OPEN, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
