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


DAYS_FETCHED = 8


def provider_body() -> dict:
    """A valid Open-Meteo answer for 8 days, shaped like the real one (see the README).
    Tests change one part of it to break it."""
    return {
        "latitude": 31.25,
        "longitude": 34.75,
        "utc_offset_seconds": 7200,
        "timezone": "Asia/Jerusalem",
        "daily_units": {
            "time": "iso8601",
            "et0_fao_evapotranspiration": "mm",
            "precipitation_sum": "mm",
        },
        "daily": {
            "time": [f"2026-11-{day}" for day in range(16, 24)],
            "et0_fao_evapotranspiration": [2.78, 2.64, 2.47, 3.0, 3.11, 3.09, 2.29, 2.34],
            "precipitation_sum": [0.0, 0.0, 0.0, 4.2, 0.0, 0.0, 0.3, 0.15],
        },
    }
