from datetime import timedelta

from app.models import utcnow


def event(username="alice", ip="10.0.0.1", success=False, **extra):
    return {"username": username, "ip_address": ip, "success": success, **extra}


def test_ingest_event(client):
    r = client.post("/api/events", json=event())
    assert r.status_code == 201
    body = r.json()
    assert body["event"]["username"] == "alice"
    assert body["event"]["timestamp"].endswith("Z")
    assert body["alerts"] == []


def test_ingest_validates_ip(client):
    r = client.post("/api/events", json=event(ip="999.1.1.1"))
    assert r.status_code == 422


def test_api_key_required_when_configured(client, settings):
    settings.api_key = "secret"
    assert client.post("/api/events", json=event()).status_code == 401
    assert client.post("/api/events", json=event(), headers={"X-API-Key": "wrong"}).status_code == 401
    assert client.post("/api/events", json=event(), headers={"X-API-Key": "secret"}).status_code == 201


def test_ingest_returns_alerts_and_list_filters(client):
    for _ in range(5):
        r = client.post("/api/events", json=event())
    assert [a["type"] for a in r.json()["alerts"]] == ["brute_force"]

    alerts = client.get("/api/alerts", params={"type": "brute_force", "status": "open"}).json()
    assert alerts["total"] == 1
    assert client.get("/api/alerts", params={"type": "impossible_travel"}).json()["total"] == 0

    events = client.get("/api/events", params={"username": "alice", "limit": 2}).json()
    assert events["total"] == 5
    assert len(events["items"]) == 2
    assert client.get("/api/events", params={"success": True}).json()["total"] == 0


def test_batch_ingest_sorts_chronologically(client):
    now = utcnow()
    batch = [event(timestamp=(now - timedelta(seconds=i)).isoformat() + "Z") for i in range(5)]
    r = client.post("/api/events/batch", json=batch)
    assert r.status_code == 201
    assert r.json()["ingested"] == 5
    assert len(r.json()["alerts"]) == 1


def test_update_alert_status(client):
    for _ in range(5):
        client.post("/api/events", json=event())
    alert_id = client.get("/api/alerts").json()["items"][0]["id"]
    r = client.patch(f"/api/alerts/{alert_id}", json={"status": "resolved"})
    assert r.status_code == 200
    assert r.json()["status"] == "resolved"
    assert client.patch(f"/api/alerts/{alert_id}", json={"status": "bogus"}).status_code == 422
    assert client.patch("/api/alerts/9999", json={"status": "resolved"}).status_code == 404


def test_resolved_alert_is_not_reused(client):
    for _ in range(5):
        client.post("/api/events", json=event())
    first = client.get("/api/alerts").json()["items"][0]["id"]
    client.patch(f"/api/alerts/{first}", json={"status": "resolved"})
    client.post("/api/events", json=event())
    assert client.get("/api/alerts").json()["total"] == 2


def test_stats(client):
    for _ in range(5):
        client.post("/api/events", json=event())
    client.post("/api/events", json=event(username="bob", ip="10.0.0.2", success=True))
    stats = client.get("/api/stats", params={"range": "1h"}).json()
    assert stats["totals"]["attempts"] == 6
    assert stats["totals"]["failed"] == 5
    assert stats["open_alerts"] == 1
    assert stats["bucket_minutes"] == 5
    assert sum(p["failed"] for p in stats["timeline"]) == 5
    assert stats["top_ips"][0]["ip_address"] == "10.0.0.1"
    assert stats["top_users"][0]["username"] == "alice"
    assert {t["type"]: t["count"] for t in stats["alerts_by_type"]}["brute_force"] == 1
    assert client.get("/api/stats", params={"range": "1y"}).status_code == 422


def test_investigate_user(client):
    now = utcnow()
    riyadh = {"country": "Saudi Arabia", "city": "Riyadh", "latitude": 24.71, "longitude": 46.67}
    london = {"country": "United Kingdom", "city": "London", "latitude": 51.5, "longitude": -0.12}
    client.post("/api/events", json=event(success=True, timestamp=(now - timedelta(minutes=10)).isoformat(), **riyadh))
    client.post("/api/events", json=event(ip="10.0.0.2", success=True, timestamp=now.isoformat(), **london))
    data = client.get("/api/investigate/user/alice").json()
    assert data["summary"]["attempts"] == 2
    assert data["summary"]["risk_score"] == 40
    assert data["distinct_ips"] == 2
    assert data["countries"] == ["Saudi Arabia", "United Kingdom"]
    assert data["locations"][0]["impossible_travel"] is True
    assert data["locations"][1]["impossible_travel"] is False
    assert data["alerts"][0]["type"] == "impossible_travel"


def test_investigate_ip(client):
    for user in ["u1", "u2", "u3"]:
        client.post("/api/events", json=event(username=user, ip="203.0.113.9"))
    data = client.get("/api/investigate/ip/203.0.113.9").json()
    assert data["blocklisted"] is True
    assert data["blocklist_match"] == "203.0.113.0/24"
    assert data["distinct_users"] == 3
    assert data["summary"]["failed"] == 3
    assert client.get("/api/investigate/ip/not-an-ip").status_code == 422


def test_investigate_unknown_entity_is_empty(client):
    data = client.get("/api/investigate/user/nobody").json()
    assert data["summary"]["attempts"] == 0
    assert data["summary"]["first_seen"] is None


def test_dashboard_not_built(client):
    r = client.get("/dashboard/")
    assert r.status_code == 503
    assert "not built" in r.text


def test_dashboard_spa_fallback(client, settings):
    dist = settings.frontend_dist
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html>app</html>")
    (dist / "assets" / "app.js").write_text("console.log(1)")
    assert client.get("/dashboard/").text == "<html>app</html>"
    assert client.get("/dashboard/investigate/ip/1.2.3.4").text == "<html>app</html>"
    assert client.get("/dashboard/assets/app.js").text == "console.log(1)"
    assert client.get("/dashboard/assets/missing.js").status_code == 404
    (settings.frontend_dist.parent / "secret.txt").write_text("secret")
    assert "secret" not in client.get("/dashboard/%2e%2e/secret.txt").text
    assert client.get("/", follow_redirects=False).headers["location"] == "/dashboard/"
