"""The only code that knows Open-Meteo: its URL, parameters, field names and units.

The rest of the service sees a ProviderForecast, or a ProviderError (O74).
"""

import datetime
import logging
import math
import time
from dataclasses import dataclass

import httpx

from config import settings

logger = logging.getLogger("weather")

DAYS_FETCHED = 8  # one more than the API serves, so a day-old forecast still covers 7 days (O72)

# Open-Meteo's daily variable names, and the unit we accept for each.
ET0 = "et0_fao_evapotranspiration"  # reference evapotranspiration, mm per day
RAIN = "precipitation_sum"  # rain + showers + snow, mm (O69)
UNITS = {ET0: "mm", RAIN: "mm"}


@dataclass(frozen=True)
class DayWeather:
    """One day of the forecast, in our own names."""

    date: datetime.date
    et0_mm: float
    rain_mm: float


@dataclass(frozen=True)
class ProviderForecast:
    """What one successful call gives: the days, and the point's UTC offset
    (to know the point's 'today' when this forecast is served later)."""

    days: list[DayWeather]
    utc_offset_seconds: int


class ProviderError(Exception):
    """The provider failed, or answered something we can't trust."""


def fetch_forecast(lat: float, lon: float, http: httpx.Client) -> ProviderForecast:
    """Ask the provider, trying 1 + PROVIDER_RETRIES times with a pause between tries.
    Raises ProviderError when every try failed."""
    attempts = 1 + settings.provider_retries
    for attempt in range(1, attempts + 1):
        try:
            return fetch_once(lat, lon, http)
        except ProviderError as exc:
            logger.warning("Provider attempt %d of %d failed: %s", attempt, attempts, exc)
            if attempt == attempts:
                raise
            time.sleep(settings.provider_retry_pause_seconds)
    raise AssertionError("unreachable")  # the loop always returns or raises


def fetch_once(lat: float, lon: float, http: httpx.Client) -> ProviderForecast:
    """One call to the provider. Any network, status or format problem is a ProviderError."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": f"{ET0},{RAIN}",
        "timezone": "auto",  # days follow the point's local date (O70)
        "forecast_days": DAYS_FETCHED,
    }
    if settings.provider_api_key:
        params["apikey"] = settings.provider_api_key
    try:
        response = http.get(
            settings.provider_base_url,
            params=params,
            timeout=settings.provider_timeout_seconds,
        )
        response.raise_for_status()
        body = response.json()
    except httpx.HTTPError as exc:  # timeout, connection error, 4xx/5xx status
        raise ProviderError(f"request failed: {exc!r}") from exc
    except ValueError as exc:  # the body is not JSON
        raise ProviderError("body is not JSON") from exc
    return parse_forecast(body)


def parse_forecast(body) -> ProviderForecast:
    """Turn the provider's JSON into our ProviderForecast, refusing anything incomplete."""
    try:
        daily = body["daily"]
        dates = [datetime.date.fromisoformat(text) for text in daily["time"]]
        et0 = [check_amount(value) for value in daily[ET0]]
        rain = [check_amount(value) for value in daily[RAIN]]
        units = {name: body["daily_units"][name] for name in UNITS}
        offset = body["utc_offset_seconds"]
    except (KeyError, TypeError, ValueError) as exc:
        raise ProviderError(f"missing or bad field: {exc!r}") from exc

    if units != UNITS:
        raise ProviderError(f"units are {units}, expected {UNITS}")
    if not (len(dates) == len(et0) == len(rain) == DAYS_FETCHED):
        raise ProviderError(f"expected {DAYS_FETCHED} days, got {len(dates)}/{len(et0)}/{len(rain)}")
    if any(later - earlier != datetime.timedelta(days=1) for earlier, later in zip(dates, dates[1:])):
        raise ProviderError("dates are not consecutive days")
    if type(offset) is not int:
        raise ProviderError("utc_offset_seconds is not a whole number")

    days = [DayWeather(date, e, r) for date, e, r in zip(dates, et0, rain)]
    return ProviderForecast(days=days, utc_offset_seconds=offset)


def check_amount(value) -> float:
    """A water amount must be a real, finite number of mm, zero or more (FR-2.8).
    `null`, text, true/false, NaN, Infinity and negatives are refused."""
    if type(value) not in (int, float) or not math.isfinite(value) or value < 0:
        raise ValueError(f"not a water amount: {value!r}")
    return float(value)
