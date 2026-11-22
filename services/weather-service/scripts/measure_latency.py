"""NOT A REQUIREMENT: measurement tooling we keep for ourselves (DECISIONS Y12, docs/extras.md).

Measure NFR-2.3: p95 latency of a fresh forecast (no provider call) at 10 requests per second.

Start the service in one terminal:
    uv run uvicorn main:app --port 8001
Then, in another:
    uv run python scripts/measure_latency.py

Each point is asked once first, so its cell's forecast is in the cache. Then every
request is a fresh answer. The script checks that `fetched_at` never changes during
the run: if it did, a request called the provider and the run would not measure NFR-2.3.

Requests go out on a fixed schedule (one every 100 ms), without waiting for the
previous answer. So a slow response cannot hide by delaying the next request.
"""

import argparse
import asyncio
import statistics
import sys
import time

import httpx

# Three demo points in three different cells (the registry's farms are near the first).
URLS = [
    "/v1/forecast?lat=31.25&lon=34.79&days=7",
    "/v1/forecast?lat=32.08&lon=34.78&days=7",
    "/v1/forecast?lat=29.56&lon=34.95&days=3",
]


async def timed_get(client: httpx.AsyncClient, url: str, latencies: list, answers: list) -> None:
    """One request: record how long it took in ms, and keep the answer for checking."""
    start = time.perf_counter()
    response = await client.get(url)
    latencies.append((time.perf_counter() - start) * 1000)
    answers.append((url, response.status_code, response.json().get("fetched_at")))


async def measure(client: httpx.AsyncClient, rate: int, seconds: int) -> tuple[list, list]:
    """Send `rate` requests per second for `seconds`, cycling through URLS.
    Returns (latencies, answers)."""
    latencies, answers = [], []
    tasks = []
    start = time.perf_counter()
    for i in range(rate * seconds):
        # Wait until this request's slot on the schedule, then send without waiting for the answer.
        await asyncio.sleep(max(0, start + i / rate - time.perf_counter()))
        url = URLS[i % len(URLS)]
        tasks.append(asyncio.create_task(timed_get(client, url, latencies, answers)))
    await asyncio.gather(*tasks)
    return latencies, answers


async def main(base_url: str, rate: int, seconds: int) -> None:
    """Warm the cache, measure, check no provider call happened, print a Markdown row."""
    async with httpx.AsyncClient(base_url=base_url) as client:
        fetched_at = {}
        for url in URLS:  # warm-up, not counted: fills the cache and opens the connection
            response = await client.get(url)
            response.raise_for_status()
            fetched_at[url] = response.json()["fetched_at"]
        print(f"{rate} requests/s for {seconds} s, against {base_url}\n")
        latencies, answers = await measure(client, rate, seconds)

    errors = [status for _, status, _ in answers if status != 200]
    refetched = [url for url, _, at in answers if at != fetched_at[url]]
    if refetched:
        sys.exit(f"{len(refetched)} answers had a new fetched_at: the provider was called. Not a fresh run.")
    # cuts[k-1] is the k-th percentile. "inclusive": never above the slowest real request.
    cuts = statistics.quantiles(latencies, n=100, method="inclusive")
    print("| Requests | Errors | p50 ms | p95 ms | p99 ms | max ms |")
    print("| --- | --- | --- | --- | --- | --- |")
    print(
        f"| {len(latencies)} | {len(errors)} | {cuts[49]:.1f} | {cuts[94]:.1f} "
        f"| {cuts[98]:.1f} | {max(latencies):.1f} |"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://127.0.0.1:8001")
    parser.add_argument("--rate", type=int, default=10, help="requests per second")
    parser.add_argument("--seconds", type=int, default=60, help="how long to measure")
    args = parser.parse_args()
    asyncio.run(main(args.base_url, args.rate, args.seconds))
