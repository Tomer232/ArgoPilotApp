"""GET /v1/plots/{plot_id}/plan: fetch the inputs, run the engine, round the answer.

Order: the plot (404 if unknown), its crop data (in the planner), its soil and emitter,
then the forecast for its point. Any upstream problem stops the plan with a 503 (upstream.py).
"""

import datetime
import uuid
from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import BaseModel

import upstream
from engine import (
    CROPS,
    DEFAULT_TRIGGER_PCT,
    PlanDay,
    PlotInputs,
    WeatherDay,
    drip_mm_per_hour,
    plan_days,
    round_half_up,
)
from errors import NotFoundError, UnavailableError

router = APIRouter()

Days = Annotated[int, Query(ge=1, le=7)]  # FR-2.9: 1 to 7, default 7
# How full the bucket is at the start of today, in percent. nan and inf are refused too.
StartPct = Annotated[float, Query(ge=0, le=100, allow_inf_nan=False)]
# The bucket level below which a day irrigates, in percent of TAW: 1 to 99 (owner's choice).
TriggerPct = Annotated[float, Query(ge=1, le=99, allow_inf_nan=False)]


# --- Response (O83, O86) ---------------------------------------------------------------


class PlanDayOut(BaseModel):
    """One day of the plan, rounded (A60): kc 3 decimals, mm 2, litres 1."""

    date: datetime.date
    et0_mm: float
    rain_mm: float  # the rain that counts (step 6 of the skill)
    kc: float
    stage: str
    need_mm: float
    irrigation_mm: float
    capped: bool  # needed more than 24 hours of dripping, so the bucket ends below full
    litres: float
    run_minutes: int
    bucket_capacity_mm: float
    trigger_mm: float
    bucket_end_mm: float
    stale: bool


class Plan(BaseModel):
    """The plan of one plot, day 1 is today."""

    plot_id: str
    crop_id: str
    soil_id: str
    start_pct: float  # the bucket level day 1 started from
    trigger_pct: float  # the trigger used, percent of TAW
    crop_trigger_pct: float  # the crop's own trigger (FAO Table 22)
    drip_mm_per_hour: float  # what the plot's drip system gives per hour
    forecast_fetched_at: str
    days: list[PlanDayOut]


def rounded(day: PlanDay) -> PlanDayOut:
    """One engine day, rounded only here, for the response (A60)."""
    return PlanDayOut(
        date=day.date,
        et0_mm=round_half_up(day.et0_mm, 2),
        rain_mm=round_half_up(day.rain_counted_mm, 2),
        kc=round_half_up(day.kc, 3),
        stage=day.stage,
        need_mm=round_half_up(day.need_mm, 2),
        irrigation_mm=round_half_up(day.irrigation_mm, 2),
        capped=day.capped,
        litres=round_half_up(day.litres, 1),
        run_minutes=day.run_minutes,
        bucket_capacity_mm=round_half_up(day.bucket_capacity_mm, 2),
        trigger_mm=round_half_up(day.trigger_mm, 2),
        bucket_end_mm=round_half_up(day.bucket_end_mm, 2),
        stale=day.stale,
    )


# --- The route -------------------------------------------------------------------------


def parse_plot_id(raw: str) -> str:
    """A path id that is not a UUID is a 404, without asking the registry.
    Any UUID spelling becomes lowercase, the registry's form."""
    try:
        return str(uuid.UUID(raw))
    except ValueError:
        raise NotFoundError(f"Plot {raw} not found") from None


@router.get("/v1/plots/{plot_id}/plan", response_model=Plan)
def get_plan(
    plot_id: str,
    days: Days = 7,
    start_pct: StartPct = 100.0,
    trigger_pct: TriggerPct = DEFAULT_TRIGGER_PCT,
) -> Plan:
    """The irrigation plan of a plot for the next `days` days, starting today (FR-2.9),
    with the bucket `start_pct` percent full this morning (default 100), irrigating when it
    would end a day below `trigger_pct` percent of TAW (default 50)."""
    plot_id = parse_plot_id(plot_id)
    plot = upstream.fetch_plot(plot_id)
    crop = CROPS.get(plot.crop_id)
    if crop is None:
        raise UnavailableError(f"The planner has no crop data for {plot.crop_id!r}")
    soil = upstream.fetch_soil(plot.soil_id)
    emitter = upstream.fetch_emitter(plot.emitter_id)
    forecast = upstream.fetch_forecast(plot.lat, plot.lon, days)

    inputs = PlotInputs(
        crop=crop,
        planting_date=plot.planting_date,
        available_water_mm_per_m=soil.available_water_mm_per_m,
        area_m2=plot.area_m2,
        row_spacing_m=plot.row_spacing_m,
        emitter_spacing_m=plot.emitter_spacing_m,
        flow_lph=emitter.flow_lph,
    )
    # The forecast is stale as a whole, so every day carries its flag (FR-2.13).
    weather = [WeatherDay(d.date, d.et0_mm, d.rain_mm, forecast.stale) for d in forecast.days]
    return Plan(
        plot_id=plot_id,
        crop_id=plot.crop_id,
        soil_id=plot.soil_id,
        start_pct=start_pct,
        trigger_pct=trigger_pct,
        crop_trigger_pct=crop.trigger_pct,
        drip_mm_per_hour=round_half_up(drip_mm_per_hour(inputs), 2),
        forecast_fetched_at=forecast.fetched_at,
        days=[rounded(day) for day in plan_days(inputs, weather, start_pct, trigger_pct)],
    )
