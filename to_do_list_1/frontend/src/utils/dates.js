// Everything about deadlines lives in this file.
//
// We deliberately use only the browser's own clock plus the plain strings the
// API speaks ("2026-10-03" for a date, "14:30" for a time). Nothing is
// converted between timezones, so the time you type is the time you see.

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Midnight at the start of the given day (local time). */
export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Date object -> 'YYYY-MM-DD', the format <input type="date"> uses. */
export function toISODate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** 'YYYY-MM-DD' -> Date object at local midnight. */
export function parseISODate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function todayISO() {
  return toISODate(new Date())
}

export function tomorrowISO() {
  return toISODate(addDays(new Date(), 1))
}

export function addDays(date, amount) {
  const copy = startOfDay(date)
  copy.setDate(copy.getDate() + amount)
  return copy
}

export function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

/** 'HH:MM:SS' (what the API sends) -> 'HH:MM' (what a time input wants). */
export function toInputTime(value) {
  return value ? value.slice(0, 5) : ''
}

export function formatMonth(date) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date)
}

export function formatFullDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

/** 6 weeks x 7 days starting on a Monday, so the grid keeps a steady shape. */
export function monthMatrix(viewDate) {
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7 // 0 = Monday
  const start = addDays(firstOfMonth, -mondayOffset)

  const weeks = []
  for (let week = 0; week < 6; week += 1) {
    const days = []
    for (let day = 0; day < 7; day += 1) days.push(addDays(start, week * 7 + day))
    weeks.push(days)
  }
  // Drop a last row that lies completely outside the month being shown.
  if (weeks[5].every((day) => day.getMonth() !== viewDate.getMonth())) weeks.pop()
  return weeks
}

/** 'overdue' | 'today' | 'soon' | 'later' | 'done' | 'none' */
export function deadlineState(task) {
  if (task.completed) return 'done'
  if (!task.due_date) return 'none'

  const dayDiff = Math.round((parseISODate(task.due_date) - startOfDay(new Date())) / 86400000)
  if (dayDiff < 0) return 'overdue'
  if (dayDiff > 0) return dayDiff <= 2 ? 'soon' : 'later'

  // Due today: only overdue once the chosen time has actually passed.
  if (task.due_time) {
    const [hours, minutes] = task.due_time.split(':').map(Number)
    const now = new Date()
    if (now.getHours() * 60 + now.getMinutes() > hours * 60 + minutes) return 'overdue'
  }
  return 'today'
}

export function isOverdue(task) {
  return deadlineState(task) === 'overdue'
}

/** A short, human label such as "Today, 14:30" or "Fri, 3 Oct". */
export function formatDeadline(task) {
  if (!task.due_date) return ''

  const dayDiff = Math.round((parseISODate(task.due_date) - startOfDay(new Date())) / 86400000)
  let label
  if (dayDiff === 0) label = 'Today'
  else if (dayDiff === 1) label = 'Tomorrow'
  else if (dayDiff === -1) label = 'Yesterday'
  else {
    label = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(parseISODate(task.due_date))
  }

  return task.due_time ? `${label}, ${toInputTime(task.due_time)}` : label
}

/** Tasks grouped by their ISO day - used by the calendar view. */
export function groupByDay(tasks) {
  const byDay = new Map()
  for (const task of tasks) {
    if (!task.due_date) continue
    if (!byDay.has(task.due_date)) byDay.set(task.due_date, [])
    byDay.get(task.due_date).push(task)
  }
  for (const list of byDay.values()) {
    // All-day tasks ("99") come after tasks with a time, earliest time first.
    list.sort((a, b) => (a.due_time ?? '99').localeCompare(b.due_time ?? '99'))
  }
  return byDay
}

/** Sorting rule behind the "Sort by deadline" button. */
export function byDeadline(a, b) {
  if (!a.due_date && !b.due_date) return a.position - b.position
  if (!a.due_date) return 1 // tasks without a deadline go last
  if (!b.due_date) return -1
  if (a.due_date !== b.due_date) return a.due_date < b.due_date ? -1 : 1
  return (a.due_time ?? '99').localeCompare(b.due_time ?? '99')
}
