"""Database connection setup for the InQueue app.

We use SQLite (a single file called todo.db) so there is nothing to install
and no server to configure. SQLAlchemy is the layer that lets us talk to that
file using normal Python classes instead of writing SQL by hand.

By default the file lives next to this project (backend/todo.db). On a host
that gives you a persistent disk, point DATABASE_URL at the mounted folder so
the data survives restarts, e.g.:

    DATABASE_URL=sqlite:////var/data/todo.db

(Note the four slashes: ``sqlite:///`` + the absolute path ``/var/data/...``.)
"""

import os
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# backend/app/database.py -> parent.parent is the backend/ folder itself
BACKEND_DIR = Path(__file__).resolve().parent.parent

# Used when DATABASE_URL is not set (local development and simple hosts).
DEFAULT_DATABASE_PATH = BACKEND_DIR / "todo.db"

# "sqlite:///C:/path/to/todo.db" is the URL format SQLAlchemy expects.
# The environment variable always wins, so hosts with a persistent disk can
# keep todo.db in that disk instead of inside the (ephemeral) source folder.
DATABASE_URL = os.getenv("DATABASE_URL", "").strip() or (
    f"sqlite:///{DEFAULT_DATABASE_PATH.as_posix()}"
)


def _sqlite_file_path(url: str) -> Path | None:
    """Return the file a sqlite URL points at, or None for other databases."""
    prefix = "sqlite:///"
    if not url.startswith(prefix):
        return None
    path = url[len(prefix) :]
    return Path(path) if path else None


# A sqlite file has to be created inside a folder that already exists, and a
# freshly mounted disk starts empty - so create it if it is missing.
_sqlite_file = _sqlite_file_path(DATABASE_URL)
if _sqlite_file is not None:
    _sqlite_file.parent.mkdir(parents=True, exist_ok=True)

# check_same_thread=False lets FastAPI use the connection from different
# threads. It only applies to SQLite; other databases reject the argument.
_connect_args = {"check_same_thread": False} if _sqlite_file is not None else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)

# Each request gets its own short-lived database session from this factory.
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Base class that all our database models inherit from."""


def ensure_schema() -> None:
    """Create the table on first run and add columns introduced later on.

    `create_all()` creates missing *tables*, but it never changes a table that
    already exists. So when the app gains a new column (the deadline columns
    below), older todo.db files need a tiny manual upgrade. This is a very
    small "migration": check what the table has, and add what it is missing.
    """
    Base.metadata.create_all(bind=engine)

    with engine.begin() as connection:
        existing = {
            row[1] for row in connection.execute(text("PRAGMA table_info(tasks)"))
        }
        if not existing:
            return  # brand new table: create_all() already added everything
        if "due_date" not in existing:
            connection.execute(text("ALTER TABLE tasks ADD COLUMN due_date DATE"))
        if "due_time" not in existing:
            connection.execute(text("ALTER TABLE tasks ADD COLUMN due_time TIME"))
        if "note" not in existing:
            connection.execute(text("ALTER TABLE tasks ADD COLUMN note TEXT"))


def get_db():
    """FastAPI dependency: open a session, hand it to the route, always close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
