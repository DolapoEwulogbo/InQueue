"""InQueue REST API built with FastAPI.

Run it with:      python run.py            (from the backend folder)
Interactive docs: http://127.0.0.1:8000/docs
"""

import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete as sql_delete
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models, schemas
from .database import engine, ensure_schema, get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Prepare todo.db (and upgrade it if it is from an older version)."""
    ensure_schema()
    yield


app = FastAPI(
    title="InQueue API",
    description="A small FastAPI + SQLite backend for the InQueue to-do app.",
    version="1.1.0",
    lifespan=lifespan,
)

# The React dev server runs on a different port, so the browser treats it as a
# different origin. CORS tells the browser that these calls are allowed.
#
# Local development is always allowed. In production the frontend lives on a
# different host (for example Vercel), so we also allow:
#   - the exact URL in the FRONTEND_URL environment variable, and
#   - every *.vercel.app origin, which covers preview deployments whose URLs
#     change on each commit.
LOCAL_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]
FRONTEND_URL = os.getenv("FRONTEND_URL", "").rstrip("/")
ALLOWED_ORIGINS = LOCAL_ORIGINS + ([FRONTEND_URL] if FRONTEND_URL else [])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _ordered_tasks(db: Session) -> list[models.Task]:
    """Every task, in the order the user arranged them."""
    statement = select(models.Task).order_by(models.Task.position, models.Task.id)
    return list(db.scalars(statement))


def _get_task_or_404(db: Session, task_id: int) -> models.Task:
    task = db.get(models.Task, task_id)
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} was not found",
        )
    return task


def _check_deadline(due_date, due_time) -> None:
    """A time on its own makes no sense - the user has to pick a date too."""
    if due_time is not None and due_date is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A 'due_time' only makes sense together with a 'due_date'.",
        )


@app.get("/api/health", tags=["meta"])
def health() -> dict[str, str]:
    """Tiny endpoint used to check that the server is alive."""
    return {"status": "ok"}


@app.get("/api/tasks", response_model=list[schemas.TaskOut], tags=["tasks"])
def list_tasks(completed: bool | None = None, db: Session = Depends(get_db)):
    """Return all tasks, newest order first. Optionally filter by completion."""
    tasks = _ordered_tasks(db)
    if completed is None:
        return tasks
    return [task for task in tasks if task.completed is completed]


@app.post(
    "/api/tasks",
    response_model=schemas.TaskOut,
    status_code=status.HTTP_201_CREATED,
    tags=["tasks"],
)
def create_task(payload: schemas.TaskCreate, db: Session = Depends(get_db)):
    """Add a new task at the bottom of the list."""
    _check_deadline(payload.due_date, payload.due_time)

    highest = db.scalar(select(func.max(models.Task.position)))
    next_position = 0 if highest is None else highest + 1

    task = models.Task(
        title=payload.title,
        note=payload.note,
        completed=False,
        position=next_position,
        due_date=payload.due_date,
        due_time=payload.due_time,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@app.post("/api/tasks/reorder", response_model=list[schemas.TaskOut], tags=["tasks"])
def reorder_tasks(payload: schemas.TaskReorder, db: Session = Depends(get_db)):
    """Save a new manual order.

    Send every task id exactly once, top-to-bottom, e.g. {"ids": [3, 1, 2]}.
    """
    tasks = _ordered_tasks(db)
    existing_ids = [task.id for task in tasks]

    if sorted(payload.ids) != sorted(existing_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "The 'ids' list must contain every task id exactly once. "
                f"Expected {existing_ids}, received {payload.ids}."
            ),
        )

    tasks_by_id = {task.id: task for task in tasks}
    for new_position, task_id in enumerate(payload.ids):
        tasks_by_id[task_id].position = new_position

    db.commit()
    return _ordered_tasks(db)


@app.delete(
    "/api/tasks/completed",
    status_code=status.HTTP_200_OK,
    tags=["tasks"],
)
def clear_completed(db: Session = Depends(get_db)):
    """Delete every task that is already checked off."""
    result = db.execute(sql_delete(models.Task).where(models.Task.completed.is_(True)))
    db.commit()
    return {"deleted": result.rowcount or 0}


@app.patch("/api/tasks/{task_id}", response_model=schemas.TaskOut, tags=["tasks"])
def update_task(
    task_id: int, payload: schemas.TaskUpdate, db: Session = Depends(get_db)
):
    """Rename a task, tick it off, and/or move its deadline.

    `exclude_unset=True` means we only look at the fields the caller actually
    sent, so sending `{"completed": true}` leaves the deadline untouched, while
    sending `{"due_date": null, "due_time": null}` clears it.
    """
    task = _get_task_or_404(db, task_id)

    changes = payload.model_dump(exclude_unset=True)

    if "title" in changes and changes["title"] is not None:
        task.title = changes["title"]
    if changes.get("completed") is not None:
        task.completed = changes["completed"]
    if "note" in changes:
        task.note = changes["note"]
    if "due_date" in changes:
        task.due_date = changes["due_date"]
    if "due_time" in changes:
        task.due_time = changes["due_time"]

    # Check the *resulting* deadline, not just the fields that were sent.
    if task.due_time is not None and task.due_date is None:
        db.rollback()  # forget the change we were about to save
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A 'due_time' only makes sense together with a 'due_date'.",
        )

    db.commit()
    db.refresh(task)
    return task


@app.delete(
    "/api/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["tasks"],
)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Remove a single task."""
    task = _get_task_or_404(db, task_id)
    db.delete(task)
    db.commit()
