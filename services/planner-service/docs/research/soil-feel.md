# Soil moisture by feel: picking today's bucket level

Research note for the planner's starting level (`start_pct`, see `docs/superpowers/specs/2026-11-17-planner-start-level-design.md`). Main source: USDA Natural Resources Conservation Service (NRCS), *Estimating Soil Moisture by Feel and Appearance*, Program Aid Number 1619, April 1998 ("PA 1619"), 6 pages. Every claim below cites the PA 1619 page, or another document's section, page or equation. Notes that are mine, not the sources', are labeled **[note]**.

## Answers in brief

1. **Texture groups.** Sand goes in PA 1619's "Coarse Texture - Fine Sand and Loamy Fine Sand" group (available water capacity 0.6-1.2 in/ft, about 50-100 mm/m). Loam is in the "Medium Texture - Sandy Clay Loam, Loam, and Silt Loam" group (1.5-2.1 in/ft, about 125-175 mm/m). Clay loam is in the "Fine Texture - Clay, Clay Loam, or Silty Clay Loam" group (1.6-2.4 in/ft, about 133-200 mm/m). Loam and clay loam are named in their groups. Our sand is not named, because PA 1619 lists only fine sand and loamy fine sand. Its 83 mm/m (1.0 in/ft) fits only the coarse group's range (PA 1619 p. 6).
2. **Ranges.** For every soil the guide gives five rows: 0-25, 25-50, 50-75 and 75-100 percent available, plus "Field Capacity (100 %)". No range is missing for our three soils. Descriptions are in section 2 (PA 1619 pp. 2, 4, 5, 6).
3. **Same concept as TAW?** Yes. "Percent available" is today's available water as a percent of the available water capacity (AWC), and 100 percent means field capacity with zero depletion (PA 1619 pp. 2-6). The NRCS Irrigation Guide defines AWC as the water held between field capacity and the permanent wilting point (NEH Part 652, Ch. 2, SC Supplement, p. 2-46). That is FAO-56's TAW = 1000 (theta_FC - theta_WP) Zr (FAO-56 Ch. 8, Eq. 82). So percent available = 100 x (1 - Dr / TAW).
4. **Where and how deep.** Take samples with a probe, auger or shovel "at the selected depth". Sample in 1-foot (about 30 cm) steps down to the crop's root depth, at "three or more sites per field". Vary the number of sites and depths with crop, field size, texture and layering (PA 1619 p. 1).
5. **Suggested `start_pct` (our choice, not the guide's).** Use the midpoint of each range: 0-25 -> 12.5, 25-50 -> 37.5, 50-75 -> 62.5, 75-100 -> 87.5, field capacity -> 100. The same values work for all three soils.
6. **Accuracy and limits.** "Soil moisture conditions can be estimated, with experience, to an accuracy of about 5 percent" (PA 1619 p. 1). The guide gives no data behind that figure. Other limits: each row is a 25-point band, the 0-25 and field-capacity rows have no photo, and the descriptions for the same row differ slightly between pages. See section 6.

## 0. The source, and how it was reached

- PA 1619 is a USDA NRCS publication. Its cover reads "United States Department of Agriculture, Natural Resources Conservation Service, Program Aid Number 1619", and the back page is dated "April 1998" (PA 1619 pp. 1, 6).
- **Copy actually read.** The official NRCS PDFs (`nrcs.usda.gov/.../2022-09/Estimating Soil Moisture by Feel and Appearance.pdf` and `wcc.nrcs.usda.gov/.../EstimatingSoilMoisture.pdf`, see Sources) timed out from this environment on 2026-11-17, through both the web fetcher and direct download. The text below comes from an unaltered copy of the same PDF, hosted by the Lodi Winegrape Commission (`lodigrowers.com`, see Sources). It has six pages with the NRCS cover, Program Aid number and April 1998 date. **[note]** Where a search engine showed text from the official NRCS file, it matches this copy word for word: the opening sentence about Irrigation Water Management and the "accuracy of about 5 percent ... three or more sites per field" passage. I could not compare the two files page by page.
- **Layout.** Page 1 is the method. Pages 2-5 each cover one texture group, with photos of a hand holding a squeezed sample. Page 6 is a summary table, "Guidelines for Estimating Soil Moisture Conditions", covering all four groups (PA 1619 pp. 1-6).

## 1. Which texture group each of our soils belongs to

PA 1619 has four texture groups. Each has its own range of available water capacity, in inches per foot of soil (PA 1619 p. 6 header row; pp. 2-5 headings):

| PA 1619 group (p. 6) | Textures named | AWC, in/ft | AWC, mm/m **[note: x 83.3]** |
|---|---|---|---|
| Coarse Texture | Fine Sand and Loamy Fine Sand | 0.6-1.2 | 50-100 |
| Moderately Coarse Texture | Sandy Loam and Fine Sandy Loam | 1.3-1.7 | 108-142 |
| Medium Texture | Sandy Clay Loam, Loam, and Silt Loam | 1.5-2.1 | 125-175 |
| Fine Texture | Clay, Clay Loam, or Silty Clay Loam | 1.6-2.4 | 133-200 |

**[note]** Conversion: 1 in/ft = 25.4 mm / 0.3048 m = 83.3 mm/m.

- **Sand (83 mm/m = 1.0 in/ft) -> Coarse Texture.** PA 1619 names only "fine sand and loamy fine sand", not plain sand (PA 1619 p. 2 heading, p. 6). Three reasons put our sand here:
  - It is the only group with sand in its name.
  - 1.0 in/ft lies inside its range, 0.6-1.2. The next group starts at 1.3 in/ft (p. 6).
  - An NRCS irrigation guide puts sand (S) and fine sand (FS) in the same "Texture Group No. 2", grouped by how water moves through the root zone (NEH Part 652, Ch. 2, SC Supplement, Table SC2-17 and the text above it, p. 2-45).
  - **[note]** This is a close fit, not an exact one. Coarse sand is not covered by PA 1619.
- **Loam (175 mm/m = 2.1 in/ft) -> Medium Texture.** "Loam" is named in the group (PA 1619 p. 4 heading, p. 6). 2.1 in/ft is the top of the group's range.
- **Clay loam (200 mm/m = 2.4 in/ft) -> Fine Texture.** "Clay loam" is named in the group (PA 1619 p. 5 heading, p. 6). 2.4 in/ft is the top of the group's range.

## 2. The ranges and descriptions for our three soils

PA 1619 gives the same five rows for every group: 0-25, 25-50, 50-75 and 75-100 "percent available", plus "Field Capacity (100 %)". Each row has a description and a soil moisture deficit (SMD) in inches per foot (PA 1619 p. 6; pp. 2, 4, 5). **No range is missing for any of our three soils.** The 0-25 row and the field-capacity row are marked "(Not pictured)" on every group page, so those two rows have text but no photo (pp. 2, 4, 5).

The descriptions below follow the group pages (pp. 2, 4, 5). Where the p. 6 table words a row differently, that is noted. SMD is given in in/ft as printed, with mm/m in brackets **[note: my conversion]**.

### Sand (Coarse Texture: fine sand and loamy fine sand), PA 1619 p. 2 and p. 6

| Percent available | SMD, in/ft (mm/m) | Description (close paraphrase; quotes are the guide's words) |
|---|---|---|
| 0-25 | 1.2-0.5 (100-42) | "Dry, loose", holds together only "if not disturbed", loose sand grains on fingers when pressed. Not pictured. |
| 25-50 | 0.9-0.3 (75-25) | "Slightly moist", forms "a very weak ball with well-defined finger" marks. The p. 6 table adds: a light coating of loose and aggregated sand grains stays on the fingers. |
| 50-75 | 0.6-0.2 (50-17) | "Moist", forms "a weak ball" with loose and aggregated sand grains on fingers, darkened color, moderate water staining on fingers, "will not ribbon". |
| 75-100 | 0.3-0.0 (25-0) | "Wet", forms "a weak ball", loose and aggregated sand grains stay on fingers, darkened color, "heavy water staining on fingers", will not ribbon. |
| 100 (field capacity) | 0.0 | "Wet", forms a weak ball, moderate to heavy soil/water coating on fingers, "wet outline of soft ball remains on hand". Not pictured. |

### Loam (Medium Texture: sandy clay loam, loam and silt loam), PA 1619 p. 4 and p. 6

| Percent available | SMD, in/ft (mm/m) | Description |
|---|---|---|
| 0-25 | 2.1-1.1 (175-92) | "Dry", soil aggregations "break away easily", no staining on fingers, "clods crumble with applied pressure". Not pictured. (p. 6 says "no moisture staining".) |
| 25-50 | 1.6-0.8 (133-67) | "Slightly moist", forms "a weak ball with rough surfaces", no water staining on fingers, a few aggregated soil grains break away. |
| 50-75 | 1.1-0.4 (92-33) | "Moist, forms a ball", very light staining on fingers, darkened color, "pliable", forms "a weak ribbon" between thumb and forefinger. (p. 6 says "very light water staining".) |
| 75-100 | 0.5-0.0 (42-0) | "Wet", forms a ball with well-defined finger marks, light to heavy soil/water coating on fingers, "ribbons between thumb and forefinger". |
| 100 (field capacity) | 0.0 | "Wet, forms a soft ball", "free water appears briefly" on the soil surface after squeezing or shaking, medium to heavy soil/water coating on fingers. Not pictured. |

### Clay loam (Fine Texture: clay, clay loam and silty clay loam), PA 1619 p. 5 and p. 6

| Percent available | SMD, in/ft (mm/m) | Description |
|---|---|---|
| 0-25 | 2.4-1.2 (200-100) | "Dry", soil aggregations separate easily, "clods are hard to crumble with applied pressure". Not pictured. |
| 25-50 | 1.8-0.8 (150-67) | "Slightly moist, forms a weak ball", very few aggregations break away, no water stains, "clods flatten with applied pressure". |
| 50-75 | 1.2-0.4 (100-33) | "Moist, forms a smooth ball with defined finger marks", light soil/water staining on fingers, "ribbons between thumb and forefinger". |
| 75-100 | 0.6-0.0 (50-0) | "Wet, forms a ball", uneven medium to heavy soil/water coating on fingers, "ribbons easily" between thumb and forefinger. |
| 100 (field capacity) | 0.0 | "Wet, forms a soft ball", free water appears on the surface after squeezing or shaking, thick soil/water coating on fingers, "slick and sticky". Not pictured. |

### What tells the rows apart

**[note: my reading of the tables above, not a rule the guide states]**

- Every row starts with the same word ladder: Dry, Slightly moist, Moist, Wet, and Wet again at field capacity (PA 1619 p. 6).
- In loam and clay loam, ribboning separates the wet half from the dry half. There is no ribbon at 0-50, a weak or full ribbon at 50-75, and a ribbon at 75-100 (pp. 4, 5).
- Sand never ribbons. Its rows differ by how well a ball forms and by how much water staining is left on the fingers (p. 2).
- Field capacity and 75-100 are both "Wet". The difference is free water on the surface, or a wet outline of the ball left on the hand (pp. 2, 4, 5).

## 3. Is PA 1619's "available water" the same as FAO-56 TAW?

**Yes, for our purpose.** Both describe the water between field capacity and wilting point, and both count depletion down from field capacity.

### The NRCS side

- PA 1619 defines **Percent Available** as "Currently available soil moisture as a percent of available water capacity" (PA 1619 pp. 2-5, box under each heading).
- It defines **In/ft. Depleted** as "Inches of water currently needed to refill a foot of soil to field capacity" (pp. 2-5).
- The 100 percent row is labelled "0.0 in./ft. depleted (field capacity)" (pp. 2-5).
- Soil Moisture Deficit (SMD), or depletion, is "the amount of water required to raise the soil-water content of the crop root zone to field capacity" (p. 1).
- PA 1619's own definition of AWC is loose: "the portion of water in a soil that can be readily absorbed by plant roots of most crops" (p. 1). It does not name wilting point.
- The NRCS Irrigation Guide is exact: "The AWC is the amount of water held between field capacity at 0.33 bars (33 centibars) and the permanent wilting point at 15 bars (1500 centibars)" (NEH Part 652, Ch. 2, SC Supplement, section (c)(2)(ii) "Available Water Capacity", p. 2-46). For sands, the upper limit is measured at 0.10 bar instead of 0.33 bar (same page).
- The same guide keeps AWC separate from Managed Allowable Depletion (MAD). AWC is the soil's capacity, while MAD is the part the crop can use "before the crop begins to suffer detrimental effects" (same document, (c)(2)(iii), p. 2-47).

### The FAO-56 side

- "Field capacity is the amount of water that a well-drained soil should hold against gravitational forces." Wilting point "is the water content at which plants will permanently wilt" (FAO-56 Ch. 8, "Soil water availability", "Total available water (TAW)").
- TAW = 1000 (theta_FC - theta_WP) Zr, in mm (FAO-56 Ch. 8, Eq. 82).
- RAW = p x TAW is the part a crop can extract without stress (Ch. 8, Eq. 83). This matches NRCS's split between AWC and MAD.
- Root-zone depletion Dr is measured down from field capacity. The starting depletion can come from a measured water content: Dr,i-1 = 1000 (theta_FC - theta_i-1) Zr (Ch. 8, "Initial depletion", Eq. 87).

### The mapping

- **[note]** PA 1619's AWC per foot corresponds to FAO's (theta_FC - theta_WP), and its "in/ft depleted" corresponds to Dr per unit depth.
- **[note]** So percent available = 100 x (TAW - Dr) / TAW, and Dr = TAW x (1 - start_pct / 100). This is the formula in the spec.
- **[note]** Two wording traps:
  1. PA 1619 says "readily absorbed", but its AWC is not FAO's RAW. Its 0 percent row is the dry end of the whole capacity, and its depletion columns reach the group's full AWC (for example 2.4 in/ft for the fine group, p. 6).
  2. Field capacity is defined in the lab by a fixed tension (NRCS) or as drained water held against gravity (FAO). The NRCS guide notes that a field "Drained Upper Limit" after 24-48 hours of drainage is usually higher than the lab value (NEH Part 652, Ch. 2, SC Supplement, p. 2-47). This does not change the concept.

## 4. Where and how deep to sample

All of the following is from PA 1619 p. 1:

- Soil moisture "is typically sampled in 1-foot increments to the root depth of the crop at three or more sites per field".
- "It is best to vary the number of sample sites and depths according to crop, field size, soil texture, and soil stratification."
- The steps for each sample:
  1. Take a sample "at the selected depth using a probe, auger, or shovel".
  2. Squeeze it firmly in the hand several times to form "an irregularly shaped 'ball'".
  3. Squeeze it out between thumb and forefinger "to form a ribbon".
  4. Observe texture, ribbon, firmness and surface roughness of the ball, water glistening, loose particles, soil/water staining on fingers, and color. A "very weak ball" falls apart with one bounce of the hand, and a "weak ball" with two or three bounces.
  5. Compare with the photos or charts to estimate percent available and inches depleted.
- The worked example on p. 1 samples at 6, 18, 30 and 42 inches (four 1-foot zones). It estimates depletion in each zone and adds them up: 3.1 inches of depletion against 6.8 inches of AWC, so "a 3.1" net irrigation will refill the root zone".

**[note]** The spec asks the grower for one squeeze "from root depth". That is a simplification of the guide, which samples every foot down to the root depth at three or more spots and sums the zones. For shallow-rooted vegetables, one sample in the first foot, or one per foot down to Zr, is close to the guide. Whether to tell growers to check two or three spots is a UI choice.

## 5. Suggested `start_pct` per range [note: our choice, not the guide's]

PA 1619 gives bands, not single values. The planner needs one number, so:

| Row the grower picks | Suggested `start_pct` | Starting Dr |
|---|---|---|
| 0-25 percent available | 12.5 | 0.875 x TAW |
| 25-50 percent available | 37.5 | 0.625 x TAW |
| 50-75 percent available | 62.5 | 0.375 x TAW |
| 75-100 percent available | 87.5 | 0.125 x TAW |
| Field capacity (100 %) | 100 | 0 |

- **Why the midpoint.** It is the value that is wrong by the least in the worst case: at most 12.5 points either way. It needs no extra assumptions, and it is the same for all three soils.
- **Alternatives.** One option is to round to whole numbers (13, 38, 63, 88). Another is to lean wetter (for example 20/45/70/90) so the planner irrigates less often on a borderline call. Neither is from a source.
- **Interaction with the trigger.** The spec says a start below half triggers irrigation on day 1. With midpoints, the 0-25 and 25-50 rows trigger and the 50-75 row does not. The 50 percent boundary between "Slightly moist" and "Moist" therefore decides day 1, which matches the guide's own big visual step: ribboning starts at 50-75 in loam and clay loam (PA 1619 pp. 4, 5).
- **Do not use the SMD columns to compute `start_pct`.** The in/ft depleted ranges in each row cover the group's whole AWC range, from low-AWC to high-AWC soils. The rows overlap, for example sand 0-25 is 1.2-0.5 and 25-50 is 0.9-0.3 (PA 1619 p. 6). For a soil with a known TAW, the percent band is the useful part.

## 6. Accuracy and limits

- **Stated accuracy:** "Soil moisture conditions can be estimated, with experience, to an accuracy of about 5 percent" (PA 1619 p. 1). The guide does not say 5 percent of what (percentage points of AWC, or of water content), and gives no study or data behind it. "With experience" is part of the claim.
- **Resolution:** The tables only give 25-point bands, plus the field-capacity row (PA 1619 p. 6). **[note]** In practice, a grower picking a row gets 25-point resolution, not 5.
- **Texture first:** Feel and appearance "vary with texture and moisture content" (p. 1), so the right group must be chosen before the row. In our app the soil type comes from the registry, not from the grower's hand.
- **Sampling:** Results depend on sampling several sites and depths (p. 1). **[note]** One handful from one spot is a weaker estimate than the guide's method.
- **Photos:** The 0-25 and field-capacity rows have no photo in any group (pp. 2, 4, 5).
- **Wording differences between pages:** A few rows read slightly differently on the group page and in the p. 6 table, for example sand 25-50 and loam 0-25 and 50-75 (section 2). The meaning is the same.
- **Coverage:** Our sand is matched to "fine sand and loamy fine sand". Plain or coarse sand is not described (section 1).

## Sources

All fetched 2026-11-17.

- USDA NRCS, *Estimating Soil Moisture by Feel and Appearance*, Program Aid Number 1619, April 1998.
  - **Copy read:** https://lodigrowers.com/wp-content/uploads/filebase/water_management/USDA_IWM_1998.pdf (6 pages, NRCS cover and PA number).
  - Official NRCS copies, found by search but timed out when fetched from here:
    - https://www.nrcs.usda.gov/sites/default/files/2022-09/Estimating%20Soil%20Moisture%20by%20Feel%20and%20Appearance.pdf
    - https://www.wcc.nrcs.usda.gov/ftpref/wntsc/waterMgt/irrigation/EstimatingSoilMoisture.pdf
    - https://www.nrcs.usda.gov/sites/default/files/2023-01/Estimating-Soil-Moinsture-By-Feel-And-Appearance.pdf (layout not checked)
  - NRCS distribution center listing (not fetched): https://nrcspad.sc.egov.usda.gov/distributioncenter/product.aspx?ProductID=199
- USDA NRCS, *National Engineering Handbook Part 652, Irrigation Guide*, Chapter 2 "Soils", South Carolina Supplement (210-vi-NEH, September 2016), pp. 2-45 to 2-47: https://directives.nrcs.usda.gov/sites/default/files2/1712932374/25691.pdf . This is a state supplement, used here only for the AWC definition and texture grouping. The national Chapter 2 (1997) was not read.
- Allen, Pereira, Raes, Smith (1998), FAO Irrigation and Drainage Paper 56, Chapter 8 (TAW, Eq. 82; RAW, Eq. 83; initial depletion, Eq. 87): https://www.fao.org/3/x0490E/x0490e0e.htm (redirects to http://www.fao.org/4/x0490E/x0490e0e.htm, the page fetched).
