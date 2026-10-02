from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Runtime configuration. Every field can be overridden with a LADS_* env var."""

    model_config = SettingsConfigDict(env_prefix="LADS_", env_file=".env", extra="ignore")

    database_url: str = f"sqlite:///{BASE_DIR / 'lads.db'}"
    # When unset, ingestion endpoints accept requests without an API key (dev mode).
    api_key: str | None = None

    blocklist_path: Path = BASE_DIR / "data" / "ip_blocklist.txt"
    geoip_db_path: Path | None = None
    frontend_dist: Path = BASE_DIR / "frontend" / "dist"

    # Brute force
    brute_force_user_threshold: int = 5
    brute_force_ip_threshold: int = 10
    brute_force_window_minutes: int = 5

    # Password spraying / credential stuffing
    spraying_distinct_users_threshold: int = 5
    spraying_failure_ratio: float = 0.8
    spraying_window_minutes: int = 10

    # Impossible travel
    impossible_travel_speed_kmh: float = 900.0
    impossible_travel_min_distance_km: float = 500.0
    impossible_travel_lookback_hours: int = 24

    # How long an open alert absorbs new matching detections instead of opening a new one
    alert_dedup_window_minutes: int = 30


@lru_cache
def get_settings() -> Settings:
    return Settings()
