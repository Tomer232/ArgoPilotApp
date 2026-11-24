"""GET /v1/plots/{plot_id}/plan, with fake registry and weather services.

No test reaches a real service: upstream.HTTP is replaced by a client whose
MockTransport answers from a dict, by host and path.
"""

import datetime

import httpx
import pytest

import upstream
from helpers import assert_problem

NORTH_BLOCK = "c8f3d1b0-4d2e-5a1b-8b22-1d6e3f702002"
PLAN_URL = f"/v1/plots/{NORTH_BLOCK}/plan"
FETCHED_AT = "2026-11-16T06:00:00Z"

# Case 3 of the skill (references/cases.md): North block, as seeded, and the
# real forecast of 2026-11-16.
CASE_3_ET0 = [2.77, 2.62, 2.47, 3.03, 3.18, 3.13, 2.31]
CASE_3_RAIN = [0, 0, 0, 0, 0, 0, 0.3]


def north_block(**changes) -> dict:
    """The registry's answer for North block (seed.py), with any fields changed."""
    plot = {
        "id": NORTH_BLOCK,
        "farm_id": "b7e2c0a0-3c1d-4f0a-9a11-0c5d2e6f1001",
        "name": "North block",
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
    return {**plot, **changes}


def forecast(first: str = "2026-11-16", et0=CASE_3_ET0, rain=CASE_3_RAIN, stale: bool = False) -> dict:
    """weather-service's answer: one day per ET0/rain pair, from `first` on."""
    start = datetime.date.fromisoformat(first)
    days = [
        {"date": (start + datetime.timedelta(days=n)).isoformat(), "et0_mm": e, "rain_mm": r}
        for n, (e, r) in enumerate(zip(et0, rain))
    ]
    return {
        "lat": 31.25,
        "lon": 34.79,
        "source": "open-meteo",
        "fetched_at": FETCHED_AT,
        "stale": stale,
        "days": days,
    }


class FakeServices:
    """Stands in for both services. `answers` maps "host/path" to a (status, body) pair,
    or to an exception to raise (a service that is down or too slow)."""

    def __init__(self):
        """Start with healthy services answering case 3."""
        self.requests: list[httpx.Request] = []
        self.answers = {
            f"registry.test/v1/plots/{NORTH_BLOCK}": (200, north_block()),
            "registry.test/v1/soils/loam": (200, {"id": "loam", "name": "Loam", "available_water_mm_per_m": 175}),
            "registry.test/v1/emitters/dripnet-pc-1.0": (
                200,
                {"id": "dripnet-pc-1.0", "name": "DripNet PC", "flow_lph": 1.0},
            ),
            "weather.test/v1/forecast": (200, forecast()),
        }

    def handle(self, request: httpx.Request) -> httpx.Response:
        """Answer one request from `answers`; anything unknown is a 404."""
        self.requests.append(request)
        answer = self.answers.get(f"{request.url.host}{request.url.path}", (404, {"code": "NOT_FOUND"}))
        if isinstance(answer, Exception):
            raise answer
        status, body = answer
        if isinstance(body, str):
            return httpx.Response(status, text=body)
        return httpx.Response(status, json=body)

    def paths(self) -> list[str]:
        """The paths asked for, in order."""
        return [request.url.path for request in self.requests]


@pytest.fixture
def services(monkeypatch) -> FakeServices:
    """Point the planner's HTTP client at the fakes."""
    fake = FakeServices()
    monkeypatch.setattr(upstream, "HTTP", httpx.Client(transport=httpx.MockTransport(fake.handle)))
    return fake


def day_row(day: dict) -> tuple:
    """A response day in the order of the hand-calculated tables' columns we return."""
    return (
        day["date"],
        day["stage"],
        day["kc"],
        day["bucket_capacity_mm"],
        day["trigger_mm"],
        day["need_mm"],
        day["rain_mm"],
        day["irrigation_mm"],
        day["litres"],
        day["run_minutes"],
        day["bucket_end_mm"],
    )


# --- Plans --------------------------------------------------------------------------------


def test_case_3_through_the_api(client, services):
    """North block with the real forecast of 2026-11-16 gives the case 3 table (cases.md)."""
    response = client.get(PLAN_URL)
    assert response.status_code == 200
    body = response.json()
    assert {k: body[k] for k in ("plot_id", "crop_id", "soil_id", "forecast_fetched_at")} == {
        "plot_id": NORTH_BLOCK,
        "crop_id": "tomato",
        "soil_id": "loam",
        "forecast_fetched_at": FETCHED_AT,
    }
    after = ("after-season", 0.8, 122.5, 61.25)
    assert [day_row(d) for d in body["days"]] == [
        ("2026-11-16", *after, 2.22, 0, 0, 0, 0, 120.28),
        ("2026-11-17", *after, 2.10, 0, 0, 0, 0, 118.19),
        ("2026-11-18", *after, 1.98, 0, 0, 0, 0, 116.21),
        ("2026-11-19", *after, 2.42, 0, 0, 0, 0, 113.79),
        ("2026-11-20", *after, 2.54, 0, 0, 0, 0, 111.24),
        ("2026-11-21", *after, 2.50, 0, 0, 0, 0, 108.74),
        ("2026-11-22", *after, 1.85, 0, 0, 0, 0, 106.89),
    ]
    assert [d["et0_mm"] for d in body["days"]] == CASE_3_ET0
    assert all(d["stale"] is False for d in body["days"])


def test_case_1_irrigation_day_through_the_api(client, services):
    """Case 1 (young tomato on sand, heat wave): the fifth day irrigates 25.04 mm, 902 minutes."""
    services.answers[f"registry.test/v1/plots/{NORTH_BLOCK}"] = (
        200,
        north_block(planting_date="2026-03-02", soil_id="sand"),
    )
    services.answers["registry.test/v1/soils/sand"] = (200, {"id": "sand", "available_water_mm_per_m": 83})
    services.answers["weather.test/v1/forecast"] = (
        200,
        forecast(first="2026-04-10", et0=[6.0, 6.4, 6.8, 7.0, 6.5], rain=[0, 0, 0, 0, 0]),
    )

    body = client.get(PLAN_URL, params={"days": 5}).json()
    assert day_row(body["days"][4]) == (
        "2026-04-14", "development", 0.793, 42.69, 21.34, 5.15, 0, 25.04, 25037.5, 902, 42.69,
    )
    assert [d["run_minutes"] for d in body["days"][:4]] == [0, 0, 0, 0]


def test_the_plan_asks_for_the_plots_own_soil_emitter_and_point(client, services):
    client.get(PLAN_URL, params={"days": 7})
    assert services.paths() == [
        f"/v1/plots/{NORTH_BLOCK}",
        "/v1/soils/loam",
        "/v1/emitters/dripnet-pc-1.0",
        "/v1/forecast",
    ]
    weather_request = services.requests[-1]
    assert dict(weather_request.url.params) == {"lat": "31.25", "lon": "34.79", "days": "7"}


def test_each_service_gets_its_own_timeout(client, services):
    """Registry 2 s, weather 12 s (O84, from TEST_SETTINGS)."""
    client.get(PLAN_URL)
    timeouts = [request.extensions["timeout"]["read"] for request in services.requests]
    assert timeouts == [2, 2, 2, 12]


def test_days_defaults_to_7(client, services):
    body = client.get(PLAN_URL).json()
    assert len(body["days"]) == 7
    assert services.requests[-1].url.params["days"] == "7"


def test_one_day_plan_is_today(client, services):
    services.answers["weather.test/v1/forecast"] = (200, forecast(et0=[2.77], rain=[0]))
    body = client.get(PLAN_URL, params={"days": 1}).json()
    assert [d["date"] for d in body["days"]] == ["2026-11-16"]


def test_stale_forecast_still_plans_with_every_day_stale(client, services):
    """FR-2.13."""
    services.answers["weather.test/v1/forecast"] = (200, forecast(stale=True))
    response = client.get(PLAN_URL)
    assert response.status_code == 200
    days = response.json()["days"]
    assert len(days) == 7
    assert all(d["stale"] is True for d in days)


def test_response_has_exactly_the_agreed_fields(client, services):
    """O83/O86: nothing more, nothing less."""
    body = client.get(PLAN_URL).json()
    assert set(body) == {
        "plot_id", "crop_id", "soil_id", "start_pct", "trigger_pct", "crop_trigger_pct",
        "drip_mm_per_hour", "forecast_fetched_at", "days",
    }
    assert set(body["days"][0]) == {
        "date", "et0_mm", "rain_mm", "kc", "stage", "need_mm", "irrigation_mm", "capped",
        "litres", "run_minutes", "bucket_capacity_mm", "trigger_mm", "bucket_end_mm", "stale",
    }


# --- The request ------------------------------------------------------------------------------


@pytest.mark.parametrize("days", ["0", "8", "-1", "abc", "1.5", ""])
def test_bad_days_is_422_and_calls_nobody(client, services, days):
    """FR-2.12."""
    assert_problem(client.get(PLAN_URL, params={"days": days}), 422, "VALIDATION")
    assert services.requests == []


def test_start_pct_defaults_to_100(client, services):
    assert client.get(PLAN_URL).json()["start_pct"] == 100


def test_start_pct_reaches_the_engine(client, services):
    """North block (loam, after season, TAW 122.5, the drip gives 40 mm a day at most): starting at
    37.5 % is Dr 76.56, so day 1 (need 2.22) would end at 43.72, below half. It wants 78.78 mm,
    gets the 40.00 the system can give, and ends at 122.5 - 38.78 = 83.72."""
    body = client.get(PLAN_URL, params={"start_pct": 37.5}).json()
    assert body["start_pct"] == 37.5
    first = body["days"][0]
    assert first["irrigation_mm"] == 40.0
    assert first["capped"] is True
    assert first["run_minutes"] == 1440
    assert first["bucket_end_mm"] == 83.72


@pytest.mark.parametrize("start_pct", ["-0.1", "100.1", "abc", "nan", "inf", "-inf", ""])
def test_bad_start_pct_is_422_and_calls_nobody(client, services, start_pct):
    assert_problem(client.get(PLAN_URL, params={"start_pct": start_pct}), 422, "VALIDATION")
    assert services.requests == []


@pytest.mark.parametrize("start_pct", ["0", "100", "12.5"])
def test_start_pct_edges_are_accepted(client, services, start_pct):
    assert client.get(PLAN_URL, params={"start_pct": start_pct}).status_code == 200


def test_trigger_pct_defaults_to_50_and_the_crops_value_is_returned(client, services):
    """North block grows tomato (crop trigger 60) on a drip of 1.0 / (1.5 x 0.4) = 1.67 mm/h."""
    body = client.get(PLAN_URL).json()
    assert body["trigger_pct"] == 50
    assert body["crop_trigger_pct"] == 60
    assert body["drip_mm_per_hour"] == 1.67
    assert body["days"][0]["trigger_mm"] == 61.25
    assert body["days"][0]["capped"] is False


def test_trigger_pct_reaches_the_engine(client, services):
    """TAW 122.5, start 70 % is Dr 36.75, day 1 (need 2.22) would end at 83.53. With trigger 80
    (98 mm) that is below it: irrigate 38.97 mm, under the 40 mm cap, so not capped."""
    body = client.get(PLAN_URL, params={"start_pct": 70, "trigger_pct": 80}).json()
    assert body["trigger_pct"] == 80
    first = body["days"][0]
    assert first["trigger_mm"] == 98.0
    assert first["irrigation_mm"] == 38.97
    assert first["capped"] is False
    assert first["bucket_end_mm"] == 122.5


@pytest.mark.parametrize("trigger_pct", ["0", "0.9", "99.1", "100", "-5", "abc", "nan", "inf", "-inf", ""])
def test_bad_trigger_pct_is_422_and_calls_nobody(client, services, trigger_pct):
    assert_problem(client.get(PLAN_URL, params={"trigger_pct": trigger_pct}), 422, "VALIDATION")
    assert services.requests == []


@pytest.mark.parametrize("trigger_pct", ["1", "99", "20.5"])
def test_trigger_pct_edges_are_accepted(client, services, trigger_pct):
    assert client.get(PLAN_URL, params={"trigger_pct": trigger_pct}).status_code == 200


def test_unknown_query_parameter_is_422(client, services):
    assert_problem(client.get(PLAN_URL, params={"day": 3}), 422, "VALIDATION")
    assert services.requests == []


@pytest.mark.parametrize("plot_id", ["not-a-uuid", "123", "c8f3d1b0"])
def test_path_id_that_is_not_a_uuid_is_404_without_asking_the_registry(client, services, plot_id):
    assert_problem(client.get(f"/v1/plots/{plot_id}/plan"), 404, "NOT_FOUND")
    assert services.requests == []


def test_uppercase_uuid_is_asked_and_answered_in_lowercase(client, services):
    response = client.get(f"/v1/plots/{NORTH_BLOCK.upper()}/plan")
    assert response.status_code == 200
    assert response.json()["plot_id"] == NORTH_BLOCK
    assert services.paths()[0] == f"/v1/plots/{NORTH_BLOCK}"


def test_unknown_plot_is_404(client, services):
    """FR-2.12: the registry says 404, so does the planner. Weather is not asked."""
    del services.answers[f"registry.test/v1/plots/{NORTH_BLOCK}"]
    assert_problem(client.get(PLAN_URL), 404, "NOT_FOUND")
    assert "/v1/forecast" not in services.paths()


def test_crop_without_planner_data_is_503_unavailable(client, services):
    services.answers[f"registry.test/v1/plots/{NORTH_BLOCK}"] = (200, north_block(crop_id="cucumber"))
    response = client.get(PLAN_URL)
    body = assert_problem(response, 503, "UNAVAILABLE")
    assert "cucumber" in body["detail"]
    assert response.headers["Retry-After"] == "5"


# --- Upstream failures: 503 naming the service, never a plan (FR-2.14) ------------------------

PLOT = f"registry.test/v1/plots/{NORTH_BLOCK}"
SOIL = "registry.test/v1/soils/loam"
EMITTER = "registry.test/v1/emitters/dripnet-pc-1.0"
WEATHER = "weather.test/v1/forecast"

FAILURES = {
    "plot: down": (PLOT, httpx.ConnectError("refused")),
    "plot: too slow": (PLOT, httpx.ReadTimeout("slow")),
    "plot: 500": (PLOT, (500, {"code": "UNAVAILABLE"})),
    "plot: 503": (PLOT, (503, {"code": "UNAVAILABLE"})),
    "plot: not JSON": (PLOT, (200, "<html>oops</html>")),
    "plot: missing field": (PLOT, (200, {k: v for k, v in north_block().items() if k != "area_m2"})),
    "plot: area 0": (PLOT, (200, north_block(area_m2=0))),
    "plot: area as text": (PLOT, (200, north_block(area_m2="1000"))),
    "plot: bad date": (PLOT, (200, north_block(planting_date="2026-02-30"))),
    "plot: lat out of range": (PLOT, (200, north_block(lat=91))),
    "soil: missing": (SOIL, (404, {"code": "NOT_FOUND"})),
    "soil: down": (SOIL, httpx.ConnectError("refused")),
    "soil: null water": (SOIL, (200, {"available_water_mm_per_m": None})),
    "emitter: missing": (EMITTER, (404, {"code": "NOT_FOUND"})),
    "emitter: zero flow": (EMITTER, (200, {"flow_lph": 0})),
}

WEATHER_FAILURES = {
    "down": httpx.ConnectError("refused"),
    "too slow": httpx.ReadTimeout("slow"),
    "503 no forecast": (503, {"code": "UNAVAILABLE"}),
    "422": (422, {"code": "VALIDATION"}),
    "not JSON": (200, "not json"),
    "missing et0": (200, {**forecast(), "days": [{"date": "2026-11-16", "rain_mm": 0}] * 7}),
    "null rain": (200, {**forecast(), "days": [{"date": "2026-11-16", "et0_mm": 2, "rain_mm": None}] * 7}),
    "negative et0": (200, forecast(et0=[-1] * 7)),
    "too few days": (200, forecast(et0=[2.77] * 6, rain=[0] * 6)),
    "too many days": (200, forecast(et0=[2.77] * 8, rain=[0] * 8)),
    "no stale flag": (200, {k: v for k, v in forecast().items() if k != "stale"}),
}


@pytest.mark.parametrize("key, answer", FAILURES.values(), ids=FAILURES.keys())
def test_registry_failure_is_503_naming_registry(client, services, key, answer):
    services.answers[key] = answer
    response = client.get(PLAN_URL)
    body = assert_problem(response, 503, "UPSTREAM_UNAVAILABLE")
    assert "registry-service" in body["detail"]
    assert response.headers["Retry-After"] == "5"
    assert "days" not in body


def test_registry_reason_is_passed_on(client, services):
    """The registry's own detail reaches the grower, not just its status (QA-3, live QA)."""
    services.answers[PLOT] = (503, {"code": "UNAVAILABLE", "detail": "Database unavailable"})
    body = assert_problem(client.get(PLAN_URL), 503, "UPSTREAM_UNAVAILABLE")
    assert body["detail"] == "registry-service: Database unavailable"


def test_weather_reason_is_passed_on(client, services):
    detail = "No forecast available: the weather provider is not answering"
    services.answers[WEATHER] = (503, {"code": "UNAVAILABLE", "detail": detail})
    body = assert_problem(client.get(PLAN_URL), 503, "UPSTREAM_UNAVAILABLE")
    assert body["detail"] == f"weather-service: {detail}"


def test_upstream_reason_is_trimmed(client, services):
    """O127: spaces around the upstream's detail don't reach the grower's sentence."""
    services.answers[PLOT] = (503, {"code": "UNAVAILABLE", "detail": "  Database unavailable \n"})
    body = assert_problem(client.get(PLAN_URL), 503, "UPSTREAM_UNAVAILABLE")
    assert body["detail"] == "registry-service: Database unavailable"


def test_a_very_long_upstream_reason_is_cut_to_200_characters(client, services):
    """QA-2 (2026-11-24): a 20,000-character detail is cut to its first 200 characters plus "...",
    so one broken upstream can't fill every card on the overview."""
    services.answers[PLOT] = (503, {"code": "UNAVAILABLE", "detail": "A" * 20_000})
    body = assert_problem(client.get(PLAN_URL), 503, "UPSTREAM_UNAVAILABLE")
    assert body["detail"] == "registry-service: " + "A" * 200 + "..."


def test_a_reason_of_exactly_200_characters_is_kept_whole(client, services):
    """The cut starts after 200 characters: exactly 200 is passed on as it is."""
    services.answers[PLOT] = (503, {"code": "UNAVAILABLE", "detail": "B" * 200})
    body = assert_problem(client.get(PLAN_URL), 503, "UPSTREAM_UNAVAILABLE")
    assert body["detail"] == "registry-service: " + "B" * 200


def test_upstream_500_with_a_detail_passes_it_on(client, services):
    """O127 holds for any failing status, not only 503: a 500 problem's detail is passed on too."""
    services.answers[PLOT] = (500, {"code": "INTERNAL", "detail": "Something broke"})
    body = assert_problem(client.get(PLAN_URL), 503, "UPSTREAM_UNAVAILABLE")
    assert body["detail"] == "registry-service: Something broke"


@pytest.mark.parametrize(
    "answer",
    [(500, "<html>oops</html>"), (503, {"code": "UNAVAILABLE"}), (503, {"detail": 5}), (503, {"detail": "  "}), (503, [1])],
    ids=["not JSON", "no detail", "detail not text", "detail blank", "not an object"],
)
def test_upstream_without_a_reason_gives_its_status(client, services, answer):
    services.answers[PLOT] = answer
    body = assert_problem(client.get(PLAN_URL), 503, "UPSTREAM_UNAVAILABLE")
    assert body["detail"] == f"registry-service answered with status {answer[0]}"


@pytest.mark.parametrize("answer", WEATHER_FAILURES.values(), ids=WEATHER_FAILURES.keys())
def test_weather_failure_is_503_naming_weather(client, services, answer):
    services.answers[WEATHER] = answer
    response = client.get(PLAN_URL)
    body = assert_problem(response, 503, "UPSTREAM_UNAVAILABLE")
    assert "weather-service" in body["detail"]
    assert response.headers["Retry-After"] == "5"
    assert "days" not in body
