"""WSGI entry-point for PythonAnywhere classic web apps.

FastAPI is ASGI, but PythonAnywhere's default Web tab expects a WSGI
``application`` object. This tiny wrapper converts it via a2wsgi.

PythonAnywhere setup (classic WSGI path):
1. Upload/clone this repo so this file lives at e.g.
   /home/YOURUSERNAME/InQueue/to_do_list_1/backend/wsgi.py
2. In the Web tab, set:
   - Source code: /home/YOURUSERNAME/InQueue/to_do_list_1/backend
   - Virtualenv: /home/YOURUSERNAME/.virtualenvs/inqueue
   - WSGI file content: see PYTHONANYWHERE_WSGI_SNIPPET.txt in this folder
3. pip install -r requirements.txt (includes a2wsgi)

For the newer ASGI beta you don't need this file at all — just point
uvicorn at app.main:app (see README section 8).
"""

from a2wsgi import ASGIMiddleware

from app.main import app  # noqa: E402

# PythonAnywhere looks for ``application`` in your WSGI file.
application = ASGIMiddleware(app)
