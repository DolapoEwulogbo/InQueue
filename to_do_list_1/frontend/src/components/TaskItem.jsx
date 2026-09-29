import { useEffect, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import DueDateEditor from './DueDateEditor'
import NoteEditor from './NoteEditor'
import { deadlineState, formatDeadline } from '../utils/dates'

// One row of the list.
// useSortable() is the dnd-kit hook that makes this row draggable.
export default function TaskItem({ task, onToggle, onDelete, onRename, onSaveDue, onSaveNote }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  const [editing, setEditing] = useState(false)
  const [editingDue, setEditingDue] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [draft, setDraft] = useState(task.title)

  const dueState = deadlineState(task)

  // If the task changes elsewhere (for example the server trimmed it), stay in sync.
  useEffect(() => {
    if (!editing) setDraft(task.title)
  }, [task.title, editing])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  function startEditing() {
    setDraft(task.title)
    setEditing(true)
  }

  function saveEdit() {
    setEditing(false)
    onRename(task, draft)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') saveEdit()
    if (event.key === 'Escape') {
      setDraft(task.title)
      setEditing(false)
    }
  }

  return (
    <li ref={setNodeRef} style={style} className={task.completed ? 'task done' : 'task'}>
      <div className="task-row">
        {/* Spread the drag listeners on the handle only, so clicking the text or
            the checkbox never starts a drag. */}
        <button
          type="button"
          className="drag-handle"
          aria-label={`Move "${task.title}"`}
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>

      <input
        className="checkbox"
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task)}
        aria-label={task.completed ? `Mark "${task.title}" as active` : `Complete "${task.title}"`}
      />

      {editing ? (
        <input
          className="title-input"
          type="text"
          autoFocus
          maxLength={255}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={saveEdit}
          aria-label="Task title"
        />
      ) : (
        <span
          className="title"
          onClick={() => onToggle(task)}
          onDoubleClick={startEditing}
          title="Click to tick off, double-click to rename"
        >
          {task.title}
        </span>
      )}

      {task.note ? (
        <button
          type="button"
          className="note-badge"
          onClick={() => setShowNote((visible) => !visible)}
          aria-expanded={showNote}
          title={showNote ? 'Hide the note' : 'Show the note'}
        >
          📝 Note
        </button>
      ) : (
        <button
          type="button"
          className="icon-button"
          onClick={() => setEditingNote(true)}
          aria-label={`Add a note to "${task.title}"`}
          title="Add a note"
        >
          📝
        </button>
      )}

      {task.due_date ? (
        <button
          type="button"
          className={`due-chip due-${dueState}`}
          onClick={() => setEditingDue(true)}
          title="Change the deadline"
        >
          {formatDeadline(task)}
        </button>
      ) : (
        <button
          type="button"
          className="icon-button"
          onClick={() => setEditingDue(true)}
          aria-label={`Set a deadline for "${task.title}"`}
          title="Set a deadline"
        >
          📅
        </button>
      )}

      {!editing && (
        <button
          type="button"
          className="icon-button"
          onClick={startEditing}
          aria-label={`Rename "${task.title}"`}
          title="Rename"
        >
          ✎
        </button>
      )}

      <button
        type="button"
        className="icon-button danger"
        onClick={() => onDelete(task)}
        aria-label={`Delete "${task.title}"`}
        title="Delete"
      >
        ✕
      </button>
      </div>

      {showNote && task.note && !editingNote && (
        <div className="note-view">
          <p className="note-preview">{task.note}</p>
          <div className="note-editor-actions">
            <button type="button" className="link-button" onClick={() => setEditingNote(true)}>
              Edit note
            </button>
            <button type="button" className="link-button" onClick={() => setShowNote(false)}>
              Hide
            </button>
          </div>
        </div>
      )}

      {editingNote && (
        <NoteEditor
          task={task}
          onSave={async (target, note) => {
            await onSaveNote(target, note)
            setShowNote(Boolean(note))
          }}
          onClose={() => setEditingNote(false)}
        />
      )}

      {editingDue && (
        <DueDateEditor task={task} onSave={onSaveDue} onClose={() => setEditingDue(false)} />
      )}
    </li>
  )
}
