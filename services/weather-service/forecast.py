"""GET /v1/forecast: the forecast cache and the route that serves it.

A forecast is kept per 0.1-degree grid cell (O71), in this process's memory only.
- Younger than FRESH_HOURS: served as is, the provider is not called (FR-2.5).
- Otherwise the provider is called (with retries). If that fails, the last forecast
  is served with "stale": true, if it is at most MAX_STALE_HOURS old and still
  covers the days asked for (FR-2.6, O72). Else 503 (FR-2.7).
"""

import datetime
import math
import threading
from dataclasses import dataclass
from typing import Annotated

import httpx
from fastapi import APIRouter, Query
from pydantic import BaseModel

from config import settings
from errors import UnavailableError
from provider import SOURCE, DayWeather, ProviderError, ProviderForecast, fetch_forecast

router = APIRouter()

# One HTTP client for the whole process: it reuses connections to the provider.
HTTP = httpx.Client()


# --- Response models: exactly the fields of the spec's example ------------


class ForecastDay(BaseModel):
    """One day of the answer."""

    date: datetime.date
    et0_mm: float
    rain_mm: float


class Forecast(BaseModel):
    """The whole answer of GET /v1/forecast."""

    lat: float
    lon: float
    source: str
    fetched_at: str
    stale: bool
    days: list[ForecastDay]


# --- Grid cells ---------------------------------------------------------------

Cell = tuple[int, int]  # (lat, lon) in tenths of a degree, rounded down: 31.25 -> 312


def cell_of(lat: float, lon: float) -> Cell:
    """The 0.1-degree cell a point is in, rounded down: 31.25 and 31.29 -> 312.
    lat 90 and lon 180 join the cell below, so every cell has a real center."""
    lat_tenths = min(math.floor(lat * 10), 899)
    lon_tenths = min(math.floor(lon * 10), 1799)
    return lat_tenths, lon_tenths


def center_of(cell: Cell) -> tuple[float, float]:
    """The point in the middle of a cell, where the provider is asked: cell 312 -> 31.25."""
    lat_tenths, lon_tenths = cell
    return round((lat_tenths + 0.5) / 10, 2), round((lon_tenths + 0.5) / 10, 2)


# --- The cache ----------------------------------------------------------------


@dataclass(frozen=True)
class CachedForecast:
    """A provider forecast, and when we got it."""

    forecast: ProviderForecast
    fetched_at: datetime.datetime  # UTC

    def age_hours(self, now: datetime.datetime) -> float:
        """How old this forecast is, in hours."""
        return (now - self.fetched_at).total_seconds() / 3600


CACHE: dict[Cell, CachedForecast] = {}

# One lock per cell: requests for the same cell wait for each other, so 10 misses
# at once make one provider call (O75). Requests for other cells don't wait.
CELL_LOCKS: dict[Cell, threading.Lock] = {}
CELL_LOCKS_GUARD = threading.Lock()  # protects CELL_LOCKS itself


def lock_for(cell: Cell) -> threading.Lock:
    """The lock of a cell, created the first time the cell is asked for."""
    with CELL_LOCKS_GUARD:
        return CELL_LOCKS.setdefault(cell, threading.Lock())


def utc_now() -> datetime.datetime:
    """The current time in UTC. Tests replace it to move the clock."""
    return datetime.datetime.now(datetime.timezone.utc)


# --- Choosing what to serve ---------------------------------------------------


def days_from_today(cached: CachedForecast, days: int, now: datetime.datetime) -> list[DayWeather] | None:
    """The `days` days starting today at the point (its own time zone), or None if the
    cached forecast doesn't hold all of them. Never fills a gap (FR-2.8)."""
    offset = datetime.timedelta(seconds=cached.forecast.utc_offset_seconds)
    today = (now + offset).date()
    remaining = [day for day in cached.forecast.days if day.date >= today]
    if len(remaining) < days or remaining[0].date != today:
        return None
    return remaining[:days]


def get_cached_or_fetch(lat: float, lon: float, days: int) -> tuple[CachedForecast, list[DayWeather], bool]:
    """The forecast to serve for a point: (cached forecast, its days, stale?).
    Raises UnavailableError (503) when there is nothing we may serve."""
    cell = cell_of(lat, lon)
    with lock_for(cell):
        now = utc_now()
        cached = CACHE.get(cell)
        if cached is not None and cached.age_hours(now) < settings.fresh_hours:
            selected = days_from_today(cached, days, now)
            if selected is not None:
                return cached, selected, False

        try:
            fresh = CachedForecast(fetch_forecast(*center_of(cell), HTTP), fetched_at=now)
        except ProviderError:
            if cached is not None and cached.age_hours(now) <= settings.max_stale_hours:
                selected = days_from_today(cached, days, now)
                if selected is not None:
                    return cached, selected, True
            raise UnavailableError("No forecast available: the weather provider is not answering") from None

        CACHE[cell] = fresh
        selected = days_from_today(fresh, days, now)
        if selected is None:
            raise UnavailableError("No forecast available: the provider's days don't start today")
        return fresh, selected, False


# --- The route ----------------------------------------------------------------

Latitude = Annotated[float, Query(ge=-90, le=90, allow_inf_nan=False)]
Longitude = Annotated[float, Query(ge=-180, le=180, allow_inf_nan=False)]
Days = Annotated[int, Query(ge=1, le=7)]


@router.get("/v1/forecast", response_model=Forecast)
def get_forecast(lat: Latitude, lon: Longitude, days: Days) -> Forecast:
    """The daily forecast (date, ET0, rain) for a point, for `days` days starting today."""
    cached, selected, stale = get_cached_or_fetch(lat, lon, days)
    return Forecast(
        lat=lat,
        lon=lon,
        source=SOURCE,
        fetched_at=cached.fetched_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
        stale=stale,
        days=[ForecastDay(date=d.date, et0_mm=d.et0_mm, rain_mm=d.rain_mm) for d in selected],
    )
