import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// Task type
type Task = {
  id: number;
  task_name: string;
  status: 'incomplete' | 'in_progress' | 'complete' | 'overdue' | 'on_hold';
  due_date?: string;
  date_created?: string;
  date_completed?: string | null;
  description?: string;

};

const Dashboard = () => {
  const [params] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editModalTask, setEditModalTask] = useState<Task | null>(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [newTaskDesc, setNewTaskDesc] = useState('');



  const statuses: Task['status'][] = ['incomplete', 'in_progress', 'complete', 'overdue', 'on_hold'];
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
    }
  }, [params]);

  const fetchTasks = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTasks(data.tasks);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAddTask = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
  
    const today = new Date().toISOString().split('T')[0];
  
    if (!newTask.trim() || !newTaskDueDate.trim()) {
      alert('Please enter both a task name and a due date.');
      return;
    }
  
    if (newTaskDueDate < today) {
      alert('Due date must be today or a future date.');
      return;
    }
  
    await fetch(`${import.meta.env.VITE_API_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        task_name: newTask,
        due_date: newTaskDueDate,
        description: newTaskDesc,
      }),
          });
  
    setNewTask('');
    setNewTaskDueDate('');
    setNewTaskDesc('');
    setShowModal(false);
    fetchTasks();
  };
  
  const handleEditTask = async () => {
    const token = localStorage.getItem('token');
    if (!token || !editModalTask) return;

    await fetch(`${import.meta.env.VITE_API_URL}/api/tasks/edit`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        original_name: editModalTask.task_name,
        new_name: editTaskName,
        due_date: editDueDate || null,
      }),
    });

    setEditModalTask(null);
    fetchTasks();
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
  
    const token = localStorage.getItem('token');
    if (!token) return;
  
    await fetch(`${import.meta.env.VITE_API_URL}/api/tasks/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ task_name: taskToDelete }),
    });
  
    setTaskToDelete(null);
    fetchTasks();
  };
  
  
  

  const handleDragStart = (event: DragStartEvent) => {
    const draggedId = event.active.id;
    const found = tasks.find((task) => task.task_name === draggedId);
    if (found) setActiveTask(found);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || !active || active.id === over.id) return;

    const taskId = active.id.toString();
    const newStatus = over.id.toString() as Task['status'];
    if (!statuses.includes(newStatus)) return;

    const token = localStorage.getItem('token');
    await fetch(`${import.meta.env.VITE_API_URL}/api/tasks/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ task_name: taskId, status: newStatus }),
    });

    setTasks((prev) =>
      prev.map((task) =>
        task.task_name === taskId ? { ...task, status: newStatus } : task
      )
    );
    setTimeout(() => fetchTasks(), 300); // still syncs with backend
      };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">

        {/* Add Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add New Task</h3>
              <input
                type="text"
                placeholder="Task name"
                className="w-full mb-2 p-2 border rounded"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
              />
              <h3 className="text-lg font-semibold mb-4">Set Due Date</h3>
              <p className="text-sm text-gray-500 mb-1">
              Today is <strong>{new Date().toLocaleDateString()}</strong>
              </p>

              <input
                type="date"
                className="w-full mb-4 p-1 border rounded"
                value={newTaskDueDate}
                min={new Date().toLocaleDateString('en-CA')}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
              />
              <textarea
              placeholder="Task description (optional)"
              className="w-full mb-4 p-2 border rounded"
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
            />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button onClick={handleAddTask} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Add Task</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editModalTask && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Edit Task</h3>
              <input
                type="text"
                className="w-full mb-2 p-2 border rounded"
                value={editTaskName}
                onChange={(e) => setEditTaskName(e.target.value)}
              />
              <input
                type="date"
                className="w-full mb-4 p-2 border rounded"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditModalTask(null)} className="px-4 py-2 border rounded">Cancel</button>
                <button onClick={handleEditTask} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Save Changes</button>
              </div>
            </div>
          </div>
        )}

      {taskToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Delete Task</h3>
            <p className="mb-4">Are you sure you want to delete <strong>{taskToDelete}</strong>?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTask}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}


        <h2 className="text-2xl font-semibold mb-4">Welcome to your task manager!</h2>

        {/* Task Input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="New Task"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="border p-2 rounded mr-2"
          />
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Task
          </button>
        </div>

        {/* DnD Board */}
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
                setEditModalTask={setEditModalTask}
                setEditTaskName={setEditTaskName}
                setEditDueDate={setEditDueDate}
                menuOpenId={menuOpenId}
                setMenuOpenId={setMenuOpenId}
                setTaskToDelete={setTaskToDelete}
              />
            ))}
          </div>

          <DragOverlay>
          {activeTask && (
            <div
              className={`p-2 ${cardStyles[activeTask.status]} rounded shadow mt-2 w-[250px] transition-all duration-200 ease-in-out`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{activeTask.task_name}</p>
                  {activeTask.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-3">
                      {activeTask.description}
                    </p>
                  )}
                  {activeTask.due_date && (
                    <p className="text-xs text-gray-400 mt-1">
                      Due: {new Date(activeTask.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DragOverlay>

        </DndContext>
      </main>
    </div>
  );
};

export default Dashboard;

// 💬 Droppable Column Component
const DroppableColumn = ({
  id,
  tasks,
  setEditModalTask,
  setEditTaskName,
  setEditDueDate,
  menuOpenId,
  setMenuOpenId,
  setTaskToDelete,
}: {
  id: string;
  tasks: Task[];
  setEditModalTask: (task: Task) => void;
  setEditTaskName: (s: string) => void;
  setEditDueDate: (s: string) => void;
  menuOpenId: string | null;
  setMenuOpenId: (id: string | null) => void;
  setTaskToDelete: (taskName: string) => void;
}) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef}   className={`${statusStyles[id]} rounded-2xl p-4 min-h-[200px] shadow-sm space-y-4`}>
      <h3 className="font-semibold capitalize mb-2">{id.replace('_', ' ')}</h3>
      {[...tasks]
        .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
        .map((task) => (
        <DraggableCard
          key={task.task_name}
          description={task.description}
          due_date={task.due_date}
          id={task.task_name}
          name={task.task_name}
          status={task.status}
          onEdit={() => {
            setEditModalTask(task);
            setEditTaskName(task.task_name);
            setEditDueDate(task.due_date || '');
          }}
          onDelete={() => setTaskToDelete(task.task_name)}
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
  status: 'incomplete' | 'in_progress' | 'complete' | 'overdue' | 'on_hold';
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
      className={`relative ${cardStyles[status]} rounded shadow transition-all duration-200 ease-in-out`}
      >

      <div {...attributes} {...listeners} className="p-2 cursor-grab select-none">
        <div className="flex justify-between items-center">
        <div>
        <p className="font-medium">{name}</p>
        {description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-3">
            {description}
          </p>
        )}
        {due_date && (
          <p className="text-xs text-gray-400 mt-1">Due: {new Date(due_date).toLocaleDateString()}</p>
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
        className="absolute top-2 right-2 text-gray-500 hover:text-black"
      >
        ⋮
      </button>

      {showMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-10 bg-white border rounded shadow z-50"
        >
          <button onClick={onEdit} className="block w-full text-left px-4 py-2 hover:bg-gray-100">
            Edit
          </button>
          <button onClick={onDelete} className="block w-full text-left px-4 py-2 hover:bg-red-100 text-red-500">
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

const statusStyles: Record<string, string> = {
  incomplete: 'bg-orange-50',
  in_progress: 'bg-yellow-50',
  complete: 'bg-green-50',
  overdue: 'bg-red-50',
  on_hold: 'bg-gray-100',
};

const cardStyles: Record<string, string> = {
  incomplete: 'bg-orange-100',
  in_progress: 'bg-yellow-100',
  complete: 'bg-green-100',
  overdue: 'bg-red-100',
  on_hold: 'bg-gray-200',
};
