import ipaddress

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.analytics import RANGES, build_timeline, entity_summary, failed_sum
from app.config import Settings, get_settings
from app.database import get_db
from app.detection.impossible_travel import travel_speed_kmh
from app.detection.ip_reputation import get_blocklist
from app.geo import haversine_km
from app.models import Alert, LoginEvent, utcnow
from app.schemas import (
    IpInvestigation,
    IpUsage,
    LocationPoint,
    StatsRange,
    UserInvestigation,
    UsernameUsage,
)

router = APIRouter(prefix="/api/investigate", tags=["investigation"])

MAX_ALERTS = 100
MAX_LOCATIONS = 200


def _timeline(db: Session, condition, range: StatsRange):
    span, bucket_minutes = RANGES[range]
    now = utcnow()
    rows = db.execute(
        select(LoginEvent.timestamp, LoginEvent.success).where(condition, LoginEvent.timestamp >= now - span)
    ).all()
    return build_timeline(rows, now - span, now, bucket_minutes), bucket_minutes


def _locations(db: Session, username: str, settings: Settings) -> list[LocationPoint]:
    events = db.scalars(
        select(LoginEvent)
        .where(LoginEvent.username == username, LoginEvent.latitude.is_not(None), LoginEvent.longitude.is_not(None))
        .order_by(LoginEvent.timestamp.desc(), LoginEvent.id.desc())
        .limit(MAX_LOCATIONS)
    ).all()
    points: list[LocationPoint] = []
    previous_ok: LoginEvent | None = None
    # Walk chronologically so each successful login is compared with the previous successful one.
    for e in reversed(events):
        point = LocationPoint(
            timestamp=e.timestamp, ip_address=e.ip_address, country=e.country, city=e.city,
            latitude=e.latitude, longitude=e.longitude, success=e.success,
        )
        if e.success:
            if previous_ok is not None:
                distance = haversine_km(previous_ok.latitude, previous_ok.longitude, e.latitude, e.longitude)
                hours = (e.timestamp - previous_ok.timestamp).total_seconds() / 3600
                speed = travel_speed_kmh(distance, hours)
                point.distance_km = round(distance, 1)
                point.speed_kmh = round(speed, 1) if speed is not None else None
                point.impossible_travel = distance >= settings.impossible_travel_min_distance_km and (
                    speed is None or speed > settings.impossible_travel_speed_kmh
                ) and hours <= settings.impossible_travel_lookback_hours
            previous_ok = e
        points.append(point)
    points.reverse()
    return points


@router.get("/user/{username}", response_model=UserInvestigation)
def investigate_user(
    username: str,
    range: StatsRange = "7d",
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    condition = LoginEvent.username == username
    alerts = db.scalars(
        select(Alert).where(Alert.username == username).order_by(Alert.last_seen.desc()).limit(MAX_ALERTS)
    ).all()
    ip_rows = db.execute(
        select(LoginEvent.ip_address, func.count(), failed_sum, func.max(LoginEvent.country))
        .where(condition)
        .group_by(LoginEvent.ip_address)
        .order_by(func.count().desc())
        .limit(50)
    ).all()
    countries = db.scalars(
        select(LoginEvent.country).where(condition, LoginEvent.country.is_not(None)).distinct()
    ).all()
    timeline, bucket_minutes = _timeline(db, condition, range)
    return UserInvestigation(
        username=username,
        summary=entity_summary(db, condition, alerts),
        distinct_ips=db.scalar(select(func.count(func.distinct(LoginEvent.ip_address))).where(condition)),
        countries=sorted(countries),
        timeline=timeline,
        bucket_minutes=bucket_minutes,
        locations=_locations(db, username, settings),
        ips=[
            IpUsage(ip_address=ip, attempts=a, failed=f or 0, successful=a - (f or 0), country=c)
            for ip, a, f, c in ip_rows
        ],
        alerts=alerts,
    )


@router.get("/ip/{ip}", response_model=IpInvestigation)
def investigate_ip(
    ip: str,
    range: StatsRange = "7d",
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    try:
        ip = str(ipaddress.ip_address(ip))
    except ValueError:
        raise HTTPException(422, "Invalid IP address")

    condition = LoginEvent.ip_address == ip
    alerts = db.scalars(
        select(Alert).where(Alert.ip_address == ip).order_by(Alert.last_seen.desc()).limit(MAX_ALERTS)
    ).all()
    user_rows = db.execute(
        select(LoginEvent.username, func.count(), failed_sum)
        .where(condition)
        .group_by(LoginEvent.username)
        .order_by(func.count().desc())
        .limit(100)
    ).all()
    located = db.execute(
        select(LoginEvent.country, LoginEvent.city)
        .where(condition, LoginEvent.country.is_not(None))
        .order_by(LoginEvent.timestamp.desc())
        .limit(1)
    ).first()
    match = get_blocklist(settings.blocklist_path).match(ip)
    timeline, bucket_minutes = _timeline(db, condition, range)
    return IpInvestigation(
        ip_address=ip,
        summary=entity_summary(db, condition, alerts),
        distinct_users=db.scalar(select(func.count(func.distinct(LoginEvent.username))).where(condition)),
        country=located.country if located else None,
        city=located.city if located else None,
        blocklisted=match is not None,
        blocklist_match=match,
        timeline=timeline,
        bucket_minutes=bucket_minutes,
        usernames=[
            UsernameUsage(username=u, attempts=a, failed=f or 0, successful=a - (f or 0)) for u, a, f in user_rows
        ],
        alerts=alerts,
    )
