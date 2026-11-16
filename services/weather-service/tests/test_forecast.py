"""GET /v1/forecast: query checks, grid cells, the 3-hour cache, stale answers and 503 (FR-2.3 to FR-2.8)."""

import datetime
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import pytest

import forecast
from config import settings
from helpers import assert_problem
from provider import DayWeather, ProviderError, ProviderForecast

UTC = datetime.timezone.utc
ISRAEL_OFFSET = 7200  # the demo point's UTC offset in winter, in seconds
# 08:00 in Israel on 16 November: the demo point's "today" is 2026-11-16.
MORNING = datetime.datetime(2026, 11, 16, 6, 0, tzinfo=UTC)
URL = "/v1/forecast?lat=31.25&lon=34.79&days=7"


def eight_days(first: datetime.date = datetime.date(2026, 11, 16)) -> ProviderForecast:
    """A provider forecast of 8 days starting `first`; ET0 1.1, 1.2, ... so days are told apart."""
    days = [
        DayWeather(first + datetime.timedelta(days=i), et0_mm=round(1.1 + i / 10, 1), rain_mm=float(i))
        for i in range(8)
    ]
    return ProviderForecast(days=days, utc_offset_seconds=ISRAEL_OFFSET)


class Scene:
    """Controls the two things the route depends on: the clock and the provider."""

    def __init__(self, monkeypatch):
        """Start at MORNING with a provider that answers eight_days()."""
        self.now = MORNING
        self.provider_up = True
        self.calls = []  # (lat, lon) of every provider call
        monkeypatch.setattr(forecast, "utc_now", lambda: self.now)
        monkeypatch.setattr(forecast, "fetch_forecast", self.fake_fetch)

    def fake_fetch(self, lat, lon, http):
        """Record the call; answer, or fail like a provider that is down."""
        self.calls.append((lat, lon))
        if not self.provider_up:
            raise ProviderError("down")
        return eight_days()

    def later(self, **delta):
        """Move the clock forward, e.g. later(hours=3)."""
        self.now += datetime.timedelta(**delta)


@pytest.fixture
def scene(monkeypatch):
    return Scene(monkeypatch)


# --- The answer ---------------------------------------------------------------


def test_forecast_answer(client, scene):
    response = client.get(URL)
    assert response.status_code == 200
    body = response.json()
    assert body == {
        "lat": 31.25,
        "lon": 34.79,
        "source": "open-meteo",
        "fetched_at": "2026-11-16T06:00:00Z",
        "stale": False,
        "days": [
            {"date": f"2026-11-{16 + i}", "et0_mm": round(1.1 + i / 10, 1), "rain_mm": float(i)}
            for i in range(7)
        ],
    }


def test_days_cuts_the_forecast(client, scene):
    body = client.get("/v1/forecast?lat=31.25&lon=34.79&days=2").json()
    assert [day["date"] for day in body["days"]] == ["2026-11-16", "2026-11-17"]


# --- Grid cells (FR-2.5, O71) -------------------------------------------------


def test_same_cell_shares_one_forecast(client, scene):
    """31.21..31.29 is one cell; days only cuts the cached forecast."""
    client.get("/v1/forecast?lat=31.21&lon=34.71&days=7")
    client.get("/v1/forecast?lat=31.29&lon=34.79&days=3")
    assert scene.calls == [(31.25, 34.75)]  # one call, at the cell's center


def test_neighbour_cell_gets_its_own_forecast(client, scene):
    client.get("/v1/forecast?lat=31.29&lon=34.79&days=7")
    client.get("/v1/forecast?lat=31.31&lon=34.79&days=7")
    assert scene.calls == [(31.25, 34.75), (31.35, 34.75)]


def test_a_cell_starts_at_its_lower_edge(client, scene):
    """A point exactly on a cell edge belongs to the cell above it: 31.3 is in 31.3-31.4."""
    client.get("/v1/forecast?lat=31.3&lon=-0.1&days=1")
    assert scene.calls == [(31.35, -0.05)]


@pytest.mark.parametrize(
    "lat, lon, center",
    [(90, 180, (89.95, 179.95)), (-90, -180, (-89.95, -179.95)), (0, 0, (0.05, 0.05))],
)
def test_edge_cells_are_called_at_a_real_point(client, scene, lat, lon, center):
    """lat 90 and lon 180 join the cell below them, so the center is never past the edge."""
    client.get(f"/v1/forecast?lat={lat}&lon={lon}&days=1")
    assert scene.calls == [center]


# --- Fresh for 3 hours (FR-2.5) -----------------------------------------------


def test_fresh_forecast_does_not_call_the_provider(client, scene):
    client.get(URL)
    scene.later(hours=2, minutes=59)
    assert client.get(URL).json()["stale"] is False
    assert len(scene.calls) == 1


def test_after_three_hours_the_provider_is_called_again(client, scene):
    client.get(URL)
    scene.later(hours=3)
    body = client.get(URL).json()
    assert len(scene.calls) == 2
    assert body["fetched_at"] == "2026-11-16T09:00:00Z"


# --- Provider down (FR-2.6, FR-2.7, O72) --------------------------------------


def test_provider_down_serves_last_forecast_as_stale(client, scene):
    client.get(URL)
    scene.later(hours=5)
    scene.provider_up = False
    body = client.get(URL).json()
    assert body["stale"] is True
    assert body["fetched_at"] == "2026-11-16T06:00:00Z"
    assert body["days"][0]["date"] == "2026-11-16"


def test_stale_answer_starts_today_in_the_points_time_zone(client, scene):
    """Fetched at 08:00 Israel time on the 16th; at 01:00 on the 17th the 16th is past."""
    client.get(URL)
    scene.later(hours=17)  # 23:00 UTC = 01:00 on the 17th in Israel
    scene.provider_up = False
    body = client.get(URL).json()
    assert body["stale"] is True
    assert [day["date"] for day in body["days"]] == [f"2026-11-{d}" for d in range(17, 24)]


def test_stale_for_24_hours_then_503(client, scene):
    client.get(URL)
    scene.provider_up = False
    scene.later(hours=24)
    assert client.get(URL).json()["stale"] is True
    scene.later(seconds=1)
    response = client.get(URL)
    assert_problem(response, 503, "UNAVAILABLE")
    assert response.headers["retry-after"] == "5"


def test_stale_without_enough_days_left_is_503(client, scene, monkeypatch):
    """Never a made-up day (FR-2.8): if the old forecast no longer covers the days asked, 503."""
    monkeypatch.setattr(settings, "max_stale_hours", 72)
    client.get(URL)
    scene.provider_up = False
    scene.later(hours=48)  # the 18th in Israel: only 6 of the 8 days are left
    assert client.get("/v1/forecast?lat=31.25&lon=34.79&days=6").json()["stale"] is True
    assert_problem(client.get(URL), 503, "UNAVAILABLE")


def test_provider_down_and_nothing_cached_is_503(client, scene):
    scene.provider_up = False
    response = client.get(URL)
    body = assert_problem(response, 503, "UNAVAILABLE")
    assert response.headers["retry-after"] == "5"
    assert "forecast" in body["detail"].lower()


def test_provider_back_up_gives_a_fresh_answer_again(client, scene):
    client.get(URL)
    scene.later(hours=4)
    scene.provider_up = False
    assert client.get(URL).json()["stale"] is True
    scene.provider_up = True
    assert client.get(URL).json()["stale"] is False


def test_a_failed_call_is_not_cached(client, scene):
    """Nothing cached after a failure: the next request asks the provider again."""
    scene.provider_up = False
    client.get(URL)
    scene.provider_up = True
    assert client.get(URL).status_code == 200
    assert len(scene.calls) == 2


# --- Many requests at once (O75) ----------------------------------------------


def test_simultaneous_misses_for_one_cell_make_one_call(client, scene, monkeypatch):
    real_fake = scene.fake_fetch

    def slow_fetch(lat, lon, http):
        time.sleep(0.2)  # long enough for every request to arrive while the first is fetching
        return real_fake(lat, lon, http)

    monkeypatch.setattr(forecast, "fetch_forecast", slow_fetch)
    start = threading.Barrier(10)

    def one(_):
        start.wait()
        return client.get(URL).status_code

    with ThreadPoolExecutor(max_workers=10) as pool:
        statuses = list(pool.map(one, range(10)))
    assert statuses == [200] * 10
    assert len(scene.calls) == 1


# --- Query checks (FR-2.4) ----------------------------------------------------

BAD_QUERIES = [
    ("lat too high", "lat=90.01&lon=0&days=7"),
    ("lat too low", "lat=-90.01&lon=0&days=7"),
    ("lon too high", "lat=0&lon=180.01&days=7"),
    ("lon too low", "lat=0&lon=-180.01&days=7"),
    ("days 0", "lat=0&lon=0&days=0"),
    ("days 8", "lat=0&lon=0&days=8"),
    ("days not whole", "lat=0&lon=0&days=7.5"),
    ("days text", "lat=0&lon=0&days=seven"),
    ("lat text", "lat=north&lon=0&days=7"),
    ("lat NaN", "lat=nan&lon=0&days=7"),
    ("lon Infinity", "lat=0&lon=inf&days=7"),
    ("lat empty", "lat=&lon=0&days=7"),
    ("lat missing", "lon=0&days=7"),
    ("lon missing", "lat=0&days=7"),
    ("days missing", "lat=0&lon=0"),
    ("unknown parameter", "lat=0&lon=0&days=7&units=metric"),
]


@pytest.mark.parametrize("case, query", BAD_QUERIES, ids=[case for case, _ in BAD_QUERIES])
def test_bad_query_is_422(client, scene, case, query):
    assert_problem(client.get(f"/v1/forecast?{query}"), 422, "VALIDATION")
    assert scene.calls == []  # a bad request never reaches the provider


@pytest.mark.parametrize("query", ["lat=90&lon=180&days=1", "lat=-90&lon=-180&days=7"])
def test_edges_are_allowed(client, scene, query):
    assert client.get(f"/v1/forecast?{query}").status_code == 200
