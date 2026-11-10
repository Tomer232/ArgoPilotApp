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
