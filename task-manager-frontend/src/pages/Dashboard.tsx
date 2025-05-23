import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AnimatedHeader from '../components/AnimatedHeader';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import EditTaskModal from '../components/EditTaskModal';
import TaskBoard from '../components/TaskBoard';
import TeamModal from '../components/TeamModal';
import Toast from '../components/Toast';
import TodayPanel from '../components/TodayPanel';
import UserStatsChart from '../components/UserStatsChart';



import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';


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
  const [userStats, setUserStats] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [errorToast, setErrorToast] = useState(false);
  const [lastMovedStatus, setLastMovedStatus] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamPassword, setTeamPassword] = useState('');
  const [isJoining, setIsJoining] = useState(true);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [teams, setTeams] = useState([]);

  const [currentMode, setCurrentMode] = useState<'personal' | 'team'>('personal');
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleSelectTeam = (teamId: number) => {

    navigate(`/team/${teamId}`);

  };

  const handleSelectPersonal = () => {
    setCurrentMode('personal');
    setSelectedTeamId(null);
  };


  const statuses: Task['status'][] = ['incomplete', 'in_progress', 'complete', 'overdue', 'on_hold'];
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
    }
  }, [params]);

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setUserStats(data);
  };

  const fetchTasks = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const endpoint =
      currentMode === 'personal'
        ? '/api/tasks'
        : `/api/teams/${selectedTeamId}/tasks`;

    const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    setTasks(data.tasks || []);
  };


  const handleAddTask = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
  
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Toronto',
    });
      
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
        team_id: currentMode === 'team' ? selectedTeamId : null,  
      }),
    });
    console.log("Submitting due date:", newTaskDueDate);

    setNewTask('');
    setNewTaskDueDate('');
    setNewTaskDesc('');
    setShowModal(false);
    fetchTasks();
    await fetchStats();

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
        description: editDescription,
      }),
      
    });

    setEditModalTask(null);
    fetchTasks();
    await fetchStats();

  };

  const handleStatusChange = async (taskName: string, newStatus: Task['status']) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (newStatus === 'overdue') {
      setErrorToast(true);
      setTimeout(() => setErrorToast(false), 3000);
      return;
    }

    await fetch(`${import.meta.env.VITE_API_URL}/api/tasks/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ task_name: taskName, status: newStatus }),
    });

    fetchTasks();
    fetchStats();
    setLastMovedStatus(newStatus);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleTeamSubmit = async () => {
  const token = localStorage.getItem('token');
  const endpoint = isJoining ? '/api/teams/join' : '/api/teams/create';

  const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name: teamName, password: teamPassword }),
  });

  const data = await res.json();

  if (res.ok) {
    setTeamId(data.teamId);
    localStorage.setItem('teamId', data.teamId);
    setShowTeamModal(false);
  } else {
    alert(data.message || 'Something went wrong.');
  }
};

  const fetchTeams = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/teams`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTeams(data.teams || []);
  };

  useEffect(() => {
    fetchTasks();
    fetchStats();
    fetchTeams();
  }, [currentMode, selectedTeamId]);

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
    await fetchStats();

  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
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
    if (newStatus === 'overdue') {
      setErrorToast(true);
      setTimeout(() => setErrorToast(false), 3000);
      return;
    }
    

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
    setLastMovedStatus(newStatus);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setLastMovedStatus(null);
    }, 3000);

    setTimeout(() => fetchTasks(), 300);
    fetchStats();

      };

  return (
    <div className="flex h-screen bg-background text-lightText font-sans">
    <TodayPanel
    tasks={tasks}
    onLogout={handleLogout}
    teams={teams}
    onSelectTeam={handleSelectTeam}
    onSelectPersonal={handleSelectPersonal}

  onManageTeams={() => setShowTeamModal(true)} 
  onEditTask={(task) => {
    setEditModalTask(task);
    setEditTaskName(task.task_name);
    setEditDueDate(task.due_date || '');
    setEditDescription(task.description || '');
  }}
/>



      <main className="flex-1 p-8 overflow-y-auto">

        {/* Add Modal */}
        {showToast && lastMovedStatus && (
          <Toast
            type="success"
            message={`Successfully marked task as '${lastMovedStatus.replace('_', ' ')}'`}
          />
        )}

        {errorToast && (
          <Toast
            type="error"
            message="Cannot manually make task overdue"
          />
        )}


        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-surface text-lightText p-6 rounded shadow-lg w-full max-w-md">

              <h3 className="text-lg font-semibold mb-4">Add New Task</h3>
              <input
                type="text"
                placeholder="Task name"
                className="w-full mb-2 p-2 border border-soft bg-background text-lightText rounded"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
              />
              <h3 className="text-lg font-semibold mb-4">Set Due Date</h3>
              <p className="text-sm text-gray-500 mb-1">
              Today is <strong>{new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}</strong>
              </p>

              <input
                type="date"
                className="w-full mb-2 p-2 border border-soft bg-background text-lightText rounded"
                value={newTaskDueDate}
                min={new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
              />
              <textarea
              placeholder="Task description (optional)"
              className="w-full mb-2 p-2 border border-soft bg-background text-lightText rounded"
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
            />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button onClick={handleAddTask} className="bg-primary text-white px-4 py-2 rounded hover:bg-cyan-600">Add Task</button>
              </div>
            </div>
          </div>
        )}


        {/* Edit Modal */}
        {editModalTask && (
      <EditTaskModal
        taskName={editTaskName}
        setTaskName={setEditTaskName}
        dueDate={editDueDate}
        setDueDate={setEditDueDate}
        description={editDescription}
        setDescription={setEditDescription}
        onSave={handleEditTask}
        onCancel={() => setEditModalTask(null)}
      />
    )}

    {taskToDelete && (
      <DeleteConfirmModal
        taskName={taskToDelete}
        onCancel={() => setTaskToDelete(null)}
        onDelete={confirmDeleteTask}
      />
    )}


        {showTeamModal && (
        <TeamModal
          teamName={teamName}
          setTeamName={setTeamName}
          password={teamPassword}
          setPassword={setTeamPassword}
          isJoining={isJoining}
          setIsJoining={setIsJoining}
          onSubmit={handleTeamSubmit}
          onCancel={() => setShowTeamModal(false)}
        />
      )}



        <div className="flex justify-between items-start flex-wrap gap-6 mb-10">
          {/* Left: Header (always left-aligned) */}
          <div className="flex-1 flex items-center justify-start min-h-[450px]">
          <div className="max-w-xl">
            <AnimatedHeader />
          </div>
        </div>


          {/* Right: Reserve space even before chart is loaded */}
          <div className="w-[700px] min-w-[600px] h-[450px] flex items-center justify-center">
            {userStats ? (
              <UserStatsChart data={userStats} />
            ) : (
              <div className="text-mutedText italic">Loading chart...</div>
            )}
          </div>
        </div>
        {/* Task Input */}
        <div className="bg-blue-900/10 p-4 rounded-xl">

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
            className="bg-primary text-white px-4 py-2 rounded hover:bg-cyan-600"
          >
            Add Task
          </button>
        </div>

        {/* DnD Board */}
        <TaskBoard
          tasks={tasks}
          onStatusChange={handleStatusChange}
          onEditTask={(task) => {
            setEditModalTask(task);
            setEditTaskName(task.task_name);
            setEditDueDate(task.due_date || '');
            setEditDescription(task.description || '');
          }}
          onDeleteTask={(taskName) => setTaskToDelete(taskName)}
        />

        </div>

      </main>
    </div>
  );
};

export default Dashboard;
