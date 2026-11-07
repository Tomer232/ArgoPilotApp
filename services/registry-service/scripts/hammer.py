"""Hammer the API to find where p95 latency crosses NFR-1.1's 100 ms limit.

    uv run python scripts/hammer.py              # all three tests (~15 min)
    uv run python scripts/hammer.py --only rate  # just one of: rate, size, mixed

Three tests, each run against its own scratch database and its own server
(one uvicorn worker, as the service ships). registry.db is never touched.

  rate   Every GET endpoint at 10 -> 25 -> 50 ... 800 requests/s, until p95 > 100 ms.
  size   GET /v1/plots at the spec's 10 requests/s while the table grows to 100,000 plots.
  mixed  80% reads, 20% writes (create, update, delete) at rising rates.
         Writes take SQLite's write lock, which a read-only test never shows.

Requests go out on a fixed schedule without waiting for earlier answers, so slow
answers cannot hide by delaying later requests (same idea as measure_latency.py).
"""

import argparse
import asyncio
import os
import random
import sqlite3
import statistics
import subprocess
import sys
import tempfile
import time
import uuid
from contextlib import contextmanager
from pathlib import Path

import httpx2

SERVICE_DIR = Path(__file__).parent.parent
PORT = 8790
LIMIT_MS = 100
DEMO_FARM = "b7e2c0a0-3c1d-4f0a-9a11-0c5d2e6f1001"

RATES = [10, 25, 50, 100, 200, 400, 800]
PLOT_COUNTS = [1_000, 5_000, 10_000, 12_500, 15_000, 20_000, 25_000, 50_000, 100_000]
MIXED_RATES = [10, 25, 50, 100, 200, 400, 800]

# Ids of plots the mixed test created, so it can update and delete them.
created: list[str] = []


# --- Scratch databases and a server to test ------------------------------


def build_database(folder: Path, total_plots: int = 4) -> Path:
    """Run the real seed script, then add plots until the table has `total_plots`."""
    path = folder / f"registry-{total_plots}.db"
    subprocess.run(["bash", "seed_registry.sh", str(path)], cwd=SERVICE_DIR, check=True, capture_output=True)
    extra = total_plots - 4
    if extra > 0:
        rows = (
            (str(uuid.uuid4()), DEMO_FARM, f"Load plot {i}", 1000, "tomato", "2026-03-01",
             "loam", 1.5, 0.4, "dripnet-pc-1.0", 31.25, 34.79)
            for i in range(extra)
        )
        with sqlite3.connect(path) as conn:
            conn.executemany("INSERT INTO plots VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", rows)
    return path


@contextmanager
def running_service(db_path: Path):
    """Start the service on `db_path`, wait until it answers, stop it afterwards."""
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(PORT)],
        cwd=SERVICE_DIR,
        env={**os.environ, "REGISTRY_DB_PATH": str(db_path)},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        for _ in range(100):
            try:
                if httpx2.get(f"http://127.0.0.1:{PORT}/health").status_code == 200:
                    break
            except httpx2.TransportError:
                time.sleep(0.1)
        yield f"http://127.0.0.1:{PORT}"
    finally:
        server.terminate()
        server.wait()


# --- Sending requests on a schedule ---------------------------------------


async def send(client: httpx2.AsyncClient, kind: str, method: str, url: str, body, results: list) -> None:
    """One request: record (kind, latency ms, status). A timeout or broken connection counts as status 0."""
    start = time.perf_counter()
    try:
        response = await client.request(method, url, json=body)
        status = response.status_code
        if method == "POST" and status == 201:
            created.append(response.json()["id"])
    except httpx2.TransportError:
        status = 0
    results.append((kind, (time.perf_counter() - start) * 1000, status))


async def run_schedule(base_url: str, rate: int, seconds: int, next_request) -> tuple[list, float]:
    """Send `rate` requests/s for `seconds`. `next_request()` says what to send each time.
    Returns (results, achieved rate). If the achieved rate is lower than asked,
    the client itself could not keep up and the step is not a fair test."""
    results, tasks = [], []
    limits = httpx2.Limits(max_connections=2000, max_keepalive_connections=2000)
    async with httpx2.AsyncClient(base_url=base_url, limits=limits, timeout=30) as client:
        start = time.perf_counter()
        for i in range(rate * seconds):
            await asyncio.sleep(max(0, start + i / rate - time.perf_counter()))
            kind, method, url, body = next_request()
            tasks.append(asyncio.create_task(send(client, kind, method, url, body, results)))
        sending_time = time.perf_counter() - start
        await asyncio.gather(*tasks)
    return results, len(tasks) / max(sending_time, 1e-9)


# --- Reporting ------------------------------------------------------------


def summary(results: list, kind: str | None = None) -> dict:
    """p50/p95/p99 and error count for one kind of request (or all)."""
    rows = [r for r in results if kind is None or r[0] == kind]
    latencies = [ms for _, ms, _ in rows]
    errors = sum(1 for _, _, status in rows if status == 0 or status >= 500)
    cuts = statistics.quantiles(latencies, n=100, method="inclusive") if len(latencies) > 1 else latencies * 99
    return {"n": len(rows), "errors": errors, "p50": cuts[49], "p95": cuts[94], "p99": cuts[98]}


def verdict(s: dict) -> str:
    if s["errors"]:
        return "❌ errors"
    return "✅" if s["p95"] <= LIMIT_MS else "❌ p95 > 100 ms"


def row(label: str, achieved: float, s: dict) -> str:
    return (f"| {label} | {achieved:.0f} | {s['n']} | {s['errors']} | {s['p50']:.1f} "
            f"| {s['p95']:.1f} | {s['p99']:.1f} | {verdict(s)} |")


HEADER = ("| {first} | Achieved req/s | Requests | Errors | p50 ms | p95 ms | p99 ms | Result |\n"
          "| --- | --- | --- | --- | --- | --- | --- | --- |")


# --- The three tests ------------------------------------------------------


def test_rate(folder: Path, seconds: int) -> None:
    """Each GET endpoint, rate going up until p95 crosses the limit or errors appear."""
    print("\n## Rate: each GET endpoint at rising request rates (seed data)\n")
    with running_service(build_database(folder)) as base_url:
        urls = []
        for resource in ["farms", "plots", "crops", "soils", "emitters"]:
            first = httpx2.get(f"{base_url}/v1/{resource}").json()[0]["id"]
            urls += [f"/v1/{resource}", f"/v1/{resource}/{first}"]
        for url in urls:
            print(f"\n### `GET {url}`\n\n" + HEADER.format(first="Target req/s"))
            for rate in RATES:
                results, achieved = asyncio.run(run_schedule(base_url, rate, seconds, lambda: ("read", "GET", url, None)))
                s = summary(results)
                print(row(str(rate), achieved, s), flush=True)
                if verdict(s) != "✅":
                    break


def test_size(folder: Path, seconds: int) -> None:
    """GET /v1/plots (returns every plot) at 10 requests/s while the table grows."""
    print("\n## Size: GET /v1/plots at 10 requests/s as the plots table grows\n")
    print(HEADER.format(first="Plots in table"))
    for count in PLOT_COUNTS:
        with running_service(build_database(folder, count)) as base_url:
            results, achieved = asyncio.run(run_schedule(base_url, 10, seconds, lambda: ("read", "GET", "/v1/plots", None)))
        s = summary(results)
        print(row(f"{count:,}", achieved, s), flush=True)
        if verdict(s) != "✅":
            break


def test_mixed(folder: Path, seconds: int) -> None:
    """80% reads, 20% writes at rising rates. Reads and writes are reported separately."""
    print("\n## Mixed: 80% reads, 20% writes (create 10%, update 5%, delete 5%), seed data\n")
    print(HEADER.format(first="Target req/s · kind"))
    with running_service(build_database(folder)) as base_url:
        reads = [f"/v1/{r}" for r in ["farms", "plots", "crops", "soils", "emitters"]]
        counter = iter(range(10**9))

        def next_request():
            roll = random.random()
            if roll < 0.10:
                body = {"farm_id": DEMO_FARM, "name": f"Mixed {next(counter)}", "area_m2": 500,
                        "crop_id": "tomato", "planting_date": "2026-03-01", "soil_id": "loam",
                        "row_spacing_m": 1.5, "emitter_spacing_m": 0.4, "emitter_id": "dripnet-pc-1.0",
                        "lat": 31.25, "lon": 34.79}
                return "write", "POST", "/v1/plots", body
            if roll < 0.15 and created:
                return "write", "PATCH", f"/v1/plots/{random.choice(created)}", {"area_m2": random.randint(1, 5000)}
            if roll < 0.20 and created:
                return "write", "DELETE", f"/v1/plots/{created.pop()}", None
            return "read", "GET", random.choice(reads), None

        for rate in MIXED_RATES:
            results, achieved = asyncio.run(run_schedule(base_url, rate, seconds, next_request))
            reads_s, writes_s = summary(results, "read"), summary(results, "write")
            print(row(f"{rate} · reads", achieved, reads_s))
            print(row(f"{rate} · writes", achieved, writes_s), flush=True)
            if verdict(reads_s) != "✅" or verdict(writes_s) != "✅":
                break


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--only", choices=["rate", "size", "mixed"])
    parser.add_argument("--seconds", type=int, default=10, help="duration of each step")
    args = parser.parse_args()
    print(f"Limit: p95 <= {LIMIT_MS} ms. Steps of {args.seconds} s. 404/409/422 are not errors; 5xx and timeouts are.")
    with tempfile.TemporaryDirectory() as tmp:
        if args.only in (None, "rate"):
            test_rate(Path(tmp), args.seconds)
        if args.only in (None, "size"):
            test_size(Path(tmp), args.seconds)
        if args.only in (None, "mixed"):
            test_mixed(Path(tmp), args.seconds)
