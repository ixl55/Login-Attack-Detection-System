from app.models import AlertType, Severity


def test_below_threshold_raises_nothing(ingest):
    for i in range(4):
        assert ingest("alice", "10.0.0.1", False, minutes=i) == []


def test_account_brute_force_detected_at_threshold(ingest):
    for i in range(4):
        ingest("alice", "10.0.0.1", False, minutes=i * 0.5)
    alerts = ingest("alice", "10.0.0.1", False, minutes=2)
    assert len(alerts) == 1
    alert = alerts[0]
    assert alert.type == AlertType.BRUTE_FORCE
    assert alert.severity == Severity.HIGH
    assert alert.username == "alice"
    assert alert.details["failed_attempts"] == 5


def test_failures_outside_window_are_ignored(ingest):
    for i in range(5):
        alerts = ingest("alice", "10.0.0.1", False, minutes=i * 2)  # 5 failures over 8 minutes
    assert alerts == []


def test_success_after_brute_force_escalates_to_critical(ingest, db):
    for i in range(6):
        ingest("alice", "10.0.0.1", False, minutes=i * 0.2)
    alerts = ingest("alice", "10.0.0.1", True, minutes=1.5)
    bf = [a for a in alerts if a.type == AlertType.BRUTE_FORCE]
    assert len(bf) == 1
    assert bf[0].severity == Severity.CRITICAL
    assert bf[0].details["possible_compromise"] is True


def test_repeated_failures_update_one_alert(ingest, db):
    ids = set()
    for i in range(9):
        for a in ingest("alice", "10.0.0.1", False, minutes=i * 0.2):
            assert a.details["scope"] == "account"
            ids.add(a.id)
    assert len(ids) == 1


def test_ip_brute_force_against_few_accounts(ingest):
    alerts = []
    for i in range(10):
        alerts = ingest(["bob", "carol"][i % 2], "10.0.0.9", False, minutes=i * 0.2)
    ip_alerts = [a for a in alerts if a.ip_address == "10.0.0.9" and a.username is None]
    assert len(ip_alerts) == 1
    assert ip_alerts[0].details["scope"] == "ip"


def test_normal_user_with_typo_is_not_flagged(ingest):
    assert ingest("dave", "10.0.0.5", False, minutes=0) == []
    assert ingest("dave", "10.0.0.5", True, minutes=0.5) == []
