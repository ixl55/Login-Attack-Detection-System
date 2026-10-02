from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.detection.base import AlertCandidate, Detector
from app.detection.brute_force import BruteForceDetector
from app.detection.impossible_travel import ImpossibleTravelDetector
from app.detection.ip_reputation import SuspiciousIPDetector
from app.detection.spraying import PasswordSprayingDetector
from app.geo import GeoResolver
from app.models import SEVERITY_RANK, Alert, AlertStatus, LoginEvent, Severity, utcnow
from app.schemas import LoginEventIn


class DetectionEngine:
    def __init__(self, settings: Settings, geo: GeoResolver | None = None):
        self.settings = settings
        self.geo = geo or GeoResolver(settings.geoip_db_path)
        self.detectors: list[Detector] = [
            BruteForceDetector(settings),
            PasswordSprayingDetector(settings),
            ImpossibleTravelDetector(settings),
            SuspiciousIPDetector(settings),
        ]

    def ingest(self, db: Session, data: LoginEventIn) -> tuple[LoginEvent, list[Alert]]:
        """Store an event, run every detector against it and persist the resulting alerts. Commits."""
        event, alerts = self._ingest_one(db, data)
        db.commit()
        return event, alerts

    def ingest_many(self, db: Session, items: list[LoginEventIn]) -> tuple[int, list[Alert]]:
        """Ingest events in chronological order so windowed detectors see them as they happened."""
        now = utcnow()
        ordered = sorted(items, key=lambda e: e.timestamp or now)
        touched: dict[int, Alert] = {}
        for item in ordered:
            _, alerts = self._ingest_one(db, item, default_ts=now)
            for a in alerts:
                touched[a.id] = a
        db.commit()
        return len(ordered), list(touched.values())

    def _ingest_one(
        self, db: Session, data: LoginEventIn, default_ts: datetime | None = None
    ) -> tuple[LoginEvent, list[Alert]]:
        event = LoginEvent(**data.model_dump(exclude={"timestamp"}), timestamp=data.timestamp or default_ts or utcnow())
        if event.latitude is None or event.longitude is None:
            loc = self.geo.resolve(event.ip_address)
            if loc:
                event.latitude, event.longitude = loc.latitude, loc.longitude
                event.country = event.country or loc.country
                event.city = event.city or loc.city
        db.add(event)
        db.flush()

        alerts = []
        for detector in self.detectors:
            for candidate in detector.detect(event, db):
                alerts.append(self._upsert_alert(db, candidate))
        db.flush()
        return event, alerts

    def _upsert_alert(self, db: Session, c: AlertCandidate) -> Alert:
        since = c.last_seen - timedelta(minutes=self.settings.alert_dedup_window_minutes)
        existing = db.execute(
            select(Alert)
            .where(
                Alert.type == c.type,
                Alert.status == AlertStatus.OPEN,
                Alert.username.is_(None) if c.username is None else Alert.username == c.username,
                Alert.ip_address.is_(None) if c.ip_address is None else Alert.ip_address == c.ip_address,
                Alert.last_seen >= since,
            )
            .order_by(Alert.last_seen.desc())
            .limit(1)
        ).scalar_one_or_none()

        if existing is None:
            alert = Alert(
                type=c.type,
                severity=c.severity,
                username=c.username,
                ip_address=c.ip_address,
                description=c.description,
                details=c.details,
                event_count=c.event_count,
                first_seen=c.first_seen,
                last_seen=c.last_seen,
                status=AlertStatus.OPEN,
            )
            db.add(alert)
            db.flush()
            return alert

        # An ongoing attack keeps updating the same alert; severity can only escalate.
        if SEVERITY_RANK[Severity(c.severity)] >= SEVERITY_RANK[Severity(existing.severity)]:
            existing.severity = c.severity
            existing.description = c.description
        existing.details = c.details
        existing.event_count += 1
        existing.first_seen = min(existing.first_seen, c.first_seen)
        existing.last_seen = max(existing.last_seen, c.last_seen)
        db.flush()
        return existing
