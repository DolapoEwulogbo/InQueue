# InQueue

A small full-stack to-do app that keeps your tasks in a queue and your deadlines
in sight.

- **Backend:** Python + [FastAPI](https://fastapi.tiangolo.com/) with SQLAlchemy, storing data in a single SQLite file
- **Frontend:** React (built with [Vite](https://vite.dev/)), `@dnd-kit` for drag-and-drop reordering

What you can do:

- **Add** tasks, **tick them off**, **rename** them, **delete** them
- **Move them around** by dragging, or let "Sort by deadline" line them up for you
- **Give each task a deadline**: a date, plus an optional time (leave the time empty
  for an "all day" task)
- **See deadlines everywhere**: each task gets a coloured badge (red = overdue,
  amber = due today), the header counts what is overdue, and the **Overdue** filter
  shows just those
- **Calendar view**: a month grid with everything that is due, and a panel for the
  day you click where you can tick things off or add new tasks for that date
- **Filter** by All / Active / Overdue / Done, and clear all finished tasks at once

---

## 1. How to run it

The easiest way is to double-click:

    start-all.cmd

That opens two windows (backend + frontend) and your browser should open by itself at
<http://localhost:5173>.

Prefer to start them separately? Double-click `start-backend.cmd` first, then
`start-frontend.cmd`.

To stop the app, close both console windows (or press `Ctrl+C` in each).

### What "running" means here

| Piece    | Address                     | What it does                                   |
| -------- | --------------------------- | ---------------------------------------------- |
| Backend  | http://127.0.0.1:8000       | The Python API that reads/writes the database  |
| API docs | http://127.0.0.1:8000/docs  | Auto-generated page to try the API by clicking |
| Frontend | http://localhost:5173       | The React page you actually look at            |

The frontend asks the backend for data; the backend saves it in `backend/todo.db`.

---

## 2. Project layout

    to_do_list_1/
    ├── start-all.cmd            <- double-click me
    ├── start-backend.cmd
    ├── start-frontend.cmd
    ├── backend/
    │   ├── .venv/               <- Python packages live here (created on first run)
    │   ├── app/
    │   │   ├── main.py          <- the API endpoints (routes)
    │   │   ├── models.py        <- the database table ("Task")
    │   │   ├── schemas.py       <- what the JSON looks like + validation
    │   │   └── database.py      <- SQLite connection (+ tiny schema upgrades)
    │   ├── run.py               <- python run.py  (starts the API)
    │   ├── smoke_test.py        <- python smoke_test.py (checks the API works)
    │   ├── requirements.txt     <- Python dependencies
    │   └── todo.db              <- your tasks (created on first run)
    └── frontend/
        ├── index.html
        ├── vite.config.js       <- dev server config (forwards /api to port 8000)
        ├── package.json         <- JavaScript dependencies
        └── src/
            ├── main.jsx         <- React entry point
            ├── App.jsx          <- app state + all the actions
            ├── api.js           <- the fetch() calls to the backend
            ├── index.css        <- styling
            ├── utils/
            │   └── dates.js     <- all deadline/date formatting logic
            └── components/
                ├── AddTaskForm.jsx
                ├── DueDateEditor.jsx
                ├── CalendarView.jsx
                ├── TaskList.jsx
                └── TaskItem.jsx

---

## 3. The API (backend)

| Method   | URL                     | Purpose                                              |
| -------- | ----------------------- | ---------------------------------------------------- |
| `GET`    | `/api/health`           | Is the server alive?                                 |
| `GET`    | `/api/tasks`            | All tasks in order (optional `?completed=true/false`) |
| `POST`   | `/api/tasks`            | Add a task: `{"title": "Buy milk"}`                  |
| `PATCH`  | `/api/tasks/{id}`       | Change any field, e.g. `{"completed": true}`         |
| `DELETE` | `/api/tasks/{id}`       | Delete one task                                      |
| `DELETE` | `/api/tasks/completed`  | Delete every ticked-off task                         |
| `POST`   | `/api/tasks/reorder`    | Save a new order: `{"ids": [3, 1, 2]}`               |

Deadline fields travel with a task:

    POST /api/tasks
    { "title": "Pay the rent", "due_date": "2026-10-03", "due_time": "09:30" }

    PATCH /api/tasks/4
    { "due_date": "2026-10-05" }            <- move the date, keep the time
    { "due_date": null, "due_time": null }  <- remove the deadline

`due_date` is a date (`YYYY-MM-DD`) and `due_time` is optional; if you send a time
without a date the API answers `422` and explains why.

The order you see on screen is stored in a `position` column on each row, so it
survives a page reload and a server restart.
---

## 4. How deadlines work (and the decisions behind them)

- **A date, plus an optional time.** A `due_date` on its own means "sometime that
  day"; add a `due_time` and it means "by 09:30". Days where a task has no time
  are shown as *all day* in the calendar.
- **Your clock is the clock.** Times are stored exactly as you type them, with no
  timezone conversion. That is ideal for one person on one machine (which is what
  this app is). If InQueue ever becomes multi-user, this is the first thing to
  change: store UTC and convert per user.
- **"Overdue" is worked out live in the browser** - a task is overdue when its date
  is in the past, or its time today has already gone by. Nothing needs a nightly
  job on the server, and the badge is correct the moment you look at it.
- **The database upgrades itself.** Adding a column to an existing SQLite file
  normally needs a migration tool. `backend/app/database.py` does a three-line
  version of it at startup: it inspects the table and adds `due_date` / `due_time`
  when they are missing. That is why your existing `todo.db` kept working.
- **The calendar groups tasks in the browser** (`src/utils/dates.js`). A to-do list
  is small, so loading everything once and grouping it client-side is simpler than
  adding date-range filters to the API.

---

## 5. Doing it by hand (what the .cmd files do)

Backend:

    cd backend
    python -m venv .venv
    .venv\Scripts\python.exe -m pip install -r requirements.txt
    .venv\Scripts\python.exe run.py

Frontend (in a second terminal):

    cd frontend
    npm install
    npm run dev

---

## 6. Things you may want to know

**Where is my data?** In `backend/todo.db` (a single SQLite file). Delete that file
while the backend is stopped and you get a clean, empty list on the next start.
Deadlines live in the same file, in the `due_date` and `due_time` columns.

**Why did a task turn red?** Its deadline has passed. Amber means it is due today,
blue means it is coming up in the next couple of days, and tasks with no date stay
plain. Tick a task off and the badge fades, because finished work is no longer late.

**How do I give a task a deadline?** Type a date in the form at the top (or click
"Today"/"Tomorrow"), or use the small calendar button on any task row. The `✕` next to
the deadline (inside the editor) removes it again.

**How do I change the task order?** Drag the `⠿` handle on the left of a row. The new
order is saved in the database right away. Keyboard alternative: focus the handle,
press `Space`, move with the arrow keys, press `Space` again to drop.

**Why didn't the frontend open?** Make sure the backend window is running first; the
frontend forwards every `/api` request to port 8000.

**"Port already in use"?** Something is still running on 8000 or 5173 - close the old
console window, or change the port in `backend/run.py` / `frontend/vite.config.js`
(and keep both in sync if you change the API port).

**npm says "running scripts is disabled on this system"?** That is the Windows
PowerShell policy. The `.cmd` launchers are not affected. If you type `npm` in
PowerShell and hit that error, use `npm.cmd` instead.

**Where do the Python packages live?** In `backend/.venv` - a private folder for this
project, so nothing is installed globally on your machine.

**Where do the JS packages live?** In `frontend/node_modules`.

---

## 7. How to check everything still works

With the backend running:

    cd backend
    .venv\Scripts\python.exe smoke_test.py

It adds, renames, ticks off, reorders, sets/clears deadlines and deletes a few
throwaway tasks, prints one line per check, and empties the list again.
"All checks passed." means the API (and the connection the browser uses) is healthy.

To prove the React code compiles without starting a server:

    cd frontend
    npm run build

That writes a `dist/` folder of static files - handy later if you ever want to put
this app online, but you do not need it for local use.

---

## 8. Put it online: Vercel (frontend) + PythonAnywhere (backend)

Vercel alone is not enough: it has no persistent disk, so `todo.db`
(SQLite) would be wiped. Keep the split:

- Frontend (React) -> Vercel
- Backend (FastAPI + SQLite) -> PythonAnywhere (files persist, so `todo.db` survives)

### A. Backend on PythonAnywhere (classic WSGI - easiest)

1. Sign up at https://www.pythonanywhere.com, note your `YOURUSERNAME`.
   Your API will be `https://YOURUSERNAME.pythonanywhere.com`.

2. Open a **Bash** console on PythonAnywhere and run:

     git clone https://github.com/DolapoEwulogbo/InQueue.git
     mkvirtualenv inqueue --python=/usr/bin/python3.10
     workon inqueue
     pip install -r ~/InQueue/to_do_list_1/backend/requirements.txt

3. Dashboard -> **Web** -> **Add a new web app** -> **Manual configuration**
   -> **Python 3.10**. Then set:

   - **Source code:** `/home/YOURUSERNAME/InQueue/to_do_list_1/backend`
   - **Virtualenv:** `/home/YOURUSERNAME/.virtualenvs/inqueue`

4. Dashboard -> Web -> **Code -> WSGI configuration file** -> replace its
   contents with `backend/PYTHONANYWHERE_WSGI_SNIPPET.txt` from this repo
   (remember to replace `YOURUSERNAME` and `FRONTEND_URL` with your real
   Vercel URL, e.g. `https://inqueue.vercel.app`).

   What that does: it imports `backend/wsgi.py`, which wraps the FastAPI
   `app` (`app.main:app`, ASGI) with `a2wsgi` so PythonAnywhere's classic
   WSGI server can run it.

5. Press green **Reload**, then visit in your browser:

   - `https://YOURUSERNAME.pythonanywhere.com/api/health` -> `{"status":"ok"}`
   - `https://YOURUSERNAME.pythonanywhere.com/docs` -> Swagger UI

   If it fails, check **Web -> Log files -> Error log**.

### A-alt. Backend on PythonAnywhere (new ASGI beta)

If you have ASGI access (`pa` tool), you don't need `wsgi.py`:

    pip install --upgrade pythonanywhere
    pip install "uvicorn[standard]" fastapi sqlalchemy==2.1.1
    pa website create --domain-name YOURUSERNAME.pythonanywhere.com \
      --command "/home/YOURUSERNAME/.virtualenvs/inqueue/bin/uvicorn --app-dir /home/YOURUSERNAME/InQueue/to_do_list_1/backend --uds ${DOMAIN_SOCKET} app.main:app"
    pa website env set --domain-name YOURUSERNAME.pythonanywhere.com \
      --key FRONTEND_URL --value https://your-vercel-app.vercel.app
    pa website reload --domain-name YOURUSERNAME.pythonanywhere.com

### B. Frontend on Vercel

1. Vercel Dashboard -> Project -> Settings -> General -> **Root Directory**
   = `to_do_list_1` (this repo keeps the app in a subfolder).
2. Settings -> Environment Variables -> add:

     VITE_API_URL=https://YOURUSERNAME.pythonanywhere.com/api

   `frontend/src/api.js` uses this in production, and falls back to `/api`
   (the Vite proxy to `127.0.0.1:8000`) locally.
3. Deployments -> Redeploy (uncheck Build Cache for a clean build).


