# Test plan

The map of AgroPilot's tests: what each part protects, where the tests are, and what is not covered yet. Updated by the `test` skill after every section.

Last updated: <date>, after <section>.

## How to run

| Suite | Command | Needs |
| --- | --- | --- |
| registry | `cd services/registry-service && uv run pytest` | nothing (SQLite copy per test); `TEST_DATABASE_URL` for PostgreSQL |
| weather | `cd services/weather-service && uv run pytest` | nothing (fake provider) |
| planner | `cd services/planner-service && uv run pytest` | nothing (fake registry and weather) |
| frontend | `cd services/frontend && npm test` | nothing (pure logic) |
| e2e | `cd tests/e2e && uv run pytest` | the stack running (`run-stack`); skips when down |

## Per service

### registry-service
- **Covered:** <areas, one line each, with the test file>
- **Known gaps:** <what isn't tested and why>

### weather-service
- **Covered:**
- **Known gaps:**

### planner-service
- **Covered:**
- **Known gaps:**

### frontend (src/lib)
- **Covered:**
- **Known gaps:**

## Across services (e2e)

| Flow | Test | What it proves |
| --- | --- | --- |
| <e.g. new plot gets a plan> | `tests/e2e/test_<name>.py` | <one line> |

## Known gaps (system-wide)

- <gap, and why it's open>
