"""Break-the-API matrix: bad fields, protocol abuse, broken databases, concurrency.

Every case must keep two rules:
  1. No server error (5xx). The one exception is 503, and only when the database is really broken.
  2. Every error response is problem+json with the right code.
Where our decisions fix the exact status, the case checks it too. `None` means
"no decision yet": only the two rules are checked.

The cases are plain lists, so a report script can run them and print a table.
"""

import json
import os
import sqlite3
import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from helpers import DEMO_FARM, EAST_FARM, NORTH_BLOCK, assert_problem, plot_body
from main import app

CODES = {404: "NOT_FOUND", 405: None, 409: "CONFLICT", 422: "VALIDATION", 503: "UNAVAILABLE"}


def matrix_client() -> TestClient:
    """A client that returns a crash as the 500 a real caller would see, instead of raising it."""
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def client(db_path) -> TestClient:
    """Overrides conftest's client for this file: a seeded copy, crashes returned as 500."""
    return matrix_client()


def check(response, expected: int | None, allow_503: bool = False) -> None:
    """Rule 1, rule 2, and the exact status if one is expected."""
    status = response.status_code
    assert status < 500 or (allow_503 and status == 503), f"server error {status}: {response.text[:200]}"
    if status >= 400:
        assert status in CODES, f"status {status} is not one the API may return: {response.text[:200]}"
        assert_problem(response, status, CODES[status])
    if expected is not None:
        assert status == expected, f"expected {expected}, got {status}: {response.text[:200]}"


def send_raw(client, method: str, path: str, content: bytes | str | None, content_type: str | None = "application/json"):
    """Send exact bytes, so we can send things json= never would (broken JSON, odd headers)."""
    headers = {} if content_type is None else {"content-type": content_type}
    return client.request(method, path, content=content, headers=headers)


# =========================================================================
# 1. Field matrix: every plot field x every kind of bad value, on POST and PATCH
# =========================================================================

NUMBER_FIELDS = ["area_m2", "row_spacing_m", "emitter_spacing_m", "lat", "lon"]
TEXT_FIELDS = ["farm_id", "name", "crop_id", "planting_date", "soil_id", "emitter_id"]
WRONG_FOR_NUMBER = ["1", True, None, [], {}, ""]
WRONG_FOR_TEXT = [1, 1.5, True, None, [], {}]

FIELD_CASES = (
    [(f"{f}={v!r}", {f: v}, 422) for f in NUMBER_FIELDS for v in WRONG_FOR_NUMBER]
    + [(f"{f}={v!r}", {f: v}, 422) for f in TEXT_FIELDS for v in WRONG_FOR_TEXT]
    + [(f"{f}=''", {f: ""}, 422) for f in TEXT_FIELDS]
    + [(f"{f}='   '", {f: "   "}, 422) for f in TEXT_FIELDS]
    + [
        # Numbers at and past their limits
        ("area_m2=0", {"area_m2": 0}, 422),
        ("area_m2=-0.0", {"area_m2": -0.0}, 422),
        ("area_m2=1e-9", {"area_m2": 1e-9}, 201),
        ("area_m2=1e308", {"area_m2": 1e308}, 201),
        ("lat=90", {"lat": 90}, 201),
        ("lat=90.000001", {"lat": 90.000001}, 422),
        ("lat=-90.000001", {"lat": -90.000001}, 422),
        ("lon=180", {"lon": 180}, 201),
        ("lon=180.000001", {"lon": 180.000001}, 422),
        ("lon=-180.000001", {"lon": -180.000001}, 422),
        # Dates
        ("date=2026-13-01", {"planting_date": "2026-13-01"}, 422),
        ("date=2026-00-10", {"planting_date": "2026-00-10"}, 422),
        ("date=2026-02-29 (not a leap year)", {"planting_date": "2026-02-29"}, 422),
        ("date=2024-02-29 (leap year)", {"planting_date": "2024-02-29"}, 201),
        ("date=0001-01-01", {"planting_date": "0001-01-01"}, 201),
        ("date=9999-12-31", {"planting_date": "9999-12-31"}, 422),
        ("date=' 2026-03-01'", {"planting_date": " 2026-03-01"}, 422),
        ("date='2026-03-01\\n'", {"planting_date": "2026-03-01\n"}, 422),
        ("date=2026/03/01", {"planting_date": "2026/03/01"}, 422),
        ("date=full-width digits", {"planting_date": "２０２６-０３-０１"}, 422),
        # Catalogue ids are exact
        ("crop_id=TOMATO", {"crop_id": "TOMATO"}, 422),
        ("crop_id='tomato '", {"crop_id": "tomato "}, 422),
        ("emitter_id=SQL injection", {"emitter_id": "x' OR '1'='1"}, 422),
        # Names: no max length, any text
        ("name=10,000 chars", {"name": "a" * 10_000}, 201),
        ("name=emoji", {"name": "🍅 Tomato row"}, 201),
        ("name=SQL injection", {"name": "x'); DROP TABLE plots;--"}, 201),
        ("name=NUL character", {"name": "a\u0000b"}, 201),
        ("name=right-to-left text", {"name": "חלקה צפונית"}, 201),
        ("farm_id=UPPERCASE", {"farm_id": DEMO_FARM.upper()}, 201),
        ("unknown field", {"color": "red"}, 422),
        ("id in body", {"id": NORTH_BLOCK}, 422),
    ]
)


@pytest.mark.parametrize("case, changes, expected", FIELD_CASES, ids=[c[0] for c in FIELD_CASES])
def test_post_plot_field(client, case, changes, expected):
    body = plot_body(name=f"Matrix {case}"[:200])  # a unique name, unless the case changes it
    body.update(changes)
    check(client.post("/v1/plots", json=body), expected)


@pytest.mark.parametrize("case, changes, expected", FIELD_CASES, ids=[c[0] for c in FIELD_CASES])
def test_patch_plot_field(client, case, changes, expected):
    # On PATCH, "201" cases are valid changes and answer 200.
    check(client.patch(f"/v1/plots/{NORTH_BLOCK}", json=changes), 200 if expected == 201 else expected)


def test_text_fields_round_trip(client):
    """Unusual but valid names come back exactly as sent, and SQL in a name is just text."""
    for name in ["🍅 Tomato row", "x'); DROP TABLE plots;--", "a\u0000b", "חלקה צפונית"]:
        created = client.post("/v1/plots", json=plot_body(name=name)).json()
        assert client.get(f"/v1/plots/{created['id']}").json()["name"] == name
    assert len(client.get("/v1/plots").json()) == 8  # the table is still there


# =========================================================================
# 2. Protocol abuse: broken JSON, odd headers, huge bodies, path tricks
# =========================================================================

VALID_FARM = json.dumps({"name": "Protocol farm"})

PROTOCOL_CASES = [
    # (case, method, path, body bytes, content-type, expected)
    ("malformed JSON", "POST", "/v1/farms", "{", "application/json", 422),
    ("single quotes", "POST", "/v1/farms", "{'name': 'x'}", "application/json", 422),
    ("empty body", "POST", "/v1/farms", "", "application/json", 422),
    ("JSON null", "POST", "/v1/farms", "null", "application/json", 422),
    ("JSON array", "POST", "/v1/farms", "[]", "application/json", 422),
    ("JSON string", "POST", "/v1/farms", '"x"', "application/json", 422),
    ("JSON number", "POST", "/v1/farms", "123", "application/json", 422),
    ("trailing garbage", "POST", "/v1/farms", VALID_FARM + " x", "application/json", 422),
    ("duplicate keys", "POST", "/v1/farms", '{"name": "a", "name": "b"}', "application/json", None),
    ("invalid UTF-8 bytes", "POST", "/v1/farms", b'{"name": "\xff"}', "application/json", 422),
    ("lone surrogate in name", "POST", "/v1/farms", '{"name": "\\ud800"}', "application/json", 422),
    ("deeply nested JSON", "POST", "/v1/farms", '{"name": ' + "[" * 100_000 + "]" * 100_000 + "}", "application/json", 422),
    ("huge integer area", "POST", "/v1/plots", json.dumps(plot_body())[:-1] + ', "area_m2": 1' + "0" * 400 + "}", "application/json", 422),
    ("1e400 area (overflows to Infinity)", "POST", "/v1/plots", json.dumps(plot_body()).replace('"area_m2": 1000', '"area_m2": 1e400'), "application/json", 422),
    ("NaN area", "POST", "/v1/plots", json.dumps(plot_body()).replace('"area_m2": 1000', '"area_m2": NaN'), "application/json", 422),
    ("1 MB name", "POST", "/v1/farms", json.dumps({"name": "a" * 1_000_000}), "application/json", None),
    # Content types
    ("charset in content-type", "POST", "/v1/farms", VALID_FARM, "application/json; charset=utf-8", 201),
    ("no content-type", "POST", "/v1/farms", VALID_FARM, None, None),
    ("text/plain", "POST", "/v1/farms", VALID_FARM, "text/plain", None),
    ("form encoded", "POST", "/v1/farms", "name=x", "application/x-www-form-urlencoded", 422),
    ("+json content-type", "POST", "/v1/farms", VALID_FARM, "application/merge-patch+json", None),
    # Paths and methods
    ("trailing slash", "GET", "/v1/farms/", None, None, None),
    ("uppercase path", "GET", "/V1/FARMS", None, None, 404),
    ("encoded dot-dot id", "GET", "/v1/crops/%2e%2e", None, None, 404),
    ("encoded slash in id", "GET", "/v1/crops/tomato%2Fx", None, None, 404),
    ("SQL injection in id", "GET", "/v1/crops/tomato'%20OR%20'1'%3D'1", None, None, 404),
    ("10,000-char id", "GET", "/v1/farms/" + "a" * 10_000, None, None, 404),
    ("HEAD on a list", "HEAD", "/v1/farms", None, None, 405),
    ("OPTIONS on a list", "OPTIONS", "/v1/farms", None, None, 405),
    ("PUT on a farm", "PUT", f"/v1/farms/{DEMO_FARM}", VALID_FARM, "application/json", 405),
    ("body on a GET", "GET", "/v1/farms", VALID_FARM, "application/json", 200),
    # Query parameters
    ("empty farm_id filter", "GET", "/v1/plots?farm_id=", None, None, 422),
    ("farm_id given twice", "GET", f"/v1/plots?farm_id={DEMO_FARM}&farm_id={EAST_FARM}", None, None, None),
    ("FARM_ID uppercase name", "GET", f"/v1/plots?FARM_ID={DEMO_FARM}", None, None, 422),
    ("query on a by-id URL", "GET", f"/v1/farms/{DEMO_FARM}?farm_id=x", None, None, 422),
]


@pytest.mark.parametrize("case, method, path, body, content_type, expected", PROTOCOL_CASES, ids=[c[0] for c in PROTOCOL_CASES])
def test_protocol(client, case, method, path, body, content_type, expected):
    response = send_raw(client, method, path, body, content_type) if body is not None else client.request(method, path, follow_redirects=False)
    if 300 <= response.status_code < 400:
        return  # a redirect is not an error; the report shows where it points
    if method == "HEAD":
        # A HEAD answer never has a body, so only the status and Allow header can be checked.
        assert response.status_code == expected and response.headers["allow"] == "GET, POST"
        return
    check(response, expected)


# =========================================================================
# 3. Broken databases: each must give a clean 503, never a 500
# =========================================================================


def make_read_only(path):
    os.chmod(path, 0o444)


def make_unreadable(path):
    os.chmod(path, 0o000)


def make_empty(path):
    path.write_bytes(b"")


def make_directory(path):
    path.unlink()
    path.mkdir()


def drop_plots_table(path):
    with sqlite3.connect(path) as conn:
        conn.execute("DROP TABLE plots")


def rename_lat_column(path):
    with sqlite3.connect(path) as conn:
        conn.execute("ALTER TABLE plots RENAME COLUMN lat TO latitude")


def text_in_number_column(path):
    # SQLite lets any column hold any type, so a REAL column can hold the text 'abc'.
    with sqlite3.connect(path) as conn:
        conn.execute("UPDATE plots SET lat = 'abc' WHERE id = ?", (NORTH_BLOCK,))


def text_in_catalogue_number(path):
    with sqlite3.connect(path) as conn:
        conn.execute("UPDATE emitters SET flow_lph = 'fast' WHERE id = 'dripnet-pc-1.0'")


def garbage_date(path):
    with sqlite3.connect(path) as conn:
        conn.execute("UPDATE plots SET planting_date = 'not a date' WHERE id = ?", (NORTH_BLOCK,))


DB_CASES = [
    # (case, how to break it, method, path, expected)
    ("read-only file: read", make_read_only, "GET", "/v1/farms", 200),
    ("read-only file: write", make_read_only, "POST", "/v1/farms", 503),
    ("no permission at all", make_unreadable, "GET", "/v1/farms", 503),
    ("empty file", make_empty, "GET", "/v1/farms", 503),
    ("a folder instead of a file", make_directory, "GET", "/v1/farms", 503),
    ("plots table dropped: list plots", drop_plots_table, "GET", "/v1/plots", 503),
    ("plots table dropped: list farms", drop_plots_table, "GET", "/v1/farms", 200),
    # With no plots table, nothing references the farm, so deleting it is correct.
    ("plots table dropped: delete farm", drop_plots_table, "DELETE", f"/v1/farms/{DEMO_FARM}", 204),
    ("column renamed", rename_lat_column, "GET", "/v1/plots", 503),
    ("text in a number column: list plots", text_in_number_column, "GET", "/v1/plots", 503),
    ("text in a number column: get plot", text_in_number_column, "GET", f"/v1/plots/{NORTH_BLOCK}", 503),
    ("text in catalogue number", text_in_catalogue_number, "GET", "/v1/emitters", 503),
    ("garbage date stored", garbage_date, "GET", f"/v1/plots/{NORTH_BLOCK}", None),
]


@pytest.mark.skipif(hasattr(os, "geteuid") and os.geteuid() == 0, reason="root ignores file permissions")
@pytest.mark.parametrize("case, breaker, method, path, expected", DB_CASES, ids=[c[0] for c in DB_CASES])
def test_broken_database(db_path, case, breaker, method, path, expected):
    breaker(db_path)
    try:
        client = matrix_client()
        body = {"name": "X"} if method == "POST" else None
        check(client.request(method, path, json=body), expected, allow_503=True)
    finally:
        if db_path.exists() and db_path.is_file():
            os.chmod(db_path, 0o644)  # let pytest clean up the temp folder


def test_locked_database_is_503(db_path):
    """Another program holds an exclusive lock: after sqlite3's 5 s wait, a clean 503."""
    blocker = sqlite3.connect(db_path)
    blocker.execute("BEGIN EXCLUSIVE")
    try:
        check(matrix_client().get("/v1/farms"), 503, allow_503=True)
    finally:
        blocker.rollback()
        blocker.close()


# =========================================================================
# 4. Concurrency: many requests at once, from separate threads
# =========================================================================


def in_parallel(count: int, request) -> list:
    """Run `request(client, i)` `count` times at once, each thread with its own client."""
    start = threading.Barrier(count)

    def one(i):
        client = matrix_client()
        start.wait()  # release all threads together
        return request(client, i)

    with ThreadPoolExecutor(max_workers=count) as pool:
        return list(pool.map(one, range(count)))


def test_same_name_created_at_once(client):
    """20 creates with the same name at the same moment: exactly one wins, the rest are 409."""
    responses = in_parallel(20, lambda c, i: c.post("/v1/plots", json=plot_body(name="Race")))
    for r in responses:
        check(r, None)
    statuses = sorted(r.status_code for r in responses)
    assert statuses == [201] + [409] * 19, statuses


def test_many_updates_to_one_plot(client):
    """30 PATCHes to one plot at once: all succeed, and the final area is one of them."""
    responses = in_parallel(30, lambda c, i: c.patch(f"/v1/plots/{NORTH_BLOCK}", json={"area_m2": 100 + i}))
    assert all(r.status_code == 200 for r in responses), [r.status_code for r in responses]
    assert client.get(f"/v1/plots/{NORTH_BLOCK}").json()["area_m2"] in {100 + i for i in range(30)}


def test_delete_farm_while_plots_are_added(client):
    """Plots are added to a farm while it is being deleted: never a plot without a farm."""
    farm = client.post("/v1/farms", json={"name": "Racing farm"}).json()

    def request(c, i):
        if i == 0:
            return c.delete(f"/v1/farms/{farm['id']}")
        return c.post("/v1/plots", json=plot_body(farm_id=farm["id"], name=f"Racing {i}"))

    for r in in_parallel(15, request):
        check(r, None)
    farm_exists = client.get(f"/v1/farms/{farm['id']}").status_code == 200
    plots = client.get(f"/v1/plots?farm_id={farm['id']}").json()
    assert farm_exists or plots == [], "plots were left pointing at a deleted farm"


def test_reads_during_writes(client):
    """Reads while others write: every request succeeds."""
    def request(c, i):
        if i % 2:
            return c.post("/v1/plots", json=plot_body(name=f"Busy {i}"))
        return c.get("/v1/plots")

    responses = in_parallel(30, request)
    assert all(r.status_code in (200, 201) for r in responses), [r.status_code for r in responses]
