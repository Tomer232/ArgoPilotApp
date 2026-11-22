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
