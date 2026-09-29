import { useState } from 'react'

import { tomorrowISO, todayISO } from '../utils/dates'

// The "add a new task" form: a title box plus an optional deadline (date and,
// if you want one, a time). A time only makes sense together with a date, so
// the time box stays disabled until a date is picked.
export default function AddTaskForm({ onAdd }) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || busy) return

    setBusy(true)
    const added = await onAdd({
      title: trimmed,
      due_date: dueDate || null,
      due_time: dueDate && dueTime ? dueTime : null,
      note: note.trim() || null,
    })
    setBusy(false)

    if (added) {
      setTitle('')
      setDueDate('')
      setDueTime('')
      setNote('')
      setShowNote(false)
    }
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <div className="add-row">
        <input
          className="add-input"
          type="text"
          placeholder="What needs to be done?"
          aria-label="New task"
          maxLength={255}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button className="add-button" type="submit" disabled={busy || title.trim() === ''}>
          {busy ? 'Adding...' : 'Add'}
        </button>
      </div>

      <div className="add-when">
        <label className="field">
          <span>Deadline</span>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => {
              setDueDate(event.target.value)
              if (!event.target.value) setDueTime('') // no date, no time
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

        <div className="quick-dates">
          <button type="button" className="chip" onClick={() => setDueDate(todayISO())}>
            Today
          </button>
          <button type="button" className="chip" onClick={() => setDueDate(tomorrowISO())}>
            Tomorrow
          </button>
          {(dueDate || dueTime) && (
            <button
              type="button"
              className="chip"
              onClick={() => {
                setDueDate('')
                setDueTime('')
              }}
            >
              No deadline
            </button>
          )}
        </div>
      </div>

      {showNote ? (
        <textarea
          className="add-note-input"
          rows={3}
          maxLength={2000}
          placeholder="Note (optional): details, links, phone numbers..."
          aria-label="Note for the new task"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      ) : (
        <button type="button" className="note-toggle" onClick={() => setShowNote(true)}>
          + Add a note
        </button>
      )}
    </form>
  )
}
