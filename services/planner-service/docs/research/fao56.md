# FAO-56: from ET0 to a daily irrigation schedule

Research note for the planner service. Source: Allen, Pereira, Raes, Smith (1998), *Crop evapotranspiration*, FAO Irrigation and Drainage Paper 56 ("FAO-56"). Every claim below cites the chapter, equation, table, example or box it comes from. Notes that are mine, not FAO's, are labeled **[note]**.

## Summary

The crop's water use under good conditions is ETc = Kc x ET0, where Kc follows a four-stage curve: flat at Kc ini, a straight ramp up to Kc mid, flat at Kc mid, a straight ramp down to Kc end (Ch. 6, Eq. 58, Eq. 66). The root zone is treated as a bucket. Each day you track the depletion Dr (mm below field capacity): rain, irrigation and capillary rise lower it, crop ET raises it, and anything above field capacity drains away the same day (Ch. 8, Eq. 85, Eq. 86, Eq. 88). The bucket holds TAW = 1000 (theta_FC - theta_WP) Zr mm, of which the crop can use RAW = p x TAW without stress (Eq. 82, Eq. 83). Irrigate when Dr reaches RAW, with a net depth no larger than Dr, so nothing percolates (Ch. 8, "Forecasting or allocating irrigations"). Annex 8 does exactly this: at the end of each day, if depletion exceeds RAW, it applies a net depth equal to that depletion early the next day (refill to field capacity). For drip and other high-frequency micro-irrigation, FAO recommends the dual coefficient (Kc = Kcb + Ke) over the single Kc (Table 10).

## 1. From ET0 and Kc to crop water need

### ETc = Kc x ET0

- ETc = Kc x ET0, ETc and ET0 in mm/day, Kc dimensionless (Ch. 5, Eq. 56; repeated as Ch. 6, Eq. 58).
- Kc is the ratio of crop ET to grass reference ET. It folds in four differences from grass: crop height, albedo, canopy resistance and soil evaporation (Ch. 5, "Crop coefficient approach").
- This ETc is for **standard conditions**: large fields, no water, salinity, disease or density limits. Any limitation gives ETc adj instead (Ch. 5, "Crop coefficient approach"; Ch. 8).
- Kc values are grass-based. Do not mix them with alfalfa-reference ET (Ch. 6, "Alfalfa-based crop coefficients", Eq. 67).

### Single vs dual crop coefficient

- **Single Kc**: transpiration and soil evaporation merged into one time-averaged coefficient (Ch. 5, "Single crop coefficient approach").
- **Dual**: Kc = Kcb + Ke, where Kcb is the basal (transpiration) coefficient with a dry soil surface and Ke is soil evaporation after wetting (Ch. 5, Eq. 57).
- Selection criteria (Ch. 5, Table 10):

| | Single Kc | Dual Kcb + Ke |
|---|---|---|
| Purpose | irrigation planning and design; irrigation management; basic irrigation schedules; real-time scheduling for non-frequent applications (surface and sprinkler) | research; real-time irrigation scheduling; scheduling for **high-frequency application (microirrigation** and automated sprinkler); supplemental irrigation; detailed soil and hydrologic water balance studies |
| Time step | daily, 10-day, monthly | daily |
| Solution method | graphical, pocket calculator, computer | computer |

- The single Kc is meant for weekly or longer periods, though the calculation can run daily. It fits systems where irrigations are several days apart, often ten days or more (Ch. 5, "Single crop coefficient approach").
- The dual approach is "best for real time irrigation scheduling ... This is the case for high frequency irrigation with microirrigation systems" (Ch. 5, "Dual crop coefficient approach").
- Ch. 6 adds: for normal planning, basic schedules and most water-balance studies, average (single) coefficients are "relevant and more convenient". Use Kcb + Ke only when daily values are needed for specific fields and years (Ch. 6, introduction).

### The Kc curve

- Four stages (Ch. 5, "Crop growth stages"):
  - **initial**: planting to about 10% ground cover;
  - **development**: 10% cover to effective full cover (often the start of flowering);
  - **mid-season**: effective full cover to the start of maturity;
  - **late season**: start of maturity to harvest or full senescence.
- Only three values are needed: Kc ini, Kc mid, Kc end. The curve is built in three steps (Ch. 6, "Construction of the Kc curve", Figure 34):
  1. set the stage lengths and take the three Kc values from Table 12;
  2. adjust them for wetting frequency and climate;
  3. draw a horizontal line through Kc ini (initial) and Kc mid (mid-season), and straight lines from Kc ini to Kc mid (development) and from Kc mid to Kc end (late season).

### Daily Kc (linear interpolation)

Ch. 6, Eq. 66:

    Kc_i = Kc_prev + [ (i - sum(L_prev)) / L_stage ] x (Kc_next - Kc_prev)

- i: day number in the growing season (1 .. season length);
- L_stage: length of the current stage (days);
- sum(L_prev): sum of the lengths of all earlier stages (days);
- Kc_prev: Kc at the end of the previous stage; Kc_next: Kc at the start of the next stage (Kc end for the late stage).
- In the initial and mid-season stages Kc is constant. "Equation 66 applies to all four stages" (Ch. 6, "Numerical determination of Kc").
- Worked example: dry beans, stages 25/25/30/20 days, Kc 0.15 / 1.19 / 0.35:
  - day 40: 0.15 + [(40 - 25)/25] (1.19 - 0.15) = 0.77;
  - day 95: 1.19 + [(95 - 80)/20] (0.35 - 1.19) = 0.56;
  - so the four requested days give 0.15, 0.77, 1.19 and 0.56 (Ch. 6, Example 28).
- Annex 8 does the same in a spreadsheet: nested IFs choose the stage, with linear interpolation in development and late season (Annex 8, Box 8.1, column O and footnote 2).

### Climatic adjustment of Kc mid and Kc end

Table 12 values assume a sub-humid climate: RHmin about 45% and u2 about 2 m/s (Ch. 6, Table 12 title and the text after it). For other climates:

    Kc_mid = Kc_mid(Tab) + [0.04 (u2 - 2) - 0.004 (RHmin - 45)] x (h / 3)^0.3        (Ch. 6, Eq. 62)
    Kc_end = Kc_end(Tab) + [0.04 (u2 - 2) - 0.004 (RHmin - 45)] x (h / 3)^0.3        (Ch. 6, Eq. 65)

- u2: mean daily wind speed at 2 m over grass for that stage (m/s), valid for 1 to 6 m/s;
- RHmin: mean daily minimum relative humidity for that stage (%), valid for 20 to 80%;
- h: mean plant height for that stage (m), valid for 0.1 to 10 m (Ch. 6, after Eq. 62 and Eq. 65).
- Eq. 65 is applied only when the Table 12 Kc end is above 0.45. Below that, no adjustment is made (Ch. 6, after Figure 34).
- RHmin = 100 x e°(Tdew) / e°(Tmax) (Eq. 63). Without dewpoint data, use Tmin in place of Tdew (Eq. 64). In arid and semi-arid climates, subtract 2 °C from Tmin first (Ch. 6, footnote to Eq. 64, citing Annex 6, Eq. 6-6). Annex 8 computes RHmin daily in exactly this way (Box 8.1, cell K14 = I14/J14*100, labeled Eq. 63).
- u2 and RHmin should be averages over the mid-season (for Kc mid) or the late season (for Kc end) (Ch. 6, text after Figure 32). Annex 8 computes the mid-season averages automatically (Box 8.1, cells K8 and K9).
- Without local data, Table 15 gives typical wind values and Table 16 typical RHmin values. Arid is 20%, semi-arid 30%, sub-humid 45%, humid 70% and very humid 80% (Ch. 6, Tables 15 and 16).
- Wetting frequency: if irrigation is more often than every 3 days and the Table 12 Kc mid is below 1.0, it can be replaced by about 1.1 to 1.3. This applies especially where f_w > 0.3 (Ch. 6, "Adjustment for frequency of wetting"). Tomato (1.15) and pepper (1.05) are already at or above 1.0, so this rule does not apply to them.
- Source quirk: the text says Box 14 shows tomato Kc mid in different climates, but Box 14 as published is titled and computed for wheat (Ch. 6, Box 14).

### Kc ini and wetting frequency; partial wetting (drip)

- Table 12 Kc ini values are approximations for planning only. For several crop groups a single value covers the whole group (Ch. 6, "Kc ini - Calculation procedure").
- Kc ini depends on the interval between wettings, ET0 and the size of each wetting. It ranges from 0.1 to 1.15 (Ch. 6, same section; Ch. 5, Table 9).
- Figure 29 covers light wettings (10 mm or less), including high-frequency micro-irrigation. Figure 30 covers heavy wettings (40 mm or more), with separate curves for coarse soils and for medium/fine soils. Between 10 and 40 mm, interpolate (Ch. 6, Eq. 59):

      Kc_ini = Kc_ini(Fig29) + [(I - 10) / (40 - 10)] x [Kc_ini(Fig30) - Kc_ini(Fig29)]       (I = average infiltration depth, mm)

- **Partial wetting** (Ch. 6, "Adjustment for partial wetting by irrigation"):
  - "for a trickle irrigation system, the fraction of the surface wetted, f_w, may be only 0.4";
  - adjust with Kc_ini = f_w x Kc_ini(Tab, Fig) (Eq. 60);
  - before choosing between Figures 29 and 30, convert the field depth to the depth on the wetted part: I_w = I / f_w (Eq. 61).
- Worked example (Ch. 6, Example 26): trickle irrigation every 2 days, 12 mm field-equivalent, f_w = 0.4, ET0 = 4 mm/day, medium soil.
  - I_w = 12 / 0.4 = 30 mm.
  - Fig. 29 gives 0.85 and Fig. 30b gives 1.15.
  - Eq. 59: 0.85 + (20/30)(0.30) = 1.05.
  - Eq. 60: 0.4 x 1.05 = 0.42.
  - ETc = 0.42 x 4 = 1.7 mm/day.
- Mixing rain and irrigation: weight f_w by the infiltration depth from each source (Ch. 6, after Eq. 61; Ch. 7, "f_w").
- Table 20 (Ch. 7) gives f_w: precipitation, sprinkler, basin and border 1.0; furrow 0.3 to 1.0 depending on layout; **trickle irrigation 0.3 to 0.4**.
- Drip in the dual method (Ch. 7, after Eq. 75): emitters under the canopy wet shaded soil, so f_w "may need to be reduced to about one-half to one-third" of the Table 20 value. A general approach is to multiply f_w by [1 - (2/3) f_c]. Ch. 7, Example 34 (drip cotton) uses f_w = 0.3, f_c = 0.53 and gets f_ew = 0.19.

### ETc under water stress (Ks)

- Dual: ETc adj = (Ks x Kcb + Ke) x ET0 (Ch. 8, Eq. 80).
- Single: ETc adj = Ks x Kc x ET0 (Ch. 8, Eq. 81).
- Ks = 1 means no stress; Ks < 1 when soil water limits uptake (Ch. 8, introduction).
- Eq. 80 is "generally more valid" because Ks affects only transpiration. Eq. 81 gives reasonable results where soil evaporation is a small part of ETc (Ch. 8, introduction).
- Ks itself is defined in section 3 (Eq. 84).

## 2. Tomato and bell pepper numbers

### Kc and height (Ch. 6, Table 12)

Group b, "Vegetables - Solanum Family (Solanaceae)". The group row gives Kc ini 0.6, Kc mid 1.15, Kc end 0.80. The crop rows leave Kc ini blank, so the group value applies. FAO says that where only one Kc ini is listed for a group, it is "representative of the whole group" (Ch. 6, "Kc ini - Calculation procedure").

| Crop | Kc ini | Kc mid | Kc end | Max crop height h (m) |
|---|---|---|---|---|
| Sweet Peppers (bell) | 0.6 (group) | 1.05 (footnote 2) | 0.90 | 0.7 |
| Tomato | 0.6 (group) | 1.15 (footnote 2) | 0.70-0.90 | 0.6 |

Footnotes that apply (Table 12):

- **Footnote 1 (on Kc ini)**: general values for typical irrigation and soil wetting. With frequent wetting (high-frequency sprinkler or daily rain) they "may increase substantially and may approach 1.0 to 1.2". Estimate them more accurately with Figures 29 and 30, Eq. 7-3 in Annex 7, or the dual Kcb ini + Ke.
- **Footnote 2 (on Kc mid)**: tomatoes and peppers are "sometimes grown on stalks reaching 1.5 to 2 meters". Then use Kc mid 1.15 for peppers and 1.20 for tomatoes, and raise h too.
- Table title: these are values for subhumid climates (RHmin about 45%, u2 about 2 m/s) with FAO Penman-Monteith ET0.
- Tomato Kc end is above 0.45, so Eq. 65 climate adjustment applies (Ch. 6, after Figure 34). The same holds for pepper.

For the dual method, Ch. 7, Table 17 lists:

| Crop | Kcb ini | Kcb mid | Kcb end |
|---|---|---|---|
| Sweet Peppers (bell) | 0.15 (group) | 1.00 | 0.80 |
| Tomato | 0.15 (group) | 1.10 | 0.60-0.80 |

Staked crops (Table 17, footnote 2): use Kcb mid 1.10 for peppers and 1.15 for tomatoes.

### Stage lengths (Ch. 6, Table 11, days)

| Crop | Init. | Dev. | Mid | Late | Total | Plant date | Region |
|---|---|---|---|---|---|---|---|
| Sweet peppers (bell) | 25/30 | 35 | 40 | 20 | 125 | April/June | Europe and Medit. |
| Sweet peppers (bell) | 30 | 40 | 110 | 30 | 210 | October | Arid Region |
| Tomato | 30 | 40 | 40 | 25 | 135 | January | Arid Region |
| Tomato | 35 | 40 | 50 | 30 | 155 | Apr/May | Calif., USA |
| Tomato | 25 | 40 | 60 | 30 | 155 | Jan | Calif. Desert, USA |
| Tomato | 35 | 45 | 70 | 30 | 180 | Oct/Nov | Arid Region |
| Tomato | 30 | 40 | 45 | 30 | 145 | April/May | Mediterranean |

- Pepper row 1 has "25/30" for the initial stage. The total of 125 matches 30 (30+35+40+20).
- Table 11 footnote (*): lengths "are indicative of general conditions, but may vary substantially from region to region, with climate and cropping conditions, and with crop variety. The user is strongly encouraged to obtain appropriate local information." Primary source: FAO-24 (Doorenbos and Pruitt, 1977), Table 22.
- FAO stresses that Table 11 is "useful only as a general guide". Box 15 shows Table 11's mid-season length (40 days) overestimating the locally observed length (30 days) for dry beans (Ch. 6, text after Table 11; Box 15).

**[note] Fit to Israel (my inference, not FAO's):**

- Spring field crops planted in spring: closest are tomato "April/May, Mediterranean" (30/40/45/30) and pepper "April/June, Europe and Medit." (25-30/35/40/20).
- Autumn or winter planting in the hot arid south (Arava, Negev): the "Arid Region" rows are closer, i.e. tomato Oct/Nov or January and pepper October.
- Israeli protected cultivation (greenhouse or net-house, often staked) is not covered by Table 11. Local data would be needed.

### Root depth and depletion fraction (Ch. 8, Table 22)

| Crop | Max root depth Zr (m) | p (for ET about 5 mm/day) |
|---|---|---|
| Sweet Peppers (bell) | 0.5-1.0 | 0.30 |
| Tomato | 0.7-1.5 | 0.40 |

- **Footnote 1**: the larger Zr values are for soils without layering or other root restrictions. "The smaller values for Zr may be used for irrigation scheduling and the larger values for modeling soil water stress or for rainfed conditions."
- **Footnote 2**: the p values apply for ETc about 5 mm/day. Adjust with p = p_table22 + 0.04 (5 - ETc).
- Ch. 8, Example 36 uses Zr about 0.8 m and p = 0.40 for a full-grown tomato. Its TAW/RAW results in mm are: loamy sand 72/29, silt 136/54, silty clay 96/38.

## 3. The soil bucket (Ch. 8)

### Capacity

    TAW = 1000 (theta_FC - theta_WP) Zr        (Ch. 8, Eq. 82)

- TAW: total available water in the root zone (mm);
- theta_FC, theta_WP: water content at field capacity and wilting point (m3/m3);
- Zr: rooting depth (m).

```
RAW = p x TAW        (Ch. 8, Eq. 83)
```

- RAW: readily available water (mm);
- p: fraction of TAW that can be depleted before ET drops (0 to 1).
- p ranges from 0.30 (shallow roots, ETc > 8 mm/day) to 0.70 (deep roots, ETc < 3 mm/day). A value of 0.50 is common (Ch. 8, "RAW").

**p adjustment for ETc** (Ch. 8, "RAW"; Table 22, footnote 2; Figure 41):

    p = p_table22 + 0.04 (5 - ETc)       ETc in mm/day; clamp to 0.1 <= p <= 0.8

- "Often, a constant value is used for p for a specific growing period, rather than varying the value each day."
- Hot dry weather lowers p by 10-25%; low ETc raises it by up to 20% (Ch. 8, "RAW").
- Soil texture: reduce p by 5-10% for fine soils (clay) and raise it by 5-10% for coarse soils (sand) (Ch. 8, after Example 36).
- RAW is similar to Management Allowed Depletion (MAD). MAD also reflects management and economics: MAD < RAW when risk-averse, MAD > RAW when stress is intended (Ch. 8, after Example 36).

### Typical soil values (Ch. 7, Table 19)

| Soil texture (USDA) | theta_FC (m3/m3) | theta_WP (m3/m3) | theta_FC - theta_WP (m3/m3) |
|---|---|---|---|
| Sand | 0.07-0.17 | 0.02-0.07 | 0.05-0.11 |
| Loamy sand | 0.11-0.19 | 0.03-0.10 | 0.06-0.12 |
| Sandy loam | 0.18-0.28 | 0.06-0.16 | 0.11-0.15 |
| Loam | 0.20-0.30 | 0.07-0.17 | 0.13-0.18 |
| Silt loam | 0.22-0.36 | 0.09-0.21 | 0.13-0.19 |
| Silt | 0.28-0.36 | 0.12-0.22 | 0.16-0.20 |
| Silt clay loam | 0.30-0.37 | 0.17-0.24 | 0.13-0.18 |
| Silty clay | 0.30-0.42 (printed "0-30 - 0.42") | 0.17-0.29 | 0.13-0.19 |
| Clay | 0.32-0.40 | 0.20-0.24 | 0.12-0.20 |

Table 19 also gives REW and TEW for the evaporation layer (used by the dual method), e.g. loam REW 8-10 mm and TEW 16-22 mm. Table 19 sits in Ch. 7, not Ch. 8. Ch. 8 refers to it when defining TAW (Ch. 8, after Eq. 82).

### Water stress coefficient

    Ks = (TAW - Dr) / (TAW - RAW) = (TAW - Dr) / ((1 - p) TAW)     when Dr > RAW        (Ch. 8, Eq. 84)
    Ks = 1                                                          when Dr <= RAW

Ks falls linearly from 1 at Dr = RAW to 0 at Dr = TAW (Ch. 8, Figure 42).

Ch. 8, Example 37 (tomato, Zr 0.8 m, p 0.40, theta_FC 0.32, theta_WP 0.12, ET0 5, Kc 1.2, start Dr 55 mm, no water for 10 days):

- TAW = 160 mm and RAW = 64 mm.
- Ks stays 1.00 on days 1-2, then falls 0.97, 0.91 ... 0.62 by day 10.
- Daily ETc adj drops from 6.0 to 3.7 mm/day, and Dr reaches 104.5 mm.

### Daily root-zone balance

    Dr,i = Dr,i-1 - (P - RO)i - Ii - CRi + ETc,i + DPi        (Ch. 8, Eq. 85)

All terms in mm:

| Term | Meaning (Ch. 8, Eq. 85 and the subsections after it) |
|---|---|
| Dr,i | root zone depletion at the end of day i |
| Dr,i-1 | depletion at the end of the previous day |
| Pi | precipitation on day i. "Daily precipitation in amounts less than about 0.2 ET0 is normally entirely evaporated and can usually be ignored", especially with the single Kc |
| ROi | surface runoff on day i, "predicted using standard procedures from hydrological texts" (FAO gives no method) |
| Ii | net irrigation depth that infiltrates, "expressed for the entire field surface" |
| CRi | capillary rise from groundwater. Can be taken as zero when the water table is more than about 1 m below the root zone |
| ETc,i | crop ET: Kc x ET0 while Dr <= RAW, otherwise from Eq. 80 or 81 |
| DPi | deep percolation out of the root zone |

- **Bounds**: 0 <= Dr,i <= TAW (Ch. 8, Eq. 86). Water above field capacity "is assumed to be lost the same day by deep percolation, following any ET for that day".
- **Deep percolation** (Ch. 8, Eq. 88):

      DPi = (Pi - ROi) + Ii - ETc,i - Dr,i-1 >= 0

  While Dr,i > 0 the soil does not drain, so DPi = 0.
- **Initial depletion** (Ch. 8, Eq. 87): Dr,i-1 = 1000 (theta_FC - theta_i-1) Zr, using measured soil water. After heavy rain or irrigation, assume Dr,i-1 is about 0.
- **Effective rain**: FAO-56 does not define an "effective rainfall" formula here. Rain enters the balance as P - RO. The excess above field capacity leaves as DP (Eq. 88), and small rains below about 0.2 ET0 can be ignored (Ch. 8, "Precipitation (P), runoff (RO) and irrigation (I)"). Annex 8 assumes RO = 0 (Annex 8, text before Figure 8.1).
- **Growing roots**: Example 38 lets Zr grow from 0.30 to 0.35 m. When Zr grows, the new soil layer adds depletion 1000 (theta_FC - theta_sub) delta Zr. That is zero if the subsoil is at field capacity, as the example assumes (Ch. 8, Example 38, column 5 note).

### FAO's irrigation rule (Ch. 8, "Forecasting or allocating irrigations")

> "To avoid crop water stress, irrigations should be applied before or at the moment when the readily available soil water is depleted (Dr,i <= RAW). To avoid deep percolation losses that may leach relevant nutrients out of the root zone, the net irrigation depth should be smaller than or equal to the root zone depletion (Ii <= Dr,i)."

Ch. 8, Example 38 sets up a dual-Kc scenario:

- p = 0.6, theta_FC 0.23, theta_WP 0.10, so TAW = 130 Zr and RAW = 78 Zr;
- the start is Dr = RAW (23 mm at Zr 0.3 m);
- irrigation and rain fall early in the day.

How it runs:

- Day 1: 40 mm is applied. Dr goes 23 -> 0, DP = 17 mm, and the day ends at Dr = 5 mm.
- Days 2-9 have no irrigation; 6 mm of rain falls on day 6. Dr climbs to 27 mm, reaching RAW (27 mm).
- Day 10: "Irrigation is required when Dr,i >= RAW". A net 27 mm "refills the root zone and avoids water loss by deep percolation (DP = 0 mm)". Day 10 ends at Dr = 6 mm.

## 4. Annex 8: the daily schedule, step by step

Annex 8 is a spreadsheet example (Figure 8.1, formulas in Box 8.1). It schedules dry edible beans at Kimberly, Idaho (1974) with the dual Kc method and the Ch. 8 water balance (Annex 8, introduction).

### Inputs (Figure 8.1, rows 3-7; Box 8.1; Table 8.1)

- **Crop**: stages 25/25/30/20 days. Planting on 22 May, so J_plant = 142, J_dev = 167, J_mid = 192, J_late = 222, J_harv = 242.
- **Coefficients**: Kcb ini 0.15, Kcb mid 1.10, Kcb end 0.25 (Table 17), shown as 0.15 / 1.13 / 0.23 after adjustment. Kc min = 0.15. Max height 0.4 m.
- **Evaporation layer**: f_w for irrigation 0.5, REW 8 mm, TEW 22 mm, initial De 18 mm, initial f_w 1.
- **Roots and soil**: Root_min 0.20 m, Root_max 0.80 m, available water (FC - WP) 160 mm/m.
- **MAD**: 70% during the initial stage and 45% after it.
- **Daily inputs per row**: date, Tmax, u2, Tdew, ET0, P - RO.

### What is computed each day (Box 8.1, columns O to AK, in order)

1. **Weather-derived values**: RHmin from Tdew and Tmax (Eq. 63). Kcb for the day by stage and linear interpolation (Eq. 66), with Kcb mid and Kcb end adjusted for climate (Eq. 70).
2. **Canopy**: crop height in proportion to Kcb / Kcb mid, never decreasing (footnote 3). Kc max (Eq. 72) and f_c (Eq. 76).
3. **Wetting**: irrigation from the previous day's decision, divided by f_w (footnote 4). f_w from the last wetting event: irrigation gives the system f_w, rain gives 1 (footnote 5). f_ew = min(1 - f_c, f_w) (Eq. 75).
4. **Soil evaporation**: start-of-day De (footnote 6), Kr (Eq. 74), Ke (Eq. 71), E = Ke x ET0, DPe (Eq. 79) and end-of-day De (Eq. 77).
5. **Unstressed crop ET**: Kc = Kcb + Ke, then ETc = Kc x ET0 (Eq. 69).
6. **Root zone**: Zr grows with Kcb (Eq. 8-1, below; footnote 8). RAW = MAD x Zr x 160 mm/m (column AF, labeled Eq. 82). RAW is also never allowed to decrease (MAX with the previous day).
7. **First estimate of end-of-day depletion** (Eq. 85): previous Dr - P - irrigation + unstressed ETc, with no drainage (footnote 9).
8. **Irrigation decision** (column AH, footnote 10): if that depletion is above RAW, the net irrigation needed equals that depletion. It is applied at the beginning of the next day. The check runs only from planting until the middle of the late season.
9. **Drainage**: DP from rain or irrigation (Eq. 88).
10. **Stress**: Ks (Eq. 84), taking p = MAD (footnote 11). Adjusted Kc = Ks x Kcb + Ke (Eq. 80).
11. **Corrected end-of-day depletion** (Eq. 85): uses the adjusted ET and the drainage. This value carries to the next day.

### Effective root depth (Annex 8, Eq. 8-1 to 8-3)

    Zr_i = Zr_min + (Zr_max - Zr_min) x (Kcb_i - Kcb_ini) / (Kcb_mid - Kcb_ini)     for J < J_mid     (Eq. 8-1)
    Zr_i = Zr_max                                                                   for J >= J_mid    (Eq. 8-2)

- Alternative (Eq. 8-3): linear in time between J_start and J_max.
- Zr_min for annual crops is about 0.15 to 0.20 m. Zr_max comes from Table 22 (Annex 8, after Figure 8.2).

### Trigger and amount

- **Trigger**: the depletion at the end of day i is above the allowable depletion, MAD x TAW. Annex 8 sets MAD = p, so this is RAW. Irrigation goes on early on day i + 1 (Box 8.1, column AH and footnote 10; cell AH8).
- **Amount**: "It is assumed that the net depth of irrigation that is retained in the crop root zone is exactly equal to the depletion depth of the previous day." This is **refill to field capacity**, not a fixed depth. FAO adds that it "presumes perfect knowledge of soil water depletion by the irrigator ... and can be changed by the user as needed" (Annex 8, text before Figure 8.1).
- **MAD by stage**: MAD is higher in the initial period (70% vs 45%), because young roots can extract drier soil with little stress (Annex 8, after Eq. 8-3).
- **End of season**: irrigation stops halfway through the late season. The last irrigation is on day 225 (Annex 8, footnote 10 and the text after Eq. 8-3).
- **Side effect**: waiting until the end-of-day depletion passes RAW "occasionally causes a small amount of stress on the day prior to irrigation" (Annex 8, text after Eq. 8-3).
- **Other assumptions**: all irrigation and rain happen early in the morning, rain drainage happens the same day, and runoff is zero (Annex 8, text before Figure 8.1).

### The worked numbers visible in Figure 8.1

The published Figure 8.1 shows rows 14-26 only (J 135-147, 15-27 May 1974):

- **Before planting**: Zr = 0.20 m and RAW = 0.70 x 0.20 x 160 = 22.4 mm.
- **J 137 (row 16)**: ending depletion 23.2 mm is above RAW, so Ks = 0.92. No irrigation is scheduled because the day is before J_plant.
- **J 142 (row 21, planting day)**: ending depletion 25.3 mm > 22.4 mm, so a net irrigation of **25.3 mm** is scheduled. Ks that day is 0.70.
- **J 143 (row 22)**: the 25.3 mm is applied early in the day.
  - On the wetted fraction it is 25.3 / 0.5 = 50.6 mm (column R).
  - f_w drops to 0.5. Ke = 0.61, Kc = 0.76 and ETc = 3.95 mm/day.
  - Evaporation-layer drainage DPe = 29.67 mm.
  - Root zone depletion ends at **3.7 mm**, and climbs back to 14.7 mm by J 147.
- **Season pattern** (Annex 8, Figure 8.3): RAW is flat at about 22 mm until about day 170, rises with root growth to about 58 mm at J_mid, then stays flat. The depletion line is a saw-tooth that touches RAW before each irrigation. The figure marks about nine irrigations (I) and two rain events (P), and depletion rises unchecked after the last irrigation on day 225.

**Source quirk**: Box 8.1 cell J6 says Kcb end is not adjusted when below 0.45, yet Figure 8.1 shows 0.25 -> 0.23. I report both as printed.

## 5. Assumptions and gaps for a drip planner [note: my notes, not FAO's]

- **Single vs dual.** Table 10 points drip (microirrigation) to the dual method. A simpler first version could use the single Kc with Kc ini scaled by f_w (Eq. 60). That is a choice for the owner. FAO itself calls the single Kc fine for "basic irrigation schedules".
- **Net vs gross.** FAO-56 works in net depths: what infiltrates and stays in the root zone, expressed over the whole field (Ch. 8, "Precipitation (P), runoff (RO) and irrigation (I)"). It gives no drip application efficiency or distribution uniformity in these chapters. Converting net mm to gross mm or litres (efficiency, emitter flow, spacing, run time) is left to the implementer.
- **Trigger choice.** FAO says irrigate at or before Dr = RAW (Ch. 8). Annex 8 uses "end-of-day Dr > MAD x TAW, irrigate next morning". Drip is usually run with small frequent doses (daily, or a fixed interval refilling ETc). Neither FAO page prescribes this, so the trigger (RAW threshold, fixed interval or daily replacement) and the amount (refill to FC, fixed depth, or a fraction of Dr) are design decisions.
- **Wetted volume.** Under drip only part of the root zone is wetted. FAO-56 handles partial wetting for evaporation (f_w, f_ew) and for Kc ini, but the Ch. 8 bucket assumes a uniform root zone over the field. Whether TAW should be reduced to the wetted soil volume is not addressed in the chapters read.
- **p and MAD.** Table 22 p values are for ETc about 5 mm/day. Whether to apply the daily p adjustment, use a stage-dependent MAD (as Annex 8 does) or use a fixed p is open.
- **Rain.** FAO gives no runoff method, and treats small rain below 0.2 ET0 as negligible. How the planner uses forecast vs observed rain is open.
- **Stage lengths and dates.** Table 11 rows are indicative only, and FAO urges local data. The planner needs planting date and stage lengths per plot, or a chosen default row.
- **Mulch and greenhouses.** Plastic mulch and protected cultivation are common with drip vegetables in Israel. They were not covered in the chapters read, apart from the pineapple footnote that drip under plastic mulch lowers Kc by 0.10 (Table 12, footnote 16).
- **Start of the balance.** An initial Dr is required (Eq. 87). Without a measurement, the usual default is Dr = 0 after a heavy wetting.

## Sources

All pages fetched 2026-11-16 (the https://www.fao.org/3/... index URL redirects to http://www.fao.org/4/...). Equations shown as images on these pages (Eq. 59, 62, 65, 66, 84, 8-1, 8-3) and the Annex 8 spreadsheet images (Figure 8.1, Figure 8.3) were read from the GIF files linked from the same pages.

- Index: http://www.fao.org/4/x0490E/x0490e00.htm
- Chapter 5, Introduction to crop evapotranspiration: http://www.fao.org/4/x0490E/x0490e0a.htm
- Chapter 6, Single crop coefficient: http://www.fao.org/4/x0490E/x0490e0b.htm
- Chapter 7, Dual crop coefficient (Tables 17, 19, 20; Eq. 75; Example 34): http://www.fao.org/4/x0490E/x0490e0c.htm
- Chapter 8, ETc under soil water stress: http://www.fao.org/4/x0490E/x0490e0e.htm
- Annex 8, Dual Kc in irrigation scheduling: http://www.fao.org/4/x0490E/x0490e0p.htm
- Equation and figure images: http://www.fao.org/4/x0490E/x0490e2b.gif (Eq. 59), x0490e2d.gif (Eq. 62), x0490e2i.gif (Eq. 65), x0490e2k.gif (Eq. 66), x0490e2w.gif (Eq. 84), x0490e5z.gif (Eq. 8-1), x0490e60.gif (Eq. 8-3), x0490e7e.gif, x0490e7f.gif, x0490e7g.gif (Figure 8.1), x0490e7i.gif (Figure 8.3), all under http://www.fao.org/4/x0490E/
