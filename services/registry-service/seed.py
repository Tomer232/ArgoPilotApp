"""Create the tables and load the 15 demo rows, on SQLite or PostgreSQL.

Usage, from services/registry-service:
    uv run python seed.py                          # the database in .env
    DATABASE_URL=<url> uv run python seed.py       # any other database

All or nothing: if anything fails, no tables and no rows are left behind.
It never touches a database that already has any of the tables.
"""

import sys
from datetime import date

from sqlalchemy import Engine, inspect

from config import settings
from db import make_engine
from tables import ALL_TABLES, metadata

SEED_ROWS: dict[str, list[dict]] = {
    "crops": [
        {"id": "tomato", "name": "Tomato"},
        {"id": "bell-pepper", "name": "Bell pepper"},
    ],
    "soils": [
        {"id": "sand", "name": "Sand", "available_water_mm_per_m": 83},
        {"id": "loam", "name": "Loam", "available_water_mm_per_m": 175},
        {"id": "clay-loam", "name": "Clay loam", "available_water_mm_per_m": 200},
    ],
    "emitters": [
        {"id": "dripnet-pc-0.6", "name": "DripNet PC", "flow_lph": 0.6},
        {"id": "dripnet-pc-1.0", "name": "DripNet PC", "flow_lph": 1.0},
        {"id": "dripnet-pc-1.6", "name": "DripNet PC", "flow_lph": 1.6},
        {"id": "dripnet-pc-2.0", "name": "DripNet PC", "flow_lph": 2.0},
    ],
    "farms": [
        {"id": "b7e2c0a0-3c1d-4f0a-9a11-0c5d2e6f1001", "name": "Demo cooperative"},
        {"id": "a9c1e4b2-6f70-4d8e-a144-3f8b5c904004", "name": "East farm"},
    ],
    "plots": [
        {
            "id": "c8f3d1b0-4d2e-5a1b-8b22-1d6e3f702002",
            "farm_id": "b7e2c0a0-3c1d-4f0a-9a11-0c5d2e6f1001",
            "name": "North block",
            "area_m2": 1000,
            "crop_id": "tomato",
            "planting_date": date(2026, 3, 1),
            "soil_id": "loam",
            "row_spacing_m": 1.5,
            "emitter_spacing_m": 0.4,
            "emitter_id": "dripnet-pc-1.0",
            "lat": 31.25,
            "lon": 34.79,
        },
        {
            "id": "d9a4e2c1-5e3f-4b6a-9c33-2e7f4a803003",
            "farm_id": "b7e2c0a0-3c1d-4f0a-9a11-0c5d2e6f1001",
            "name": "East block",
            "area_m2": 800,
            "crop_id": "bell-pepper",
            "planting_date": date(2026, 4, 12),
            "soil_id": "clay-loam",
            "row_spacing_m": 1.5,
            "emitter_spacing_m": 0.4,
            "emitter_id": "dripnet-pc-1.6",
            "lat": 31.26,
            "lon": 34.80,
        },
        {
            "id": "e0b5f3d2-6f40-4c7b-8d44-3f8a5b914004",
            "farm_id": "a9c1e4b2-6f70-4d8e-a144-3f8b5c904004",
            "name": "West block",
            "area_m2": 1500,
            "crop_id": "tomato",
            "planting_date": date(2026, 2, 15),
            "soil_id": "sand",
            "row_spacing_m": 1.5,
            "emitter_spacing_m": 0.4,
            "emitter_id": "dripnet-pc-0.6",
            "lat": 31.40,
            "lon": 34.60,
        },
        {
            "id": "f1c6a4e3-7051-4d8c-9e55-4a9b6c025005",
            "farm_id": "a9c1e4b2-6f70-4d8e-a144-3f8b5c904004",
            "name": "Greenhouse",
            "area_m2": 400,
            "crop_id": "bell-pepper",
            "planting_date": date(2026, 5, 1),
            "soil_id": "loam",
            "row_spacing_m": 1.2,
            "emitter_spacing_m": 0.3,
            "emitter_id": "dripnet-pc-2.0",
            "lat": 31.41,
            "lon": 34.61,
        },
    ],
}


class TablesExistError(Exception):
    """The database already has some of our tables; seeding would mix old and new data."""


def seed_database(engine: Engine) -> None:
    """Create the five tables and insert SEED_ROWS, in one transaction."""
    with engine.begin() as conn:
        existing = set(inspect(conn).get_table_names())
        if existing & {table.name for table in ALL_TABLES}:
            raise TablesExistError
        metadata.create_all(conn)
        for table in ALL_TABLES:
            conn.execute(table.insert(), SEED_ROWS[table.name])


def main() -> None:
    """Seed the database in DATABASE_URL (the environment wins over .env)."""
    engine = make_engine(settings.database_url, creating=True)
    try:
        seed_database(engine)
    except TablesExistError:
        print("Tables already exist; nothing changed.", file=sys.stderr)
        sys.exit(1)
    print(f"Seeded {engine.url.render_as_string(hide_password=True)}")
    print("  2 farms, 4 plots, 2 crops, 3 soils, 4 emitters")


if __name__ == "__main__":
    main()
