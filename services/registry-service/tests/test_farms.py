"""Farms CRUD (FR-1.1)."""

import pytest

from helpers import DEMO_FARM, EAST_FARM, UNKNOWN_ID, assert_problem

# --- Read -----------------------------------------------------------------


def test_list_seed_farms(client):
    response = client.get("/v1/farms")
    assert response.status_code == 200
    assert response.json() == [
        {"id": DEMO_FARM, "name": "Demo cooperative"},
        {"id": EAST_FARM, "name": "East farm"},
    ]


def test_get_farm(client):
    response = client.get(f"/v1/farms/{DEMO_FARM}")
    assert response.status_code == 200
    assert response.json() == {"id": DEMO_FARM, "name": "Demo cooperative"}


def test_get_farm_uppercase_id(client):
    assert client.get(f"/v1/farms/{DEMO_FARM.upper()}").status_code == 200


@pytest.mark.parametrize("farm_id", [UNKNOWN_ID, "abc"])
def test_get_unknown_farm_is_404(client, farm_id):
    assert_problem(client.get(f"/v1/farms/{farm_id}"), 404, "NOT_FOUND")


# --- Create ---------------------------------------------------------------


def test_create_farm(client):
    response = client.post("/v1/farms", json={"name": "  Kibbutz  "})
    assert response.status_code == 201
    farm = response.json()
    assert set(farm) == {"id", "name"}
    assert farm["name"] == "Kibbutz"  # trimmed
    assert client.get(f"/v1/farms/{farm['id']}").json() == farm


def test_duplicate_farm_names_are_allowed(client):
    assert client.post("/v1/farms", json={"name": "East farm"}).status_code == 201


@pytest.mark.parametrize(
    "body",
    [
        {"name": ""},
        {"name": "   "},
        {"name": 5},
        {"name": None},
        {},
        {"name": "X", "owner": "bob"},  # unknown field
        {"name": "X", "id": UNKNOWN_ID},  # clients can't choose ids
    ],
)
def test_create_farm_invalid_is_422(client, body):
    assert_problem(client.post("/v1/farms", json=body), 422, "VALIDATION")


def test_create_farm_without_body_is_422(client):
    assert_problem(client.post("/v1/farms"), 422, "VALIDATION")


# --- Update ---------------------------------------------------------------


def test_rename_farm(client):
    response = client.patch(f"/v1/farms/{DEMO_FARM}", json={"name": "Renamed"})
    assert response.status_code == 200
    assert response.json() == {"id": DEMO_FARM, "name": "Renamed"}
    assert client.get(f"/v1/farms/{DEMO_FARM}").json()["name"] == "Renamed"


def test_empty_patch_changes_nothing(client):
    response = client.patch(f"/v1/farms/{DEMO_FARM}", json={})
    assert response.status_code == 200
    assert response.json() == {"id": DEMO_FARM, "name": "Demo cooperative"}


@pytest.mark.parametrize("body", [{"name": None}, {"name": "  "}, {"name": 5}, {"color": "red"}])
def test_patch_farm_invalid_is_422(client, body):
    assert_problem(client.patch(f"/v1/farms/{DEMO_FARM}", json=body), 422, "VALIDATION")


def test_patch_unknown_farm_is_404(client):
    assert_problem(client.patch(f"/v1/farms/{UNKNOWN_ID}", json={"name": "X"}), 404, "NOT_FOUND")


# --- Delete ---------------------------------------------------------------


def test_delete_empty_farm(client):
    farm = client.post("/v1/farms", json={"name": "Temp"}).json()
    response = client.delete(f"/v1/farms/{farm['id']}")
    assert response.status_code == 204
    assert response.content == b""
    assert_problem(client.get(f"/v1/farms/{farm['id']}"), 404, "NOT_FOUND")


def test_delete_farm_with_plots_is_409(client):
    assert_problem(client.delete(f"/v1/farms/{DEMO_FARM}"), 409, "CONFLICT")
    assert client.get(f"/v1/farms/{DEMO_FARM}").status_code == 200  # still there


def test_delete_farm_after_its_plots_are_gone(client):
    for plot in client.get(f"/v1/plots?farm_id={EAST_FARM}").json():
        assert client.delete(f"/v1/plots/{plot['id']}").status_code == 204
    assert client.delete(f"/v1/farms/{EAST_FARM}").status_code == 204


def test_delete_unknown_farm_is_404(client):
    assert_problem(client.delete(f"/v1/farms/{UNKNOWN_ID}"), 404, "NOT_FOUND")
