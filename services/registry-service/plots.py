"""Plots: create, read, update, delete.

Field rules (area > 0, lat range, a real date, ...) live in models.py.
This file adds the rules that need the request or the database: the planting
date is not in the client's future, references must exist, and a plot name
must be unique inside its farm.
"""

import datetime
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy import Connection, delete, insert, select, update
from sqlalchemy.exc import IntegrityError

from db import connect
from errors import ConflictError, NotFoundError, ValidationFailedError
from models import (
    Plot,
    PlotCreate,
    PlotUpdate,
    check_not_future,
    normalize_uuid,
    parse_id,
    sent_fields,
    today_for_request,
)
from tables import crops, emitters, farms, plots, soils

# "Today" where the client is, from its Time-Zone header (see models.py).
ClientToday = Annotated[datetime.date, Depends(today_for_request)]

router = APIRouter()

# Every column the API returns, in the spec's order (never the hidden `seq`).
PLOT_COLUMNS = [
    plots.c.id,
    plots.c.farm_id,
    plots.c.name,
    plots.c.area_m2,
    plots.c.crop_id,
    plots.c.planting_date,
    plots.c.soil_id,
    plots.c.row_spacing_m,
    plots.c.emitter_spacing_m,
    plots.c.emitter_id,
    plots.c.lat,
    plots.c.lon,
]

# What a plot points to: (table, plot field, word used in the error message).
REFERENCES = [
    (farms, "farm_id", "farm"),
    (crops, "crop_id", "crop"),
    (soils, "soil_id", "soil"),
    (emitters, "emitter_id", "emitter"),
]

NAME_TAKEN = "A plot with this name already exists on this farm"


def find_plot(conn: Connection, plot_id: str) -> dict:
    """One plot by id, or 404."""
    query = select(*PLOT_COLUMNS).where(plots.c.id == plot_id)
    row = conn.execute(query).mappings().first()
    if row is None:
        raise NotFoundError("Unknown plot")
    return dict(row)


def check_references(conn: Connection, plot: dict) -> None:
    """422 if the plot's farm, crop, soil or emitter does not exist.

    The farm row is also locked (FOR SHARE) until this request ends. Otherwise, on
    PostgreSQL, a farm deleted between this check and the plot's INSERT would make
    the foreign key fail, and that error would be misread as "name taken".
    A concurrent farm delete now waits, then correctly gets "Farm still has plots".
    SQLite ignores the lock; it already lets only one writer in at a time.
    Crops, soils and emitters can't be deleted through the API, so they need no lock.
    """
    for table, field, label in REFERENCES:
        query = select(table.c.id).where(table.c.id == plot[field])
        if table is farms:
            query = query.with_for_update(read=True)
        found = conn.execute(query).first()
        if found is None:
            raise ValidationFailedError(f"Unknown {label}")


@router.post("/v1/plots", status_code=201, response_model=Plot)
def create_plot(body: PlotCreate, today: ClientToday):
    """Create a plot. The server picks the id."""
    check_not_future(body.planting_date, today)
    plot = {"id": str(uuid.uuid4()), **body.model_dump()}
    plot["planting_date"] = datetime.date.fromisoformat(plot["planting_date"])  # Date column
    with connect() as conn:
        check_references(conn, plot)
        try:
            conn.execute(insert(plots).values(plot))
        except IntegrityError:
            # References were checked above, so this is the UNIQUE (farm_id, name) rule.
            raise ConflictError(NAME_TAKEN) from None
    return plot


@router.get("/v1/plots", response_model=list[Plot])
def list_plots(farm_id: str | None = None):
    """All plots, oldest first. With ?farm_id=, only that farm's plots."""
    query = select(*PLOT_COLUMNS).order_by(plots.c.seq)
    with connect() as conn:
        if farm_id is not None:
            try:
                farm_id = normalize_uuid(farm_id)
            except ValueError:
                raise ValidationFailedError("farm_id: not a valid UUID") from None
            query = query.where(plots.c.farm_id == farm_id)
        rows = conn.execute(query).mappings().all()
    return [dict(row) for row in rows]


@router.get("/v1/plots/{plot_id}", response_model=Plot)
def get_plot(plot_id: str):
    """One plot, or 404."""
    plot_id = parse_id(plot_id, "plot")
    with connect() as conn:
        return find_plot(conn, plot_id)


@router.patch("/v1/plots/{plot_id}", response_model=Plot)
def update_plot(plot_id: str, body: PlotUpdate, today: ClientToday):
    """Change only the fields sent, then check the result as a whole.
    Moving a plot to another farm is allowed if the name is free there."""
    plot_id = parse_id(plot_id, "plot")
    changes = sent_fields(body)
    if "planting_date" in changes:
        check_not_future(changes["planting_date"], today)
        changes["planting_date"] = datetime.date.fromisoformat(changes["planting_date"])
    with connect() as conn:
        plot = find_plot(conn, plot_id)
        plot.update(changes)
        check_references(conn, plot)
        try:
            conn.execute(update(plots).where(plots.c.id == plot_id).values(plot))
        except IntegrityError:
            raise ConflictError(NAME_TAKEN) from None
    return plot


@router.delete("/v1/plots/{plot_id}", status_code=204, response_class=Response)
def delete_plot(plot_id: str) -> None:
    """Delete a plot, or 404."""
    plot_id = parse_id(plot_id, "plot")
    with connect() as conn:
        find_plot(conn, plot_id)
        conn.execute(delete(plots).where(plots.c.id == plot_id))
