# Three hand-calculated cases

Calculated by hand, by the owner, with the steps in `SKILL.md`. These are the planner engine's
tests (NFR-2.5: the engine must match within 0.5%). Together they cover every rule: growing roots,
the development-stage Kc ramp, an irrigation with litres and minutes, rain that refills and
drains, rain too small to count, and a plot after its season.

One row per day, in order. Calculated with full precision, then rounded as in `SKILL.md`
(kc 3 decimals, mm 2 decimals, litres 1 decimal, minutes rounded up). Rounding is the school way,
half up: 0.7925 is 0.793 and 27.065 is 27.07 (plain Python `round` gives 0.792 and 27.06,
because those numbers are stored as 0.79249999... and 27.064999...).
`Dr` is the depletion at the end of the day (mm below full); the next day starts from it.
`Zr` is shown to 3 decimals here only to make the rows easy to check.

## Case 1: young tomato on sand, heat wave (irrigation, growing roots)

| Input | Value |
| --- | --- |
| Crop | `tomato` (30/40/45/30 days, Kc 0.60/1.15/0.80, full root depth 0.7 m) |
| Planting date | 2026-03-02 |
| Soil | sand, `available_water_mm_per_m` = 83 |
| Plot | 1000 m², rows 1.5 m, emitters every 0.4 m, 1.0 L/h |
| Plan starts | 2026-04-10, bucket full |

| Date | ET0 mm | Rain mm |
| --- | --- | --- |
| 2026-04-10 | 6.0 | 0 |
| 2026-04-11 | 6.4 | 0 |
| 2026-04-12 | 6.8 | 0 |
| 2026-04-13 | 7.0 | 0 |
| 2026-04-14 | 6.5 | 0 |

| Date | i | Stage | Kc | Zr m | TAW mm | half mm | need mm | rain counted mm | irrigation mm | litres | minutes | Dr mm | bucket_end mm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-04-10 | 40 | development | 0.738 | 0.486 | 40.31 | 20.16 | 4.43 | 0 | 0 | 0 | 0 | 4.43 | 35.89 |
| 2026-04-11 | 41 | development | 0.751 | 0.493 | 40.91 | 20.45 | 4.81 | 0 | 0 | 0 | 0 | 9.23 | 31.67 |
| 2026-04-12 | 42 | development | 0.765 | 0.500 | 41.50 | 20.75 | 5.20 | 0 | 0 | 0 | 0 | 14.44 | 27.07 |
| 2026-04-13 | 43 | development | 0.779 | 0.507 | 42.09 | 21.05 | 5.45 | 0 | 0 | 0 | 0 | 19.89 | 22.21 |
| 2026-04-14 | 44 | development | 0.793 | 0.514 | 42.69 | 21.34 | 5.15 | 0 | 25.04 | 25037.5 | 902 | 0 | 42.69 |

On 2026-04-14 the bucket would end the day at 42.69 - 25.04 = 17.65 mm, below half (21.34), so it is refilled: 25.04 mm = 25,037.5 litres; 1,666.67 emitters x 1.0 L/h = 1,666.67 L/h; 25,037.5 / 1,666.67 x 60 = 901.35, rounded up to 902 minutes. The roots grow every day, so TAW grows while Dr carries over (the new soil is assumed full).

## Case 2: pepper in mid-season with rain (refill and drain, small rain ignored)

| Input | Value |
| --- | --- |
| Crop | `bell-pepper` (30/35/40/20 days, Kc 0.60/1.05/0.90, full root depth 0.5 m) |
| Planting date | 2026-04-01 |
| Soil | clay loam, `available_water_mm_per_m` = 200 |
| Plot | 800 m², rows 1.5 m, emitters every 0.4 m, 1.6 L/h |
| Plan starts | 2026-06-19, bucket full |

| Date | ET0 mm | Rain mm |
| --- | --- | --- |
| 2026-06-19 | 4.0 | 0 |
| 2026-06-20 | 3.0 | 12.0 |
| 2026-06-21 | 4.5 | 0.6 |
| 2026-06-22 | 5.0 | 0 |

| Date | i | Stage | Kc | Zr m | TAW mm | half mm | need mm | rain counted mm | irrigation mm | litres | minutes | Dr mm | bucket_end mm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-06-19 | 80 | mid | 1.050 | 0.500 | 100.00 | 50.00 | 4.20 | 0 | 0 | 0 | 0 | 4.20 | 95.80 |
| 2026-06-20 | 81 | mid | 1.050 | 0.500 | 100.00 | 50.00 | 3.15 | 12.00 | 0 | 0 | 0 | 0 | 100.00 |
| 2026-06-21 | 82 | mid | 1.050 | 0.500 | 100.00 | 50.00 | 4.73 | 0 | 0 | 0 | 0 | 4.73 | 95.28 |
| 2026-06-22 | 83 | mid | 1.050 | 0.500 | 100.00 | 50.00 | 5.25 | 0 | 0 | 0 | 0 | 9.98 | 90.03 |

Drained on 2026-06-20: **4.65 mm**. The bucket could take 4.20 (short of full) + 3.15 (that day's need) = 7.35 mm, and 12.00 mm fell, so 12.00 - 7.35 = 4.65 mm went below the roots (FAO Eq. 88).

On 2026-06-21 the 0.6 mm rain is below 0.2 x 4.5 = 0.9 mm, so it counts as 0.

## Case 3: North block (demo plot) after its season, real forecast of 2026-11-16

| Input | Value |
| --- | --- |
| Crop | `tomato` (30/40/45/30 days, Kc 0.60/1.15/0.80, full root depth 0.7 m) |
| Planting date | 2026-03-01 |
| Soil | loam, `available_water_mm_per_m` = 175 |
| Plot | 1000 m², rows 1.5 m, emitters every 0.4 m, 1.0 L/h |
| Plan starts | 2026-11-16, bucket full |

Forecast: weather-service's real answer for (31.25, 34.79) on 2026-11-16.

| Date | ET0 mm | Rain mm |
| --- | --- | --- |
| 2026-11-16 | 2.77 | 0 |
| 2026-11-17 | 2.62 | 0 |
| 2026-11-18 | 2.47 | 0 |
| 2026-11-19 | 3.03 | 0 |
| 2026-11-20 | 3.18 | 0 |
| 2026-11-21 | 3.13 | 0 |
| 2026-11-22 | 2.31 | 0.3 |

| Date | i | Stage | Kc | Zr m | TAW mm | half mm | need mm | rain counted mm | irrigation mm | litres | minutes | Dr mm | bucket_end mm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-16 | 261 | after-season | 0.800 | 0.700 | 122.50 | 61.25 | 2.22 | 0 | 0 | 0 | 0 | 2.22 | 120.28 |
| 2026-11-17 | 262 | after-season | 0.800 | 0.700 | 122.50 | 61.25 | 2.10 | 0 | 0 | 0 | 0 | 4.31 | 118.19 |
| 2026-11-18 | 263 | after-season | 0.800 | 0.700 | 122.50 | 61.25 | 1.98 | 0 | 0 | 0 | 0 | 6.29 | 116.21 |
| 2026-11-19 | 264 | after-season | 0.800 | 0.700 | 122.50 | 61.25 | 2.42 | 0 | 0 | 0 | 0 | 8.71 | 113.79 |
| 2026-11-20 | 265 | after-season | 0.800 | 0.700 | 122.50 | 61.25 | 2.54 | 0 | 0 | 0 | 0 | 11.26 | 111.24 |
| 2026-11-21 | 266 | after-season | 0.800 | 0.700 | 122.50 | 61.25 | 2.50 | 0 | 0 | 0 | 0 | 13.76 | 108.74 |
| 2026-11-22 | 267 | after-season | 0.800 | 0.700 | 122.50 | 61.25 | 1.85 | 0 | 0 | 0 | 0 | 15.61 | 106.89 |

The season ended on **2026-07-23**: day i = 145 (30 + 40 + 45 + 30) is the planting day + 144 days. The 0.3 mm rain on 2026-11-22 is below 0.2 x 2.31 = 0.462 mm, so it counts as 0. At about 2.2 mm a day the bucket would take about 28 days to reach half.
