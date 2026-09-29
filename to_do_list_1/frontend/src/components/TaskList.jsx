import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import TaskItem from './TaskItem'

// DndContext is the part of dnd-kit that tracks dragging; SortableContext keeps
// the rows in a simple vertical list.
export default function TaskList({
  tasks,
  onToggle,
  onDelete,
  onRename,
  onSaveDue,
  onSaveNote,
  onReorder,
}) {
  const sensors = useSensors(
    // Mouse / touch: start dragging only after moving 5 pixels, so a plain
    // click still counts as a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Keyboard: Space to pick up, arrow keys to move, Space to drop.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tasks.findIndex((task) => task.id === active.id)
    const newIndex = tasks.findIndex((task) => task.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    onReorder(arrayMove(tasks, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
              onRename={onRename}
              onSaveDue={onSaveDue}
              onSaveNote={onSaveNote}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
