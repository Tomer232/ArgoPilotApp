"""Measure NFR-1.1: p95 latency of every GET list and GET by id at 10 requests per second.

Start the service in one terminal:
    uv run uvicorn main:app --port 8000
Then, in another:
    uv run python scripts/measure_latency.py

Requests go out on a fixed schedule (one every 100 ms), without waiting for the
previous answer. So a slow response cannot hide by delaying the next request.
"""

import argparse
import asyncio
import statistics
import time

import httpx2

RESOURCES = ["farms", "plots", "crops", "soils", "emitters"]
WARMUP_REQUESTS = 10


async def timed_get(client: httpx2.AsyncClient, url: str, latencies: list, errors: list) -> None:
    """One request: record how long it took in ms, and note any non-200 answer."""
    start = time.perf_counter()
    response = await client.get(url)
    latencies.append((time.perf_counter() - start) * 1000)
    if response.status_code != 200:
        errors.append(response.status_code)


async def measure(client: httpx2.AsyncClient, url: str, rate: int, seconds: int) -> tuple[list, list]:
    """Send `rate` requests per second to `url` for `seconds`. Returns (latencies, errors)."""
    latencies, errors = [], []
    tasks = []
    start = time.perf_counter()
    for i in range(rate * seconds):
        # Wait until this request's slot on the schedule, then send without waiting for the answer.
        await asyncio.sleep(max(0, start + i / rate - time.perf_counter()))
        tasks.append(asyncio.create_task(timed_get(client, url, latencies, errors)))
    await asyncio.gather(*tasks)
    return latencies, errors


async def endpoints(client: httpx2.AsyncClient) -> list[str]:
    """Every GET list URL, and a GET by id URL using the first row of each list."""
    urls = []
    for resource in RESOURCES:
        first = (await client.get(f"/v1/{resource}")).json()[0]
        urls += [f"/v1/{resource}", f"/v1/{resource}/{first['id']}"]
    return urls


async def main(base_url: str, rate: int, seconds: int) -> None:
    """Measure each endpoint in turn and print a Markdown table."""
    print(f"{rate} requests/s for {seconds} s per endpoint, against {base_url}\n")
    print("| Endpoint | Requests | Errors | p50 ms | p95 ms | p99 ms | max ms |")
    print("| --- | --- | --- | --- | --- | --- | --- |")
    async with httpx2.AsyncClient(base_url=base_url) as client:
        for url in await endpoints(client):
            for _ in range(WARMUP_REQUESTS):  # not counted: first requests open connections
                await client.get(url)
            latencies, errors = await measure(client, url, rate, seconds)
            # cuts[k-1] is the k-th percentile. "inclusive": never above the slowest real request.
            cuts = statistics.quantiles(latencies, n=100, method="inclusive")
            name = url if len(url) < 30 else url[:24] + "…"
            print(
                f"| `GET {name}` | {len(latencies)} | {len(errors)} | {cuts[49]:.1f} "
                f"| {cuts[94]:.1f} | {cuts[98]:.1f} | {max(latencies):.1f} |"
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--rate", type=int, default=10, help="requests per second")
    parser.add_argument("--seconds", type=int, default=30, help="duration per endpoint")
    args = parser.parse_args()
    asyncio.run(main(args.base_url, args.rate, args.seconds))
