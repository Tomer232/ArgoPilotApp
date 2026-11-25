"""Errors shared by every route, /health, and the API docs (on in this service, Y13)."""

from helpers import assert_problem


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_unknown_url_is_404(client):
    assert_problem(client.get("/v1/nothing-here"), 404, "NOT_FOUND")


def test_docs_are_on(client):
    """The frontend's prompt reads the API at /docs (Y13)."""
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").json()["info"]["title"] == "AgroPilot planner-service"


def test_wrong_method_is_405_without_code(client):
    response = client.post("/health")
    body = assert_problem(response, 405, None)
    assert body["title"] == "Method Not Allowed"
    assert response.headers["allow"] == "GET"


def test_unknown_query_parameter_is_422(client):
    body = assert_problem(client.get("/health?verbose=1"), 422, "VALIDATION")
    assert body["detail"] == "Unknown query parameter: verbose"


def test_repeated_query_parameter_is_422(client):
    """?days=1&days=2 is ambiguous: 422, not one of them picked silently (QA-6, live QA)."""
    url = "/v1/plots/c8f3d1b0-4d2e-5a1b-8b22-1d6e3f702002/plan?days=1&days=2"
    body = assert_problem(client.get(url), 422, "VALIDATION")
    assert body["detail"] == "Query parameter given more than once: days"


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
