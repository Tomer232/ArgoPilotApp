"""The only code that calls registry-service and weather-service.

Every answer is checked with a Pydantic model before the planner uses it. Anything
wrong (down, too slow, an error status, a body we can't trust) is a 503
UPSTREAM_UNAVAILABLE whose detail names the service (FR-2.14, O84). So a bad answer
can never turn into a plan of zeros.
"""

import datetime
from typing import Annotated

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from config import settings
from errors import NotFoundError, UpstreamUnavailableError

REGISTRY = "registry-service"
WEATHER = "weather-service"

# One HTTP client for the whole process: it reuses connections. Tests replace it.
HTTP = httpx.Client()

Positive = Annotated[float, Field(gt=0)]


# --- What we accept from each service (extra fields are ignored) ------------------


class UpstreamAnswer(BaseModel):
    """Base for upstream answers: exact JSON types ("1000" is not a number), no inf or NaN."""

    model_config = ConfigDict(strict=True, allow_inf_nan=False)


class RegistryPlot(UpstreamAnswer):
    """The plot fields the plan uses."""

    crop_id: str
    planting_date: datetime.date
    soil_id: str
    area_m2: Positive
    row_spacing_m: Positive
    emitter_spacing_m: Positive
    emitter_id: str
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class RegistrySoil(UpstreamAnswer):
    """The soil field the plan uses."""

    available_water_mm_per_m: Positive


class RegistryEmitter(UpstreamAnswer):
    """The emitter field the plan uses."""

    flow_lph: Positive


class ForecastDay(UpstreamAnswer):
    """One forecast day. ET0 and rain are never negative."""

    date: datetime.date
    et0_mm: float = Field(ge=0)
    rain_mm: float = Field(ge=0)


class Forecast(UpstreamAnswer):
    """The forecast fields the plan uses."""

    fetched_at: str
    stale: bool
    days: list[ForecastDay]


# --- One GET, checked -------------------------------------------------------------


def upstream_reason(service: str, response: httpx.Response) -> str:
    """Why `service` failed, for our 503's detail: its own problem+json `detail` when it sent
    one (e.g. "registry-service: Database unavailable"), otherwise its status (QA-3, live QA)."""
    try:
        detail = response.json().get("detail")
    except (ValueError, AttributeError):
        detail = None
    if isinstance(detail, str) and detail.strip():
        return f"{service}: {detail.strip()}"
    return f"{service} answered with status {response.status_code}"


def get_checked(service: str, url: str, model: type[UpstreamAnswer], timeout: float, params=None):
    """GET `url` and return its body as `model`. Every failure is a 503 naming `service`.
    A 404 is returned as None, so the caller decides what it means."""
    try:
        response = HTTP.get(url, params=params, timeout=timeout)
    except httpx.TimeoutException:
        raise UpstreamUnavailableError(f"{service} did not answer in time") from None
    except httpx.HTTPError:
        raise UpstreamUnavailableError(f"{service} is not reachable") from None
    if response.status_code == 404:
        return None
    if response.status_code != 200:
        raise UpstreamUnavailableError(upstream_reason(service, response))
    try:
        return model.model_validate_json(response.content)
    except ValidationError:
        raise UpstreamUnavailableError(f"{service} answered with data the planner can't use") from None


def registry_get(path: str, model: type[UpstreamAnswer]):
    """GET a registry resource, or None on 404."""
    url = settings.registry_url.rstrip("/") + path
    return get_checked(REGISTRY, url, model, settings.registry_timeout_seconds)


# --- What the plan route calls --------------------------------------------------------


def fetch_plot(plot_id: str) -> RegistryPlot:
    """The plot. Unknown plot: 404 NOT_FOUND (FR-2.12)."""
    plot = registry_get(f"/v1/plots/{plot_id}", RegistryPlot)
    if plot is None:
        raise NotFoundError(f"Plot {plot_id} not found")
    return plot


def fetch_soil(soil_id: str) -> RegistrySoil:
    """The plot's soil. Missing, though the plot points at it: the registry is broken, 503."""
    soil = registry_get(f"/v1/soils/{soil_id}", RegistrySoil)
    if soil is None:
        raise UpstreamUnavailableError(f"{REGISTRY} has no soil {soil_id!r} for this plot")
    return soil


def fetch_emitter(emitter_id: str) -> RegistryEmitter:
    """The plot's emitter. Missing, though the plot points at it: 503, as for the soil."""
    emitter = registry_get(f"/v1/emitters/{emitter_id}", RegistryEmitter)
    if emitter is None:
        raise UpstreamUnavailableError(f"{REGISTRY} has no emitter {emitter_id!r} for this plot")
    return emitter


def fetch_forecast(lat: float, lon: float, days: int) -> Forecast:
    """The forecast for the plot's point: exactly `days` days, or 503."""
    url = settings.weather_url.rstrip("/") + "/v1/forecast"
    params = {"lat": lat, "lon": lon, "days": days}
    forecast = get_checked(WEATHER, url, Forecast, settings.weather_timeout_seconds, params)
    if forecast is None:
        raise UpstreamUnavailableError(f"{WEATHER} answered with status 404")
    if len(forecast.days) != days:
        raise UpstreamUnavailableError(f"{WEATHER} gave {len(forecast.days)} days, the plan asked for {days}")
    return forecast
