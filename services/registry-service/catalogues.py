"""Read-only catalogues: crops, soils, emitters.

Only GET is defined here, so any other method on these URLs gets 405 from FastAPI.
"""

from fastapi import APIRouter

from db import connect
from errors import NotFoundError
from models import Crop, Emitter, Soil

router = APIRouter()


# --- Shared helpers --------------------------------------------------------
# `table` is always one of our own constants below, never user input,
# so putting it into the SQL string is safe. The id is passed as a parameter (?).


def get_all(table: str) -> list[dict]:
    """Every row of a catalogue table, in insertion order."""
    with connect() as conn:
        rows = conn.execute(f"SELECT * FROM {table} ORDER BY rowid").fetchall()
    return [dict(row) for row in rows]


def get_one(table: str, item_id: str, label: str) -> dict:
    """One row by id, or 404 with e.g. 'Unknown crop'."""
    with connect() as conn:
        row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (item_id,)).fetchone()
    if row is None:
        raise NotFoundError(f"Unknown {label}")
    return dict(row)


# --- Routes ---------------------------------------------------------------


@router.get("/v1/crops", response_model=list[Crop])
def list_crops():
    """All crops."""
    return get_all("crops")


@router.get("/v1/crops/{crop_id}", response_model=Crop)
def get_crop(crop_id: str):
    """One crop, or 404."""
    return get_one("crops", crop_id, "crop")


@router.get("/v1/soils", response_model=list[Soil])
def list_soils():
    """All soils."""
    return get_all("soils")


@router.get("/v1/soils/{soil_id}", response_model=Soil)
def get_soil(soil_id: str):
    """One soil, or 404."""
    return get_one("soils", soil_id, "soil")


@router.get("/v1/emitters", response_model=list[Emitter])
def list_emitters():
    """All emitters."""
    return get_all("emitters")


@router.get("/v1/emitters/{emitter_id}", response_model=Emitter)
def get_emitter(emitter_id: str):
    """One emitter, or 404."""
    return get_one("emitters", emitter_id, "emitter")
