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
