"""Serves the built React dashboard (frontend/dist) under /dashboard, with an SPA fallback."""

from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse

from app.config import Settings, get_settings

router = APIRouter(include_in_schema=False)

NOT_BUILT_HTML = """<!doctype html><meta charset="utf-8"><title>LADS</title>
<body style="font-family:system-ui;background:#0b1120;color:#e2e8f0;padding:3rem">
<h1>Dashboard not built yet</h1>
<p>Run <code>cd frontend &amp;&amp; npm install &amp;&amp; npm run build</code>, then reload.</p>
<p>The API is available at <a style="color:#22d3ee" href="/docs">/docs</a>.</p></body>"""


@router.get("/")
def root():
    return RedirectResponse("/dashboard/")


@router.get("/dashboard")
@router.get("/dashboard/{path:path}")
def dashboard(path: str = "", settings: Settings = Depends(get_settings)):
    dist: Path = settings.frontend_dist.resolve()
    index = dist / "index.html"
    if not index.exists():
        return HTMLResponse(NOT_BUILT_HTML, status_code=503)
    if path:
        candidate = (dist / path).resolve()
        if candidate.is_file() and candidate.is_relative_to(dist):
            return FileResponse(candidate)
        if path.startswith("assets/"):
            return HTMLResponse("Not found", status_code=404)
    # Client-side routes (e.g. /dashboard/investigate/ip/1.2.3.4) all load the SPA shell.
    return FileResponse(index, headers={"Cache-Control": "no-cache"})
