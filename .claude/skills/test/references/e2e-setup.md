# e2e suite setup

Create these two files in `tests/e2e/` at the repo root the first time. Then `cd tests/e2e && uv run pytest` installs pytest and httpx into its own `.venv`.

## `tests/e2e/pyproject.toml`

```toml
[project]
name = "agropilot-e2e"
version = "0.1.0"
description = "Tests that run against the real, running AgroPilot services."
requires-python = ">=3.12"
dependencies = []

[dependency-groups]
dev = ["pytest~=9.2", "httpx~=0.28"]

[tool.pytest.ini_options]
testpaths = ["."]
```

## `tests/e2e/conftest.py`

```python
"""Shared fixtures for the e2e suite: real services, own test rows only."""

import uuid

import httpx
import pytest

REGISTRY = "http://127.0.0.1:8000"
WEATHER = "http://127.0.0.1:8001"
PLANNER = "http://127.0.0.1:8002"
FRONTEND = "http://127.0.0.1:3000"


def is_up(url: str) -> bool:
    """True if the url answers 200 within 2 seconds."""
    try:
        return httpx.get(url, timeout=2).status_code == 200
    except httpx.HTTPError:
        return False


@pytest.fixture(scope="session", autouse=True)
def stack_running() -> None:
    """Skip the whole suite unless all four services answer (start them with run-stack)."""
    urls = [f"{REGISTRY}/health", f"{WEATHER}/health", f"{PLANNER}/health", FRONTEND]
    down = [url for url in urls if not is_up(url)]
    if down:
        pytest.skip(f"stack not running ({', '.join(down)}): bash .claude/skills/run-stack/scripts/stack.sh start")


@pytest.fixture
def e2e_name() -> str:
    """A unique name for rows this test creates, so they never clash with seed data."""
    return f"e2e-{uuid.uuid4().hex[:8]}"


@pytest.fixture
def e2e_farm(e2e_name: str):
    """A farm created for this test in the real registry, deleted (with its plots) afterwards."""
    farm = httpx.post(f"{REGISTRY}/v1/farms", json={"name": e2e_name}, timeout=5)
    farm.raise_for_status()
    farm_id = farm.json()["id"]
    yield farm.json()
    for plot in httpx.get(f"{REGISTRY}/v1/plots", params={"farm_id": farm_id}, timeout=5).json():
        httpx.delete(f"{REGISTRY}/v1/plots/{plot['id']}", timeout=5)
    httpx.delete(f"{REGISTRY}/v1/farms/{farm_id}", timeout=5)
```

A farm body is only `{"name": ...}` (`FarmCreate` in `services/registry-service/models.py`). Plots need more fields; build them from `PlotCreate` in the same file, using seed crop, soil and emitter ids from `GET /v1/crops`, `/v1/soils`, `/v1/emitters`.
