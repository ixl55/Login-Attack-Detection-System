from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.detection.base import AlertCandidate, Detector
from app.geo import haversine_km
from app.models import AlertType, LoginEvent, Severity


def _place(e: LoginEvent) -> dict:
    return {
        "ip_address": e.ip_address,
        "country": e.country,
        "city": e.city,
        "latitude": e.latitude,
        "longitude": e.longitude,
        "timestamp": e.timestamp.isoformat(timespec="seconds") + "Z",
    }


def travel_speed_kmh(distance_km: float, hours: float) -> float | None:
    """Speed needed to cover the distance; None means "instantaneous" (no elapsed time)."""
    return distance_km / hours if hours > 0 else None


class ImpossibleTravelDetector(Detector):
    """Two successful logins for one user from places too far apart for the time between them."""

    def detect(self, event: LoginEvent, db: Session) -> list[AlertCandidate]:
        s = self.settings
        if not event.success or event.latitude is None or event.longitude is None:
            return []

        previous = db.execute(
            select(LoginEvent)
            .where(
                LoginEvent.username == event.username,
                LoginEvent.success.is_(True),
                LoginEvent.id != event.id,
                LoginEvent.latitude.is_not(None),
                LoginEvent.longitude.is_not(None),
                LoginEvent.timestamp <= event.timestamp,
                LoginEvent.timestamp >= event.timestamp - timedelta(hours=s.impossible_travel_lookback_hours),
            )
            .order_by(LoginEvent.timestamp.desc(), LoginEvent.id.desc())
            .limit(1)
        ).scalar_one_or_none()
        if previous is None:
            return []

        distance = haversine_km(previous.latitude, previous.longitude, event.latitude, event.longitude)
        if distance < s.impossible_travel_min_distance_km:
            return []
        hours = (event.timestamp - previous.timestamp).total_seconds() / 3600
        speed = travel_speed_kmh(distance, hours)
        if speed is not None and speed <= s.impossible_travel_speed_kmh:
            return []

        origin = previous.city or previous.country or previous.ip_address
        destination = event.city or event.country or event.ip_address
        return [
            AlertCandidate(
                type=AlertType.IMPOSSIBLE_TRAVEL,
                severity=Severity.CRITICAL,
                username=event.username,
                ip_address=event.ip_address,
                description=(
                    f"'{event.username}' logged in from {origin} and {destination} "
                    f"({distance:,.0f} km) within {hours * 60:.0f} minutes"
                ),
                first_seen=previous.timestamp,
                last_seen=event.timestamp,
                event_count=2,
                details={
                    "from": _place(previous),
                    "to": _place(event),
                    "distance_km": round(distance, 1),
                    "elapsed_minutes": round(hours * 60, 1),
                    "speed_kmh": round(speed, 1) if speed is not None else None,
                    "max_speed_kmh": s.impossible_travel_speed_kmh,
                },
            )
        ]
