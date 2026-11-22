# Five hand-calculated cases

Calculated by hand, by the owner, with the steps in `SKILL.md`. These are the planner engine's
tests (NFR-2.5: the engine must match within 0.5%). Together they cover every rule: growing roots,
the development-stage Kc ramp, an irrigation with litres and minutes, rain that refills and
drains, rain too small to count, a plot after its season, a plan that starts below full and hits the 24-hour cap (case 4), and a crop trigger of 60% (case 5).
Cases 1 to 3 use the default trigger (50%) and never reach the cap (see "Cap check" under case 3).

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

Cap check (cases 1 to 3): the cap is `flow_lph / (row_spacing_m x emitter_spacing_m) x 24`. Case 1: 1.0 / 0.6 x 24 = 40.00 mm a day, and its one irrigation is 25.04 mm (902 minutes, under 1,440), so nothing changes. Case 2: 1.6 / 0.6 x 24 = 64.00 mm; it never irrigates. Case 3: 1.0 / 0.6 x 24 = 40.00 mm; it never irrigates. No day in cases 1 to 3 is above 1,440 minutes, so all their numbers stay as they are.

## Case 4: East block (demo plot), the grower says the soil is at 37.5% (starts below full, 24-hour cap)

| Input | Value |
| --- | --- |
| Crop | `bell-pepper` (30/35/40/20 days, Kc 0.60/1.05/0.90, full root depth 0.5 m) |
| Planting date | 2026-04-12 |
| Soil | clay loam, `available_water_mm_per_m` = 200 |
| Plot | 800 m², rows 1.5 m, emitters every 0.4 m, 1.6 L/h |
| Plan starts | 2026-11-16, `start_pct` = 37.5, `trigger_pct` = 50 (default) |

Forecast: made up for this case (it is not a real forecast).

| Date | ET0 mm | Rain mm |
| --- | --- | --- |
| 2026-11-16 | 3.0 | 0 |
| 2026-11-17 | 2.5 | 0 |
| 2026-11-18 | 3.5 | 6.0 |
| 2026-11-19 | 4.0 | 0 |

The plan starts on season day i = 219 (2026-11-16 is 218 days after the planting day 2026-04-12, and the planting day is day 1), which is after the season (125 days), so Kc = 0.90 and Zr = 0.5 m on all four days: TAW = 200 x 0.5 = 100 mm, half = 50 mm.

Step 0: Dr at the start = 100 x (1 - 37.5 / 100) = 62.5 mm (the bucket holds 37.5 mm).

The drip system (step 8): drip_mm_per_hour = 1.6 / (1.5 x 0.4) = 2.6667 mm/h; max_mm_per_day = 2.6667 x 24 = 64.00 mm (response: `drip_mm_per_hour` 2.67).

| Date | i | Stage | Kc | Zr m | TAW mm | trigger mm | need mm | rain counted mm | irrigation mm | capped | litres | minutes | Dr mm | bucket_end mm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-16 | 219 | after-season | 0.900 | 0.500 | 100.00 | 50.00 | 2.70 | 0 | 64.00 | yes | 51200.0 | 1440 | 1.20 | 98.80 |
| 2026-11-17 | 220 | after-season | 0.900 | 0.500 | 100.00 | 50.00 | 2.25 | 0 | 0 | no | 0 | 0 | 3.45 | 96.55 |
| 2026-11-18 | 221 | after-season | 0.900 | 0.500 | 100.00 | 50.00 | 3.15 | 6.00 | 0 | no | 0 | 0 | 0.60 | 99.40 |
| 2026-11-19 | 222 | after-season | 0.900 | 0.500 | 100.00 | 50.00 | 3.60 | 0 | 0 | no | 0 | 0 | 4.20 | 95.80 |

Day 1 (2026-11-16): need = 0.90 x 3.0 = 2.70. Dr_end = 62.5 + 2.70 = 65.20, so the bucket would end at 100 - 65.20 = 34.80 mm, below the trigger (50). It wants to refill 65.20 mm, but the system gives at most 64.00 mm in 24 h, so it is **capped**: irrigation = min(65.20, 64.00) = 64.00 mm. Litres = 64.00 x 800 = 51,200; emitters = 800 / (1.5 x 0.4) = 1,333.33 x 1.6 L/h = 2,133.33 L/h; 51,200 / 2,133.33 x 60 = 1,440 minutes exactly (shortcut: 64.00 x 1.5 x 0.4 / 1.6 x 60 = 1,440). The depletion left is 65.20 - 64.00 = 1.20 mm, so the bucket ends at 100 - 1.20 = 98.80 mm, not full. (Before the cap this day irrigated 65.20 mm, 52,160 litres, 1,467 minutes, and ended full.)

Day 2 (2026-11-17): Dr_end = 1.20 + 2.25 = 3.45; the bucket would end at 96.55 mm, above the trigger, so no irrigation (nothing is carried over from the cap; the normal trigger decides).

Day 3 (2026-11-18): the 6.0 mm rain is not below 0.2 x 3.5 = 0.7 mm, so it counts. Dr_end = max(0, 3.45 - 6.0 + 3.15) = max(0, 0.60) = 0.60. Nothing drains, because the bucket was not full before the rain.

Day 4 (2026-11-19): Dr_end = 0.60 + 3.60 = 4.20; bucket 95.80 mm.

Old numbers (before the cap, day 1 refilled to full): day 1 irrigation 65.20, litres 52,160.0, minutes 1,467, Dr 0, bucket_end 100.00; day 2 Dr 2.25, bucket_end 97.75; day 3 Dr 0, bucket_end 100.00 (0.60 mm drained); day 4 Dr 3.60, bucket_end 96.40.

## Case 5: tomato on sand, crop trigger 60% (irrigates where 50% would not)

| Input | Value |
| --- | --- |
| Crop | `tomato` (30/40/45/30 days, Kc 0.60/1.15/0.80, full root depth 0.7 m, p 0.40) |
| Planting date | 2026-02-15 |
| Soil | sand, `available_water_mm_per_m` = 83 |
| Plot | 1000 m², rows 1.5 m, emitters every 0.4 m, 0.6 L/h (the third demo plot) |
| Plan starts | 2026-05-05, bucket full (`start_pct` = 100), `trigger_pct` = 60 (the crop value: (1 - 0.40) x 100) |

Forecast: made up for this case (it is not a real forecast).

| Date | ET0 mm | Rain mm |
| --- | --- | --- |
| 2026-05-05 | 6.4 | 0 |
| 2026-05-06 | 7.0 | 0 |
| 2026-05-07 | 7.2 | 0 |
| 2026-05-08 | 6.0 | 0 |

2026-05-05 is 79 days after the planting day 2026-02-15 (13 days to 28 Feb, 31 in March, 30 in April, 5 in May), so i = 80, and the four days are i = 80 to 83. That is mid-season (the mid stage runs from day 71 to 115), so Kc = 1.15, and the roots are at full depth (i >= 70): Zr = 0.2 + 0.5 x min(80 / 70, 1) = 0.7 m. TAW = 83 x 0.7 = 58.10 mm on all four days. Trigger at 60% = 0.60 x 58.10 = 34.86 mm; the default trigger at 50% would be 29.05 mm.

The drip system: drip_mm_per_hour = 0.6 / (1.5 x 0.4) = 1.00 mm/h; max_mm_per_day = 24.00 mm. The cap is not reached.

| Date | i | Stage | Kc | Zr m | TAW mm | trigger mm | need mm | rain counted mm | irrigation mm | capped | litres | minutes | Dr mm | bucket_end mm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-05-05 | 80 | mid | 1.150 | 0.700 | 58.10 | 34.86 | 7.36 | 0 | 0 | no | 0 | 0 | 7.36 | 50.74 |
| 2026-05-06 | 81 | mid | 1.150 | 0.700 | 58.10 | 34.86 | 8.05 | 0 | 0 | no | 0 | 0 | 15.41 | 42.69 |
| 2026-05-07 | 82 | mid | 1.150 | 0.700 | 58.10 | 34.86 | 8.28 | 0 | 23.69 | no | 23690.0 | 1422 | 0 | 58.10 |
| 2026-05-08 | 83 | mid | 1.150 | 0.700 | 58.10 | 34.86 | 6.90 | 0 | 0 | no | 0 | 0 | 6.90 | 51.20 |

Day 1: need = 1.15 x 6.4 = 7.36; Dr_end = 0 + 7.36 = 7.36; the bucket would end at 58.10 - 7.36 = 50.74 mm, above 34.86, so no irrigation.

Day 2: need = 1.15 x 7.0 = 8.05; Dr_end = 7.36 + 8.05 = 15.41; bucket 42.69 mm, above 34.86, no irrigation.

Day 3 (2026-05-07, the day that tells the triggers apart): need = 1.15 x 7.2 = 8.28; Dr_end = 15.41 + 8.28 = 23.69; the bucket would end at 58.10 - 23.69 = 34.41 mm. That is below the 60% trigger (34.86), so it irrigates 23.69 mm; it is below the 24.00 mm cap, so not capped, and the bucket is full again. With the default 50% trigger (29.05) the same 34.41 mm is above the trigger, so **nothing would be irrigated that day**. Litres = 23.69 x 1000 = 23,690; emitters = 1000 / (1.5 x 0.4) = 1,666.67 x 0.6 L/h = 1,000 L/h; 23,690 / 1,000 x 60 = 1,421.4, rounded up to 1,422 minutes (shortcut: 23.69 x 1.5 x 0.4 / 0.6 x 60 = 1,421.4).

Day 4: need = 1.15 x 6.0 = 6.90; Dr_end = 0 + 6.90 = 6.90; bucket 51.20 mm, above 34.86, no irrigation.
