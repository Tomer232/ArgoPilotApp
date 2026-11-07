"""Errors shared by every route: unknown URL, wrong method, database down, query parameters."""

import pytest
from fastapi.testclient import TestClient

from helpers import assert_problem
from main import app


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_unknown_url_is_404(client):
    assert_problem(client.get("/v1/nothing-here"), 404, "NOT_FOUND")


def test_docs_pages_are_off(client):
    for url in ["/docs", "/redoc", "/openapi.json"]:
        assert_problem(client.get(url), 404, "NOT_FOUND")


def test_wrong_method_is_405_without_code(client):
    response = client.post("/v1/crops")
    body = assert_problem(response, 405, None)
    assert body["title"] == "Method Not Allowed"
    assert response.headers["allow"] == "GET"


@pytest.mark.parametrize(
    "method, url, allow",
    [
        ("PUT", "/v1/farms", "GET, POST"),
        ("PUT", "/v1/farms/b7e2c0a0-3c1d-4f0a-9a11-0c5d2e6f1001", "DELETE, GET, PATCH"),
        ("PUT", "/v1/plots", "GET, POST"),
        ("PUT", "/v1/plots/c8f3d1b0-4d2e-5a1b-8b22-1d6e3f702002", "DELETE, GET, PATCH"),
        ("DELETE", "/v1/emitters/dripnet-pc-1.0", "GET"),
    ],
)
def test_405_allow_header_lists_every_method(client, method, url, allow):
    response = client.request(method, url)
    assert response.status_code == 405
    assert response.headers["allow"] == allow


def test_422_title_matches_spec(client):
    body = assert_problem(client.post("/v1/farms", json={"name": ""}), 422, "VALIDATION")
    assert body["title"] == "Unprocessable Entity"


def test_unknown_query_parameter_is_422(client):
    assert_problem(client.get("/v1/farms?x=1"), 422, "VALIDATION")
    assert_problem(client.get("/v1/plots?farmid=abc"), 422, "VALIDATION")


# --- Database unreachable -------------------------------------------------


def test_missing_database_is_503_with_retry_after(tmp_path, monkeypatch):
    missing = tmp_path / "missing.db"
    monkeypatch.setenv("REGISTRY_DB_PATH", str(missing))
    response = TestClient(app).get("/v1/farms")
    assert_problem(response, 503, "UNAVAILABLE")
    assert response.headers["retry-after"] == "5"
    assert not missing.exists()  # mode=rw: no empty database was created


def test_corrupt_database_is_503(tmp_path, monkeypatch):
    garbage = tmp_path / "garbage.db"
    garbage.write_text("this is not a database")
    monkeypatch.setenv("REGISTRY_DB_PATH", str(garbage))
    assert_problem(TestClient(app).get("/v1/plots"), 503, "UNAVAILABLE")


def test_database_removed_while_running_is_503(client, db_path):
    assert client.get("/v1/farms").status_code == 200
    db_path.unlink()
    assert_problem(client.get("/v1/farms"), 503, "UNAVAILABLE")
