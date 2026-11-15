"""Plots CRUD (FR-1.1) and the plot rules (FR-1.3)."""

import datetime
import json
from zoneinfo import ZoneInfo

import pytest

from helpers import (
    DEMO_FARM,
    EAST_FARM,
    NORTH_BLOCK,
    UNKNOWN_ID,
    assert_problem,
    plot_body,
    today_in_earliest_timezone,
)

PLOT_FIELDS = {
    "id", "farm_id", "name", "area_m2", "crop_id", "planting_date", "soil_id",
    "row_spacing_m", "emitter_spacing_m", "emitter_id", "lat", "lon",
}

# --- Read -----------------------------------------------------------------


def test_list_all_plots(client):
    plots = client.get("/v1/plots").json()
    assert [p["name"] for p in plots] == ["North block", "East block", "West block", "Greenhouse"]
    assert all(set(p) == PLOT_FIELDS for p in plots)


def test_list_plots_of_one_farm(client):
    plots = client.get(f"/v1/plots?farm_id={EAST_FARM}").json()
    assert [p["name"] for p in plots] == ["West block", "Greenhouse"]


def test_filter_accepts_uppercase_farm_id(client):
    assert len(client.get(f"/v1/plots?farm_id={EAST_FARM.upper()}").json()) == 2


def test_filter_unknown_farm_is_empty_list(client):
    response = client.get(f"/v1/plots?farm_id={UNKNOWN_ID}")
    assert response.status_code == 200
    assert response.json() == []


def test_filter_not_a_uuid_is_422(client):
    assert_problem(client.get("/v1/plots?farm_id=abc"), 422, "VALIDATION")


def test_get_plot(client):
    plot = client.get(f"/v1/plots/{NORTH_BLOCK}").json()
    assert plot["name"] == "North block"
    assert plot["planting_date"] == "2026-03-01"


@pytest.mark.parametrize("plot_id", [UNKNOWN_ID, "abc"])
def test_get_unknown_plot_is_404(client, plot_id):
    assert_problem(client.get(f"/v1/plots/{plot_id}"), 404, "NOT_FOUND")


# --- Create ---------------------------------------------------------------


def test_create_plot_returns_body_plus_id(client):
    body = plot_body()
    response = client.post("/v1/plots", json=body)
    assert response.status_code == 201
    plot = response.json()
    assert set(plot) == PLOT_FIELDS
    assert {k: v for k, v in plot.items() if k != "id"} == body
    assert client.get(f"/v1/plots/{plot['id']}").json() == plot


@pytest.mark.parametrize(
    "field, value",
    [
        # FR-1.3: area and spacings must be greater than 0
        ("area_m2", 0),
        ("area_m2", -5),
        ("row_spacing_m", 0),
        ("emitter_spacing_m", 0),
        # FR-1.3: lat from -90 to 90, lon from -180 to 180
        ("lat", 90.1),
        ("lat", -90.1),
        ("lon", 180.1),
        ("lon", -180.1),
        # Date: exactly YYYY-MM-DD and a real date
        ("planting_date", "2026-02-30"),
        ("planting_date", "2026-3-1"),
        ("planting_date", "2026-03-01T00:00:00"),
        ("planting_date", 20260301),
        # Strict types
        ("area_m2", "1000"),
        ("lat", True),
        ("name", 5),
        # Names must not be blank
        ("name", "   "),
        # farm_id must be a UUID
        ("farm_id", "abc"),
    ],
)
def test_create_plot_invalid_field_is_422(client, field, value):
    assert_problem(client.post("/v1/plots", json=plot_body(**{field: value})), 422, "VALIDATION")


def test_create_plot_planting_date_in_future_is_422(client):
    future = today_in_earliest_timezone() + datetime.timedelta(days=1)
    body = plot_body(planting_date=future.isoformat())
    assert_problem(client.post("/v1/plots", json=body), 422, "VALIDATION")


def test_create_plot_planting_date_today_is_ok(client):
    body = plot_body(planting_date=today_in_earliest_timezone().isoformat())
    assert client.post("/v1/plots", json=body).status_code == 201


# --- "Today" follows the client's Time-Zone header --------------------------


def today_in(zone: str) -> datetime.date:
    return datetime.datetime.now(ZoneInfo(zone)).date()


def test_today_in_client_time_zone_is_ok(client):
    body = plot_body(planting_date=today_in("Asia/Jerusalem").isoformat())
    response = client.post("/v1/plots", json=body, headers={"Time-Zone": "Asia/Jerusalem"})
    assert response.status_code == 201


def test_tomorrow_in_client_time_zone_is_422(client):
    tomorrow = today_in("Asia/Jerusalem") + datetime.timedelta(days=1)
    body = plot_body(planting_date=tomorrow.isoformat())
    response = client.post("/v1/plots", json=body, headers={"Time-Zone": "Asia/Jerusalem"})
    problem = assert_problem(response, 422, "VALIDATION")
    assert problem["detail"] == "planting_date: must not be in the future"


def test_same_date_depends_on_client_time_zone(client):
    # Kiritimati (UTC+14) is always a day ahead of Honolulu (UTC-10).
    kiritimati_today = today_in("Pacific/Kiritimati").isoformat()
    body = plot_body(planting_date=kiritimati_today)
    behind = client.post("/v1/plots", json=body, headers={"Time-Zone": "Pacific/Honolulu"})
    assert_problem(behind, 422, "VALIDATION")
    ahead = client.post("/v1/plots", json=body, headers={"Time-Zone": "Pacific/Kiritimati"})
    assert ahead.status_code == 201


@pytest.mark.parametrize("zone", ["Mars/Base", "", "asia/jerusalem", "../../etc/passwd", "America"])
def test_unknown_time_zone_is_422(client, zone):
    response = client.post("/v1/plots", json=plot_body(), headers={"Time-Zone": zone})
    problem = assert_problem(response, 422, "VALIDATION")
    assert problem["detail"] == "Time-Zone: unknown time zone"


def test_patch_planting_date_uses_client_time_zone(client):
    tomorrow = today_in("Asia/Jerusalem") + datetime.timedelta(days=1)
    response = client.patch(
        f"/v1/plots/{NORTH_BLOCK}",
        json={"planting_date": tomorrow.isoformat()},
        headers={"Time-Zone": "Asia/Jerusalem"},
    )
    assert_problem(response, 422, "VALIDATION")


@pytest.mark.parametrize("lat, lon", [(90, -180), (-90, 180)])
def test_create_plot_lat_lon_edges_are_ok(client, lat, lon):
    assert client.post("/v1/plots", json=plot_body(lat=lat, lon=lon)).status_code == 201


@pytest.mark.parametrize("field", sorted(PLOT_FIELDS - {"id"}))
def test_create_plot_missing_field_is_422(client, field):
    body = plot_body()
    del body[field]
    assert_problem(client.post("/v1/plots", json=body), 422, "VALIDATION")


def test_create_plot_unknown_field_is_422(client):
    assert_problem(client.post("/v1/plots", json=plot_body(color="red")), 422, "VALIDATION")


def test_create_plot_infinity_is_422(client):
    # json.dumps writes float("inf") as the bare word Infinity, which Python's JSON reader accepts.
    raw = json.dumps(plot_body(area_m2=float("inf")))
    assert "Infinity" in raw
    response = client.post("/v1/plots", content=raw, headers={"content-type": "application/json"})
    assert_problem(response, 422, "VALIDATION")


@pytest.mark.parametrize(
    "field, value, label",
    [
        ("crop_id", "banana", "crop"),
        ("soil_id", "rock", "soil"),
        ("emitter_id", "dripnet-xyz", "emitter"),
        ("farm_id", UNKNOWN_ID, "farm"),
    ],
)
def test_create_plot_unknown_reference_is_422(client, field, value, label):
    response = client.post("/v1/plots", json=plot_body(**{field: value}))
    body = assert_problem(response, 422, "VALIDATION")
    assert body["detail"] == f"Unknown {label}"


# --- Plot name unique inside one farm -------------------------------------


def test_duplicate_name_on_same_farm_is_409(client):
    assert_problem(client.post("/v1/plots", json=plot_body(name="North block")), 409, "CONFLICT")


def test_duplicate_name_after_trimming_is_409(client):
    assert_problem(client.post("/v1/plots", json=plot_body(name="  North block  ")), 409, "CONFLICT")


def test_same_name_on_other_farm_is_ok(client):
    response = client.post("/v1/plots", json=plot_body(farm_id=EAST_FARM, name="North block"))
    assert response.status_code == 201


def test_name_differing_only_in_case_is_ok(client):
    assert client.post("/v1/plots", json=plot_body(name="north block")).status_code == 201


# --- Update ---------------------------------------------------------------


def test_patch_changes_only_sent_fields(client):
    before = client.get(f"/v1/plots/{NORTH_BLOCK}").json()
    response = client.patch(f"/v1/plots/{NORTH_BLOCK}", json={"area_m2": 1200})
    assert response.status_code == 200
    assert response.json() == {**before, "area_m2": 1200}
    assert client.get(f"/v1/plots/{NORTH_BLOCK}").json() == response.json()


def test_empty_patch_changes_nothing(client):
    before = client.get(f"/v1/plots/{NORTH_BLOCK}").json()
    response = client.patch(f"/v1/plots/{NORTH_BLOCK}", json={})
    assert response.status_code == 200
    assert response.json() == before


@pytest.mark.parametrize(
    "body",
    [{"area_m2": None}, {"area_m2": 0}, {"lat": 91}, {"planting_date": "2026-02-30"}, {"color": "red"}],
)
def test_patch_invalid_is_422(client, body):
    assert_problem(client.patch(f"/v1/plots/{NORTH_BLOCK}", json=body), 422, "VALIDATION")


def test_patch_unknown_emitter_is_422(client):
    response = client.patch(f"/v1/plots/{NORTH_BLOCK}", json={"emitter_id": "nope"})
    assert assert_problem(response, 422, "VALIDATION")["detail"] == "Unknown emitter"


def test_patch_rename_to_taken_name_is_409(client):
    response = client.patch(f"/v1/plots/{NORTH_BLOCK}", json={"name": "East block"})
    assert_problem(response, 409, "CONFLICT")


def test_patch_move_to_other_farm(client):
    response = client.patch(f"/v1/plots/{NORTH_BLOCK}", json={"farm_id": EAST_FARM})
    assert response.status_code == 200
    assert response.json()["farm_id"] == EAST_FARM


def test_patch_move_to_farm_where_name_is_taken_is_409(client):
    client.post("/v1/plots", json=plot_body(farm_id=EAST_FARM, name="North block"))
    response = client.patch(f"/v1/plots/{NORTH_BLOCK}", json={"farm_id": EAST_FARM})
    assert_problem(response, 409, "CONFLICT")


def test_patch_move_to_unknown_farm_is_422(client):
    response = client.patch(f"/v1/plots/{NORTH_BLOCK}", json={"farm_id": UNKNOWN_ID})
    assert_problem(response, 422, "VALIDATION")


def test_patch_unknown_plot_is_404(client):
    assert_problem(client.patch(f"/v1/plots/{UNKNOWN_ID}", json={}), 404, "NOT_FOUND")


# --- Delete ---------------------------------------------------------------


def test_delete_plot(client):
    response = client.delete(f"/v1/plots/{NORTH_BLOCK}")
    assert response.status_code == 204
    assert response.content == b""
    assert_problem(client.get(f"/v1/plots/{NORTH_BLOCK}"), 404, "NOT_FOUND")
    assert len(client.get(f"/v1/plots?farm_id={DEMO_FARM}").json()) == 1


def test_delete_unknown_plot_is_404(client):
    assert_problem(client.delete(f"/v1/plots/{UNKNOWN_ID}"), 404, "NOT_FOUND")
