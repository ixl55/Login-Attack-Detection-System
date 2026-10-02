from app.geo import haversine_km
from app.models import AlertType, Severity
from tests.conftest import JEDDAH, LONDON, RIYADH


def test_haversine_riyadh_london():
    d = haversine_km(RIYADH["latitude"], RIYADH["longitude"], LONDON["latitude"], LONDON["longitude"])
    assert 4850 < d < 5000


def test_impossible_travel_detected(ingest):
    assert ingest("eve", "10.0.0.1", True, minutes=0, **RIYADH) == []
    alerts = ingest("eve", "10.0.0.2", True, minutes=10, **LONDON)
    assert len(alerts) == 1
    alert = alerts[0]
    assert alert.type == AlertType.IMPOSSIBLE_TRAVEL
    assert alert.severity == Severity.CRITICAL
    assert alert.details["from"]["city"] == "Riyadh"
    assert alert.details["to"]["city"] == "London"
    assert alert.details["speed_kmh"] > 20000


def test_plausible_flight_is_not_flagged(ingest):
    ingest("eve", "10.0.0.1", True, minutes=0, **RIYADH)
    assert ingest("eve", "10.0.0.2", True, minutes=8 * 60, **LONDON) == []


def test_short_distance_is_not_flagged(ingest):
    # Riyadh -> Jeddah is ~850km; above min distance but 2 hours later is ~425km/h
    ingest("eve", "10.0.0.1", True, minutes=0, **RIYADH)
    assert ingest("eve", "10.0.0.2", True, minutes=120, **JEDDAH) == []


def test_failed_logins_are_ignored(ingest):
    ingest("eve", "10.0.0.1", True, minutes=0, **RIYADH)
    assert ingest("eve", "10.0.0.2", False, minutes=5, **LONDON) == []


def test_events_without_location_are_ignored(ingest):
    ingest("eve", "10.0.0.1", True, minutes=0, **RIYADH)
    assert ingest("eve", "10.0.0.2", True, minutes=5) == []
