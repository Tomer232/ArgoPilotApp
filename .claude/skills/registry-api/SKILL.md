---
name: registry-api
description: API conventions for services/registry-service (FastAPI + sqlite3). Use this skill whenever you add, change, rename or remove an endpoint, route, request/response model, query parameter or error response in registry-service, and whenever you write tests for one, even if the request only says "add a field", "support filtering by X" or "fix this status code".
---

# Registry API conventions

The registry is graded against a written spec: the current task file in the course
repo (https://github.com/alonitac/OzVeruach26, e.g. `tasks/p2.md`). Every API client
relies on these conventions holding on every endpoint, so a new endpoint should look
exactly like the existing ones in `farms.py` and `plots.py`. Read one of those first.

## 1. Routes and lists

- Every route is under `/v1`. Routers have no prefix, so write the full path in the
  decorator: `@router.get("/v1/plots")`.
- A list endpoint returns a plain JSON array (`response_model=list[Plot]`), not an
  object around it. No rows is `200` with `[]`, never a 404.
- A new query parameter must also be added to `ALLOWED_QUERY_PARAMS` in `main.py`.
  Otherwise it is rejected with 422.

## 2. Only the spec's fields

Return only the fields the spec lists, and never add one on your own (no
`created_at`, `links` or counts unless the spec has them). The response model in
`models.py` lists exactly the spec's fields, and that is what enforces it, so always
set `response_model`. Request models inherit `RequestModel` (strict, `extra="forbid"`).

## 3. PATCH changes only what was sent

Use `sent_fields(body)` from `models.py`. Fields missing from the body stay
unchanged. An explicit `null` is 422. `{}` is 200 with the row unchanged.

## 4. Errors are problem+json

Every error is `application/problem+json` (RFC 9457) with a stable `code`. Raise the
classes from `errors.py`, never `HTTPException` and never a hand-built body:

| Class | Status | `code` |
|---|---|---|
| `ValidationFailedError` | 422 | `VALIDATION` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |
| `UnavailableError` | 503 | `UNAVAILABLE` (adds `Retry-After`) |

FastAPI's default error body (`{"detail": ...}`) must never reach a client.
`errors.py` already rewrites FastAPI's own 400/404/405 and validation errors. If you
see a default body, fix the handler instead of working around it.

One deliberate exception: a 405 is problem+json with an `Allow` header and **no
`code`** (see `docs/judgment-log.md` #1). Leave it that way.

Conventions that already exist: a path id that is not a UUID gives 404 (`parse_id`);
an unknown reference inside a body (farm, crop, soil, emitter) gives 422, not 404.

## 5. Tests for every outcome

Each endpoint gets tests for the success case **and every failure case it can
return** (each 404, 409, 422 path). List the outcomes from the code before writing
the tests, so none is missed. Use the `client` fixture, `plot_body(**changes)` for
a valid plot body and `assert_problem(response, status, code)` from
`tests/helpers.py` for errors. It checks the status, the content type and the `code`.

## 6. Run the suite before saying done

From `services/registry-service`, run `uv run pytest` and report the result. If
anything fails, the work is not done, even if the failure looks unrelated.

## 7. Ask when the spec is silent

If the spec doesn't say what to do in some case (a status code, a field, an edge
case), stop and ask the owner with the options and a recommendation. Don't invent
behavior. Each answer is recorded in `DECISIONS.md`, and anything built outside the
spec goes there too.
