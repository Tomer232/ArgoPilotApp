"""Plots: create, read, update, delete.

Field rules (area > 0, lat range, date not in the future, ...) live in models.py.
This file adds the rules that need the database: references must exist,
and a plot name must be unique inside its farm.
"""

import sqlite3
import uuid

from fastapi import APIRouter, Response

from db import connect
from errors import ConflictError, NotFoundError, ValidationFailedError
from models import Plot, PlotCreate, PlotUpdate, normalize_uuid, parse_id, sent_fields

router = APIRouter()

COLUMNS = (
    "id, farm_id, name, area_m2, crop_id, planting_date, soil_id, "
    "row_spacing_m, emitter_spacing_m, emitter_id, lat, lon"
)

# What a plot points to: (table, plot field, word used in the error message).
REFERENCES = [
    ("farms", "farm_id", "farm"),
    ("crops", "crop_id", "crop"),
    ("soils", "soil_id", "soil"),
    ("emitters", "emitter_id", "emitter"),
]

NAME_TAKEN = "A plot with this name already exists on this farm"


def find_plot(conn: sqlite3.Connection, plot_id: str) -> dict:
    """One plot by id, or 404."""
    row = conn.execute(f"SELECT {COLUMNS} FROM plots WHERE id = ?", (plot_id,)).fetchone()
    if row is None:
        raise NotFoundError("Unknown plot")
    return dict(row)


def check_references(conn: sqlite3.Connection, plot: dict) -> None:
    """422 if the plot's farm, crop, soil or emitter does not exist."""
    for table, field, label in REFERENCES:
        found = conn.execute(f"SELECT 1 FROM {table} WHERE id = ?", (plot[field],)).fetchone()
        if found is None:
            raise ValidationFailedError(f"Unknown {label}")


@router.post("/v1/plots", status_code=201, response_model=Plot)
def create_plot(body: PlotCreate):
    """Create a plot. The server picks the id."""
    plot = {"id": str(uuid.uuid4()), **body.model_dump()}
    with connect() as conn:
        check_references(conn, plot)
        try:
            conn.execute(
                f"INSERT INTO plots ({COLUMNS}) VALUES (:id, :farm_id, :name, :area_m2, :crop_id, "
                ":planting_date, :soil_id, :row_spacing_m, :emitter_spacing_m, "
                ":emitter_id, :lat, :lon)",
                plot,
            )
        except sqlite3.IntegrityError:
            # References were checked above, so this is the UNIQUE (farm_id, name) rule.
            raise ConflictError(NAME_TAKEN) from None
    return plot


@router.get("/v1/plots", response_model=list[Plot])
def list_plots(farm_id: str | None = None):
    """All plots, oldest first. With ?farm_id=, only that farm's plots."""
    with connect() as conn:
        if farm_id is None:
            rows = conn.execute(f"SELECT {COLUMNS} FROM plots ORDER BY rowid").fetchall()
        else:
            try:
                farm_id = normalize_uuid(farm_id)
            except ValueError:
                raise ValidationFailedError("farm_id: not a valid UUID") from None
            rows = conn.execute(
                f"SELECT {COLUMNS} FROM plots WHERE farm_id = ? ORDER BY rowid", (farm_id,)
            ).fetchall()
    return [dict(row) for row in rows]


@router.get("/v1/plots/{plot_id}", response_model=Plot)
def get_plot(plot_id: str):
    """One plot, or 404."""
    plot_id = parse_id(plot_id, "plot")
    with connect() as conn:
        return find_plot(conn, plot_id)


@router.patch("/v1/plots/{plot_id}", response_model=Plot)
def update_plot(plot_id: str, body: PlotUpdate):
    """Change only the fields sent, then check the result as a whole.
    Moving a plot to another farm is allowed if the name is free there."""
    plot_id = parse_id(plot_id, "plot")
    changes = sent_fields(body)
    with connect() as conn:
        plot = find_plot(conn, plot_id)
        plot.update(changes)
        check_references(conn, plot)
        try:
            conn.execute(
                "UPDATE plots SET farm_id = :farm_id, name = :name, area_m2 = :area_m2, "
                "crop_id = :crop_id, planting_date = :planting_date, soil_id = :soil_id, "
                "row_spacing_m = :row_spacing_m, emitter_spacing_m = :emitter_spacing_m, "
                "emitter_id = :emitter_id, lat = :lat, lon = :lon WHERE id = :id",
                plot,
            )
        except sqlite3.IntegrityError:
            raise ConflictError(NAME_TAKEN) from None
    return plot


@router.delete("/v1/plots/{plot_id}", status_code=204, response_class=Response)
def delete_plot(plot_id: str) -> None:
    """Delete a plot, or 404."""
    plot_id = parse_id(plot_id, "plot")
    with connect() as conn:
        find_plot(conn, plot_id)
        conn.execute("DELETE FROM plots WHERE id = ?", (plot_id,))
