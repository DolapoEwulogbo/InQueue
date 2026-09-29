"""The database table that stores one row per to-do item."""

from datetime import date as date_type
from datetime import datetime, time as time_type, timezone

from sqlalchemy import Boolean, Date, DateTime, Integer, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def utcnow() -> datetime:
    """Timezone-aware "now" so timestamps are unambiguous."""
    return datetime.now(timezone.utc)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # An optional longer, free-form description: links, phone numbers, details.
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # "position" is what keeps the user's manually chosen order.
    # Lower number = higher up in the list.
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0, index=True)

    # Deadlines. Both are optional: a task can have no deadline at all, a date
    # only ("all day"), or a date plus a time ("due at 14:30").
    due_date: Mapped[date_type | None] = mapped_column(Date, nullable=True, index=True)
    due_time: Mapped[time_type | None] = mapped_column(Time, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, onupdate=utcnow
    )

    def __repr__(self) -> str:  # helps when debugging in a Python shell
        return f"<Task id={self.id} title={self.title!r} done={self.completed}>"
