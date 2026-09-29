import { useCallback, useEffect, useMemo, useState } from 'react'

import * as api from './api'
import AddTaskForm from './components/AddTaskForm'
import CalendarView from './components/CalendarView'
import TaskList from './components/TaskList'
import { addMonths, byDeadline, isOverdue, toISODate, todayISO } from './utils/dates'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Done' },
]

const VIEWS = [
  { id: 'list', label: 'List' },
  { id: 'calendar', label: 'Calendar' },
]

function emptyMessage(tasks, filter) {
  if (tasks.length === 0) return 'Your queue is empty. Add a task above.'
  if (filter === 'completed') return 'No completed tasks yet.'
  if (filter === 'overdue') return 'Nothing is overdue. Nice work!'
  return 'Nothing left to do. Nice work!'
}

export default function App() {
  const [tasks, setTasks] = useState([]) // always the FULL list, in saved order
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState('list') // 'list' or 'calendar'
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => todayISO())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load the saved tasks once, when the app first appears.
  const loadTasks = useCallback(async () => {
    try {
      setTasks(await api.fetchTasks())
      setError('')
    } catch (err) {
      setError(`Could not load your tasks: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const visibleTasks = useMemo(() => {
    if (filter === 'active') return tasks.filter((task) => !task.completed)
    if (filter === 'overdue') return tasks.filter(isOverdue)
    if (filter === 'completed') return tasks.filter((task) => task.completed)
    return tasks
  }, [tasks, filter])

  const remaining = tasks.filter((task) => !task.completed).length
  const doneCount = tasks.length - remaining
  const overdueCount = tasks.filter(isOverdue).length

  async function handleAdd(payload) {
    try {
      const created = await api.createTask(payload)
      setTasks((prev) => [...prev, created])
      setError('')
      return true
    } catch (err) {
      setError(`Could not add the task: ${err.message}`)
      return false
    }
  }

  async function handleToggle(task) {
    const optimistic = { ...task, completed: !task.completed }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? optimistic : t)))
    try {
      const saved = await api.updateTask(task.id, { completed: optimistic.completed })
      setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)))
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t))) // undo
      setError(`Could not update the task: ${err.message}`)
    }
  }

  async function handleRename(task, newTitle) {
    const title = newTitle.trim()
    if (!title || title === task.title) return
    try {
      const saved = await api.updateTask(task.id, { title })
      setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)))
    } catch (err) {
      setError(`Could not rename the task: ${err.message}`)
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return
    const snapshot = tasks
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    try {
      await api.deleteTask(task.id)
    } catch (err) {
      setTasks(snapshot) // put it back if the server said no
      setError(`Could not delete the task: ${err.message}`)
    }
  }

  async function handleClearCompleted() {
    if (!window.confirm(`Delete ${doneCount} completed task(s)?`)) return
    const snapshot = tasks
    setTasks((prev) => prev.filter((t) => !t.completed))
    try {
      await api.clearCompleted()
    } catch (err) {
      setTasks(snapshot)
      setError(`Could not clear completed tasks: ${err.message}`)
    }
  }

  // Called after a drag-and-drop with the new order of the *visible* tasks.
  async function handleReorder(newVisibleOrder) {
    const visibleIds = new Set(newVisibleOrder.map((task) => task.id))
    let cursor = 0
    // Drop the reordered items back into the very same slots they came from, so
    // the order stays correct even while a filter (Active / Done) is applied.
    const merged = tasks.map((task) =>
      visibleIds.has(task.id) ? newVisibleOrder[cursor++] : task,
    )

    const snapshot = tasks
    setTasks(merged) // show the new order immediately
    try {
      setTasks(await api.reorderTasks(merged.map((task) => task.id)))
    } catch (err) {
      setTasks(snapshot)
      setError(`Could not save the new order: ${err.message}`)
    }
  }

  // Save a new deadline (or clear it by passing nulls) for one task.
  async function handleSaveDue(task, changes) {
    const optimistic = { ...task, ...changes }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? optimistic : t)))
    try {
      const saved = await api.updateTask(task.id, changes)
      setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)))
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t))) // undo
      setError(`Could not save the deadline: ${err.message}`)
    }
  }

  // Save (or clear with null) the free-form note attached to a task.
  async function handleSaveNote(task, note) {
    const optimistic = { ...task, note }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? optimistic : t)))
    try {
      const saved = await api.updateTask(task.id, { note })
      setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)))
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t))) // undo
      setError(`Could not save the note: ${err.message}`)
    }
  }

  // Put the whole queue in deadline order (tasks without a deadline go last).
  async function handleSortByDeadline() {
    const ordered = [...tasks].sort(byDeadline)
    const snapshot = tasks
    setTasks(ordered)
    try {
      setTasks(await api.reorderTasks(ordered.map((task) => task.id)))
    } catch (err) {
      setTasks(snapshot)
      setError(`Could not save the new order: ${err.message}`)
    }
  }

  function changeView(nextView) {
    if (nextView === 'calendar') {
      // Jump to today so the calendar always opens on a familiar month.
      setCalendarMonth(new Date())
      setSelectedDay(todayISO())
    }
    setView(nextView)
  }

  function handlePrevMonth() {
    setCalendarMonth((current) => addMonths(current, -1))
  }

  function handleNextMonth() {
    setCalendarMonth((current) => addMonths(current, 1))
  }

  function handleThisMonth() {
    const now = new Date()
    setCalendarMonth(now)
    setSelectedDay(toISODate(now))
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>InQueue</h1>
        <p className="tagline">Your to-do queue, with deadlines kept in sight.</p>
        <p className="subtitle">
          {tasks.length === 0
            ? 'Nothing here yet - add your first task below.'
            : `${remaining} of ${tasks.length} task${tasks.length === 1 ? '' : 's'} left`}
          {overdueCount > 0 && <span className="overdue-pill">{overdueCount} overdue</span>}
        </p>
      </header>

      {error && (
        <div className="banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}

      <div className="view-switch" role="tablist" aria-label="Choose a view">
        {VIEWS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={view === option.id}
            className={view === option.id ? 'chip chip-active' : 'chip'}
            onClick={() => changeView(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <AddTaskForm onAdd={handleAdd} />

      {view === 'list' ? (
        <>
          <div className="toolbar">
            <div className="filters">
              {FILTERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={option.id === filter ? 'chip chip-active' : 'chip'}
                  onClick={() => setFilter(option.id)}
                  aria-pressed={option.id === filter}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="toolbar-actions">
              {tasks.length > 1 && (
                <button type="button" className="link-button" onClick={handleSortByDeadline}>
                  Sort by deadline
                </button>
              )}
              {doneCount > 0 && (
                <button type="button" className="link-button" onClick={handleClearCompleted}>
                  Clear completed ({doneCount})
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <p className="empty">Loading your tasks...</p>
          ) : visibleTasks.length === 0 ? (
            <p className="empty">{emptyMessage(tasks, filter)}</p>
          ) : (
            <TaskList
              tasks={visibleTasks}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onRename={handleRename}
              onSaveDue={handleSaveDue}
              onSaveNote={handleSaveNote}
              onReorder={handleReorder}
            />
          )}
        </>
      ) : (
        <CalendarView
          tasks={tasks}
          viewDate={calendarMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onToday={handleThisMonth}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onAddForDay={handleAdd}
        />
      )}

      <footer className="hint">
        Set a deadline with the date box above or the calendar button on a task. In the
        list, drag the handle to reorder, click a title to rename it, and use "Sort by
        deadline" to line everything up by when it is due.
      </footer>
    </div>
  )
}
