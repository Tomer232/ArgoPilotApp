"""The database schema, written once for SQLite and PostgreSQL alike.

Every table has a hidden `seq` column: an auto-increment number that only keeps
lists in insertion order (PostgreSQL has no rowid). The API never returns it.
"""

from sqlalchemy import (
    Column,
    Date,
    Float,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    UniqueConstraint,
)

metadata = MetaData()


def seq_column() -> Column:
    """The hidden insertion-order key. On SQLite, INTEGER PRIMARY KEY is the rowid."""
    return Column("seq", Integer, primary_key=True, autoincrement=True)


def id_column() -> Column:
    """The public id: what the API and the foreign keys use."""
    return Column("id", String, unique=True, nullable=False)


crops = Table(
    "crops",
    metadata,
    seq_column(),
    id_column(),
    Column("name", String, nullable=False),
)

soils = Table(
    "soils",
    metadata,
    seq_column(),
    id_column(),
    Column("name", String, nullable=False),
    Column("available_water_mm_per_m", Integer, nullable=False),
)

emitters = Table(
    "emitters",
    metadata,
    seq_column(),
    id_column(),
    Column("name", String, nullable=False),
    Column("flow_lph", Float, nullable=False),
)

farms = Table(
    "farms",
    metadata,
    seq_column(),
    id_column(),
    Column("name", String, nullable=False),
)

plots = Table(
    "plots",
    metadata,
    seq_column(),
    id_column(),
    Column("farm_id", String, ForeignKey("farms.id"), nullable=False),
    Column("name", String, nullable=False),
    Column("area_m2", Float, nullable=False),
    Column("crop_id", String, ForeignKey("crops.id"), nullable=False),
    Column("planting_date", Date, nullable=False),
    Column("soil_id", String, ForeignKey("soils.id"), nullable=False),
    Column("row_spacing_m", Float, nullable=False),
    Column("emitter_spacing_m", Float, nullable=False),
    Column("emitter_id", String, ForeignKey("emitters.id"), nullable=False),
    Column("lat", Float, nullable=False),
    Column("lon", Float, nullable=False),
    UniqueConstraint("farm_id", "name"),
)

# Insert order: a table comes after the tables it references.
ALL_TABLES = [crops, soils, emitters, farms, plots]
