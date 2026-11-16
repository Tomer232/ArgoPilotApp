"""Small helpers shared by the tests."""

# Settings every test run uses, so tests never need a .env. Nothing here reaches the
# real provider: tests that fetch replace the provider call.
TEST_SETTINGS = {
    "PROVIDER_BASE_URL": "https://provider.test/v1/forecast",
    "PROVIDER_API_KEY": "",
    "PROVIDER_TIMEOUT_SECONDS": "3",
    "PROVIDER_RETRIES": "2",
    "PROVIDER_RETRY_PAUSE_SECONDS": "0",
    "FRESH_HOURS": "3",
    "MAX_STALE_HOURS": "24",
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
