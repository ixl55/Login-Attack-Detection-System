from collections.abc import Callable
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import Settings, get_settings
from app.database import Base, get_db
from app.detection import DetectionEngine
from app.geo import GeoResolver
from app.main import create_app
from app.schemas import LoginEventIn

BASE_TIME = datetime(2026, 1, 1, 12, 0, 0)

RIYADH = {"country": "Saudi Arabia", "city": "Riyadh", "latitude": 24.7136, "longitude": 46.6753}
LONDON = {"country": "United Kingdom", "city": "London", "latitude": 51.5072, "longitude": -0.1276}
JEDDAH = {"country": "Saudi Arabia", "city": "Jeddah", "latitude": 21.4858, "longitude": 39.1925}


@pytest.fixture
def settings(tmp_path) -> Settings:
    blocklist = tmp_path / "blocklist.txt"
    blocklist.write_text("# test\n203.0.113.0/24\n198.51.100.66\n")
    return Settings(
        database_url="sqlite://",
        blocklist_path=blocklist,
        frontend_dist=tmp_path / "dist",
        api_key=None,
    )


@pytest.fixture
def db() -> Session:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    yield session
    session.close()


@pytest.fixture
def engine(settings) -> DetectionEngine:
    return DetectionEngine(settings, geo=GeoResolver(None))


@pytest.fixture
def ingest(db, engine) -> Callable:
    """ingest(username, ip, success, minutes=offset from BASE_TIME, **extra) -> list of alerts."""

    def _ingest(username: str, ip: str, success: bool, minutes: float = 0, **extra):
        payload = LoginEventIn(
            username=username,
            ip_address=ip,
            success=success,
            timestamp=BASE_TIME + timedelta(minutes=minutes),
            **extra,
        )
        _, alerts = engine.ingest(db, payload)
        return alerts

    return _ingest


@pytest.fixture
def client(db, settings) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_settings] = lambda: settings
    return TestClient(app)
