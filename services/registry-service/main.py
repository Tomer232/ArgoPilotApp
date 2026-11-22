from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.responses import FileResponse
from sqlalchemy import text

import catalogues
import farms
import plots
from db import connect
from errors import ValidationFailedError, register_error_handlers

# Query parameters each URL accepts. Anything else is a 422, so a typo like
# ?farmid= fails loudly instead of quietly returning every plot.
ALLOWED_QUERY_PARAMS = {"/v1/plots": {"farm_id"}}


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


# /docs and /openapi.json are on: the frontend's prompt reads the API there (Y13, replaces O14).
app = FastAPI(
    title="AgroPilot registry-service",
    version="0.1.0",
    dependencies=[Depends(reject_unknown_query_params)],
)
register_error_handlers(app)
app.include_router(catalogues.router)
app.include_router(farms.router)
app.include_router(plots.router)


@app.get("/health")
def health() -> dict[str, str]:
    """Up means the API answers and the database runs a query. Database down: 503 (QA-2, live QA)."""
    with connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}


UI_FILE = Path(__file__).parent / "ui" / "index.html"


@app.get("/ui", include_in_schema=False)
def ui() -> FileResponse:
    """The demo dashboard: one static HTML page that calls the API above."""
    return FileResponse(UI_FILE)
