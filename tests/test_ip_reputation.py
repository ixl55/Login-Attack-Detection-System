from app.detection.ip_reputation import IpBlocklist
from app.models import AlertType, Severity


def test_blocklist_matches_cidr_and_single_ip(tmp_path):
    f = tmp_path / "bl.txt"
    f.write_text("203.0.113.0/24  # range\n198.51.100.66\nnot-an-ip\n2001:db8:bad::/48\n")
    bl = IpBlocklist(f)
    assert bl.match("203.0.113.77") == "203.0.113.0/24"
    assert bl.match("198.51.100.66") == "198.51.100.66/32"
    assert bl.match("198.51.100.67") is None
    assert bl.match("2001:db8:bad::1") == "2001:db8:bad::/48"
    assert bl.match("8.8.8.8") is None


def test_blocklist_reloads_on_change(tmp_path):
    import os

    f = tmp_path / "bl.txt"
    f.write_text("10.0.0.1\n")
    bl = IpBlocklist(f)
    assert bl.match("10.0.0.2") is None
    f.write_text("10.0.0.2\n")
    os.utime(f, (1, 1))  # force a different mtime
    assert bl.match("10.0.0.2") == "10.0.0.2/32"


def test_failed_attempt_from_blocklisted_ip_is_medium(ingest):
    alerts = ingest("frank", "203.0.113.5", False)
    assert len(alerts) == 1
    assert alerts[0].type == AlertType.SUSPICIOUS_IP
    assert alerts[0].severity == Severity.MEDIUM


def test_successful_login_from_blocklisted_ip_is_high(ingest):
    ingest("frank", "203.0.113.5", False)
    alerts = ingest("frank", "203.0.113.5", True, minutes=1)
    assert alerts[0].severity == Severity.HIGH
    assert alerts[0].details["successful_users"] == ["frank"]
    assert alerts[0].event_count == 2


def test_clean_ip_raises_nothing(ingest):
    assert ingest("frank", "8.8.8.8", True) == []
