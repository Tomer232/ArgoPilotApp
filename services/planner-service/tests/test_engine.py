"""engine.py: the irrigation calculation, checked against the owner's five hand-calculated
cases (.claude/skills/irrigation-calc-reference/references/cases.md) and the rules' edges."""

import dataclasses
import datetime

import pytest

from engine import (
    CROPS,
    PlotInputs,
    WeatherDay,
    counted_rain,
    drip_mm_per_hour,
    plan_days,
    root_depth_m,
    round_half_up,
    round_up,
    season_day,
    stage_and_kc,
)

TOMATO = CROPS["tomato"]
PEPPER = CROPS["bell-pepper"]


def weather(first: str, et0: list[float], rain: list[float]) -> list[WeatherDay]:
    """Forecast days from `first` on, one per ET0/rain pair."""
    start = datetime.date.fromisoformat(first)
    return [
        WeatherDay(start + datetime.timedelta(days=n), et0_mm=e, rain_mm=r, stale=False)
        for n, (e, r) in enumerate(zip(et0, rain))
    ]


def as_table_row(day) -> tuple:
    """A plan day rounded like the hand-calculated tables:
    (date, i, stage, kc, Zr, TAW, half, need, rain counted, irrigation, litres, minutes, Dr, bucket_end)."""
    return (
        day.date.isoformat(),
        day.season_day,
        day.stage,
        round_half_up(day.kc, 3),
        round_half_up(day.root_depth_m, 3),
        round_half_up(day.bucket_capacity_mm, 2),
        round_half_up(day.trigger_mm, 2),
        round_half_up(day.need_mm, 2),
        round_half_up(day.rain_counted_mm, 2),
        round_half_up(day.irrigation_mm, 2),
        round_half_up(day.litres, 1),
        day.run_minutes,
        round_half_up(day.depletion_mm, 2),
        round_half_up(day.bucket_end_mm, 2),
    )


# --- The five hand-calculated cases (rows copied from cases.md) -------------------


def test_case_1_young_tomato_on_sand():
    plot = PlotInputs(
        crop=TOMATO,
        planting_date=datetime.date(2026, 3, 2),
        available_water_mm_per_m=83,
        area_m2=1000,
        row_spacing_m=1.5,
        emitter_spacing_m=0.4,
        flow_lph=1.0,
    )
    days = plan_days(plot, weather("2026-04-10", [6.0, 6.4, 6.8, 7.0, 6.5], [0, 0, 0, 0, 0]))
    assert [as_table_row(d) for d in days] == [
        ("2026-04-10", 40, "development", 0.738, 0.486, 40.31, 20.16, 4.43, 0, 0, 0, 0, 4.43, 35.89),
        ("2026-04-11", 41, "development", 0.751, 0.493, 40.91, 20.45, 4.81, 0, 0, 0, 0, 9.23, 31.67),
        ("2026-04-12", 42, "development", 0.765, 0.500, 41.50, 20.75, 5.20, 0, 0, 0, 0, 14.44, 27.07),
        ("2026-04-13", 43, "development", 0.779, 0.507, 42.09, 21.05, 5.45, 0, 0, 0, 0, 19.89, 22.21),
        ("2026-04-14", 44, "development", 0.793, 0.514, 42.69, 21.34, 5.15, 0, 25.04, 25037.5, 902, 0, 42.69),
    ]


def test_case_2_pepper_with_rain():
    plot = PlotInputs(
        crop=PEPPER,
        planting_date=datetime.date(2026, 4, 1),
        available_water_mm_per_m=200,
        area_m2=800,
        row_spacing_m=1.5,
        emitter_spacing_m=0.4,
        flow_lph=1.6,
    )
    days = plan_days(plot, weather("2026-06-19", [4.0, 3.0, 4.5, 5.0], [0, 12.0, 0.6, 0]))
    assert [as_table_row(d) for d in days] == [
        ("2026-06-19", 80, "mid", 1.050, 0.500, 100.00, 50.00, 4.20, 0, 0, 0, 0, 4.20, 95.80),
        ("2026-06-20", 81, "mid", 1.050, 0.500, 100.00, 50.00, 3.15, 12.00, 0, 0, 0, 0, 100.00),
        ("2026-06-21", 82, "mid", 1.050, 0.500, 100.00, 50.00, 4.73, 0, 0, 0, 0, 4.73, 95.28),
        ("2026-06-22", 83, "mid", 1.050, 0.500, 100.00, 50.00, 5.25, 0, 0, 0, 0, 9.98, 90.03),
    ]
    assert round_half_up(days[1].drained_mm, 2) == 4.65


def test_case_3_north_block_after_its_season():
    plot = PlotInputs(
        crop=TOMATO,
        planting_date=datetime.date(2026, 3, 1),
        available_water_mm_per_m=175,
        area_m2=1000,
        row_spacing_m=1.5,
        emitter_spacing_m=0.4,
        flow_lph=1.0,
    )
    et0 = [2.77, 2.62, 2.47, 3.03, 3.18, 3.13, 2.31]
    days = plan_days(plot, weather("2026-11-16", et0, [0, 0, 0, 0, 0, 0, 0.3]))
    after = ("after-season", 0.800, 0.700, 122.50, 61.25)
    assert [as_table_row(d) for d in days] == [
        ("2026-11-16", 261, *after, 2.22, 0, 0, 0, 0, 2.22, 120.28),
        ("2026-11-17", 262, *after, 2.10, 0, 0, 0, 0, 4.31, 118.19),
        ("2026-11-18", 263, *after, 1.98, 0, 0, 0, 0, 6.29, 116.21),
        ("2026-11-19", 264, *after, 2.42, 0, 0, 0, 0, 8.71, 113.79),
        ("2026-11-20", 265, *after, 2.54, 0, 0, 0, 0, 11.26, 111.24),
        ("2026-11-21", 266, *after, 2.50, 0, 0, 0, 0, 13.76, 108.74),
        ("2026-11-22", 267, *after, 1.85, 0, 0, 0, 0, 15.61, 106.89),
    ]


def test_case_4_east_block_starting_at_37_5_percent():
    plot = PlotInputs(
        crop=PEPPER,
        planting_date=datetime.date(2026, 4, 12),
        available_water_mm_per_m=200,
        area_m2=800,
        row_spacing_m=1.5,
        emitter_spacing_m=0.4,
        flow_lph=1.6,
    )
    days = plan_days(plot, weather("2026-11-16", [3.0, 2.5, 3.5, 4.0], [0, 0, 6.0, 0]), start_pct=37.5)
    after = ("after-season", 0.900, 0.500, 100.00, 50.00)
    assert [as_table_row(d) for d in days] == [
        ("2026-11-16", 219, *after, 2.70, 0, 64.00, 51200.0, 1440, 1.20, 98.80),
        ("2026-11-17", 220, *after, 2.25, 0, 0, 0, 0, 3.45, 96.55),
        ("2026-11-18", 221, *after, 3.15, 6.00, 0, 0, 0, 0.60, 99.40),
        ("2026-11-19", 222, *after, 3.60, 0, 0, 0, 0, 4.20, 95.80),
    ]
    assert [d.capped for d in days] == [True, False, False, False]
    assert drip_mm_per_hour(plot) == pytest.approx(1.6 / 0.6)


def test_case_5_tomato_on_sand_with_trigger_60():
    plot = PlotInputs(
        crop=TOMATO,
        planting_date=datetime.date(2026, 2, 15),
        available_water_mm_per_m=83,
        area_m2=1000,
        row_spacing_m=1.5,
        emitter_spacing_m=0.4,
        flow_lph=0.6,
    )
    days = plan_days(plot, weather("2026-05-05", [6.4, 7.0, 7.2, 6.0], [0, 0, 0, 0]), trigger_pct=60)
    mid = ("mid", 1.150, 0.700, 58.10, 34.86)
    assert [as_table_row(d) for d in days] == [
        ("2026-05-05", 80, *mid, 7.36, 0, 0, 0, 0, 7.36, 50.74),
        ("2026-05-06", 81, *mid, 8.05, 0, 0, 0, 0, 15.41, 42.69),
        ("2026-05-07", 82, *mid, 8.28, 0, 23.69, 23690.0, 1422, 0, 58.10),
        ("2026-05-08", 83, *mid, 6.90, 0, 0, 0, 0, 6.90, 51.20),
    ]
    assert [d.capped for d in days] == [False, False, False, False]


def test_case_5_with_the_default_trigger_does_not_irrigate_on_day_three():
    """The same plan with trigger 50 (29.05 mm): day 3 ends at 34.41, above it, so no irrigation."""
    plot = PlotInputs(
        crop=TOMATO,
        planting_date=datetime.date(2026, 2, 15),
        available_water_mm_per_m=83,
        area_m2=1000,
        row_spacing_m=1.5,
        emitter_spacing_m=0.4,
        flow_lph=0.6,
    )
    days = plan_days(plot, weather("2026-05-05", [6.4, 7.0, 7.2, 6.0], [0, 0, 0, 0]))
    assert round_half_up(days[2].bucket_end_mm, 2) == 34.41
    assert days[2].irrigation_mm == 0


# --- Edges of each rule ---------------------------------------------------------------


def test_planting_day_is_day_one():
    assert season_day(datetime.date(2026, 3, 1), planting_date=datetime.date(2026, 3, 1)) == 1


@pytest.mark.parametrize(
    "i, stage, kc",
    [
        (1, "initial", 0.60),
        (30, "initial", 0.60),  # last initial day
        (31, "development", 0.60 + 1 / 40 * 0.55),  # first development day
        (70, "development", 1.15),  # end of the ramp reaches Kc mid
        (71, "mid", 1.15),
        (115, "mid", 1.15),
        (116, "late", 1.15 + 1 / 30 * (0.80 - 1.15)),
        (145, "late", 0.80),  # last season day reaches Kc end
        (146, "after-season", 0.80),
        (400, "after-season", 0.80),
    ],
)
def test_tomato_stages_and_kc(i, stage, kc):
    found_stage, found_kc = stage_and_kc(TOMATO, i)
    assert found_stage == stage
    assert found_kc == pytest.approx(kc)


@pytest.mark.parametrize("i, depth", [(1, 0.2 + 0.5 / 70), (35, 0.45), (70, 0.7), (71, 0.7), (300, 0.7)])
def test_tomato_root_depth_grows_until_mid_season(i, depth):
    assert root_depth_m(TOMATO, i) == pytest.approx(depth)


@pytest.mark.parametrize(
    "rain, et0, counted",
    [(1.0, 5.0, 1.0), (0.99, 5.0, 0.0), (0.0, 5.0, 0.0), (12.0, 3.0, 12.0)],
    ids=["exactly 0.2 x ET0 counts", "just below is ignored", "no rain", "big rain"],
)
def test_counted_rain(rain, et0, counted):
    assert counted_rain(rain, et0) == counted


def plot_on(soil_mm_per_m: float) -> PlotInputs:
    """A full-grown tomato plot (planted long ago) on the given soil."""
    return PlotInputs(
        crop=TOMATO,
        planting_date=datetime.date(2025, 1, 1),
        available_water_mm_per_m=soil_mm_per_m,
        area_m2=100,
        row_spacing_m=1.0,
        emitter_spacing_m=0.5,
        flow_lph=2.0,
    )


def test_exactly_half_is_not_below_half():
    """TAW 100 x 0.7 = 70, half 35. Need 35 in one day ends at exactly half: no irrigation."""
    [day] = plan_days(plot_on(100), weather("2026-11-16", [35 / 0.8], [0]))
    assert day.bucket_end_mm == pytest.approx(35)
    assert day.irrigation_mm == 0
    assert day.run_minutes == 0


def test_below_half_refills_to_full():
    [day] = plan_days(plot_on(100), weather("2026-11-16", [36 / 0.8], [0]))
    assert day.irrigation_mm == pytest.approx(36)
    assert day.bucket_end_mm == pytest.approx(70)
    assert day.depletion_mm == 0
    # 36 mm x 1.0 m x 0.5 m / 2.0 L/h x 60 = 540 minutes
    assert day.run_minutes == 540


def test_irrigation_never_drains():
    """Refill only up to full: nothing goes below the roots on an irrigation day."""
    [day] = plan_days(plot_on(100), weather("2026-11-16", [50], [0]))
    assert day.irrigation_mm == pytest.approx(40)
    assert day.drained_mm == 0


def test_start_100_is_the_same_plan_as_no_start():
    """The default start is full: passing 100 changes nothing, to the last decimal."""
    days = weather("2026-11-16", [3, 4, 5, 6, 7, 8, 9], [0, 0, 1, 0, 0, 0, 0])
    assert plan_days(plot_on(100), days, start_pct=100) == plan_days(plot_on(100), days)


def test_start_below_half_irrigates_on_day_one_and_refills_to_full():
    """TAW 70, start 40 % is Dr 42. Need 2.4 ends day 1 at 70 - 44.4 = 25.6, below half 35."""
    [day] = plan_days(plot_on(100), weather("2026-11-16", [3.0], [0]), start_pct=40)
    assert day.irrigation_mm == pytest.approx(44.4)
    assert day.bucket_end_mm == pytest.approx(70)
    assert day.depletion_mm == 0


def test_start_0_begins_with_depletion_equal_to_taw():
    """Empty bucket, no rain: Dr = TAW 70, and the day's need 2.4 can't empty it further
    (FAO Eq. 86, QA-1), so Dr stays 70 and irrigation refills 70."""
    [day] = plan_days(plot_on(100), weather("2026-11-16", [3.0], [0]), start_pct=0)
    assert day.irrigation_mm == pytest.approx(70)
    assert day.bucket_end_mm == pytest.approx(70)


def test_start_above_half_can_stay_dry():
    """Start 90 % is Dr 7, need 2.4 ends at 60.6, above half: no irrigation, bucket 60.6."""
    [day] = plan_days(plot_on(100), weather("2026-11-16", [3.0], [0]), start_pct=90)
    assert day.irrigation_mm == 0
    assert day.bucket_end_mm == pytest.approx(60.6)


def test_capped_day_is_exactly_1440_minutes_and_ends_below_full():
    """plot_on: 2 L/h over 1.0 x 0.5 m is 4 mm/h, so 96 mm a day at most. TAW 70 here, so use a
    bigger soil: 200 mm/m gives TAW 140 and an empty start (Dr 140; the need 2.4 can't go below empty)
    wants 140 > 96."""
    [day] = plan_days(plot_on(200), weather("2026-11-16", [3.0], [0]), start_pct=0)
    assert day.capped is True
    assert day.irrigation_mm == pytest.approx(96)
    assert day.run_minutes == 1440
    assert day.depletion_mm == pytest.approx(140 - 96)
    assert day.bucket_end_mm == pytest.approx(96)


def test_the_day_after_a_capped_day_irrigates_only_below_the_trigger():
    """Day 1 is capped and ends at 96 of 140 (above the 70 trigger): day 2 waters nothing."""
    days = plan_days(plot_on(200), weather("2026-11-16", [3.0, 3.0], [0, 0]), start_pct=0)
    assert [d.capped for d in days] == [True, False]
    assert days[1].irrigation_mm == 0
    assert days[1].run_minutes == 0


def test_exactly_the_cap_is_not_capped():
    """Flow 1.0 L/h over 1.0 x 0.5 m is 2 mm/h, 48 mm a day. A full bucket and a need of exactly
    48 mm (ET0 60 x Kc 0.8) wants 48: not above the cap, so not capped, and 1440 minutes by the formula."""
    plot = dataclasses.replace(plot_on(100), flow_lph=1.0)
    [day] = plan_days(plot, weather("2026-11-16", [60.0], [0]))
    assert day.irrigation_mm == pytest.approx(48)
    assert day.capped is False
    assert day.run_minutes == 1440


def test_a_higher_trigger_irrigates_where_half_would_not():
    """TAW 70: need 2.4 on a full bucket ends at 67.6. Trigger 98 (68.6 mm) is above that: irrigate 2.4."""
    [day] = plan_days(plot_on(100), weather("2026-11-16", [3.0], [0]), trigger_pct=98)
    assert day.irrigation_mm == pytest.approx(2.4)
    assert day.capped is False
    [half] = plan_days(plot_on(100), weather("2026-11-16", [3.0], [0]))
    assert half.irrigation_mm == 0


def test_stale_flag_is_carried_per_day():
    days = weather("2026-11-16", [3, 3], [0, 0])
    days[1] = WeatherDay(days[1].date, 3, 0, stale=True)
    assert [d.stale for d in plan_days(plot_on(100), days)] == [False, True]


# --- Rounding (A60) -------------------------------------------------------------------


@pytest.mark.parametrize(
    "value, places, rounded",
    [
        (0.7925, 3, 0.793),  # stored as 0.79249999...
        (41.5 - 14.435, 2, 27.07),  # computed as 27.064999999999998
        (4.725, 2, 4.73),
        (2.5, 0, 3.0),  # half up, not Python's half-to-even
        (1.0049, 2, 1.0),
    ],
)
def test_round_half_up(value, places, rounded):
    assert round_half_up(value, places) == rounded


@pytest.mark.parametrize("value, minutes", [(901.35, 902), (901.0000000001, 901), (720.0, 720), (0.01, 1)])
def test_round_up(value, minutes):
    assert round_up(value) == minutes


def test_bucket_never_goes_below_empty():
    """QA-1, FAO Eq. 86 (0 <= Dr <= TAW). A drip far too slow for the need: 0.02 L/h over 1.0 x 0.5 m
    is 0.04 mm/h, 0.96 mm a day; tomato need 0.8 x 3 = 2.4 mm. Empty start, TAW 70.
    Each day Dr would be 70 + 2.4 but stops at 70 (the crop can't take water that isn't there),
    the cap gives 0.96, so every day ends at 0.96 mm, never below 0."""
    slow = dataclasses.replace(plot_on(100), flow_lph=0.02)
    days = plan_days(slow, weather("2026-11-16", [3.0, 3.0, 3.0], [0, 0, 0]), start_pct=0)
    assert [d.capped for d in days] == [True, True, True]
    for day in days:
        assert day.irrigation_mm == pytest.approx(0.96)
        assert day.depletion_mm == pytest.approx(70 - 0.96)
        assert day.bucket_end_mm == pytest.approx(0.96)
