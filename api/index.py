from sentinelpay.backend.main import app as fastapi_app


async def app(scope, receive, send):
    """Expose the existing FastAPI routes under Vercel's /api function path."""
    if scope.get("type") == "http" and scope.get("path", "").startswith("/api"):
        scope = dict(scope)
        path = scope["path"][4:] or "/"
        scope["path"] = path
        raw_path = scope.get("raw_path")
        if raw_path is not None:
            scope["raw_path"] = raw_path[4:] or b"/"
    await fastapi_app(scope, receive, send)
