import logging
import math
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

EARTH_RADIUS_KM = 6371.0


@dataclass(frozen=True)
class GeoLocation:
    country: str | None
    city: str | None
    latitude: float
    longitude: float


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlmb / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


class GeoResolver:
    """Resolves an IP to a location using a MaxMind GeoLite2-City database, when one is configured.

    Events that already carry latitude/longitude never hit the resolver.
    """

    def __init__(self, db_path: Path | None):
        self._reader = None
        if db_path and db_path.exists():
            try:
                import geoip2.database  # optional dependency

                self._reader = geoip2.database.Reader(str(db_path))
            except ImportError:
                logger.warning("geoip2 is not installed; GeoIP lookups are disabled")

    @property
    def enabled(self) -> bool:
        return self._reader is not None

    def resolve(self, ip: str) -> GeoLocation | None:
        if self._reader is None:
            return None
        try:
            r = self._reader.city(ip)
        except Exception:  # unknown/private address
            return None
        if r.location.latitude is None or r.location.longitude is None:
            return None
        return GeoLocation(r.country.name, r.city.name, r.location.latitude, r.location.longitude)
