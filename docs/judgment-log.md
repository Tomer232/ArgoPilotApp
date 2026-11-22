# Judgment log

Decisions where the agent suggested one thing and I decided, with my reasons.
Every other decision is listed in [`DECISIONS.md`](../DECISIONS.md).

## 1. A 405 response has no `code`

The spec says every error carries one of four codes: `VALIDATION`, `NOT_FOUND`, `CONFLICT` or `UNAVAILABLE`. A wrong HTTP method, such as `POST /v1/crops`, fits none of them.

- **Agent suggested:** three options: send no `code`; reuse `VALIDATION`; or invent a fifth code such as `METHOD_NOT_ALLOWED`.
- **I decided:** no `code`. I leaned towards it before asking, then asked the agent for its opinion, and it agreed. The response is still problem+json, with `status: 405` and an `Allow` header that lists the methods that do work.
- **Why:** a code that means something else is worse than no code, because a client would act on it wrongly. Inventing a fifth code adds something the spec does not list. The risk is that a strict reading of "every error has a code" counts this as missing.

## 2. The `GET /v1/plots` size limit is documented, not fixed

The load test found that `GET /v1/plots` returns every plot in one response. At 10 requests/s its p95 reaches 91 ms at 12,500 plots, and requests time out at 15,000 plots. With 1,000 plots it measures 14.9 ms.

- **Agent suggested:** documenting the limit, and named pagination as the real fix.
- **I decided:** document it in the README and the PR, and not add pagination.
- **Why:** pagination is outside the spec. It changes the response shape of an endpoint the spec defines, and the task says to build only what it lists. Changing the API is the spec owner's decision, not mine.

## 3. A "future" planting date means after today in UTC+14

The spec rejects a `planting_date` in the future, but "today" depends on the time zone.

- **Agent suggested:** it asked which time zone should decide "today" and explained UTC's downside: a farmer in Israel who plants after midnight local time would be rejected for about two to three hours, because in UTC it is still yesterday.
- **I decided:** I had leaned towards UTC, then questioned it, since it is just the server's time zone moved to one side. I asked whether "today" could follow the user's region, for example local time in Stockholm or `Asia/Jerusalem`. That is the right answer, but it needs each plot's time zone worked out from its location. For now I chose the simplest and cheapest option: today in UTC+14, the earliest time zone on Earth.
- **Why:** with UTC+14, no farmer anywhere is rejected for planting today. The cost is that a date up to about a day ahead can be accepted in western time zones. This is temporary: using each plot's own time zone is noted as future work.

## 4. Bad stored data gives 503, not 500

The break-the-API test wrote text into a number column of the database directly, as another program could. The API then crashed with a **plain-text 500**.

- **Agent suggested:** report the failure first, then fix it by answering `503 UNAVAILABLE`. A last-resort handler would also turn any other unexpected error into a 503, so no error is ever plain text.
- **I decided:** 503 `UNAVAILABLE`, with the last-resort handler. The real error is still written to the log.
- **Why:**
  - The API promises every error as problem+json with a code, and a plain-text 500 breaks that promise to clients.
  - The client's request was valid; the fault is the server's own data. 503 is the only server-side code the spec allows, and it comes with `Retry-After`.

## 5. "Today" follows the client's time zone, bounded by UTC

This revisits entry 3. I wanted "in the future" to mean the future where the request comes from: at the same moment, a date can already be today in India but still tomorrow in Jerusalem.

- **Agent suggested:** three ways to know the client's zone: the client sends a `Time-Zone` header (recommended), work it out from the plot's lat/lon, or guess from the IP address (unreliable).
- **I decided:** the header. Then I asked how to stop a client from claiming any zone it likes, and proposed a base time zone, such as the server's, that bounds what a client can claim. The agent agreed with the idea but suggested UTC as the base instead of the server's location, because servers move. Every real zone is between UTC−12 and UTC+14, and only real zone names are accepted, so no claim can move "today" more than a day past UTC. No header keeps the old UTC+14 rule; an unknown zone gives 422.
- **Why:** a farmer's "today" is where the farmer is. The worst a lying client can do is claim UTC+14, which is exactly what we already allowed, so lying gains nothing. Old clients and curl keep working without the header.

## 6. Turn `/docs` back on (P2)

P2's frontend prompt tells the agent to read the registry and planner APIs at `/docs`, but P1 turned `/docs` off (O14).

- **Agent suggested:** keep `/docs` off and point the frontend agent at the service READMEs and code instead.
- **I decided:** turn `/docs` (and `/openapi.json`) back on for `registry-service` and `planner-service` (Y13).
- **Why:** so the agent reads the real API, not a description of it.

## 7. The grower sets today's soil water (P2)

The planner only looks forward from today, so it must know how full the soil bucket is this morning. It assumed full every time (O76), so in November most plots showed "No irrigation" for 7 days, even on dry soil.

- **Agent suggested:** start full, FAO's default without a measurement; storing each plot's bucket was kept for later.
- **I decided:** the lecturer said it is ours to decide, so the grower chooses the level on the plot page each visit (Y14, O87). Then I asked that the question be about what the grower sees: "full, half, empty" talks about our bucket, and a grower looks at soil. So the page asks the grower to squeeze a handful of soil and pick the description that matches, per soil type (O88, from the USDA NRCS feel-and-appearance guide), and we convert it to a bucket level.
- **Why:** the plan should start from the real field, and the words should be ones a grower can check by hand.

## 8. No Israeli long-season sources (P2)

All demo plots are past the FAO season, so the planner keeps the end-of-season Kc (O80).

- **Agent suggested:** adopt measured Israeli tables (Harel 2014 for tomato, Besor 2022 for pepper), assuming every plot is a net-house.
- **I decided:** don't use the Israeli sources; stay on FAO (O89).
- **Why:** it is a big steer off from the FRs. The tables cover only protected crops and one planting month each, and they still end before the demo plots' age.

## 9. A hard 24-hour cap on a day's watering (P2)

Refilling a dry bucket could ask for 2024 minutes (34 h) of dripping in one day.

- **Agent suggested:** a practical cap per day, set in `.env` (for example 12 h).
- **I decided:** cap it hard at 24 h, so it prevents overflow and waste but never stops a grower who needs to water for a long time: the rest happens on the next days, and the water level, not the date, decides when (O90).
- **Why:** 24 h is the system's real limit. Any smaller number would be a guess.

## 10. The grower chooses the irrigation trigger, 1-99% (P2)

p2.md says to irrigate below half. FAO gives each crop its own level (tomato 60%, pepper 70%).

- **Agent suggested:** let the grower choose half, the crop value or a custom value, but only from 30% to 70%, FAO's range.
- **I decided:** any value from 1% to 99%. Outside 30-70% the page shows a warning and the recommended crop value (Y15).
- **Why:** the grower knows the field; the page should advise, not refuse.

## 11. Keeping pages the spec didn't ask for (P2)

The frontend redesign added list pages for farms, plots, crops, soils and emitters, a plot dropdown, and a home page that plans every plot. The frontend prompt says "No other pages or features".

- **Agent suggested:** delete all three: they are out of spec, and the home summary calls the planner once per plot on every load.
- **I decided:** keep them and record them as deviations (Y20-Y22, `docs/extras.md`).
- **Why:** the grower should see the whole registry from the app, and that is what a good product looks like at this stage. The lecturer said we may add functionality as we see fit and need. Stepping out of the given requirements is fine, just not too far.
