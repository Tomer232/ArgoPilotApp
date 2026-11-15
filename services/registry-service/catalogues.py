"""Read-only catalogues: crops, soils, emitters.

Only GET is defined here, so any other method on these URLs gets 405 from FastAPI.
"""

from fastapi import APIRouter
from sqlalchemy import Table, select

from db import connect
from errors import NotFoundError
from models import Crop, Emitter, Soil
from tables import crops, emitters, soils

router = APIRouter()


# --- Shared helpers --------------------------------------------------------


def public_columns(table: Table) -> list:
    """Every column except the hidden `seq`, which the API never returns."""
    return [column for column in table.c if column.name != "seq"]


def get_all(table: Table) -> list[dict]:
    """Every row of a catalogue table, in insertion order."""
    query = select(*public_columns(table)).order_by(table.c.seq)
    with connect() as conn:
        rows = conn.execute(query).mappings().all()
    return [dict(row) for row in rows]


def get_one(table: Table, item_id: str, label: str) -> dict:
    """One row by id, or 404 with e.g. 'Unknown crop'."""
    if "\x00" in item_id:
        # No id contains NUL, and PostgreSQL can't even compare such text: skip the query.
        raise NotFoundError(f"Unknown {label}")
    query = select(*public_columns(table)).where(table.c.id == item_id)
    with connect() as conn:
        row = conn.execute(query).mappings().first()
    if row is None:
        raise NotFoundError(f"Unknown {label}")
    return dict(row)


# --- Routes ---------------------------------------------------------------


@router.get("/v1/crops", response_model=list[Crop])
def list_crops():
    """All crops."""
    return get_all(crops)


@router.get("/v1/crops/{crop_id}", response_model=Crop)
def get_crop(crop_id: str):
    """One crop, or 404."""
    return get_one(crops, crop_id, "crop")


@router.get("/v1/soils", response_model=list[Soil])
def list_soils():
    """All soils."""
    return get_all(soils)


@router.get("/v1/soils/{soil_id}", response_model=Soil)
def get_soil(soil_id: str):
    """One soil, or 404."""
    return get_one(soils, soil_id, "soil")


@router.get("/v1/emitters", response_model=list[Emitter])
def list_emitters():
    """All emitters."""
    return get_all(emitters)


@router.get("/v1/emitters/{emitter_id}", response_model=Emitter)
def get_emitter(emitter_id: str):
    """One emitter, or 404."""
    return get_one(emitters, emitter_id, "emitter")
