---
name: irrigation-calc-reference
description: The irrigation formulas AgroPilot's planner-service uses, from FAO-56: crop coefficient Kc by growth stage, root depth, the soil bucket (TAW, half-full trigger), rain, irrigation depth, and converting mm to litres and drip run minutes. Use whenever you write, change, test or explain any irrigation number in planner-service (kc, need_mm, bucket, irrigation_mm, litres, run_minutes), compute a plan by hand, or answer "how much / when should this plot be watered". Do not invent agronomy: every rule is here, with its source.
---

# Irrigation calculation reference

How planner-service turns a plot and a weather forecast into a daily irrigation plan.
Every rule below is a decision in `DECISIONS.md` (O76-O82, A60) and comes from FAO-56,
summarised and cited in `services/planner-service/docs/research/fao56.md`.
**Don't change a rule or a number without a new decision**: FR-2.11 says every plan
number is calculated as written here, and the three hand-calculated cases in
`references/cases.md` are the engine's tests (NFR-2.5: within 0.5%).

## Inputs

- **Plot** (registry `GET /v1/plots/{id}`): `crop_id`, `planting_date`, `soil_id`, `area_m2`,
  `row_spacing_m`, `emitter_spacing_m`, `emitter_id`, `lat`, `lon`.
- **Soil** (registry): `available_water_mm_per_m` = 1000 (theta_FC - theta_WP), FAO Eq. 82.
- **Emitter** (registry): `flow_lph`, litres per hour per emitter.
- **Forecast** (weather `GET /v1/forecast`): per day `date`, `et0_mm`, `rain_mm`, and `stale`.
- **Crop table** (in the planner, not the registry, O54). FAO Table 11 stage lengths, Table 12 Kc,
  Table 22 root depth (the smaller value, meant for scheduling):

| crop_id | Stage days: initial / development / mid / late | Kc ini / mid / end | Full root depth |
| --- | --- | --- | --- |
| `tomato` | 30 / 40 / 45 / 30 (145) | 0.60 / 1.15 / 0.80 | 0.7 m |
| `bell-pepper` | 30 / 35 / 40 / 20 (125) | 0.60 / 1.05 / 0.90 | 0.5 m |

No climate adjustment of Kc (it needs humidity and wind, which we don't have).

## The daily calculation

The plan starts **today, with the bucket full** (depletion Dr = 0; O76). Then, for each forecast
day in order (FAO Ch. 8 water balance, single Kc):

1. **Season day** `i = (date - planting_date) + 1` in days. The planting day is day 1.
2. **Stage and Kc** (FAO Eq. 66), with L1..L4 the stage lengths:
   - `i <= L1`: initial, `Kc = Kc_ini`
   - `i <= L1+L2`: development, `Kc = Kc_ini + (i - L1) / L2 x (Kc_mid - Kc_ini)`
   - `i <= L1+L2+L3`: mid, `Kc = Kc_mid`
   - `i <= L1+L2+L3+L4`: late, `Kc = Kc_mid + (i - L1 - L2 - L3) / L4 x (Kc_end - Kc_mid)`
   - otherwise: after-season, `Kc = Kc_end` (keep planning; never a plan of zeros; O80)
3. **Root depth** (Annex 8 Eq. 8-3, straight line in time; O77):
   `Zr = 0.2 + (Zr_full - 0.2) x min(i / (L1 + L2), 1)` metres. Full depth from the start of mid-season.
4. **Bucket size** `TAW = available_water_mm_per_m x Zr` mm. **Trigger** `half = 0.5 x TAW` (p = 0.5; O78).
   Roots growing into new soil don't change Dr: the new soil is assumed full (FAO Example 38).
5. **Crop water need** `need_mm = Kc x ET0` (FAO Eq. 58).
6. **Rain that counts**: `rain_mm` if `rain_mm >= 0.2 x ET0`, else 0. A small rain just evaporates (FAO Ch. 8).
   No runoff (Annex 8).
7. **Depletion at the end of the day, without irrigation**: `Dr_end = max(0, Dr_prev - rain_counted + need_mm)`.
   The `max(0, ...)`: water above full drains away the same day (FAO Eq. 86, 88).
8. **Irrigate?** If the bucket would end the day **below half** (`TAW - Dr_end < half`), irrigate today
   `irrigation_mm = Dr_end`, which refills it to full, so `Dr_end = 0` (O79; FAO: irrigation <= depletion,
   nothing drains). Otherwise `irrigation_mm = 0`.
9. **Bucket level** `bucket_end_mm = TAW - Dr_end`. Carry `Dr_end` to the next day.

## From mm to litres and minutes (ours, not FAO's; O82)

- `litres = irrigation_mm x area_m2` (1 mm on 1 m² is 1 litre)
- `emitters = area_m2 / (row_spacing_m x emitter_spacing_m)`. It's not rounded: it's a density times an area.
- `run_minutes = ceil(litres / (emitters x flow_lph) x 60)`, rounded **up**, so we never under-water.
  A day with no irrigation has `run_minutes = 0`. There's no drip-efficiency factor.
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

`references/cases.md` has three cases, calculated by hand. A change to the engine must still
match all three within 0.5%. When a number surprises you, recompute one day by hand with the
steps above before changing code.
