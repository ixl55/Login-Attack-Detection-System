from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.detection.base import AlertCandidate, Detector
from app.models import AlertType, LoginEvent, Severity

MAX_LISTED_USERS = 50


class PasswordSprayingDetector(Detector):
    """One IP trying many different accounts, mostly failing (password spraying / credential stuffing)."""

    def detect(self, event: LoginEvent, db: Session) -> list[AlertCandidate]:
        s = self.settings
        window_start = event.timestamp - timedelta(minutes=s.spraying_window_minutes)
        rows = db.execute(
            select(LoginEvent.username, LoginEvent.success, LoginEvent.timestamp).where(
                LoginEvent.ip_address == event.ip_address,
                LoginEvent.timestamp >= window_start,
                LoginEvent.timestamp <= event.timestamp,
            )
        ).all()

        users = {r.username for r in rows}
        if len(users) < s.spraying_distinct_users_threshold:
            return []
        failed = sum(1 for r in rows if not r.success)
        ratio = failed / len(rows)
        if ratio < s.spraying_failure_ratio:
            return []

        compromised = sorted({r.username for r in rows if r.success})
        return [
            AlertCandidate(
                type=AlertType.PASSWORD_SPRAYING,
                severity=Severity.CRITICAL if compromised else Severity.HIGH,
                ip_address=event.ip_address,
                description=f"{event.ip_address} tried {len(users)} different accounts ({failed} failures)",
                first_seen=min(r.timestamp for r in rows),
                last_seen=event.timestamp,
                event_count=len(rows),
                details={
                    "distinct_users": len(users),
                    "attempts": len(rows),
                    "failed_attempts": failed,
                    "failure_ratio": round(ratio, 3),
                    "window_minutes": s.spraying_window_minutes,
                    "usernames": sorted(users)[:MAX_LISTED_USERS],
                    "compromised_users": compromised,
                },
            )
        ]
