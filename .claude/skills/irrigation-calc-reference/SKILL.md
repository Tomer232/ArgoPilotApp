---
name: irrigation-calc-reference
description: The irrigation formulas AgroPilot's planner-service uses, from FAO-56: crop coefficient Kc by growth stage, root depth, the soil bucket (TAW, trigger level), rain, irrigation depth with its 24-hour cap, and converting mm to litres and drip run minutes. Use whenever you write, change, test or explain any irrigation number in planner-service (kc, need_mm, bucket, irrigation_mm, litres, run_minutes), compute a plan by hand, or answer "how much / when should this plot be watered". Do not invent agronomy: every rule is here, with its source.
---

# Irrigation calculation reference

How planner-service turns a plot and a weather forecast into a daily irrigation plan.
Every rule below is a decision in `DECISIONS.md` (O76-O82, A60; O76 is superseded by step 0) and comes from FAO-56,
summarised and cited in `services/planner-service/docs/research/fao56.md`.
**Don't change a rule or a number without a new decision**: FR-2.11 says every plan
number is calculated as written here, and the five hand-calculated cases in
`references/cases.md` are the engine's tests (NFR-2.5: within 0.5%).

## Inputs

- **Plot** (registry `GET /v1/plots/{id}`): `crop_id`, `planting_date`, `soil_id`, `area_m2`,
  `row_spacing_m`, `emitter_spacing_m`, `emitter_id`, `lat`, `lon`.
- **Soil** (registry): `available_water_mm_per_m` = 1000 (theta_FC - theta_WP), FAO Eq. 82.
- **Emitter** (registry): `flow_lph`, litres per hour per emitter.
- **Forecast** (weather `GET /v1/forecast`): per day `date`, `et0_mm`, `rain_mm`, and `stale`.
- **Crop table** (in the planner, not the registry, O54). FAO Table 11 stage lengths, Table 12 Kc,
  Table 22 root depth (the smaller value, meant for scheduling):

| crop_id | Stage days: initial / development / mid / late | Kc ini / mid / end | Full root depth | p (Table 22) | Crop trigger |
| --- | --- | --- | --- | --- | --- |
| `tomato` | 30 / 40 / 45 / 30 (145) | 0.60 / 1.15 / 0.80 | 0.7 m | 0.40 | 60% |
| `bell-pepper` | 30 / 35 / 40 / 20 (125) | 0.60 / 1.05 / 0.90 | 0.5 m | 0.30 | 70% |

`p` is the fraction of TAW the crop can use up before it is stressed (FAO Table 22). The crop trigger is
the bucket level in percent of TAW below which we irrigate: `(1 - p) x 100`. It is only used when the
grower picks it; the default trigger is 50 (step 4).

No climate adjustment of Kc (it needs humidity and wind, which we don't have).

## The daily calculation

Start with step 0, once. Then, for each forecast day in order (FAO Ch. 8 water balance, single Kc), do steps 1 to 9:

0. **Starting level** `start_pct`, a number from 0 to 100 (decimals allowed): how full the bucket is at the
   start of today, in percent of TAW. 100 is full (field capacity), 0 is empty (wilting point).
   **The default is 100**, a full bucket, when the grower gives nothing.
   `Dr_start = TAW(day 1) x (1 - start_pct / 100)`, with `TAW(day 1)` from steps 3 and 4 on the first day.
   So 100 gives Dr = 0 and 0 gives Dr = TAW. Below the trigger (50 by default) the bucket is already under it, so day 1 irrigates (step 8).
   Source: the owner's decision of 2026-11-17, which supersedes O76 (always start full). The meaning of the
   percentage is USDA NRCS Program Aid 1619, "Estimating Soil Moisture by Feel and Appearance" (1998): percent
   of available water, counted down from field capacity, which is our TAW (see
   `services/planner-service/docs/research/soil-feel.md`, section 3).

1. **Season day** `i = (date - planting_date) + 1` in days. The planting day is day 1.
2. **Stage and Kc** (FAO Eq. 66), with L1..L4 the stage lengths:
   - `i <= L1`: initial, `Kc = Kc_ini`
   - `i <= L1+L2`: development, `Kc = Kc_ini + (i - L1) / L2 x (Kc_mid - Kc_ini)`
   - `i <= L1+L2+L3`: mid, `Kc = Kc_mid`
   - `i <= L1+L2+L3+L4`: late, `Kc = Kc_mid + (i - L1 - L2 - L3) / L4 x (Kc_end - Kc_mid)`
   - otherwise: after-season, `Kc = Kc_end` (keep planning; never a plan of zeros; O80)
3. **Root depth** (Annex 8 Eq. 8-3, straight line in time; O77):
   `Zr = 0.2 + (Zr_full - 0.2) x min(i / (L1 + L2), 1)` metres. Full depth from the start of mid-season.
4. **Bucket size** `TAW = available_water_mm_per_m x Zr` mm. **Trigger** `trigger = trigger_pct / 100 x TAW`,
   the bucket level below which we irrigate. `trigger_pct` is a number from 1 to 99, **default 50**, which is
   half of TAW (p = 0.5; O78). The grower may pick another: the crop value from the table above (tomato 60,
   bell pepper 70; FAO Table 22, `trigger_pct = (1 - p) x 100`) or any number from 1 to 99. FAO says p
   runs from 0.30 to 0.70 (Ch. 8, "RAW"), so 30 to 70 is the usual range; outside it the planner still
   plans, and the frontend warns. The trigger choice is the owner's decision of 2026-11-17.
   Roots growing into new soil don't change Dr: the new soil is assumed full (FAO Example 38).
5. **Crop water need** `need_mm = Kc x ET0` (FAO Eq. 58).
6. **Rain that counts**: `rain_mm` if `rain_mm >= 0.2 x ET0`, else 0. A small rain just evaporates (FAO Ch. 8).
   No runoff (Annex 8).
7. **Depletion at the end of the day, without irrigation**: `Dr_end = min(TAW, max(0, Dr_prev - rain_counted + need_mm))`.
   The `max(0, ...)`: water above full drains away the same day (FAO Eq. 86, 88). The `min(TAW, ...)`: the
   bucket can't go below empty, because the crop can't take water that isn't there (FAO Eq. 86:
   `0 <= Dr <= TAW`). So an empty start refills exactly TAW, and a capped day never ends below 0 mm.
   Source of the upper bound: the owner's decision of 2026-11-17, after QA found levels below empty (QA-1).
8. **Irrigate?** If the bucket would end the day **below the trigger** (`TAW - Dr_end < trigger`), irrigate
   today (O79; FAO: irrigation <= depletion, nothing drains). Otherwise `irrigation_mm = 0`.
   The wish is to refill to full, but a drip system can only run 24 hours a day, so there is a **cap**:
   - `drip_mm_per_hour = flow_lph / (row_spacing_m x emitter_spacing_m)`
   - `max_mm_per_day = drip_mm_per_hour x 24`
   - `irrigation_mm = min(Dr_end, max_mm_per_day)`, and `capped = Dr_end > max_mm_per_day`
   - the depletion left after irrigating is `Dr_end - irrigation_mm`: 0 when not capped, so the bucket is
     full; above 0 when capped, so the bucket ends the day below full.
   Nothing is carried over: the next day the normal trigger decides again. Source of the cap: the physics of
   the system (owner's decision of 2026-11-17), not FAO.
9. **Bucket level** `bucket_end_mm = TAW - Dr_end` (the depletion left after step 8). Carry that depletion to
   the next day.

## From mm to litres and minutes (ours, not FAO's; O82)

- `litres = irrigation_mm x area_m2` (1 mm on 1 m² is 1 litre)
- `emitters = area_m2 / (row_spacing_m x emitter_spacing_m)`. It's not rounded: it's a density times an area.
- `run_minutes = ceil(litres / (emitters x flow_lph) x 60)`, rounded **up**, so we never under-water.
  A day with no irrigation has `run_minutes = 0`. There's no drip-efficiency factor.
  A **capped** day has `run_minutes` exactly 1440 (24 h): the formula gives 1440 on paper, but float noise
  could make `ceil` give 1441, so the planner sets 1440 itself when `capped`.
- Shortcut, the same number: `run_minutes = ceil(irrigation_mm x row_spacing_m x emitter_spacing_m / flow_lph x 60)`.

## Rounding (A60)

- Calculate with full precision and round **only in the response**:
  - `kc` to 3 decimals
  - mm values to 2 decimals
  - `litres` to 1 decimal
  - `run_minutes` with `ceil`
- Round **half up**, the school way (0.7925 -> 0.793, 27.065 -> 27.07), with `Decimal`.
- Floats carry noise: 0.7925 is stored as 0.79249999..., and 41.5 - 14.435 comes out as
  27.064999999999998. So first write the value with **9 decimals** (`f"{x:.9f}"` gives 27.065000000),
  then round half up. Plain `round()`, or `Decimal(x)` straight from the float, gives 0.792 and 27.06,
  and the engine wouldn't match the hand-calculated cases.
- The same 9-decimal step comes before `ceil`, so 901.0000000001 minutes is 901, not 902.

## Checking your work

`references/cases.md` has five cases, calculated by hand (case 4 starts at 37.5% and hits the 24-hour cap, case 5
uses trigger 60, the others start full with trigger 50). A change to the engine must still match all five
within 0.5%. When a number surprises you, recompute one day by hand with the
steps above before changing code.
