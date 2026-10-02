from app.models import AlertType, Severity


def test_spraying_detected(ingest):
    alerts = []
    for i, user in enumerate(["u1", "u2", "u3", "u4", "u5"]):
        alerts = ingest(user, "10.9.9.9", False, minutes=i)
    spray = [a for a in alerts if a.type == AlertType.PASSWORD_SPRAYING]
    assert len(spray) == 1
    assert spray[0].ip_address == "10.9.9.9"
    assert spray[0].details["distinct_users"] == 5
    assert spray[0].severity == Severity.HIGH


def test_successful_stuffing_is_critical(ingest):
    for i, user in enumerate(["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8"]):
        ingest(user, "10.9.9.9", False, minutes=i * 0.5)
    alerts = ingest("u9", "10.9.9.9", True, minutes=5)
    spray = [a for a in alerts if a.type == AlertType.PASSWORD_SPRAYING]
    assert spray[0].severity == Severity.CRITICAL
    assert spray[0].details["compromised_users"] == ["u9"]


def test_shared_ip_with_mostly_successful_logins_is_not_spraying(ingest):
    # e.g. an office NAT: many users, mostly successful
    alerts = []
    for i, user in enumerate(["u1", "u2", "u3", "u4", "u5", "u6"]):
        alerts += ingest(user, "10.1.1.1", True, minutes=i)
    alerts += ingest("u7", "10.1.1.1", False, minutes=7)
    assert [a for a in alerts if a.type == AlertType.PASSWORD_SPRAYING] == []


def test_spread_out_over_time_is_not_spraying(ingest):
    alerts = []
    for i, user in enumerate(["u1", "u2", "u3", "u4", "u5"]):
        alerts += ingest(user, "10.9.9.9", False, minutes=i * 5)
    assert [a for a in alerts if a.type == AlertType.PASSWORD_SPRAYING] == []
