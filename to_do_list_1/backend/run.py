"""Convenience starter script.

From the backend folder run:   python run.py
Then open:                     http://127.0.0.1:8000/docs
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,  # auto-restarts when you edit a Python file
    )
