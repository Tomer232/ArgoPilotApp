"""Error responses in RFC 9457 problem+json format."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException
from starlette.routing import Match

PROBLEM_JSON = "application/problem+json"
RETRY_AFTER_SECONDS = 5

logger = logging.getLogger("registry")

# Title for each status we return. Written out because Python 3.13+ calls 422
# "Unprocessable Content", while the spec's example says "Unprocessable Entity".
TITLES = {
    404: "Not Found",
    405: "Method Not Allowed",
    409: "Conflict",
    422: "Unprocessable Entity",
    503: "Service Unavailable",
}


def problem_response(
    status: int,
    detail: str,
    code: str | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    """Build one problem+json response. `code` is left out when None (used for 405)."""
    body = {
        "type": "about:blank",
        "title": TITLES.get(status, "Error"),
        "status": status,
        "detail": detail,
    }
    if code is not None:
        body["code"] = code
    return JSONResponse(body, status_code=status, media_type=PROBLEM_JSON, headers=headers)


# --- Errors our own code raises -------------------------------------------


class ApiError(Exception):
    """Base class: each subclass fixes its HTTP status and stable `code`."""

    status = 500
    code = ""

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


class ValidationFailedError(ApiError):
    status = 422
    code = "VALIDATION"


class NotFoundError(ApiError):
    status = 404
    code = "NOT_FOUND"


class ConflictError(ApiError):
    status = 409
    code = "CONFLICT"


class UnavailableError(ApiError):
    status = 503
    code = "UNAVAILABLE"


# --- Handlers: turn every error into problem+json -------------------------


def handle_api_error(request: Request, exc: ApiError) -> JSONResponse:
    """Our own errors. A 503 also tells the client when to retry."""
    headers = None
    if exc.status == 503:
        headers = {"Retry-After": str(RETRY_AFTER_SECONDS)}
    return problem_response(exc.status, exc.detail, exc.code, headers)


def handle_http_error(request: Request, exc: HTTPException) -> JSONResponse:
    """FastAPI's own errors: unknown URL (404), wrong method (405), unreadable body (400)."""
    if exc.status_code == 400:
        # FastAPI's 400 for a body it can't decode (invalid UTF-8, JSON nested too deep).
        # Same answer as any other bad body.
        return problem_response(422, "body: could not be read as JSON", "VALIDATION")
    if exc.status_code == 404:
        return problem_response(404, "Resource not found", "NOT_FOUND")
    if exc.status_code == 405:
        # No `code`: none of the four codes fits a wrong method (see judgment log).
        return problem_response(405, "Method not allowed", headers={"Allow": allowed_methods(request)})
    return problem_response(exc.status_code, str(exc.detail), headers=exc.headers)


HTTP_METHODS = ["DELETE", "GET", "PATCH", "POST", "PUT"]


def allowed_methods(request: Request) -> str:
    """Every method this URL accepts, e.g. "GET, POST" for /v1/farms.
    FastAPI makes one route per method, and Starlette's own Allow header lists just one
    of them. So ask the routes, method by method, which ones they would handle."""
    allowed = []
    for method in HTTP_METHODS:
        scope = {**request.scope, "method": method}
        if any(route.matches(scope)[0] == Match.FULL for route in request.app.routes):
            allowed.append(method)
    return ", ".join(allowed)


def handle_request_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Bad request body or query: list every problem as 'field: message'."""
    messages = []
    for error in exc.errors():
        # loc is e.g. ("body", "area_m2"): drop "body", unless the whole body is the problem.
        loc = error["loc"][1:] or error["loc"]
        field = ".".join(str(part) for part in loc)
        messages.append(f"{field}: {error['msg']}")
    return problem_response(422, "; ".join(messages), "VALIDATION")


def handle_stored_data_error(request: Request, exc: ResponseValidationError) -> JSONResponse:
    """A row in the database doesn't fit the API's shape (e.g. text in a number column,
    written by another program). The data is broken, so like a corrupt file: 503."""
    logger.error("Stored data does not match the API: %s", exc.errors())
    return handle_api_error(request, UnavailableError("Stored data is invalid"))


def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    """Last resort for any crash we didn't foresee: still problem+json, never plain text.
    The server still logs the full traceback."""
    return handle_api_error(request, UnavailableError("Unexpected server error"))


def register_error_handlers(app: FastAPI) -> None:
    """Attach all the handlers above to the app."""
    app.add_exception_handler(ApiError, handle_api_error)
    app.add_exception_handler(HTTPException, handle_http_error)
    app.add_exception_handler(RequestValidationError, handle_request_validation_error)
    app.add_exception_handler(ResponseValidationError, handle_stored_data_error)
    app.add_exception_handler(Exception, handle_unexpected_error)
