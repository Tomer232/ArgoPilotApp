"""Error responses in RFC 9457 problem+json format."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

PROBLEM_JSON = "application/problem+json"
RETRY_AFTER_SECONDS = 5

# Title for each status we return. Written out because Python 3.12 calls 422
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
    """FastAPI's routing errors: unknown URL (404) or wrong method (405)."""
    if exc.status_code == 404:
        return problem_response(404, "Resource not found", "NOT_FOUND")
    if exc.status_code == 405:
        # No `code`: none of the four codes fits a wrong method (see judgment log).
        # exc.headers carries the `Allow` header listing the methods that do work.
        return problem_response(405, "Method not allowed", headers=exc.headers)
    return problem_response(exc.status_code, str(exc.detail), headers=exc.headers)


def handle_request_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Bad request body or query: list every problem as 'field: message'."""
    messages = []
    for error in exc.errors():
        field = ".".join(str(part) for part in error["loc"][1:])  # drop "body"/"query"
        messages.append(f"{field}: {error['msg']}" if field else error["msg"])
    return problem_response(422, "; ".join(messages), "VALIDATION")


def register_error_handlers(app: FastAPI) -> None:
    """Attach all the handlers above to the app."""
    app.add_exception_handler(ApiError, handle_api_error)
    app.add_exception_handler(HTTPException, handle_http_error)
    app.add_exception_handler(RequestValidationError, handle_request_validation_error)
