"""Small helpers shared by the tests."""

# Settings every test run uses, so tests never need a .env. No test reaches a real
# service: tests that call upstream replace the HTTP clients.
TEST_SETTINGS = {
    "REGISTRY_URL": "http://registry.test",
    "WEATHER_URL": "http://weather.test",
    "REGISTRY_TIMEOUT_SECONDS": "2",
    "WEATHER_TIMEOUT_SECONDS": "12",
}


def assert_problem(response, status: int, code: str | None) -> dict:
    """Check an error is RFC 9457 problem+json with the right status and code. Returns the body."""
    assert response.status_code == status
    assert response.headers["content-type"] == "application/problem+json"
    body = response.json()
    assert body["type"] == "about:blank"
    assert body["status"] == status
    assert body["title"]
    assert body["detail"]
    if code is None:
        assert "code" not in body
    else:
        assert body["code"] == code
    return body
