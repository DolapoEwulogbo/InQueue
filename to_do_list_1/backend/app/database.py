"""Database connection setup for the InQueue app.

We use SQLite (a single file called todo.db) so there is nothing to install
and no server to configure. SQLAlchemy is the layer that lets us talk to that
file using normal Python classes instead of writing SQL by hand.
"""

from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# backend/database.py -> parent.parent is the backend/ folder itself
BACKEND_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BACKEND_DIR / "todo.db"

# "sqlite:///C:/path/to/todo.db" is the URL format SQLAlchemy expects.
DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"

# check_same_thread=False lets FastAPI use the connection from different threads.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

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
