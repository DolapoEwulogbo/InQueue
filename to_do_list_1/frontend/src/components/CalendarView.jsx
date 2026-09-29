import { useMemo, useState } from 'react'

import {
  WEEKDAY_LABELS,
  formatFullDate,
  formatMonth,
  groupByDay,
  isOverdue,
  monthMatrix,
  parseISODate,
  toInputTime,
  toISODate,
  todayISO,
} from '../utils/dates'

// Month calendar: every day shows the tasks that are due on it, and the panel
// below the grid lets you work with the tasks of the day you selected.
export default function CalendarView({
  tasks,
  viewDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  selectedDay,
  onSelectDay,
  onToggle,
  onDelete,
  onAddForDay,
}) {
  const weeks = useMemo(() => monthMatrix(viewDate), [viewDate])
  const byDay = useMemo(() => groupByDay(tasks), [tasks])
  const today = todayISO()
  const currentMonth = viewDate.getMonth()
  const selectedTasks = byDay.get(selectedDay) ?? []
  const undated = tasks.filter((task) => !task.due_date)
  const openUndated = undated.filter((task) => !task.completed).length

  return (
    <section className="calendar">
      <div className="calendar-head">
        <button type="button" className="chip" onClick={onPrevMonth} aria-label="Previous month">
          ‹
        </button>
        <span className="calendar-month">{formatMonth(viewDate)}</span>
        <button type="button" className="chip" onClick={onNextMonth} aria-label="Next month">
          ›
        </button>
        <button type="button" className="chip" onClick={onToday}>
          Today
        </button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {weeks.flat().map((day) => {
          const key = toISODate(day)
          const dayTasks = byDay.get(key) ?? []
          const open = dayTasks.filter((task) => !task.completed)
          const overdue = dayTasks.filter(isOverdue).length

          const classes = ['calendar-day']
          if (day.getMonth() !== currentMonth) classes.push('outside')
          if (key === today) classes.push('is-today')
          if (key === selectedDay) classes.push('is-selected')
          if (overdue > 0) classes.push('has-overdue')

          return (
            <button
              type="button"
              key={key}
              className={classes.join(' ')}
              onClick={() => onSelectDay(key)}
              aria-label={`${formatFullDate(day)}: ${open.length} open task(s)`}
            >
              <span className="day-number">{day.getDate()}</span>
              {dayTasks.slice(0, 2).map((task) => (
                <span
                  key={task.id}
                  className={task.completed ? 'day-task done' : 'day-task'}
                >
                  {task.due_time ? `${toInputTime(task.due_time)} ` : ''}
                  {task.title}
                </span>
              ))}
              {dayTasks.length > 2 && (
                <span className="day-task more">+{dayTasks.length - 2} more</span>
              )}
            </button>
          )
        })}
      </div>

      <DayPanel
        day={selectedDay}
        tasks={selectedTasks}
        onToggle={onToggle}
        onDelete={onDelete}
        onAddForDay={onAddForDay}
      />

      {undated.length > 0 && (
        <p className="calendar-note">
          {openUndated} task{openUndated === 1 ? '' : 's'} without a deadline
          {openUndated === 0 ? ' (all done!)' : ''} - find them in the List view.
        </p>
      )}
    </section>
  )
}

// The panel under the grid: the tasks of the selected day, plus a quick way to
// add one more task for that day.
function DayPanel({ day, tasks, onToggle, onDelete, onAddForDay }) {
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    const added = await onAddForDay({
      title: trimmed,
      due_date: day,
      due_time: time || null,
    })
    if (added) {
      setTitle('')
      setTime('')
    }
  }

  return (
    <div className="day-panel">
      <h3 className="day-panel-title">
        {formatFullDate(parseISODate(day))}
        <span className="day-panel-count">
          {tasks.filter((task) => !task.completed).length} open
        </span>
      </h3>

      {tasks.length === 0 ? (
        <p className="empty small">Nothing due on this day.</p>
      ) : (
        <ul className="mini-list">
          {tasks.map((task) => (
            <li key={task.id} className={task.completed ? 'mini-task done' : 'mini-task'}>
              <input
                className="checkbox"
                type="checkbox"
                checked={task.completed}
                onChange={() => onToggle(task)}
                aria-label={`Toggle "${task.title}"`}
              />
              <span className="mini-time">{task.due_time ? toInputTime(task.due_time) : 'all day'}</span>
              <span className="mini-title">{task.title}</span>
              {task.note && (
                <span className="note-marker" title={task.note}>
                  📝
                </span>
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
            </li>
          ))}
        </ul>
      )}

      <form className="mini-form" onSubmit={handleSubmit}>
        <input
          className="add-input"
          type="text"
          placeholder="Add a task for this day"
          aria-label="New task for the selected day"
          maxLength={255}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <input
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          aria-label="Time for the new task"
        />
        <button type="submit" className="add-button" disabled={title.trim() === ''}>
          Add
        </button>
      </form>
    </div>
  )
}
