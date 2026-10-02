from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy.orm import Session

from app.config import Settings
from app.models import AlertType, LoginEvent, Severity


@dataclass
class AlertCandidate:
    type: AlertType
    severity: Severity
    description: str
    first_seen: datetime
    last_seen: datetime
    event_count: int
    # The (username, ip_address) pair identifies the entity for de-duplication; either may be None.
    username: str | None = None
    ip_address: str | None = None
    details: dict = field(default_factory=dict)


class Detector(ABC):
    def __init__(self, settings: Settings):
        self.settings = settings

    @abstractmethod
    def detect(self, event: LoginEvent, db: Session) -> list[AlertCandidate]:
        """Inspect a freshly stored event (already flushed to `db`) and return any findings."""
