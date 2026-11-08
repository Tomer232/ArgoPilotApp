"""Crops, soils, emitters: read-only (FR-1.2)."""

import pytest

from helpers import assert_problem

# The spec's tables, in the spec's order.
CROPS = [
    {"id": "tomato", "name": "Tomato"},
    {"id": "bell-pepper", "name": "Bell pepper"},
]
SOILS = [
    {"id": "sand", "name": "Sand", "available_water_mm_per_m": 83},
    {"id": "loam", "name": "Loam", "available_water_mm_per_m": 175},
    {"id": "clay-loam", "name": "Clay loam", "available_water_mm_per_m": 200},
]
EMITTERS = [
    {"id": "dripnet-pc-0.6", "name": "DripNet PC", "flow_lph": 0.6},
    {"id": "dripnet-pc-1.0", "name": "DripNet PC", "flow_lph": 1.0},
    {"id": "dripnet-pc-1.6", "name": "DripNet PC", "flow_lph": 1.6},
    {"id": "dripnet-pc-2.0", "name": "DripNet PC", "flow_lph": 2.0},
]
CATALOGUES = [("/v1/crops", CROPS), ("/v1/soils", SOILS), ("/v1/emitters", EMITTERS)]


@pytest.mark.parametrize("url, expected", CATALOGUES)
def test_list_matches_spec(client, url, expected):
    response = client.get(url)
    assert response.status_code == 200
    assert response.json() == expected


@pytest.mark.parametrize("url, expected", CATALOGUES)
def test_get_each_by_id(client, url, expected):
    for item in expected:
        response = client.get(f"{url}/{item['id']}")
        assert response.status_code == 200
        assert response.json() == item


@pytest.mark.parametrize("url, label", [("/v1/crops", "crop"), ("/v1/soils", "soil"), ("/v1/emitters", "emitter")])
def test_unknown_id_is_404(client, url, label):
    body = assert_problem(client.get(f"{url}/nope"), 404, "NOT_FOUND")
    assert body["detail"] == f"Unknown {label}"


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
@pytest.mark.parametrize("url", ["/v1/crops", "/v1/crops/tomato", "/v1/soils", "/v1/soils/sand", "/v1/emitters", "/v1/emitters/dripnet-pc-1.0"])
def test_other_methods_are_405(client, method, url):
    assert_problem(client.request(method, url), 405, None)
