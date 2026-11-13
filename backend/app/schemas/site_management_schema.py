from datetime import datetime
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, StringConstraints


class SiteRenameRequest(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100, pattern=r'^[^\x00-\x1f\x7f]+$')]


class SiteFileResponse(BaseModel):
    name: str
    path: str
    kind: Literal['file', 'directory']
    size_bytes: int | None = None


class SiteFilesResponse(BaseModel):
    path: str
    entries: list[SiteFileResponse]
    total_entries: int
    total_files: int
    size_bytes: int
    offset: int
    limit: int


class SiteActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    changed_at: datetime
    previous_status: str | None = None
    new_status: str
    reason: str | None = None
