import { useState } from 'react'

// The editor for a task's note - the longer free-form text ("ask about the
// leak, their number is 07700 900123"). It appears under the task row.
export default function NoteEditor({ task, onSave, onClose }) {
  const [draft, setDraft] = useState(task.note ?? '')

  function handleSave() {
    onSave(task, draft.trim() === '' ? null : draft)
    onClose()
  }

  return (
    <div className="note-editor">
      <textarea
        className="note-input"
        rows={4}
        maxLength={2000}
        autoFocus
        placeholder="Details, links, phone numbers - anything worth remembering."
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose()
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) handleSave()
        }}
      />

      <div className="note-editor-actions">
        <button type="button" className="chip chip-active" onClick={handleSave}>
          Save note
        </button>
        {task.note && (
          <button
            type="button"
            className="chip"
            onClick={() => {
              onSave(task, null)
              onClose()
            }}
          >
            Remove
          </button>
        )}
        <button type="button" className="chip" onClick={onClose}>
          Cancel
        </button>
        <span className="note-hint">Ctrl+Enter saves, Esc closes</span>
      </div>
    </div>
  )
}
