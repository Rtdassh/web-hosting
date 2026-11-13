from datetime import datetime
from typing import Literal
from pydantic import BaseModel


class SiteVersionResponse(BaseModel):
    id: str
    created_at: datetime
    size_bytes: int
    active: bool


class SiteSampleResponse(BaseModel):
    checked_at: datetime
    status: Literal['up', 'down', 'stopped']
    http_status: int | None = None
    latency_ms: float | None = None


class SiteMonitorResponse(BaseModel):
    latest: SiteSampleResponse | None = None
    stale: bool
    samples: int
    availability_percent: float | None = None
    recent: list[SiteSampleResponse]
    interval_seconds: int


class SiteTrafficResponse(BaseModel):
    available: bool
    scope: str
    requests: int | None = None
    response_body_bytes: int | None = None
    errors: int | None = None


class SiteInsightsResponse(BaseModel):
    monitor: SiteMonitorResponse
    traffic: SiteTrafficResponse


class SiteHealthResponse(BaseModel):
    id: int
    name: str
    monitor: SiteMonitorResponse
