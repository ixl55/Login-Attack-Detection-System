#!/usr/bin/env python3
"""Generate realistic login traffic plus one scenario per attack type and send it to the API.

    python scripts/simulate_attacks.py                 # 24h of history + attacks, sent as one batch
    python scripts/simulate_attacks.py --live 120      # then keep streaming traffic for 2 minutes

Uses only the standard library so it can run anywhere.
"""

import argparse
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

CITIES = {
    "Riyadh": ("Saudi Arabia", 24.7136, 46.6753),
    "Jeddah": ("Saudi Arabia", 21.4858, 39.1925),
    "Dammam": ("Saudi Arabia", 26.4207, 50.0888),
    "Dubai": ("United Arab Emirates", 25.2048, 55.2708),
    "Cairo": ("Egypt", 30.0444, 31.2357),
    "Amman": ("Jordan", 31.9454, 35.9284),
    "London": ("United Kingdom", 51.5072, -0.1276),
    "New York": ("United States", 40.7128, -74.0060),
    "Moscow": ("Russia", 55.7558, 37.6173),
    "Sao Paulo": ("Brazil", -23.5505, -46.6333),
}

USERS = {
    "ahmed": "Riyadh", "sara": "Riyadh", "omar": "Riyadh", "fatima": "Jeddah", "khalid": "Jeddah",
    "noura": "Dammam", "yousef": "Dubai", "lina": "Jeddah", "hassan": "Cairo", "mariam": "Amman",
    "ali": "Riyadh", "reem": "Dubai", "admin": "Riyadh", "faisal": "Dammam", "huda": "Cairo",
    "majed": "Riyadh", "salma": "Jeddah", "tariq": "Amman", "dana": "Dubai", "ziad": "Riyadh",
}

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36",
]
ATTACK_AGENTS = ["python-requests/2.31.0", "curl/8.4.0", "Hydra v9.5", "Go-http-client/1.1"]
APPS = ["web-portal", "mobile-app", "admin-panel"]

rng = random.Random(42)
# Each user has a stable "home" IP so normal traffic never looks like spraying.
HOME_IPS = {u: f"{rng.randint(80, 95)}.{rng.randint(0, 255)}.{rng.randint(0, 255)}.{rng.randint(2, 250)}" for u in USERS}


def iso(ts: datetime) -> str:
    return ts.astimezone(timezone.utc).isoformat()


def event(username, ip, success, ts, city=None, agent=None, app=None):
    e = {
        "username": username,
        "ip_address": ip,
        "success": success,
        "timestamp": iso(ts),
        "user_agent": agent or rng.choice(USER_AGENTS),
        "source_app": app or rng.choice(APPS[:2]),
    }
    if city:
        country, lat, lon = CITIES[city]
        e.update(country=country, city=city, latitude=lat, longitude=lon)
    return e


def normal_traffic(now: datetime, hours: float) -> list[dict]:
    events = []
    for user, city in USERS.items():
        for _ in range(rng.randint(3, 8)):
            ts = now - timedelta(hours=rng.uniform(0.05, hours))
            if rng.random() < 0.15:  # a typo followed by a successful retry
                events.append(event(user, HOME_IPS[user], False, ts, city))
                ts += timedelta(seconds=rng.randint(5, 30))
            events.append(event(user, HOME_IPS[user], True, ts, city))
    return events


def attacks(now: datetime) -> list[dict]:
    ev = []
    t = now - timedelta(minutes=45)

    # 1) Brute force against "admin" that eventually succeeds -> critical
    ip = "45.155.205.10"
    for i in range(12):
        ev.append(event("admin", ip, False, t + timedelta(seconds=i * 12), "Moscow", "Hydra v9.5", "admin-panel"))
    ev.append(event("admin", ip, True, t + timedelta(seconds=160), "Moscow", "Hydra v9.5", "admin-panel"))

    # 2) Brute force against "sara" from two IPs -> high
    t = now - timedelta(minutes=30)
    for i in range(7):
        ev.append(event("sara", f"91.92.109.{40 + i % 2}", False, t + timedelta(seconds=i * 20), "Sao Paulo",
                        "python-requests/2.31.0"))

    # 3) Password spraying / credential stuffing from one IP, one account falls -> critical
    t = now - timedelta(minutes=25)
    ip = "185.220.101.45"
    victims = [u for u in USERS if u != "admin"]
    for i, user in enumerate(victims[:15]):
        ev.append(event(user, ip, False, t + timedelta(seconds=i * 15), "Moscow", "Go-http-client/1.1"))
    ev.append(event("ziad", ip, True, t + timedelta(seconds=240), "Moscow", "Go-http-client/1.1"))

    # 4) A second, unsuccessful spray -> high
    t = now - timedelta(minutes=12)
    for i, user in enumerate(["root", "test", "guest", "support", "info", "user", "administrator"]):
        ev.append(event(user, "91.240.118.172", False, t + timedelta(seconds=i * 8), "Sao Paulo", "curl/8.4.0"))

    # 5) Impossible travel: Riyadh -> London in 10 minutes, Jeddah -> New York in 30 minutes
    t = now - timedelta(minutes=20)
    ev.append(event("omar", HOME_IPS["omar"], True, t, "Riyadh"))
    ev.append(event("omar", "81.2.69.160", True, t + timedelta(minutes=10), "London"))
    t = now - timedelta(minutes=50)
    ev.append(event("lina", HOME_IPS["lina"], True, t, "Jeddah"))
    ev.append(event("lina", "72.229.28.185", True, t + timedelta(minutes=30), "New York"))

    # 6) Blocklisted IPs (see data/ip_blocklist.txt): one failing, one successful
    t = now - timedelta(minutes=8)
    for i in range(3):
        ev.append(event("khalid", "203.0.113.50", False, t + timedelta(seconds=i * 40), agent="curl/8.4.0"))
    ev.append(event("noura", "198.51.100.66", True, now - timedelta(minutes=5)))
    return ev


def post(url: str, path: str, payload, api_key: str | None):
    req = urllib.request.Request(
        url.rstrip("/") + path,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", **({"X-API-Key": api_key} if api_key else {})},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def live(url: str, api_key: str | None, seconds: int) -> None:
    print(f"Streaming live traffic for {seconds}s (Ctrl+C to stop)...")
    end = time.time() + seconds
    burst_ip = None
    try:
        while time.time() < end:
            now = datetime.now(timezone.utc)
            user = rng.choice(list(USERS))
            if rng.random() < 0.25:
                burst_ip = burst_ip or f"193.{rng.randint(0, 255)}.{rng.randint(0, 255)}.{rng.randint(2, 250)}"
                e = event(rng.choice(list(USERS)), burst_ip, False, now, "Moscow", rng.choice(ATTACK_AGENTS))
            else:
                if rng.random() < 0.05:
                    burst_ip = None  # attacker rotates IP
                e = event(user, HOME_IPS[user], rng.random() > 0.1, now, USERS[user])
            result = post(url, "/api/events", e, api_key)
            for a in result["alerts"]:
                print(f"  [{a['severity']:>8}] {a['type']}: {a['description']}")
            time.sleep(rng.uniform(0.3, 1.5))
    except KeyboardInterrupt:
        pass


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--url", default=os.environ.get("LADS_URL", "http://localhost:8000"))
    p.add_argument("--api-key", default=os.environ.get("LADS_API_KEY"))
    p.add_argument("--hours", type=float, default=24, help="hours of normal history to generate")
    p.add_argument("--live", type=int, default=0, metavar="SECONDS", help="keep streaming traffic afterwards")
    p.add_argument("--no-attacks", action="store_true", help="only generate normal traffic")
    args = p.parse_args()

    now = datetime.now(timezone.utc)
    events = normal_traffic(now, args.hours)
    if not args.no_attacks:
        events += attacks(now)
    try:
        result = post(args.url, "/api/events/batch", events, args.api_key)
    except urllib.error.URLError as exc:
        print(f"Could not reach {args.url}: {exc}", file=sys.stderr)
        return 1

    print(f"Ingested {result['ingested']} events, {len(result['alerts'])} alerts raised/updated:")
    for a in sorted(result["alerts"], key=lambda a: a["first_seen"]):
        print(f"  [{a['severity']:>8}] {a['type']}: {a['description']}")
    if args.live:
        live(args.url, args.api_key, args.live)
    return 0


if __name__ == "__main__":
    sys.exit(main())
