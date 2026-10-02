import secrets

from fastapi import Depends, Header, HTTPException, status

from app.config import Settings, get_settings
from app.detection import DetectionEngine


def require_api_key(
    x_api_key: str | None = Header(default=None), settings: Settings = Depends(get_settings)
) -> None:
    if settings.api_key is None:
        return
    if x_api_key is None or not secrets.compare_digest(x_api_key, settings.api_key):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or missing X-API-Key header")


_engines: dict[int, DetectionEngine] = {}


def get_engine(settings: Settings = Depends(get_settings)) -> DetectionEngine:
    # Settings objects aren't hashable; one engine per settings instance (normally just one).
    engine = _engines.get(id(settings))
    if engine is None or engine.settings is not settings:
        engine = _engines[id(settings)] = DetectionEngine(settings)
    return engine
