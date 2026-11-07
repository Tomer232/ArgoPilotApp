from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.responses import FileResponse

import catalogues
import farms
import plots
from errors import ValidationFailedError, register_error_handlers

# Query parameters each URL accepts. Anything else is a 422, so a typo like
# ?farmid= fails loudly instead of quietly returning every plot.
ALLOWED_QUERY_PARAMS = {"/v1/plots": {"farm_id"}}


def reject_unknown_query_params(request: Request) -> None:
    """Runs before every route: 422 on any query parameter the URL does not accept."""
    allowed = ALLOWED_QUERY_PARAMS.get(request.url.path, set())
    unknown = set(request.query_params) - allowed
    if unknown:
        raise ValidationFailedError(f"Unknown query parameter: {', '.join(sorted(unknown))}")


# /docs, /redoc and /openapi.json are off: the task does not list them.
app = FastAPI(
    title="AgroPilot registry-service",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    dependencies=[Depends(reject_unknown_query_params)],
)
register_error_handlers(app)
app.include_router(catalogues.router)
app.include_router(farms.router)
app.include_router(plots.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


UI_FILE = Path(__file__).parent / "ui" / "index.html"


@app.get("/ui", include_in_schema=False)
def ui() -> FileResponse:
    """The demo dashboard: one static HTML page that calls the API above."""
    return FileResponse(UI_FILE)
