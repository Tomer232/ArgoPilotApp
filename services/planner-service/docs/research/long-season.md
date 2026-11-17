# Long-season Kc for tomato and bell pepper in southern Israel

Research note for the planner's days after the FAO-56 season (DECISIONS.md O80: today the plan holds Kc end and labels the day `after-season`). The question is which published source gives Kc for the 8-10 month seasons that Israeli growers use under nets and plastic, and what that Kc is multiplied by. Every claim below cites a document, table and page. Notes that are mine, not the sources', are labeled **[note]**. Hebrew is translated by me. Where I quote Hebrew, the translation follows in brackets.

## Answers in brief

1. **Published long-season tables.** Four Israeli sources give stage or day tables, all for **protected** crops (net-house or greenhouse). None gives open-field tables.
   - **Tomato, Negev, measured Kc.** Harel et al. (2014), Negev R&D Center (Besor), drainage lysimeters. Greenhouse, winter (planted about 1 Oct): 0.30 / 0.57 / 1.0 / 0.83 for days 7-20 / 21-35 / 36-90 / 91-250. Net-house, summer (planted about mid-April): round tomato 0.18 / 0.47 / 0.9 / 0.81 for days 7-20 / 21-35 / 36-69 / 70-200 (Harel 2014, Tables 2 and 3, p. 138).
   - **Tomato, extension guide.** Shaham (Ministry of Agriculture extension service), autumn-winter greenhouse tomato, July 2017, repeats the winter table exactly as "irrigation coefficients" found at Negev R&D (Shaham 2017, p. 5).
   - **Tomato, Ramat HaNegev.** Cherry tomato in greenhouses, planted 1 Sept, brackish water: rises from 0.3 to 1.1 by days 81-90, then 0.9 for days 91-250 (Ramat Negev R&D 2020 report, Table 2, pp. 20-21).
   - **Pepper, Negev.** Negev R&D (Besor) final report 2022, summer net-house pepper planted 19 May 2022, lysimeters. Kc against the outside station's Penman: 0.3 / 0.6 / 0.7 / 0.7 / 0.9 / 0.8 for days 14-27 / 28-40 / 40-60 / 60-100 / 100-150 / 150-180 (Besor pepper 2022, Table 1, p. 7).
   - **Pepper, Jordan Valley.** Shaham + Jordan Valley R&D, autumn pepper (planted Aug-Sep) to "end of growth". Coefficients by stage and calendar period, net-house and greenhouse, with both pan and Penman-Monteith columns. 2020 net-house Penman column: 0.4-0.5 / 0.5-0.6 / 1.0 / 0.8 (Shaham 2020, Tables 1 and 2, p. 2).
2. **Reference.** Harel 2014, Besor pepper 2022, Shaham 2017 tomato and Ramat Negev 2020 all multiply **Penman-Monteith ET0**. The Jordan Valley pepper sheets give **two columns**, one for Class A pan and one for Penman-Monteith, and say the two need different coefficients (Shaham 2016 p. 1; Shaham 2020 p. 1). Only the Penman column may be used with our ET0. The one trap: Besor pepper 2022 also has a column against Penman computed **inside** the net-house. That column is about twice the outside one and must not be used with Open-Meteo ET0 (Besor pepper 2022, Table 1, p. 7).
3. **Season lengths in our area.** In the northern Negev near the coastal plain, tomato is grown in net-houses and greenhouses "all year around" (Harel 2014, p. 132). Winter greenhouse tomato ran to day 250 and summer net-house tomato was removed at day 200 (Harel 2014, p. 136). Autumn-winter greenhouse tomato is planted from August-September (Shaham 2017, variety tables pp. 1-2; coefficient table to day 250, p. 5). Negev summer net-house pepper is planted in May and the measured season ran to day 180 (Besor pepper 2022, pp. 5, 7). Jordan Valley autumn pepper is planted August-September, with irrigation intervals listed through May-June (Shaham 2016, Table 2, p. 2).
4. **FAO-56.** Table 11 stage lengths are "useful only as a general guide", and local observations should be used where possible (Ch. 6, "Length of growth stages"). Table 11 itself has a 180-day tomato row (Oct/Nov, arid) and a 210-day pepper row (October, arid). Where mid and late seasons span several climatic seasons, "several adjustments of Kc are often required" (Ch. 6, said of fruit trees). For a harvest earlier than the curve, FAO says to "terminate the application of the constructed curve early" (Ch. 6, Kc end). After the crop is gone, bare soil uses Kc = Kc ini from the Chapter 6 procedure (Ch. 11, "Bare soil"). FAO-56 has nothing on greenhouse or net-house crops.
5. **Recommendation [note].**
   - **Tomato: Harel et al. 2014.** It is peer-reviewed, measured at Besor (31°16'N 34°23'E, close to our plots), uses Penman-Monteith ET0 as in FAO-56, and covers both seasons. The Ministry's extension guide adopted its winter table unchanged. For our spring-planted plots, the summer net-house table (Table 3, round tomato) fits the planting month.
   - **Pepper: Besor pepper 2022, Table 1, "Kc against outside Penman".** It is the only pepper table from our region, uses the Ministry's outside-station Penman ET0 (the same quantity as our ET0), and was measured in lysimeters on local sand.
   - **After even the long season.** The published curves stop: tomato plants were removed at day 200 (summer) or about 250 (winter), and the pepper table stops at day 180. After that no source gives a crop Kc. FAO-56 says to end the curve at harvest, and after it the field is bare soil (Ch. 11). Our demo plots are at about days 200-275 on 2026-11-17, so they are at or past even these long seasons.
6. **Limits.** Every long-season table is for protected cultivation. Each is tied to one planting month, often to a growth medium in the lysimeter, and sometimes to brackish water or over-irrigation. None covers open-field tomato or pepper in Israel. The registry does not say whether a plot is open field, net-house or greenhouse, nor its planting season type. See section 6.

## 0. The sources, and how they were reached

All fetched 2026-11-17. The Hebrew PDFs could not be read by the web fetcher (compressed streams). I downloaded them and rendered each page to an image to read the tables as printed. Page numbers are the PDF's own printed page numbers.

| Short name | What it is | Where |
|---|---|---|
| Harel 2014 | Harel, Sofer, Broner, Zohar (Negev R&D Center) and Gantz (Ministry extension, vegetables), "Growth-Stage-Specific Kc of Greenhouse Tomato Plants Grown in Semi-Arid Mediterranean Region", *Journal of Agricultural Science* 6(11):132-142, 2014, doi:10.5539/jas.v6n11p132. Open access, CC BY 3.0. | publisher PDF |
| Shaham 2017 | Ministry of Agriculture, Extension Service (Shaham), vegetables department, "גידול עגבניות בעונת הסתוי-חורף" [Growing tomatoes in the autumn-winter season], Gantz, Ilani, Avraham, July 2017, 6 pp. | copy hosted by Arava R&D (`agri.arava.co.il`); I did not find the gov.il original |
| Ramat Negev 2020 | Ramat Negev R&D, "ייעול ההשקיה של גידול עגבניות בהנבה חורפית בחממות ברמת הנגב" [Improving irrigation of winter-harvest greenhouse tomatoes in Ramat HaNegev], Seguli, Cohen, Kay, Zenvar, 2020, 21 pp. | `moprn.org` |
| Besor pepper 2022 | Negev R&D (Mop Darom), final report 2022, research no. 92-012-20, "ייעול ההשקיה של גידול פלפל בהנבה קיצית בבתי רשת בנגב" [Improving irrigation of summer-harvest pepper in net-houses in the Negev], PI Moshe Broner, with Tali Ilani and Lior Avraham (Shaham), program 2020-2022, 13 pp. | `mopdarom.org.il` |
| Shaham 2016 | Shaham + Jordan Valley R&D, "המלצות השקיה ודישון לפלפל סתווי בבתי רשת ובבתי צמיחה בבקעת הירדן" [Irrigation and fertilisation recommendations for autumn pepper in net-houses and greenhouses in the Jordan Valley], updated 2016, Tzipilevich, Gilad, Adler, Silverman, Omer, Alon, 9 pp. | gov.il |
| Shaham 2020 | The same recommendations "מעודכן לשנת 2020" [updated for 2020], Silverman, Omer, Alon (Shaham), Tzipilevich, Gilad, Meir (Jordan Valley R&D), Adler. | copy hosted by a seed company (`topseedsisrael.com`); I did not find the gov.il original |
| FAO-56 | Allen et al. 1998, Ch. 4 (pan method), Ch. 6 (single Kc), Ch. 11 (non-growing periods). See also `fao56.md`. | fao.org |

## 1. The long-season tables, as printed

### 1a. Tomato, Negev R&D (Besor): Harel 2014

Setting (Harel 2014, pp. 132-133):

- Negev R&D Center, "northern part of the Negev desert and the southern part of the Israeli coastal plain". Climate semi-arid Mediterranean, rainy winters (October-April, 216 mm mean annual rain), long dry hot summers. The paper prints "34°23'N, 31°16'E", with latitude and longitude swapped (p. 133). **[note]** The station is at 31°16'N 34°23'E. Our plots are 31.25-31.41 N, 34.60-34.80 E, about 20-40 km east.
- Naturally ventilated greenhouse, 4 m gutter. In summer, roof and walls are 50-mesh insect net. In winter, the roof is polyethylene, and the walls are polyethylene up to one third of the gutter height with net above (p. 133).
- Lysimeters: troughs of tuff (0-8 mm) plus 15% compost, irrigated to "constant water saturation", ETc = irrigation minus drainage. Plant density 2.2 plants/m² (pp. 133-134, Appendix p. 142). Field plots on local sand (87% sand), drip, 1.6 l/h emitters (p. 133).
- "Reference evapotranspiration (ET0) was calculated using the Penman-Monteith equation as adopted by FAO-56 (Allen et al., 1998)" and Kc = ETc/ET0 (section 3.3, p. 134). The paper does not say whether the weather data came from inside or outside the structure.

Table 2, "round tomatoes grown in a plastic covered greenhouse during the winter season", cv. 1402 (p. 138):

| Growth stage | Days after transplanting | Kc |
|---|---|---|
| Seedlings establishment | 7-20 | 0.30 |
| Blooming and initial fruit set | 21-35 | 0.57 |
| Fruit development of 1st and 2nd clusters | 36-90 | 1 |
| Fruit pick | 91-250 | 0.83 |

Table 3, "round and cherry cluster tomatoes grown in a net house covered with 50 mesh insect proof net during the summer season" (p. 138):

| Growth stage | Days after transplanting | Kc round (cv. 1125) | Kc cherry cluster (cv. Shiran-1335) |
|---|---|---|---|
| Seedlings establishment | 7-20 | 0.18 | 0.15 |
| Blooming and initial fruit set | 21-35 | 0.47 | 0.35 |
| Fruit development of 1st and 2nd clusters | 36-69 | 0.9 | 0.8 |
| Fruit pick | 70-200 | 0.81 | 0.97 |
| Yield extinguishing | 135-200 | - | 0.85 |

Season details:

- **Winter:** fruit picking starts at about day 70. Kc "slowly and steadily decreases" until about day 140, when leaf removal begins, followed by a ten-day dip in water use (p. 134).
- **Summer:** harvest starts earlier, and the plant "exhausts" itself, so the crop was removed "at day 200 as opposed to day 250 in the winter" (p. 136).
- **Planting dates.** Figure 1's axes run from 1 Oct 2011 to 17 Jun 2012 and from 16 Apr 2013 to 6 Oct 2013 (p. 135). **[note]** So the winter crop was planted about 1 October and the summer crop about mid-April. That is my reading of the axes; the text gives no planting date.
- **Source quirks.** The Figure 1 caption labels panel (a) "winter", but panel (a) shows the April-October 2013 data (p. 135). Section 4.3 calls the summer season "2011", while Figure 6 says "2013 summer" (pp. 136, 139). I report the tables as printed.

### 1b. Tomato, Ministry extension guide: Shaham 2017

- The guide is for greenhouse tomato in the autumn-winter season (title, p. 1). Recommended varieties include plantings "אוגוסט-ספטמבר" [August-September] for a short crop of 8-10 trusses, and varieties "מתאים לשתילות כל השנה, לגידול ארוך" [suitable for planting all year, for a long crop] (variety tables, pp. 1-2).
- Table "טבלת מקדמי השקיה ומנת מים מחושבת בקרקע קלה כפי שנמצאו במו"פ דרום" [table of irrigation coefficients and computed water dose in light soil, as found at Negev R&D] (p. 5):

| Stage | Days from planting | Irrigation coefficient | Computed dose, m³/dunam/day |
|---|---|---|---|
| קליטה והתבססות [establishment] | 7-20 | 0.30 | 2 |
| פריחה וחנטה [flowering and fruit set] | 21-35 | 0.57 | 3 |
| מילוי פרי בתפרחת ראשונה ושנייה [fruit filling, 1st and 2nd trusses] | 36-90 | 1 | 4 |
| קטיף [harvest] | 91-250 | 0.83 | 2-6 |

- Reference: the text under the table says the coefficient is a fraction of "ההתאיידות המחושבת (פנמן)" [computed evaporation (Penman)], and the dose = "מקדם ההשקיה * התאיידות מחושבת לפי פנמן" [irrigation coefficient x Penman evaporation]. The dose column uses multi-year averages at the Besor station, and evaporation data are on the Ministry's weather website (pp. 5-6).
- **[note]** The coefficients are identical to Harel 2014 Table 2, so the Ministry adopted the paper's winter table.

### 1c. Tomato, Ramat HaNegev: Ramat Negev 2020

- Cherry tomato in greenhouses, irrigated with brackish water diluted to about 1.5 dS/m. The highest yield came at 140% of measured use, that is, all plant use plus 40% drainage (abstract, p. 1).
- Table 2 coefficients are the 3-year average ratio of measured use to Penman. The authors say they are "דומה באופן כללי למקדם שפורסם שה"מ למערב הנגב עם מים מותפלים" [broadly similar to the coefficient Shaham published for the western Negev with desalinated water] (discussion, p. 20).
- Table 2, "המלצות מקדמי השקיה לגידול עגבניות בחממה ברמת הנגב" [recommended irrigation coefficients for greenhouse tomato in Ramat HaNegev], for planting on 1/9 [1 September], daily dose based on mean Penman 2017-2020 (pp. 20-21):

| Days from planting | 1-10 | 11-20 | 21-30 | 31-40 | 41-50 | 51-60 | 61-70 | 71-80 | 81-90 | 91-250 |
|---|---|---|---|---|---|---|---|---|---|---|
| Coefficient | 0.3 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.85 | 0.95 | 1.1 | 0.9 |

### 1d. Pepper, Negev R&D (Besor): Besor pepper 2022

- **Area.** About 3,000 dunam (300 ha) of pepper are grown in net-houses in the Negev on sandy soil (85-90% sand). There were no clear recommendations for water amounts by stage and weather, and growers over-irrigate (abstract and background, p. 1).
- **Planting and setup.** Pepper cv. TOP42 was planted on 19.5.22 [19 May 2022] in lysimeters and in the soil around them, in two rows 33 cm apart (p. 5). The lysimeters hold 60% tuff and 40% coarse "kibbul" [coarse fill]. They are over-irrigated so drainage is at least 20-40%, and ETc = irrigation minus drainage (p. 4).
- **Weather.** A weather station inside the net-house is compared with "התחנה המטאורולוגית החיצונית שבמו"פ דרום" [the outside weather station at Negev R&D]. The aim is coefficients "שמותאמים להתאדות הפוטנציאלית (פנמן) שנגישה לחקלאים מאתר משרד החקלאות" [matched to the potential (Penman) evaporation available to farmers from the Ministry of Agriculture website] (p. 5).
- **Inside vs outside.** Inside Penman is much lower than outside Penman. The report fits ET0 = 1.5 x ET_in + 1.5 (Eq. 1, p. 7). Figure 5 shows data from 1 June to late November 2022 (p. 7).

Table 1, "מקדמי הגידול Kc בין ההתאדות המחושבת לפי פנמן לצריכת המים של צמחי הפלפל בגידול קיצי בבשור" [crop coefficients Kc between Penman evaporation and water use of summer pepper at Besor] (p. 7):

| Days from planting | Stage | Kc vs outside Penman | Kc vs inside Penman |
|---|---|---|---|
| 0-14 | קליטה והתבססות [establishment] | "השקיה טכנית בהתאם לצורך" [technical irrigation as needed] | same |
| 14-27 | התפתחות [development] | 0.3 | 0.6 |
| 28-40 | חנטה [fruit set] | 0.6 | 1.0 |
| 40-60 | חנטה ומילוי פרי [fruit set and filling] | 0.7 | 1.3 |
| 60-100 | הבשלה וקטיף [ripening and harvest] | 0.7 | 1.5 |
| 100-150 | קטיף [harvest] | 0.9 | 2.3 |
| 150-180 | קטיף עד סיום גידול [harvest to end of crop] | 0.8 | 1.7 |

- The text says the Kc against outside Penman is roughly half the Kc against inside Penman (p. 7).
- From early September (about day 120) Penman falls and pepper use falls with it. Only after about day 150 does use fall faster than Penman (p. 7).
- Table 2 (p. 12) is a separate **irrigation** coefficient: outside 0.4 / 0.8 / 0.9 / 0.9 / 1.1 / 1.0; inside 0.8 / 1.3 / 1.6 / 1.9 / 2.8 / 2.1, same day bands. It follows the finding that sandy soil should get about 125% of use, at least once a day, to keep the soil water tension high. 150% did not raise yield or quality (discussion, p. 11).
- **[note]** Table 1 is the crop's water use (Kc). Table 2 is Kc plus a deliberate surplus. The planner's FAO water balance wants Table 1.

### 1e. Pepper, Jordan Valley: Shaham 2016 and Shaham 2020

- **Reference change.** Most regions "עברו ... ממדידת התאדות מגיגית למדידת התאדות מתחנה מטאורולוגית" [moved from pan evaporation to evaporation from a weather station], computed from temperature, humidity, radiation and wind, "התאדות מחושבת או התאדות פוטנציאלית (פנמן-מונטיס)" [computed or potential evaporation (Penman-Monteith)]. Because the two methods give different values, different coefficients are needed (Shaham 2016, p. 1; same text in Shaham 2020, p. 1).
- **Crop.** Autumn pepper, planted August-September, in net-houses and greenhouses, in local soil, detached substrate and feeding troughs (Shaham 2016, p. 1; Shaham 2020, p. 1).

Shaham 2016, Table 1, net-houses and greenhouses together (p. 1):

| Stage or period | Coefficient x Class A pan | Coefficient x Penman-Monteith |
|---|---|---|
| Establishment (about two weeks) | as needed | as needed |
| Establishment to set of 3-4 fruits | 0.4 | 0.6 |
| Set of 3-4 fruits to end of December | 0.7-0.8 | 0.8-1.0 |
| End of December to mid-February | 0.6 | 0.7 |
| Mid-February to end of crop | 0.8 | 1.1 |

Shaham 2020 replaced this with separate tables for net-house (Table 1) and greenhouse (Table 2) (p. 2):

| Stage or period | Net-house, pan | Net-house, Penman | Greenhouse, pan | Greenhouse, Penman |
|---|---|---|---|---|
| Establishment (about two weeks) | as needed | as needed | as needed | as needed |
| Establishment to removing the shade net | 0.3-0.4 | 0.4-0.5 | 0.3-0.4 | 0.4-0.5 |
| Removing the shade net to set of 3-4 fruits* | 0.4-0.5 | 0.5-0.6 | 0.4-0.5 | 0.5-0.6 |
| Set of 3-4 fruits to deploying the shade net (net-house) / to replacing the insect net with plastic (greenhouse) | 0.75 | 1.0 | 0.65 | 0.8 |
| Plastic installed to shade net on the plastic (to mid-February)** | - | - | 0.75 | 1.0 |
| Deploying the shade net to end of crop | 0.6 | 0.8 | 0.6 | 0.8 |

- \* At this stage, irrigate by the lower coefficient if growth is strong, and by the higher one if fruit set is strong (Shaham 2020, p. 2, footnote).
- \*\* Under plastic, evaporation is about 10% lower than in a net-house, so in practice irrigate both house types alike (Shaham 2020, p. 2, footnote).
- A 2020/21 trial compared the 2018 and 2020 recommendations. The 2020 ones saved about 20% water with no loss of yield or quality. The 2018 ones were based on coefficients measured at "תחנה מטאורולוגית חיצונית סטנדרטית" [a standard outside weather station] (Jordan Valley R&D + Shaham, "בחינת יישום מקדמי השקיה בגידול פלפל בבתי צמיחה בבקעת הירדן בחורף - עונת 2020/21" [Testing irrigation coefficients for pepper in Jordan Valley greenhouses in winter, 2020/21], abstract and introduction, p. 1).
- **[note]** In both years the pan coefficient is about 0.75 of the Penman one (for example 0.75 vs 1.0 and 0.6 vs 0.8 in 2020). That ratio is only implied by the tables, and the sources do not state it as a rule.

## 2. Which reference each coefficient multiplies

| Source | Multiplies | Basis for saying so |
|---|---|---|
| Harel 2014, Tables 2-3 | FAO-56 Penman-Monteith ET0 | "Penman-Monteith equation as adopted by FAO-56" (p. 134). Inside or outside weather data: not stated. |
| Shaham 2017 tomato | Penman ("התאיידות מחושבת לפי פנמן" [evaporation computed by Penman]), Ministry weather site, Besor averages | p. 5-6 |
| Ramat Negev 2020 | Penman (ratio of measured use to Penman) | discussion and Table 2, pp. 20-21 |
| Besor pepper 2022, Table 1 | Penman, two columns: **outside station** and inside the net-house | Table 1 header, p. 7; aim stated on p. 5 |
| Shaham 2016 / 2020 pepper | Two columns: **Class A pan** and **Penman-Monteith** | table headers, Shaham 2016 p. 1, Shaham 2020 p. 2 |

- FAO-56 links the two references by ET0 = Kp x Epan (Ch. 4, Eq. 55). The pan coefficient Kp for a Class A pan depends on fetch, humidity and wind and comes from Table 5 (Ch. 4, "Pan evaporation method"). **[note]** So a pan-based crop coefficient can only be turned into a Penman one with a local Kp. The Jordan Valley sheets avoid that by printing both columns. We should use only Penman columns.
- **[note]** Open-Meteo's ET0 is FAO-56 Penman-Monteith for an open grass reference outside any structure. It matches "outside Penman", not "inside Penman". Using an inside-Penman column with our ET0 would roughly double the water (Besor pepper 2022, Table 1 and text, p. 7).

## 3. Season lengths and planting months near our plots

- **Tomato, northern Negev near the coastal plain.** About 1,500 ha of net-houses and greenhouses grow tomato "all year around". The structures are low-cost and unheated, with 50-mesh net in summer and plastic in winter (Harel 2014, pp. 132-133).
  - Winter crop: planted about 1 October, ran to day 250.
  - Summer crop: planted about mid-April, removed at day 200.
  - (Harel 2014, Figure 1 p. 135; p. 136.)
- **Tomato, extension guide.** Autumn-winter greenhouse tomato planted from August-September; some varieties are for planting all year and "a long crop" (Shaham 2017, pp. 1-2). The coefficient table runs to day 250 (p. 5). In Ramat HaNegev, cherry tomato planted 1 September also runs to day 250, and is grown "לאורך כל השנה (קיץ וחורף)" [all year, summer and winter] (Ramat Negev 2020, pp. 1, 21).
- **Pepper, western Negev.** The summer net-house crop was planted on 19 May, and the measured season ran to day 180, into November (Besor pepper 2022, pp. 5, 7).
- **Pepper, Jordan Valley.** The autumn crop is planted August-September. Irrigation intervals are listed month by month from August to May-June (Shaham 2016, Table 2, p. 2), about 9-10 months **[note: my count]**.
- **FAO-56 Table 11, for comparison.** Tomato 135-180 days, with the longest row 35/45/70/30 = 180 days for Oct/Nov planting in an arid region. Pepper 125 days (Europe and Mediterranean) or 30/40/110/30 = 210 days for October planting in an arid region (Ch. 6, Table 11; see `fao56.md`).
- **[note]** Our demo plots were planted on 15 Feb, 1 Mar, 12 Apr and 1 May 2026 (`services/registry-service/seed.py`). On 2026-11-17 they are 275, 261, 219 and 200 days from planting. The Israeli sources have no Feb-March planting. The nearest are Harel's mid-April summer tomato and Besor's mid-May summer pepper.

## 4. What FAO-56 says about long seasons and after harvest

- **Stage lengths are local.** "The values in Table 11 are useful only as a general guide and for comparison purposes", and "Local observations of the specific plant stage development should be used, wherever possible". Local information can come from farmers and "agricultural extension agents" (Ch. 6, "Length of growth stages"). Stage length "will also vary with cultivar" (same section).
- **Long seasons across several climatic seasons.** For deciduous fruit trees, whose mid and late seasons are long, "several adjustments of Kc are often required if the mid and late seasons cover several climatic seasons" (Ch. 6, "Construction of the Kc curve", fruit trees). FAO says this for trees, not vegetables. **[note]** It is the closest FAO guidance to a 9-month tomato or pepper.
- **Repeated harvests.** For forage crops cut several times, "Each harvest essentially terminates a 'sub' growing season and associated Kc curve" (Ch. 6, forage crops). **[note]** Tomato and pepper are picked repeatedly but not cut back, so the Israeli tables use one long "harvest" stage instead.
- **End of the curve.** For a harvest earlier than the curve, the user "can then terminate the application of the constructed curve early, corresponding to the time of the early harvest" (Ch. 6, "Crop coefficient for the end of the late season stage"). FAO-56 has no rule for continuing a Kc curve past the end of a season.
- **After the crop.** For bare soil, "Kc for bare soil can be calculated as Kc = Kc ini where Kc ini is calculated using the procedure of Chapter 6". With the dual method, Kcb = 0 (Ch. 11, "Bare soil"). Dead vegetation or mulch: Kc = Kc ini, reduced about 5% for each 10% of soil covered (Ch. 11, "Surface covered with dead vegetation").
- **Protected crops.** FAO-56 Ch. 6 has nothing on greenhouse or net-house cultivation. The only related remark is that drip under plastic mulch lowers pineapple Kc by 0.10 (Table 12, footnote 16; see `fao56.md`).

## 5. Recommendation [note: my reasoning, for the owner to decide]

**Tomato: Harel et al. 2014.**

- It is the only peer-reviewed, lysimeter-measured, stage-by-day Kc for tomato from our region (Besor).
- It is computed against FAO-56 Penman-Monteith ET0, the same quantity weather-service gives.
- The Ministry's extension guide adopted its winter table unchanged (Shaham 2017, p. 5). Ramat Negev 2020 found values of similar size (0.9 in harvest vs 0.83).
- Which table fits our plots:
  - Spring plantings (Feb-Apr) match the **summer net-house table** (Table 3, round tomato): 0.18 / 0.47 / 0.9 / 0.81, season to day 200.
  - The winter table (Table 2), to day 250, is the alternative if the owner prefers the longer, plastic-covered season.
  - Both stay at about 0.8 for the whole harvest stage.

**Pepper: Besor pepper 2022, Table 1, "Kc against outside Penman".**

- It is the only pepper table from the western Negev.
- It is matched on purpose to the Ministry's outside-station Penman, which is what Open-Meteo approximates.
- It was measured in lysimeters next to pepper in local sand.
- Values: 0.3 / 0.6 / 0.7 / 0.7 / 0.9 / 0.8, season to day 180.
- The Jordan Valley 2020 Penman column is the backup. It ends a 9-10 month autumn crop at 0.8 "from deploying the shade net to end of crop", the same late value. But it is staged by calendar and net operations, not days, and comes from another region.

**What still happens after the long season.**

- Neither source has a crop past day 200 (summer tomato), 250 (winter tomato) or 180 (summer pepper). Harel's summer tomato crop was removed at day 200 (p. 136).
- FAO-56 ends the curve at harvest and treats the field as bare soil afterwards, with Kc = Kc ini (Ch. 6, Kc end; Ch. 11).
- So the choice past the long season is the same as today, only later:
  - hold the last Kc (about 0.8, now with an Israeli source), or
  - mark the season ended.
- All four demo plots are at day 200 or later on 2026-11-17. A "season ended" answer would still affect every demo plan. That is a choice for the owner (and possibly the lecturer, as O80 says).

## 6. Limits of each source

- **Open field: no Israeli source found.** I found no Ministry or R&D table, pan or Penman, for open-field tomato or pepper in the Negev. The two searches for open-field and processing tomato coefficients returned only greenhouse work. **[note]** For an open-field plot, FAO-56 Tables 11/12 remain the only sourced values.
- **Structure.** All long-season tables are for net-houses or greenhouses. Inside a net-house, crop water use relative to outside Penman is about half of that relative to inside Penman (Besor pepper 2022, p. 7). So the structure itself lowers the outside-based Kc, and these values would under-water an open field. The registry has no field for structure type (`services/registry-service/tables.py`, table `plots`). One demo plot is merely named "Greenhouse" (`seed.py`).
- **Planting month.** Each table is for one season: tomato winter (about 1 Oct) and summer (about mid-April), pepper summer (19 May), Jordan Valley pepper autumn (Aug-Sep). Day-based Kc carries the climate of that season. No source covers a February or March planting.
- **Lysimeter medium and over-irrigation.** The Kc was measured in tuff/compost (Harel 2014, p. 133) or tuff/coarse fill (Besor pepper 2022, p. 4), kept wet with 20-40% drainage. The papers say lysimeter use tracks soil-grown plants in the same structure (Harel 2014, p. 136). This is the maximum, unstressed use, which is what FAO's Kc means.
- **Water quality.** Ramat Negev 2020 uses brackish water (about 1.5 dS/m) and recommends 140% of use (p. 1). Its coefficients include no leaching, but its yield advice does. Besor pepper Table 2 (p. 12) is an irrigation coefficient with a 25% surplus and is not a Kc.
- **Variety.** Harel's cherry-cluster tomato differs from round tomato: higher Kc in harvest (0.97 vs 0.81), then a decline (Harel 2014, Table 3). The registry crop "tomato" does not say round or cherry.
- **ET0 source.** Harel 2014 does not say whether its Penman-Monteith used inside or outside weather data. Shaham 2017, which reprints the same numbers, points to the Ministry's (outside) stations and Besor averages (pp. 5-6). **[note]** I treat them as outside-based, but that is an inference.
- **No climate adjustment.** None of the Israeli sources applies FAO Eq. 62/65. Their Kc already includes local climate and structure.
- **Copies.** Shaham 2017 and Shaham 2020 were read from copies hosted by Arava R&D and a seed company, not from gov.il. Shaham 2016 and the 2020/21 trial are on gov.il.

## Not reached or not verified

- The Shaham Excel file "מקדמי השקיה בפלפל, ערבה ובקעת הירדן" [irrigation coefficients for pepper, Arava and Jordan Valley] is linked from Shaham's autumn hot-pepper sheet, August 2022, p. 6. The link was not followed or read.
- Tanny, Cohen, Tzipilevich et al. 2018, "פיתוח אומדני תצרוכת מים ומדדי השקיה, מבוססים על נוסחת פנמן-מונטית, לגידול פלפל בבתי רשת וחממות" [Developing water-use estimates and irrigation indices based on Penman-Monteith for pepper in net-houses and greenhouses], season report. Cited in Besor pepper 2022, p. 13; not found online.
- Cohen et al. 2015, Shaham sheet on autumn pepper in the Arava. Cited in Besor pepper 2022, pp. 2, 13; not read.
- Möller and Assouline 2007 (*Irrigation Science* 25:171-181) and Möller et al. 2004 (*Agric. For. Meteorol.* 127:35-51), on screenhouse pepper water use in southern Israel. Cited in Besor pepper 2022, p. 12; not read, so none of their numbers are used here.
- The Shaham western-Negev tomato coefficient for desalinated water mentioned in Ramat Negev 2020, p. 20. Not found as a separate document. **[note]** It may be the Shaham 2017 table.

## Sources

All fetched 2026-11-17.

- Harel, D., Sofer, M., Broner, M., Zohar, D., Gantz, S. (2014). Growth-Stage-Specific Kc of Greenhouse Tomato Plants Grown in Semi-Arid Mediterranean Region. *Journal of Agricultural Science* 6(11):132-142. doi:10.5539/jas.v6n11p132. Article page: https://ccsenet.org/journal/index.php/jas/article/view/38015 ; PDF: https://ccsenet.org/journal/index.php/jas/article/download/38015/22334
- Shaham, vegetables department (Gantz, Ilani, Avraham), July 2017, גידול עגבניות בעונת הסתוי-חורף [Growing tomatoes in the autumn-winter season]: https://agri.arava.co.il/wp-content/uploads/%D7%92%D7%99%D7%93%D7%95%D7%9C-%D7%A2%D7%92%D7%91%D7%A0%D7%99%D7%95%D7%AA-%D7%91%D7%AA%D7%99-%D7%A6%D7%9E%D7%99%D7%97%D7%94-%D7%A1%D7%AA%D7%95-%D7%97%D7%95%D7%A8%D7%A3-2017.pdf
- Ramat Negev R&D (Seguli, Cohen, Kay, Zenvar), 2020, ייעול ההשקיה של גידול עגבניות בהנבה חורפית בחממות ברמת הנגב [Improving irrigation of winter-harvest greenhouse tomatoes in Ramat HaNegev]: https://moprn.org/sites/default/files/research/file/%D7%94%D7%A9%D7%A7%D7%99%D7%99%D7%AA%20%D7%A2%D7%92%D7%91%D7%A0%D7%99%D7%95%D7%AA%20%D7%A9%D7%A0%D7%AA%D7%99%202019%20-%20Website211124.pdf
- Negev R&D (Broner, Ilani, Avraham), final report 2022, research 92-012-20, ייעול ההשקיה של גידול פלפל בהנבה קיצית בבתי רשת בנגב [Improving irrigation of summer-harvest pepper in net-houses in the Negev]: https://mopdarom.org.il/wp-content/uploads/2026/07/%D7%99%D7%99%D7%A2%D7%95%D7%9C-%D7%94%D7%94%D7%A9%D7%A7%D7%99%D7%94-%D7%A9%D7%9C-%D7%92%D7%99%D7%93%D7%95%D7%9C-%D7%A4%D7%9C%D7%A4%D7%9C-%D7%91%D7%94%D7%A0%D7%91%D7%94-%D7%A7%D7%99%D7%A6%D7%99%D7%AA-%D7%91%D7%91%D7%AA%D7%99-%D7%A8%D7%A9%D7%AA-%D7%91%D7%A0%D7%92%D7%91-2022.pdf
- Shaham + Jordan Valley R&D, updated 2016, המלצות השקיה ודישון לפלפל סתווי בבתי רשת ובבתי צמיחה בבקעת הירדן [Irrigation and fertilisation recommendations for autumn pepper in Jordan Valley net-houses and greenhouses]: https://www.gov.il/BlobFolder/reports/moag-dapon-402/he/Professional_information_dapon_hashkaya_vdishun_pilpel_2016%20(2).pdf
- Same, updated for 2020: https://topseedsisrael.com/wp-content/uploads/2020/09/irrigation_and_fertilizer_recommendations_for_growing_pepper_in_greenhouses.pdf
- Jordan Valley R&D + Shaham, בחינת יישום מקדמי השקיה בגידול פלפל בבתי צמיחה בבקעת הירדן בחורף - עונת 2020/21 [Testing irrigation coefficients for pepper in Jordan Valley greenhouses in winter, 2020/21]: https://www.gov.il/BlobFolder/reports/examination-of-the-application-of-irrigation-coefficients-in-pepper-cultivation/he/Professional_information_examination-of-the-application-of-irrigation-coefficients-in-pepper-cultivation.pdf
- Shaham, August 2022, גידול פלפל חריף בבתי צמיחה בסתיו [Growing hot pepper in protected houses in autumn] (only for the Excel link, p. 6): https://www.gov.il/BlobFolder/reports/growing-hot-pepper-in-grow-houses-in-the-fall-season/he/Professional_information_growing-hot-pepper-in-grow-houses-in-the-fall-season.pdf
- FAO-56, Chapter 4 (pan method, Eq. 55, Table 5): http://www.fao.org/4/x0490E/x0490e08.htm
- FAO-56, Chapter 6 (Tables 11 and 12, stage lengths, Kc end, fruit trees, forage): http://www.fao.org/4/x0490E/x0490e0b.htm
- FAO-56, Chapter 11 (ETc during non-growing periods): http://www.fao.org/4/x0490E/x0490e0h.htm
- Repository: `services/planner-service/docs/research/fao56.md`, `DECISIONS.md` (O80), `services/registry-service/seed.py`, `services/registry-service/tables.py`.
