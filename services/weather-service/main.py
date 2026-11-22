"""weather-service: wires the app together (routes, error handlers, /health)."""

from fastapi import Depends, FastAPI, Request

import forecast
from errors import ValidationFailedError, register_error_handlers

# Query parameters each URL accepts. Anything else is a 422, so a typo like
# ?latitude= fails loudly instead of being ignored.
ALLOWED_QUERY_PARAMS = {"/v1/forecast": {"lat", "lon", "days"}}


def reject_unknown_query_params(request: Request) -> None:
    """Runs before every route: 422 on any query parameter the URL does not accept, or one given twice."""
    allowed = ALLOWED_QUERY_PARAMS.get(request.url.path, set())
    unknown = set(request.query_params) - allowed
    if unknown:
        raise ValidationFailedError(f"Unknown query parameter: {', '.join(sorted(unknown))}")
    names = [name for name, _ in request.query_params.multi_items()]
    repeated = sorted({name for name in names if names.count(name) > 1})
    if repeated:
        raise ValidationFailedError(f"Query parameter given more than once: {', '.join(repeated)}")


# /docs, /redoc and /openapi.json are off: the task does not list them (O75).
app = FastAPI(
    title="AgroPilot weather-service",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    dependencies=[Depends(reject_unknown_query_params)],
)
register_error_handlers(app)
app.include_router(forecast.router)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check for the frontend's status line."""
    return {"status": "ok"}
