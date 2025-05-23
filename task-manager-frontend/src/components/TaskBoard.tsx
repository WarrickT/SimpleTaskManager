import { DndContext, DragOverlay, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import type { Task } from '../types';
import { cardStyles, statusStyles } from '../utils/styles';

type Props = {
  tasks: Task[];
  onStatusChange: (taskName: string, newStatus: Task['status']) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskName: string) => void;
};

const TaskBoard = ({ tasks, onStatusChange, onEditTask, onDeleteTask }: Props) => {
  const statuses: Task['status'][] = ['incomplete', 'in_progress', 'complete', 'overdue', 'on_hold'];
  const sensors = useSensors(useSensor(PointerSensor));
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleDragStart = (event: any) => {
    const draggedId = event.active.id;
    const found = tasks.find((task) => task.task_name === draggedId);
    if (found) setActiveTask(found);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || !active || active.id === over.id) return;

    const newStatus = over.id.toString() as Task['status'];
    if (!statuses.includes(newStatus)) return;
    onStatusChange(active.id.toString(), newStatus);
  };
 
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
    >
      <div className="grid grid-cols-5 gap-4">
        {statuses.map((status) => (
          <DroppableColumn
            key={status}
            id={status}
            tasks={tasks.filter((task) => task.status === status)}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            menuOpenId={menuOpenId}
            setMenuOpenId={setMenuOpenId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div
            className={`p-4 ${cardStyles[activeTask.status]} rounded shadow mt-2 w-[280px] transition-all duration-200 ease-in-out`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-2xl font-bold text-lightText">{activeTask.task_name}</p>
                {activeTask.description && (
                  <p className="text-base bg-purple-500 bg-opacity-30 text-purple-100 mt-3 p-3 rounded-md line-clamp-3 font-medium">
                    {activeTask.description}
                  </p>
                )}
                {activeTask.due_date && (
                  <p className="text-sm inline-block mt-4 bg-primary text-white px-4 py-1.5 rounded-full">
                    Due: {new Date(activeTask.due_date + 'T00:00:00').toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default TaskBoard;

// 🪣 Column Component
const DroppableColumn = ({
  id,
  tasks,
  onEditTask,
  onDeleteTask,
  menuOpenId,
  setMenuOpenId,
}: {
  id: string;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskName: string) => void;
  menuOpenId: string | null;
  setMenuOpenId: (id: string | null) => void;
}) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={`${statusStyles[id]} rounded-2xl p-4 min-h-[200px] shadow-sm space-y-4`}>
      <h3 className="font-semibold capitalize mb-2">{id.replace('_', ' ')}</h3>
      {tasks
        .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
        .map((task) => (
          <DraggableCard
            key={task.task_name}
            id={task.task_name}
            name={task.task_name}
            description={task.description}
            due_date={task.due_date}
            status={task.status}
            onEdit={() => onEditTask(task)}
            onDelete={() => onDeleteTask(task.task_name)}
            menuOpenId={menuOpenId}
            setMenuOpenId={setMenuOpenId}
          />
        ))}
    </div>
  );
};

const DraggableCard = ({
  id,
  name,
  description,
  due_date,
  status,
  onEdit,
  onDelete,
  menuOpenId,
  setMenuOpenId,
}: {
  id: string;
  name: string;
  description?: string;
  due_date?: string;
  status: Task['status'];
  onEdit: () => void;
  onDelete: () => void;
  menuOpenId: string | null;
  setMenuOpenId: (id: string | null) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1,
    transition: 'opacity 0.0s ease',
  };

  const showMenu = menuOpenId === id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${cardStyles[status]} rounded shadow transition-all duration-200 ease-in-out p-4`}
    >
      <div {...attributes} {...listeners} className="cursor-grab select-none">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-2xl font-bold text-lightText">{name}</p>
            {description && (
              <p className="text-base bg-purple-500 bg-opacity-30 text-purple-100 mt-3 p-3 rounded-md line-clamp-3 font-medium">
                {description}
              </p>
            )}
            {due_date && (
              <p className="text-sm inline-block mt-4 bg-primary text-white px-4 py-1.5 rounded-full">
                Due: {new Date(due_date + 'T00:00:00').toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}
              </p>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setMenuOpenId(showMenu ? null : id);
        }}
        className="absolute top-3 right-3 text-mutedText hover:text-white"
      >
        ⋮
      </button>

      {showMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 top-12 bg-surface border border-soft text-lightText rounded shadow z-50"
        >
          <button onClick={onEdit} className="block w-full text-left px-5 py-3 hover:bg-background">Edit</button>
          <button onClick={onDelete} className="block w-full text-left px-5 py-3 hover:bg-red-100 text-red-500">Delete</button>
        </div>
      )}
    </div>
  );
};
