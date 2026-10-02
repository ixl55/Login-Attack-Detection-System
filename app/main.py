import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import alerts, events, investigate, stats
from app.database import Base, engine
from app import frontend


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


def create_app() -> FastAPI:
    logging.basicConfig(level=logging.INFO)
    app = FastAPI(
        title="Login Attack Detection System",
        description="Ingests login attempts and detects brute force, password spraying, "
        "impossible travel and blocklisted IPs.",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.include_router(events.router)
    app.include_router(alerts.router)
    app.include_router(stats.router)
    app.include_router(investigate.router)

    @app.get("/api/health", tags=["health"])
    def health():
        return {"status": "ok"}

    app.include_router(frontend.router)
    return app


app = create_app()
