"""Seed ids, a valid plot body, and a check for problem+json errors."""

import datetime

# Ids from seed_registry.sh
DEMO_FARM = "b7e2c0a0-3c1d-4f0a-9a11-0c5d2e6f1001"  # North block, East block
EAST_FARM = "a9c1e4b2-6f70-4d8e-a144-3f8b5c904004"  # West block, Greenhouse
NORTH_BLOCK = "c8f3d1b0-4d2e-5a1b-8b22-1d6e3f702002"
UNKNOWN_ID = "00000000-0000-0000-0000-000000000000"


def plot_body(**changes) -> dict:
    """The spec's example POST /v1/plots body, with any fields replaced."""
    body = {
        "farm_id": DEMO_FARM,
        "name": "South block",
        "area_m2": 1000,
        "crop_id": "tomato",
        "planting_date": "2026-03-01",
        "soil_id": "loam",
        "row_spacing_m": 1.5,
        "emitter_spacing_m": 0.4,
        "emitter_id": "dripnet-pc-1.0",
        "lat": 31.25,
        "lon": 34.79,
    }
    body.update(changes)
    return body


def today_in_earliest_timezone() -> datetime.date:
    """Today's date in UTC+14, the last date the API accepts as 'not in the future'."""
    return datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=14))).date()


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
