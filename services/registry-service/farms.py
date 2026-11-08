"""Farms: create, read, update, delete."""

import sqlite3
import uuid

from fastapi import APIRouter, Response

from db import connect
from errors import ConflictError, NotFoundError
from models import Farm, FarmCreate, FarmUpdate, parse_id, sent_fields

router = APIRouter()


def find_farm(conn: sqlite3.Connection, farm_id: str) -> dict:
    """One farm by id, or 404."""
    row = conn.execute("SELECT id, name FROM farms WHERE id = ?", (farm_id,)).fetchone()
    if row is None:
        raise NotFoundError("Unknown farm")
    return dict(row)


@router.post("/v1/farms", status_code=201, response_model=Farm)
def create_farm(body: FarmCreate):
    """Create a farm. The server picks the id."""
    farm = {"id": str(uuid.uuid4()), "name": body.name}
    with connect() as conn:
        conn.execute("INSERT INTO farms (id, name) VALUES (:id, :name)", farm)
    return farm


@router.get("/v1/farms", response_model=list[Farm])
def list_farms():
    """All farms, oldest first."""
    with connect() as conn:
        rows = conn.execute("SELECT id, name FROM farms ORDER BY rowid").fetchall()
    return [dict(row) for row in rows]


@router.get("/v1/farms/{farm_id}", response_model=Farm)
def get_farm(farm_id: str):
    """One farm, or 404."""
    farm_id = parse_id(farm_id, "farm")
    with connect() as conn:
        return find_farm(conn, farm_id)


@router.patch("/v1/farms/{farm_id}", response_model=Farm)
def update_farm(farm_id: str, body: FarmUpdate):
    """Change only the fields sent. Empty body: nothing changes, 200."""
    farm_id = parse_id(farm_id, "farm")
    changes = sent_fields(body)
    with connect() as conn:
        farm = find_farm(conn, farm_id)
        farm.update(changes)
        conn.execute("UPDATE farms SET name = :name WHERE id = :id", farm)
    return farm


@router.delete("/v1/farms/{farm_id}", status_code=204, response_class=Response)
def delete_farm(farm_id: str) -> None:
    """Delete a farm. 409 if it still has plots."""
    farm_id = parse_id(farm_id, "farm")
    with connect() as conn:
        find_farm(conn, farm_id)
        try:
            conn.execute("DELETE FROM farms WHERE id = ?", (farm_id,))
        except sqlite3.IntegrityError:
            # The plots table's foreign key refuses to leave plots without a farm.
            raise ConflictError("Farm still has plots") from None
