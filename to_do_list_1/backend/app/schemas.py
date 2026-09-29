"""Pydantic models: they describe the JSON shape of requests and responses.

FastAPI uses these to (a) validate incoming data automatically and
(b) document the API at http://127.0.0.1:8000/docs
"""

from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Notes are free text, but we keep a sane upper limit.
NOTE_MAX_LENGTH = 2000


def _clean_title(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("title must not be empty")
    return cleaned


def _clean_note(value: str | None) -> str | None:
    """Notes are optional; a blank note simply means "no note"."""
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


class TaskCreate(BaseModel):
    title: str = Field(max_length=255, examples=["Buy milk"])
    note: str | None = Field(default=None, max_length=NOTE_MAX_LENGTH)
    due_date: date | None = Field(default=None, examples=["2026-10-03"])
    due_time: time | None = Field(default=None, examples=["14:30"])

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        return _clean_title(value)

    @field_validator("note")
    @classmethod
    def strip_note(cls, value: str | None) -> str | None:
        return _clean_note(value)


class TaskUpdate(BaseModel):
    """Used for PATCH: send only the fields you want to change.

    Sending `"due_date": null` (and/or `"due_time": null`) clears the deadline,
    and `"note": null` clears the note.
    """

    title: str | None = Field(default=None, max_length=255)
    completed: bool | None = None
    note: str | None = Field(default=None, max_length=NOTE_MAX_LENGTH)
    due_date: date | None = None
    due_time: time | None = None

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str | None) -> str | None:
        return None if value is None else _clean_title(value)

    @field_validator("note")
    @classmethod
    def strip_note(cls, value: str | None) -> str | None:
        return _clean_note(value)


class TaskReorder(BaseModel):
    """New top-to-bottom order for every task, as a list of task ids."""

    ids: list[int] = Field(min_length=1, examples=[[3, 1, 2]])


class TaskOut(BaseModel):
    """What the API sends back for a task."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    completed: bool
    note: str | None
    position: int
    due_date: date | None
    due_time: time | None
    created_at: datetime
    updated_at: datetime
