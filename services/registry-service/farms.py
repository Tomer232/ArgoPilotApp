"""Farms: create, read, update, delete."""

import uuid

from fastapi import APIRouter, Response
from sqlalchemy import Connection, delete, insert, select, update
from sqlalchemy.exc import IntegrityError

from db import connect
from errors import ConflictError, NotFoundError
from models import Farm, FarmCreate, FarmUpdate, parse_id, sent_fields
from tables import farms

router = APIRouter()

FARM_COLUMNS = [farms.c.id, farms.c.name]


def find_farm(conn: Connection, farm_id: str) -> dict:
    """One farm by id, or 404."""
    query = select(*FARM_COLUMNS).where(farms.c.id == farm_id)
    row = conn.execute(query).mappings().first()
    if row is None:
        raise NotFoundError("Unknown farm")
    return dict(row)


@router.post("/v1/farms", status_code=201, response_model=Farm)
def create_farm(body: FarmCreate):
    """Create a farm. The server picks the id."""
    farm = {"id": str(uuid.uuid4()), "name": body.name}
    with connect() as conn:
        conn.execute(insert(farms).values(farm))
    return farm


@router.get("/v1/farms", response_model=list[Farm])
def list_farms():
    """All farms, oldest first."""
    query = select(*FARM_COLUMNS).order_by(farms.c.seq)
    with connect() as conn:
        rows = conn.execute(query).mappings().all()
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
        conn.execute(update(farms).where(farms.c.id == farm_id).values(name=farm["name"]))
    return farm


@router.delete("/v1/farms/{farm_id}", status_code=204, response_class=Response)
def delete_farm(farm_id: str) -> None:
    """Delete a farm. 409 if it still has plots."""
    farm_id = parse_id(farm_id, "farm")
    with connect() as conn:
        find_farm(conn, farm_id)
        try:
            conn.execute(delete(farms).where(farms.c.id == farm_id))
        except IntegrityError:
            # The plots table's foreign key refuses to leave plots without a farm.
            raise ConflictError("Farm still has plots") from None
