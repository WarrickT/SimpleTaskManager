import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import React from 'react';
import io from 'socket.io-client';

export type TeamTask = {
  id: number;
  task_name: string;
  status: 'incomplete' | 'in_progress' | 'complete' | 'overdue' | 'on_hold';
  due_date?: string;
  description?: string;
  assigned_by: string;
  assigned_to: { email: string; name: string; completed: boolean }[];
  team_id: number;
};

const socket = io(import.meta.env.VITE_API_URL, { withCredentials: true });

const statuses: TeamTask['status'][] = [
  'incomplete',
  'in_progress',
  'complete',
  'overdue',
  'on_hold',
];

type Props = {
  tasks: TeamTask[];
  onStatusChange: (taskName: string, newStatus: TeamTask['status']) => void;
  onEditTask: (task: TeamTask) => void;
  onDeleteTask: (taskName: string) => void;
  isAdmin: boolean;
  userEmail: string;
  onToggleComplete: (
    taskId: number,
    teamId: number,
    assigneeEmail: string,
    completed: boolean
  ) => void;
};

const TeamTaskBoard: React.FC<Props> = ({
  tasks,
  onStatusChange,
  onEditTask,
  onDeleteTask,
  isAdmin,
  userEmail,
  onToggleComplete,
}) => {
  const [activeTask, setActiveTask] = React.useState<TeamTask | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const groupedTasks = statuses.reduce((acc, status) => {
    acc[status] = tasks.filter((task) => task.status === status);
    return acc;
  }, {} as Record<TeamTask['status'], TeamTask[]>);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event) => {
        const taskId = event.active.id.toString();
        const found = tasks.find((t) => t.task_name === taskId);
        setActiveTask(found || null);
      }}
      onDragEnd={(event) => {
        setActiveTask(null);
        if (!isAdmin) return;
        const { active, over } = event;
        if (!active || !over) return;
        const taskId = active.id.toString();
        const newStatus = over.id.toString() as TeamTask['status'];
        if (!statuses.includes(newStatus)) return;
        onStatusChange(taskId, newStatus);
        socket.emit('new_activity', {
          actor_email: userEmail,
          action: 'updated_task_status',
          target: taskId,
          destination: newStatus,
          timestamp: new Date().toISOString(),
        });
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statuses.map((status) => (
          <Column
            key={status}
            id={status}
            tasks={groupedTasks[status]}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            isAdmin={isAdmin}
            userEmail={userEmail}
            onToggleComplete={onToggleComplete}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <TaskCard
            task={activeTask}
            onEdit={() => {}}
            onDelete={() => {}}
            isAdmin={false}
            isOverlay
            userEmail={userEmail}
            onToggleComplete={onToggleComplete}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
};

const columnColors: Record<TeamTask['status'], string> = {
  incomplete: 'border-l-4 border-[#a85d00]',
  in_progress: 'border-l-4 border-[#5a3b1e]',
  complete: 'border-l-4 border-[#1b5e20]',
  overdue: 'border-l-4 border-[#8b0000]',
  on_hold: 'border-l-4 border-[#4b4b4b]',
};

const Column: React.FC<{
  id: TeamTask['status'];
  tasks: TeamTask[];
  onEditTask: (task: TeamTask) => void;
  onDeleteTask: (taskName: string) => void;
  isAdmin: boolean;
  userEmail: string;
  onToggleComplete: Props['onToggleComplete'];
}> = ({ id, tasks, onEditTask, onDeleteTask, isAdmin, userEmail, onToggleComplete }) => {
  const { setNodeRef } = useDroppable({ id });
  const titleMap = {
    incomplete: 'Incomplete',
    in_progress: 'In Progress',
    complete: 'Complete',
    overdue: 'Overdue',
    on_hold: 'On Hold',
  };

  return (
    <div ref={setNodeRef} className={`bg-[#1e1e2e] p-4 rounded-lg min-h-[300px] ${columnColors[id]}`}>
      <h3 className="text-white font-semibold mb-4">{titleMap[id]}</h3>
      {tasks.map((task) => (
        <TaskCard
          key={task.task_name}
          task={task}
          onEdit={() => onEditTask(task)}
          onDelete={() => onDeleteTask(task.task_name)}
          isAdmin={isAdmin}
          userEmail={userEmail}
          onToggleComplete={onToggleComplete}
        />
      ))}
    </div>
  );
};

const TaskCard: React.FC<{
  task: TeamTask;
  onEdit: () => void;
  onDelete: () => void;
  isAdmin: boolean;
  isOverlay?: boolean;
  userEmail: string;
  onToggleComplete: Props['onToggleComplete'];
}> = ({ task, onEdit, onDelete, isAdmin, isOverlay, userEmail, onToggleComplete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: task.task_name });

  const style = {
    transform: !isOverlay && transform ? CSS.Transform.toString(transform) : undefined,
    opacity: isOverlay ? 1 : isDragging ? 0 : 1,
    transition: 'opacity 0.0s ease',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-[#2c2c3d] text-white p-4 rounded-lg shadow mb-4 border-l-4 border-cyan-500 ${
        isOverlay ? 'pointer-events-none w-full max-w-[280px]' : 'cursor-pointer'
      }`}
    >
      <div className="flex justify-between items-center mb-1">
        <div {...listeners} {...attributes} className="text-lg font-bold cursor-grab select-none">
          {task.task_name}
        </div>
        {isAdmin && (
          <div className="space-x-2 text-sm">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onEdit();
              }}
              className="text-blue-400 hover:text-blue-300"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDelete();
              }}
              className="text-red-400 hover:text-red-300"
            >
              Delete
            </button>
          </div>
        )}
      </div>
      {task.description && <p className="text-sm text-purple-300 mb-2">{task.description}</p>}
      {task.due_date && <p className="text-xs text-cyan-300">Due: {task.due_date}</p>}
      <p className="text-xs text-mutedText mt-1">Assigned by: {task.assigned_by}</p>
      <div className="text-xs text-mutedText mt-1 space-y-1">
        {task.assigned_to.map((assignee) => {
          const isDisabled = assignee.email.toLowerCase() !== userEmail.toLowerCase();
          return (
            <label key={assignee.email} className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={!!assignee.completed}
                disabled={isDisabled}
                onChange={() =>
                  onToggleComplete(task.id, task.team_id, assignee.email, !assignee.completed)
                }
              />
              <span>{assignee.email === userEmail ? 'You' : assignee.name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default TeamTaskBoard;
