from fastapi import FastAPI

import catalogues
import farms
from errors import register_error_handlers

# /docs, /redoc and /openapi.json are off: the task does not list them.
app = FastAPI(
    title="AgroPilot registry-service",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
register_error_handlers(app)
app.include_router(catalogues.router)
app.include_router(farms.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
