"""The irrigation engine: plot + forecast in, one plan row per day out.

Plain functions, no HTTP and no rounding of results (the response rounds; A60).
Every rule is a step of the irrigation-calc-reference skill
(.claude/skills/irrigation-calc-reference/SKILL.md), from FAO-56; the step numbers
in the comments below are the skill's.
"""

import datetime
import math
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

# --- Crops (FAO Tables 11, 12, 22; O80) -------------------------------------------


@dataclass(frozen=True)
class Crop:
    """What the engine needs to know about a crop."""

    stage_days: tuple[int, int, int, int]  # initial, development, mid, late
    kc_ini: float
    kc_mid: float
    kc_end: float
    root_depth_m: float  # full depth, from the start of mid-season


CROPS = {
    "tomato": Crop(stage_days=(30, 40, 45, 30), kc_ini=0.60, kc_mid=1.15, kc_end=0.80, root_depth_m=0.7),
    "bell-pepper": Crop(stage_days=(30, 35, 40, 20), kc_ini=0.60, kc_mid=1.05, kc_end=0.90, root_depth_m=0.5),
}

ROOT_DEPTH_AT_PLANTING_M = 0.2  # Annex 8: about 0.15-0.20 m for annual crops (O77)
TRIGGER_FRACTION = 0.5  # irrigate when the bucket would end the day below half (O78)
SMALL_RAIN_FRACTION = 0.2  # rain below 0.2 x ET0 just evaporates (O81)


# --- Inputs and output ------------------------------------------------------------


@dataclass(frozen=True)
class PlotInputs:
    """Everything about the plot the calculation uses (from the registry)."""

    crop: Crop
    planting_date: datetime.date
    available_water_mm_per_m: float  # the soil's
    area_m2: float
    row_spacing_m: float
    emitter_spacing_m: float
    flow_lph: float  # the emitter's


@dataclass(frozen=True)
class WeatherDay:
    """One forecast day (from weather-service)."""

    date: datetime.date
    et0_mm: float
    rain_mm: float
    stale: bool


@dataclass(frozen=True)
class PlanDay:
    """One day of the plan, at full precision."""

    date: datetime.date
    season_day: int
    stage: str
    kc: float
    root_depth_m: float
    bucket_capacity_mm: float  # TAW
    trigger_mm: float  # half of TAW
    et0_mm: float
    need_mm: float  # Kc x ET0
    rain_mm: float  # as forecast
    rain_counted_mm: float
    irrigation_mm: float
    litres: float
    run_minutes: int
    depletion_mm: float  # Dr at the end of the day
    bucket_end_mm: float
    drained_mm: float  # water above full that left below the roots
    stale: bool


# --- One rule per function ----------------------------------------------------------


def season_day(date: datetime.date, planting_date: datetime.date) -> int:
    """Step 1: day number in the season. The planting day is day 1."""
    return (date - planting_date).days + 1


def stage_and_kc(crop: Crop, i: int) -> tuple[str, float]:
    """Step 2: the growth stage and Kc on season day i (FAO Eq. 66).
    Flat in initial and mid, straight lines in development and late, Kc end after the season."""
    initial, development, mid, late = crop.stage_days
    if i <= initial:
        return "initial", crop.kc_ini
    if i <= initial + development:
        return "development", crop.kc_ini + (i - initial) / development * (crop.kc_mid - crop.kc_ini)
    if i <= initial + development + mid:
        return "mid", crop.kc_mid
    if i <= initial + development + mid + late:
        days_into_late = i - initial - development - mid
        return "late", crop.kc_mid + days_into_late / late * (crop.kc_end - crop.kc_mid)
    return "after-season", crop.kc_end


def root_depth_m(crop: Crop, i: int) -> float:
    """Step 3: roots grow in a straight line from 0.2 m at planting to full depth at the
    start of mid-season, then stay (Annex 8, Eq. 8-3)."""
    initial, development, _, _ = crop.stage_days
    grown = min(i / (initial + development), 1)
    return ROOT_DEPTH_AT_PLANTING_M + (crop.root_depth_m - ROOT_DEPTH_AT_PLANTING_M) * grown


def counted_rain(rain_mm: float, et0_mm: float) -> float:
    """Step 6: rain counts in full, unless it's below 0.2 x ET0: then it just evaporates."""
    return rain_mm if rain_mm >= SMALL_RAIN_FRACTION * et0_mm else 0.0


def run_minutes(irrigation_mm: float, plot: PlotInputs) -> int:
    """How long the drip system runs to give `irrigation_mm` (O82), rounded up.
    litres / (emitters x flow) x 60, where emitters = area / (row spacing x emitter spacing)."""
    if irrigation_mm == 0:
        return 0
    litres = irrigation_mm * plot.area_m2
    emitters = plot.area_m2 / (plot.row_spacing_m * plot.emitter_spacing_m)
    return round_up(litres / (emitters * plot.flow_lph) * 60)


# --- The plan -------------------------------------------------------------------------


def plan_days(plot: PlotInputs, forecast: list[WeatherDay]) -> list[PlanDay]:
    """The plan, day by day. It starts with the bucket full (O76) and carries the
    depletion (Dr, mm below full) from each day to the next."""
    depletion = 0.0
    plan = []
    for day in forecast:
        i = season_day(day.date, plot.planting_date)  # step 1
        stage, kc = stage_and_kc(plot.crop, i)  # step 2
        depth = root_depth_m(plot.crop, i)  # step 3
        capacity = plot.available_water_mm_per_m * depth  # step 4: TAW
        trigger = TRIGGER_FRACTION * capacity
        need = kc * day.et0_mm  # step 5
        rain = counted_rain(day.rain_mm, day.et0_mm)  # step 6

        # Step 7: water above full drains away the same day.
        without_irrigation = depletion - rain + need
        drained = max(0.0, -without_irrigation)
        depletion = max(0.0, without_irrigation)

        # Step 8: would the bucket end the day below half? Then refill it to full today.
        irrigation = depletion if capacity - depletion < trigger else 0.0
        depletion -= irrigation

        plan.append(
            PlanDay(
                date=day.date,
                season_day=i,
                stage=stage,
                kc=kc,
                root_depth_m=depth,
                bucket_capacity_mm=capacity,
                trigger_mm=trigger,
                et0_mm=day.et0_mm,
                need_mm=need,
                rain_mm=day.rain_mm,
                rain_counted_mm=rain,
                irrigation_mm=irrigation,
                litres=irrigation * plot.area_m2,
                run_minutes=run_minutes(irrigation, plot),
                depletion_mm=depletion,
                bucket_end_mm=capacity - depletion,  # step 9
                drained_mm=drained,
                stale=day.stale,
            )
        )
    return plan


# --- Rounding (A60) -------------------------------------------------------------------


def without_float_noise(value: float) -> Decimal:
    """The value to 9 decimals, as a Decimal: 27.064999999999998 -> 27.065000000."""
    return Decimal(f"{value:.9f}")


def round_half_up(value: float, places: int) -> float:
    """Round the school way: 0.7925 -> 0.793 (3 places), 27.065 -> 27.07 (2 places)."""
    step = Decimal(1).scaleb(-places)  # 0.01 for 2 places
    return float(without_float_noise(value).quantize(step, rounding=ROUND_HALF_UP))


def round_up(value: float) -> int:
    """Round up to a whole number, ignoring float noise: 901.35 -> 902, 901.0000000001 -> 901."""
    return math.ceil(without_float_noise(value))
