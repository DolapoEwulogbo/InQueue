// All communication with the FastAPI backend lives in this file.
//
// Requests go to "/api/..." on the same origin, and vite.config.js forwards
// them to the Python server on port 8000.

const BASE_URL = '/api'

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    // FastAPI sends errors as {"detail": "..."} - turn that into a JS Error.
    let message = `Request failed with status ${response.status}`
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') {
        message = body.detail
      } else if (Array.isArray(body.detail)) {
        message = body.detail.map((item) => item.msg).join(', ')
      }
    } catch {
      // The response had no JSON body (for example a network hiccup).
    }
    throw new Error(message)
  }

  // 204 No Content (used by DELETE) has no body to parse.
  return response.status === 204 ? null : response.json()
}

export const fetchTasks = () => request('/tasks')

/**
 * payload looks like { title, due_date, due_time } - due_date/due_time are
 * optional and are plain "YYYY-MM-DD" / "HH:MM" strings.
 */
export const createTask = (payload) =>
  request('/tasks', { method: 'POST', body: JSON.stringify(payload) })

/** changes can contain title, completed, due_date and/or due_time. */
export const updateTask = (id, changes) =>
  request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })

export const deleteTask = (id) => request(`/tasks/${id}`, { method: 'DELETE' })

export const reorderTasks = (ids) =>
  request('/tasks/reorder', { method: 'POST', body: JSON.stringify({ ids }) })

export const clearCompleted = () => request('/tasks/completed', { method: 'DELETE' })
