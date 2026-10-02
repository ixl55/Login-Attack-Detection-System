from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.detection.base import AlertCandidate, Detector
from app.models import AlertType, LoginEvent, Severity


class BruteForceDetector(Detector):
    """Many failed logins against one account, or many failures from one IP against few accounts."""

    def detect(self, event: LoginEvent, db: Session) -> list[AlertCandidate]:
        s = self.settings
        window_start = event.timestamp - timedelta(minutes=s.brute_force_window_minutes)
        findings: list[AlertCandidate] = []

        user_failures = db.execute(
            select(func.count(), func.min(LoginEvent.timestamp), func.count(func.distinct(LoginEvent.ip_address)))
            .where(
                LoginEvent.username == event.username,
                LoginEvent.success.is_(False),
                LoginEvent.timestamp >= window_start,
                LoginEvent.timestamp <= event.timestamp,
            )
        ).one()
        failed_count, first_failure, source_ips = user_failures

        if failed_count >= s.brute_force_user_threshold:
            compromised = event.success
            findings.append(
                AlertCandidate(
                    type=AlertType.BRUTE_FORCE,
                    severity=Severity.CRITICAL if compromised else Severity.HIGH,
                    username=event.username,
                    description=(
                        f"Successful login for '{event.username}' after {failed_count} failed attempts"
                        if compromised
                        else f"{failed_count} failed login attempts for '{event.username}'"
                    ),
                    first_seen=first_failure,
                    last_seen=event.timestamp,
                    event_count=failed_count + (1 if compromised else 0),
                    details={
                        "scope": "account",
                        "failed_attempts": failed_count,
                        "window_minutes": s.brute_force_window_minutes,
                        "source_ips": source_ips,
                        "last_ip": event.ip_address,
                        "possible_compromise": compromised,
                    },
                )
            )

        if not event.success:
            ip_failed, ip_first, ip_users = db.execute(
                select(func.count(), func.min(LoginEvent.timestamp), func.count(func.distinct(LoginEvent.username)))
                .where(
                    LoginEvent.ip_address == event.ip_address,
                    LoginEvent.success.is_(False),
                    LoginEvent.timestamp >= window_start,
                    LoginEvent.timestamp <= event.timestamp,
                )
            ).one()
            # Failures spread over many accounts are reported as password spraying instead.
            if ip_failed >= s.brute_force_ip_threshold and ip_users < s.spraying_distinct_users_threshold:
                findings.append(
                    AlertCandidate(
                        type=AlertType.BRUTE_FORCE,
                        severity=Severity.HIGH,
                        ip_address=event.ip_address,
                        description=f"{ip_failed} failed login attempts from {event.ip_address}",
                        first_seen=ip_first,
                        last_seen=event.timestamp,
                        event_count=ip_failed,
                        details={
                            "scope": "ip",
                            "failed_attempts": ip_failed,
                            "window_minutes": s.brute_force_window_minutes,
                            "targeted_users": ip_users,
                        },
                    )
                )

        return findings
