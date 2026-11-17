"""planner-service: wires the app together (routes, error handlers, /health)."""

from fastapi import Depends, FastAPI, Request

import plan
from errors import ValidationFailedError, register_error_handlers

# Query parameters each route accepts, by the route's path template. Anything else
# is a 422, so a typo like ?day= fails loudly instead of quietly giving 7 days.
ALLOWED_QUERY_PARAMS = {"/v1/plots/{plot_id}/plan": {"days", "start_pct", "trigger_pct"}}


def reject_unknown_query_params(request: Request) -> None:
    """Runs before every route: 422 on any query parameter the route does not accept."""
    route = request.scope.get("route")
    allowed = ALLOWED_QUERY_PARAMS.get(getattr(route, "path", ""), set())
    unknown = set(request.query_params) - allowed
    if unknown:
        raise ValidationFailedError(f"Unknown query parameter: {', '.join(sorted(unknown))}")


# /docs and /openapi.json are on: the frontend's prompt reads the API there (Y13).
app = FastAPI(
    title="AgroPilot planner-service",
    version="0.1.0",
    description="A daily drip-irrigation plan per plot, from registry-service and weather-service (FAO-56).",
    dependencies=[Depends(reject_unknown_query_params)],
)
register_error_handlers(app)
app.include_router(plan.router)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check for the frontend's status line."""
    return {"status": "ok"}
