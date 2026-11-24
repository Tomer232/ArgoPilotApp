"""One plot through the whole system: the registry stores it, the planner plans it from the
registry and weather-service, and the frontend's plot page shows it."""

import uuid

import httpx

from conftest import FRONTEND, PLANNER, REGISTRY


def plot_body(farm_id: str, name: str, **changes) -> dict:
    """A valid plot on the e2e farm, with seed catalogue ids, at the seed plots' Be'er Sheva point."""
    body = {
        "farm_id": farm_id,
        "name": name,
        "area_m2": 500,
        "crop_id": "tomato",
        "planting_date": "2026-03-01",
        "soil_id": "loam",
        "row_spacing_m": 1.5,
        "emitter_spacing_m": 0.4,
        "emitter_id": "dripnet-pc-1.6",
        "lat": 31.25,
        "lon": 34.79,
    }
    return body | changes


def create_plot(farm_id: str, name: str) -> dict:
    """POST a plot and return it."""
    response = httpx.post(f"{REGISTRY}/v1/plots", json=plot_body(farm_id, name), timeout=5)
    assert response.status_code == 201, response.text
    return response.json()


def test_a_new_plot_gets_a_seven_day_plan(e2e_farm, e2e_name):
    """FR-2 flow: a plot just created in the registry is planned by the planner, which reads it
    from the registry and the forecast from weather-service: 7 days by default, in order."""
    plot = create_plot(e2e_farm["id"], e2e_name)
    response = httpx.get(f"{PLANNER}/v1/plots/{plot['id']}/plan", timeout=30)
    assert response.status_code == 200, response.text
    days = response.json()["days"]
    assert len(days) == 7
    assert [day["date"] for day in days] == sorted(day["date"] for day in days)


def test_the_plot_page_shows_the_new_plot(e2e_farm, e2e_name):
    """FR-2.16: the frontend's plot page renders the plot the registry just stored, by name."""
    plot = create_plot(e2e_farm["id"], e2e_name)
    response = httpx.get(f"{FRONTEND}/plots/{plot['id']}", timeout=30)
    assert response.status_code == 200
    assert e2e_name in response.text


def test_an_unknown_plot_page_is_a_real_404():
    """O98, O116: proxy.ts asks the registry first, so a plot that doesn't exist answers 404."""
    response = httpx.get(f"{FRONTEND}/plots/{uuid.uuid4()}", timeout=30)
    assert response.status_code == 404


def test_the_planner_says_404_for_a_plot_the_registry_does_not_have():
    """The planner passes the registry's 404 on as its own 404 NOT_FOUND."""
    response = httpx.get(f"{PLANNER}/v1/plots/{uuid.uuid4()}/plan", timeout=30)
    assert response.status_code == 404
    assert response.json()["code"] == "NOT_FOUND"


def test_the_registry_refuses_an_unrealistic_plot(e2e_farm, e2e_name):
    """O132 on the real database: a 1 cm2 plot is 422 and nothing is stored."""
    response = httpx.post(f"{REGISTRY}/v1/plots", json=plot_body(e2e_farm["id"], e2e_name, area_m2=0.0001), timeout=5)
    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION"
    stored = httpx.get(f"{REGISTRY}/v1/plots", params={"farm_id": e2e_farm["id"]}, timeout=5).json()
    assert stored == []
