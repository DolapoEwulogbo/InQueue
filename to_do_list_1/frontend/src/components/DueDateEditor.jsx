import { useState } from 'react'

import { toInputTime } from '../utils/dates'

// A small pop-up row under a task for changing (or removing) its deadline.
export default function DueDateEditor({ task, onSave, onClose }) {
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [dueTime, setDueTime] = useState(toInputTime(task.due_time))

  function handleSave() {
    onSave(task, { due_date: dueDate || null, due_time: dueDate && dueTime ? dueTime : null })
    onClose()
  }

  function handleClear() {
    onSave(task, { due_date: null, due_time: null })
    onClose()
  }

  return (
    <div className="due-editor">
      <label className="field">
        <span>Date</span>
        <input
          type="date"
          autoFocus
          value={dueDate}
          onChange={(event) => {
            setDueDate(event.target.value)
            if (!event.target.value) setDueTime('')
          }}
        />
      </label>

      <label className="field">
        <span>Time</span>
        <input
          type="time"
          value={dueTime}
          disabled={!dueDate}
          onChange={(event) => setDueTime(event.target.value)}
        />
      </label>

      <div className="due-editor-actions">
        <button type="button" className="chip chip-active" onClick={handleSave}>
          Save
        </button>
        {task.due_date && (
          <button type="button" className="chip" onClick={handleClear}>
            Remove
          </button>
        )}
        <button type="button" className="chip" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}
