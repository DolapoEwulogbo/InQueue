"""Quick end-to-end check of the running to-do API.

Start the backend first (`python run.py`), then run:

    .venv\\Scripts\\python.exe smoke_test.py

The script creates a few tasks, reorders them, renames them, ticks one off,
deletes them again and prints one line per check. Only the Python standard
library is used, so there is nothing extra to install.
"""

import json
import urllib.error
import urllib.request

API = "http://127.0.0.1:8000/api"
PROXY = "http://localhost:5173/api"  # the same API, seen through the React dev server

failures = 0


def call(method, path, payload=None, base=API):
    """Send a JSON request and return (status_code, body)."""
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(
        f"{base}{path}",
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raw = error.read()
        return error.code, json.loads(raw) if raw else None


def check(label, condition, extra=""):
    global failures
    if not condition:
        failures += 1
    print(f"{'OK  ' if condition else 'FAIL'} {label}" + (f"  ({extra})" if extra else ""))


def titles(tasks):
    return [task["title"] for task in tasks]


# --------------------------------------------------------------------------
# start from a clean list
# --------------------------------------------------------------------------
status, existing = call("GET", "/tasks")
for task in existing or []:
    call("DELETE", f"/tasks/{task['id']}")

status, tasks = call("GET", "/tasks")
check("GET /tasks works", status == 200, f"status={status}")
check("the list starts empty", tasks == [], f"got={tasks}")

# --------------------------------------------------------------------------
# create
# --------------------------------------------------------------------------
created = []
for title in ["Buy milk", "Walk the dog", "Write the report"]:
    status, task = call("POST", "/tasks", {"title": title})
    created.append(task)
    check(f"POST /tasks creates '{title}'", status == 201)

status, tasks = call("GET", "/tasks")
check("new tasks keep the order they were added in", titles(tasks) == [
    "Buy milk", "Walk the dog", "Write the report",
], titles(tasks))
check("positions are 0, 1, 2", [t["position"] for t in tasks] == [0, 1, 2])

status, body = call("POST", "/tasks", {"title": "   "})
check("an empty title is rejected", status == 422, f"status={status}")

# --------------------------------------------------------------------------
# deadlines
# --------------------------------------------------------------------------
status, dated = call(
    "POST",
    "/tasks",
    {"title": "Pay the rent", "due_date": "2030-01-31", "due_time": "09:30"},
)
check(
    "POST /tasks stores a deadline",
    status == 201 and dated["due_date"] == "2030-01-31" and dated["due_time"].startswith("09:30"),
    f"{dated.get('due_date')} {dated.get('due_time')}",
)

status, body = call("POST", "/tasks", {"title": "No date", "due_time": "08:00"})
check("a time without a date is rejected on create", status == 422, f"status={status}")

status, body = call("PATCH", f"/tasks/{dated['id']}", {"due_time": "07:15"})
check(
    "PATCH can change just the time, keeping the date",
    status == 200 and body["due_date"] == "2030-01-31" and body["due_time"].startswith("07:15"),
    f"{body.get('due_date')} {body.get('due_time')}",
)

status, body = call("PATCH", f"/tasks/{dated['id']}", {"due_date": None})
check("a time without a date is rejected on update", status == 422, f"status={status}")

status, body = call("PATCH", f"/tasks/{dated['id']}", {"due_date": None, "due_time": None})
check(
    "sending null clears the deadline",
    status == 200 and body["due_date"] is None and body["due_time"] is None,
)

status, body = call("DELETE", f"/tasks/{dated['id']}")
check("the deadline test task is deleted again", status == 204, f"status={status}")

# --------------------------------------------------------------------------
# notes
# --------------------------------------------------------------------------
status, noted = call(
    "POST", "/tasks", {"title": "Call the plumber", "note": "  Ask about the leak  "}
)
check(
    "POST /tasks stores a note and trims it",
    status == 201 and noted["note"] == "Ask about the leak",
    repr(noted.get("note")),
)

status, body = call("PATCH", f"/tasks/{noted['id']}", {"note": "Also ask about the radiator"})
check(
    "PATCH can replace a note",
    status == 200 and body["note"] == "Also ask about the radiator",
    repr(body.get("note")),
)

status, body = call("PATCH", f"/tasks/{noted['id']}", {"completed": True})
check(
    "ticking a task off leaves its note alone",
    status == 200 and body["completed"] is True and body["note"] == "Also ask about the radiator",
)

status, body = call("PATCH", f"/tasks/{noted['id']}", {"note": "   "})
check("a blank note clears the note", status == 200 and body["note"] is None)

status, body = call("PATCH", f"/tasks/{noted['id']}", {"note": None})
check("sending null clears the note", status == 200 and body["note"] is None)

status, body = call("DELETE", f"/tasks/{noted['id']}")
check("the notes test task is deleted again", status == 204, f"status={status}")

# --------------------------------------------------------------------------
# tick off and rename
# --------------------------------------------------------------------------
second_id = tasks[1]["id"]
status, body = call("PATCH", f"/tasks/{second_id}", {"completed": True})
check("PATCH /tasks/{id} ticks a task off", status == 200 and body["completed"] is True)

status, body = call("PATCH", f"/tasks/{tasks[0]['id']}", {"title": "  Buy oat milk  "})
check("renaming works and the text is trimmed", body["title"] == "Buy oat milk", body.get("title"))

status, body = call("GET", "/tasks?completed=true")
check("?completed=true only returns ticked tasks", len(body) == 1, titles(body))

status, body = call("PATCH", "/tasks/999999", {"completed": True})
check("a missing task returns 404", status == 404, f"status={status}")

# --------------------------------------------------------------------------
# reorder
# --------------------------------------------------------------------------
ids = [task["id"] for task in tasks]
status, body = call("POST", "/tasks/reorder", {"ids": [ids[2], ids[0], ids[1]]})
check("POST /tasks/reorder saves a new order", status == 200 and titles(body) == [
    "Write the report", "Buy oat milk", "Walk the dog",
], titles(body))

status, body = call("POST", "/tasks/reorder", {"ids": [ids[0]]})
check("a partial order is rejected with 400", status == 400, f"status={status}")

# --------------------------------------------------------------------------
# delete
# --------------------------------------------------------------------------
status, body = call("PATCH", f"/tasks/{ids[1]}", {"completed": False})
check("PATCH can also un-tick a task", status == 200 and body["completed"] is False)

status, body = call("PATCH", f"/tasks/{ids[2]}", {"completed": True})
check("PATCH ticked off the third task again", status == 200 and body["completed"] is True)

status, body = call("DELETE", "/tasks/completed")
check(
    "DELETE /tasks/completed removes ticked tasks",
    status == 200 and body.get("deleted") == 1,
    f"deleted={body.get('deleted')}",
)

status, body = call("DELETE", f"/tasks/{ids[0]}")
check("DELETE /tasks/{id} removes one task", status == 204, f"status={status}")

status, tasks = call("GET", "/tasks")
check("exactly one task is left", len(tasks) == 1, titles(tasks))

# --------------------------------------------------------------------------
# the path the browser really uses (Vite proxy on port 5173)
# --------------------------------------------------------------------------
try:
    status, body = call("GET", "/tasks", base=PROXY)
    check("the React dev server proxies /api to the backend", status == 200, f"status={status}")
except Exception as error:  # noqa: BLE001 - just report it
    check("the React dev server proxies /api to the backend", False, str(error))

# --------------------------------------------------------------------------
# clean up, so you start with an empty list
# --------------------------------------------------------------------------
status, tasks = call("GET", "/tasks")
for task in tasks:
    call("DELETE", f"/tasks/{task['id']}")
status, tasks = call("GET", "/tasks")
check("the list is empty again", tasks == [])

print()
print("All checks passed." if failures == 0 else f"{failures} check(s) failed.")
