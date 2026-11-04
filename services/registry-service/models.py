"""Shapes of the JSON the API returns. Only these fields ever leave the service."""

from pydantic import BaseModel

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
