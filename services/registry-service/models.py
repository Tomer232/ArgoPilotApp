"""JSON shapes the API accepts and returns, plus helpers for reading request input.

Response models list exactly the spec's fields, so nothing else ever leaves the service.
"""

import uuid
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

from errors import NotFoundError, ValidationFailedError

# A name: spaces at both ends are removed, and it must not be empty afterwards.
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class RequestModel(BaseModel):
    """Base for request bodies: strict types ("1000" is not a number), unknown fields rejected."""

    model_config = ConfigDict(strict=True, extra="forbid")


# --- Helpers for request input --------------------------------------------


def parse_id(raw: str, label: str) -> str:
    """Turn a URL id into the stored form (lowercase UUID). Not a UUID: 404, no row can have it."""
    try:
        return str(uuid.UUID(raw))
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
