"""Errors shared by every route: unknown URL, wrong method, docs off, unknown query parameters."""

from helpers import assert_problem


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_unknown_url_is_404(client):
    assert_problem(client.get("/v1/nothing-here"), 404, "NOT_FOUND")


def test_docs_pages_are_off(client):
    for url in ["/docs", "/redoc", "/openapi.json"]:
        assert_problem(client.get(url), 404, "NOT_FOUND")


def test_wrong_method_is_405_without_code(client):
    response = client.post("/health")
    body = assert_problem(response, 405, None)
    assert body["title"] == "Method Not Allowed"
    assert response.headers["allow"] == "GET"


def test_unknown_query_parameter_is_422(client):
    body = assert_problem(client.get("/health?verbose=1"), 422, "VALIDATION")
    assert body["detail"] == "Unknown query parameter: verbose"


def test_repeated_query_parameter_is_422(client):
    """A point given twice is ambiguous: 422, not one of them picked silently (QA-6, live QA)."""
    body = assert_problem(client.get("/v1/forecast?lat=31&lat=32&lon=34&days=1"), 422, "VALIDATION")
    assert body["detail"] == "Query parameter given more than once: lat"


def test_other_http_errors_keep_their_status_and_headers():
    """errors.handle_http_error: a status with no special rule (here 401) is passed on as problem+json."""
    from fastapi import HTTPException

    from errors import handle_http_error

    exc = HTTPException(status_code=401, detail="Not allowed", headers={"WWW-Authenticate": "Basic"})
    response = handle_http_error(None, exc)  # the request is not used for this status
    assert response.status_code == 401
    assert response.headers["content-type"] == "application/problem+json"
    assert response.headers["www-authenticate"] == "Basic"
    assert b"Not allowed" in response.body


def test_unexpected_error_is_a_503_problem():
    """errors.handle_unexpected_error: any crash becomes a 503 problem+json with Retry-After."""
    from errors import handle_unexpected_error

    response = handle_unexpected_error(None, RuntimeError("boom"))
    assert response.status_code == 503
    assert response.headers["content-type"] == "application/problem+json"
    assert response.headers["retry-after"] == "5"
    assert b"Unexpected server error" in response.body
