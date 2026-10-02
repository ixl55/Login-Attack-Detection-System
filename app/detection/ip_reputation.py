import ipaddress
import logging
from datetime import timedelta
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.detection.base import AlertCandidate, Detector
from app.models import AlertType, LoginEvent, Severity

logger = logging.getLogger(__name__)

Network = ipaddress.IPv4Network | ipaddress.IPv6Network


class IpBlocklist:
    """IPs and CIDR ranges loaded from a text file (one per line, '#' comments). Reloads when the file changes."""

    def __init__(self, path: Path):
        self.path = path
        self._mtime: float | None = None
        self._networks: list[Network] = []

    def _load(self) -> None:
        try:
            mtime = self.path.stat().st_mtime
        except FileNotFoundError:
            self._networks, self._mtime = [], None
            return
        if mtime == self._mtime:
            return
        networks = []
        for lineno, raw in enumerate(self.path.read_text().splitlines(), 1):
            line = raw.split("#", 1)[0].strip()
            if not line:
                continue
            try:
                networks.append(ipaddress.ip_network(line, strict=False))
            except ValueError:
                logger.warning("Ignoring invalid blocklist entry %r at %s:%d", line, self.path, lineno)
        self._networks, self._mtime = networks, mtime

    def match(self, ip: str) -> str | None:
        self._load()
        addr = ipaddress.ip_address(ip)
        for net in self._networks:
            if addr.version == net.version and addr in net:
                return str(net)
        return None


_blocklists: dict[Path, IpBlocklist] = {}


def get_blocklist(path: Path) -> IpBlocklist:
    if path not in _blocklists:
        _blocklists[path] = IpBlocklist(path)
    return _blocklists[path]


class SuspiciousIPDetector(Detector):
    """Any login attempt from an IP on the blocklist."""

    def detect(self, event: LoginEvent, db: Session) -> list[AlertCandidate]:
        match = get_blocklist(self.settings.blocklist_path).match(event.ip_address)
        if match is None:
            return []

        since = event.timestamp - timedelta(minutes=self.settings.alert_dedup_window_minutes)
        rows = db.execute(
            select(LoginEvent.username, LoginEvent.success, LoginEvent.timestamp).where(
                LoginEvent.ip_address == event.ip_address,
                LoginEvent.timestamp >= since,
                LoginEvent.timestamp <= event.timestamp,
            )
        ).all()
        successful_users = sorted({r.username for r in rows if r.success})
        return [
            AlertCandidate(
                type=AlertType.SUSPICIOUS_IP,
                severity=Severity.HIGH if successful_users else Severity.MEDIUM,
                ip_address=event.ip_address,
                description=(
                    f"Successful login from blocklisted IP {event.ip_address}"
                    if successful_users
                    else f"Login attempt from blocklisted IP {event.ip_address}"
                ),
                first_seen=min(r.timestamp for r in rows),
                last_seen=event.timestamp,
                event_count=len(rows),
                details={
                    "matched_range": match,
                    "attempts": len(rows),
                    "usernames": sorted({r.username for r in rows})[:50],
                    "successful_users": successful_users,
                },
            )
        ]
