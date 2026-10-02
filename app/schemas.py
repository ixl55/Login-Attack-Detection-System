from datetime import datetime, timezone
from ipaddress import ip_address
from typing import Annotated, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer, field_validator

from app.models import AlertStatus, AlertType, Severity


def to_naive_utc(value: datetime) -> datetime:
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


# Stored datetimes are naive UTC; always emit them with an explicit "Z" so clients parse them as UTC.
UTCDateTime = Annotated[
    datetime,
    PlainSerializer(lambda d: d.replace(tzinfo=None).isoformat(timespec="seconds") + "Z", return_type=str),
]

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int


class LoginEventIn(BaseModel):
    username: str = Field(min_length=1, max_length=255)
    ip_address: str
    success: bool
    timestamp: datetime | None = Field(default=None, description="Defaults to now (UTC)")
    user_agent: str | None = Field(default=None, max_length=512)
    source_app: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=100)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @field_validator("ip_address")
    @classmethod
    def validate_ip(cls, value: str) -> str:
        return str(ip_address(value.strip()))

    @field_validator("username")
    @classmethod
    def strip_username(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("username must not be blank")
        return value

    @field_validator("timestamp")
    @classmethod
    def normalize_timestamp(cls, value: datetime | None) -> datetime | None:
        return to_naive_utc(value) if value else None


class LoginEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: UTCDateTime
    username: str
    ip_address: str
    success: bool
    user_agent: str | None
    source_app: str | None
    country: str | None
    city: str | None
    latitude: float | None
    longitude: float | None


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: AlertType
    severity: Severity
    username: str | None
    ip_address: str | None
    description: str
    details: dict
    event_count: int
    first_seen: UTCDateTime
    last_seen: UTCDateTime
    status: AlertStatus
    created_at: UTCDateTime
    updated_at: UTCDateTime


class AlertUpdate(BaseModel):
    status: AlertStatus


class IngestResult(BaseModel):
    event: LoginEventOut
    alerts: list[AlertOut]


class BatchIngestResult(BaseModel):
    ingested: int
    alerts: list[AlertOut]


# ---------- Stats ----------

StatsRange = Literal["1h", "24h", "7d"]


class TimelinePoint(BaseModel):
    bucket: UTCDateTime
    success: int
    failed: int


class Totals(BaseModel):
    attempts: int
    successful: int
    failed: int
    failure_rate: float
    new_alerts: int


class TypeCount(BaseModel):
    type: AlertType
    count: int


class SeverityCount(BaseModel):
    severity: Severity
    count: int


class TopIp(BaseModel):
    ip_address: str
    attempts: int
    failed: int
    failure_rate: float
    distinct_users: int


class TopUser(BaseModel):
    username: str
    attempts: int
    failed: int
    failure_rate: float
    distinct_ips: int


class StatsOut(BaseModel):
    range: StatsRange
    generated_at: UTCDateTime
    bucket_minutes: int
    totals: Totals
    previous: Totals
    open_alerts: int
    critical_open_alerts: int
    timeline: list[TimelinePoint]
    alerts_by_type: list[TypeCount]
    alerts_by_severity: list[SeverityCount]
    top_ips: list[TopIp]
    top_users: list[TopUser]


# ---------- Investigation ----------


class EntitySummary(BaseModel):
    attempts: int
    successful: int
    failed: int
    first_seen: UTCDateTime | None
    last_seen: UTCDateTime | None
    risk_score: int
    open_alerts: int


class LocationPoint(BaseModel):
    timestamp: UTCDateTime
    ip_address: str
    country: str | None
    city: str | None
    latitude: float | None
    longitude: float | None
    success: bool
    impossible_travel: bool = False
    distance_km: float | None = None
    speed_kmh: float | None = None


class IpUsage(BaseModel):
    ip_address: str
    attempts: int
    failed: int
    successful: int
    country: str | None


class UsernameUsage(BaseModel):
    username: str
    attempts: int
    failed: int
    successful: int


class UserInvestigation(BaseModel):
    username: str
    summary: EntitySummary
    distinct_ips: int
    countries: list[str]
    timeline: list[TimelinePoint]
    bucket_minutes: int
    locations: list[LocationPoint]
    ips: list[IpUsage]
    alerts: list[AlertOut]


class IpInvestigation(BaseModel):
    ip_address: str
    summary: EntitySummary
    distinct_users: int
    country: str | None
    city: str | None
    blocklisted: bool
    blocklist_match: str | None
    timeline: list[TimelinePoint]
    bucket_minutes: int
    usernames: list[UsernameUsage]
    alerts: list[AlertOut]
