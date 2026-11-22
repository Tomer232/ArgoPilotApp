"""JSON shapes the API accepts and returns, plus helpers for reading request input.

Response models list exactly the spec's fields, so nothing else ever leaves the service.
"""

import datetime
import uuid
from typing import Annotated
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Header
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

from errors import NotFoundError, ValidationFailedError

# The first time zone on Earth to reach a new day. Used when a request sends no
# Time-Zone header: then a date counts as "in the future" only if it is still
# ahead there, so no farmer anywhere is rejected for entering today's date.
EARLIEST_TIMEZONE = datetime.timezone(datetime.timedelta(hours=14))


# --- Small validators -----------------------------------------------------


def normalize_uuid(value: str) -> str:
    """Any valid UUID spelling -> the stored lowercase form. Raises ValueError if not a UUID."""
    return str(uuid.UUID(value))


def check_real_date(value: str) -> str:
    """A real calendar date: not 2026-02-30. (Whether it's in the future depends on
    the client's time zone, so the routes check that with check_not_future.)"""
    datetime.date.fromisoformat(value)
    return value


def today_for_request(
    time_zone: Annotated[str | None, Header(alias="Time-Zone")] = None,
) -> datetime.date:
    """Today's date where the client is, from a header like `Time-Zone: Asia/Jerusalem`.

    Every real time zone is between UTC-12 and UTC+14, so a client can't push
    "today" more than a day past UTC. No header: today in UTC+14, as before.
    """
    if time_zone is None:
        return datetime.datetime.now(EARLIEST_TIMEZONE).date()
    try:
        zone = ZoneInfo(time_zone)
    except (ZoneInfoNotFoundError, ValueError):
        raise ValidationFailedError("Time-Zone: unknown time zone") from None
    return datetime.datetime.now(zone).date()


def check_not_future(planting_date: str, today: datetime.date) -> None:
    """422 if the planting date is after the client's today."""
    if datetime.date.fromisoformat(planting_date) > today:
        raise ValidationFailedError("planting_date: must not be in the future")


# --- Field types used in request bodies -----------------------------------

def reject_nul(value: str) -> str:
    """422 for text with a NUL character: PostgreSQL text columns cannot store it."""
    if "\x00" in value:
        raise ValueError("must not contain a NUL character")
    return value


# A name: spaces at both ends are removed, then it must be 1 to 200 characters.
# The limit keeps every name storable in PostgreSQL's unique index (decision 5).
Name = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=200),
    AfterValidator(reject_nul),
]

# A crop, soil or emitter id: any text the database can compare, so no NUL.
CatalogueRef = Annotated[str, AfterValidator(reject_nul)]

# A UUID that points at another row (e.g. the plot's farm).
UuidRef = Annotated[str, AfterValidator(normalize_uuid)]

# Area and spacings: realistic ranges, so tiny or huge values can't break the planner's
# arithmetic (live QA-1, O132). 1 m2 to 100 ha; rows 0.1-10 m apart; emitters 0.1-5 m apart.
Area = Annotated[float, Field(ge=1, le=1_000_000)]
RowSpacing = Annotated[float, Field(ge=0.1, le=10)]
EmitterSpacing = Annotated[float, Field(ge=0.1, le=5)]

Latitude = Annotated[float, Field(ge=-90, le=90)]
Longitude = Annotated[float, Field(ge=-180, le=180)]

# Exactly YYYY-MM-DD. JSON has no date type, so the date travels as text.
PlantingDate = Annotated[
    str,
    StringConstraints(pattern=r"^\d{4}-\d{2}-\d{2}$"),
    AfterValidator(check_real_date),
]


class RequestModel(BaseModel):
    """Base for request bodies: strict types ("1000" is not a number),
    unknown fields rejected, and no Infinity or NaN."""

    model_config = ConfigDict(strict=True, extra="forbid", allow_inf_nan=False)


# --- Helpers for request input --------------------------------------------


def parse_id(raw: str, label: str) -> str:
    """Turn a URL id into the stored form (lowercase UUID). Not a UUID: 404, no row can have it."""
    try:
        return normalize_uuid(raw)
    except ValueError:
        raise NotFoundError(f"Unknown {label}") from None


def sent_fields(body: BaseModel) -> dict:
    """PATCH: only the fields the client actually sent. An explicit null is rejected."""
    changes = body.model_dump(exclude_unset=True)
    for field, value in changes.items():
        if value is None:
            raise ValidationFailedError(f"{field}: may not be null")
    return changes


# --- Catalogues (read-only) ------------------------------------------------


class Crop(BaseModel):
    id: str
    name: str


class Soil(BaseModel):
    id: str
    name: str
    available_water_mm_per_m: int


class Emitter(BaseModel):
    id: str
    name: str
    flow_lph: float


# --- Farms -----------------------------------------------------------------


class Farm(BaseModel):
    id: str
    name: str


class FarmCreate(RequestModel):
    """POST body."""

    name: Name


class FarmUpdate(RequestModel):
    """PATCH body: every field optional, only the ones sent are changed."""

    name: Name | None = None


# --- Plots -----------------------------------------------------------------


class Plot(BaseModel):
    id: str
    farm_id: str
    name: str
    area_m2: float
    crop_id: str
    planting_date: datetime.date
    soil_id: str
    row_spacing_m: float
    emitter_spacing_m: float
    emitter_id: str
    lat: float
    lon: float


class PlotCreate(RequestModel):
    """POST body. Whether farm, crop, soil and emitter exist is checked in plots.py."""

    farm_id: UuidRef
    name: Name
    area_m2: Area
    crop_id: CatalogueRef
    planting_date: PlantingDate
    soil_id: CatalogueRef
    row_spacing_m: RowSpacing
    emitter_spacing_m: EmitterSpacing
    emitter_id: CatalogueRef
    lat: Latitude
    lon: Longitude


class PlotUpdate(RequestModel):
    """PATCH body: same rules as PlotCreate, every field optional."""

    farm_id: UuidRef | None = None
    name: Name | None = None
    area_m2: Area | None = None
    crop_id: CatalogueRef | None = None
    planting_date: PlantingDate | None = None
    soil_id: CatalogueRef | None = None
    row_spacing_m: RowSpacing | None = None
    emitter_spacing_m: EmitterSpacing | None = None
    emitter_id: CatalogueRef | None = None
    lat: Latitude | None = None
    lon: Longitude | None = None
