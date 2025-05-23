import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import TeamActivityFeed from '../components/TeamActivityFeed';
import TeamCalendarView from '../components/TeamCalendarView';
import TeamChatBox from '../components/TeamChatBox';
import TeamTaskBoard from '../components/TeamTaskBoard';
import TeamTaskModal from '../components/TeamTaskModal';

const socket = io(import.meta.env.VITE_API_URL, { withCredentials: true });

// At top of TeamTaskBoard.tsx
import EditTeamTaskModal from '../components/EditTeamTaskModal';
import type { TeamTask } from '../components/TeamTaskBoard'; // or wherever your real type lives


type TeamInfo = {
  name: string;
  role: string;
  created_at: string;
};

const TeamDashboard = () => {
  const { teamId } = useParams();
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
const [teamMembers, setTeamMembers] = useState<{ email: string; name: string }[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [editModalTask, setEditModalTask] = useState<TeamTask | null>(null);
const [editTaskName, setEditTaskName] = useState('');
const [editDueDate, setEditDueDate] = useState('');
const [editDescription, setEditDescription] = useState('');
const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const isAdmin = teamInfo?.role === 'admin';



const fetchTeamTasks = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No auth token found in localStorage.');
    return;
  }

  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/teams/${teamId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error('Failed to fetch team tasks:', await res.text()); // More helpful
      setTeamTasks([]);
      return;
    }

    const data = await res.json();
    setTeamTasks(data.tasks || []);
  } catch (err) {
    console.error('Error fetching team tasks:', err);
    setTeamTasks([]);
  }
};

const handleEditTask = async () => {
  const token = localStorage.getItem('token');
  if (!token || !editModalTask) return;

  await fetch(`${import.meta.env.VITE_API_URL}/api/teams/${teamId}/tasks/edit`, {
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
  fetchTeamTasks();
};

const confirmDeleteTask = async () => {
  if (!taskToDelete || !teamId) return;

  const token = localStorage.getItem('token');
  if (!token) return;

  await fetch(`${import.meta.env.VITE_API_URL}/api/teams/${teamId}/tasks/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ task_name: taskToDelete }),
  });

  setTaskToDelete(null);
  fetchTeamTasks(); // Refresh
};


const handleToggleAssigneeComplete = async (
  taskId: number,
  teamId: number,
  assigneeEmail: string,
  completed: boolean
) => {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/teams/${teamId}/tasks/assignee-status`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          task_id: taskId,
          assignee_email: assigneeEmail,
          completed,
        }),
      }
    );

    if (res.ok) {
      // ✅ Update local state
      setTeamTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                assigned_to: task.assigned_to.map((a) =>
                  a.email === assigneeEmail ? { ...a, completed } : a
                ),
              }
            : task
        )
      );
    } else {
      console.error('Failed to update assignee completion status');
    }
  } catch (err) {
    console.error('Error updating assignee completion:', err);
  }
};



  const fetchTeamInfo = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTeamInfo(data.team);
  };

  const fetchTeamMembers = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/teams/${teamId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    // Transform the data so it has email + name (name can be same as email for now)
    const formatted = data.members.map((m: any) => ({
      email: m.name, // m.name is the email in your current backend
      name: m.name,  // you could split or prettify later if needed
    }));

    setTeamMembers(formatted);
  };

  const handleStatusChange = async (taskName: string, newStatus: TeamTask['status']) => {
  const token = localStorage.getItem('token');
  if (!token) return;

  // Optional: prevent manual overdue
  if (newStatus === 'overdue') {
    alert('Cannot manually set status to Overdue.');
    return;
  }

  await fetch(`${import.meta.env.VITE_API_URL}/api/teams/${teamId}/tasks/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ task_name: taskName, status: newStatus }),
  });

  fetchTeamTasks(); // Refresh task list
};



  useEffect(() => {
    if (teamId) {
      fetchTeamInfo();
      fetchTeamTasks();
      fetchTeamMembers();
    }
  }, [teamId]);

  useEffect(() => {
  if (!teamId) return;

  socket.emit('join_team', teamId);

  const handleAssigneeUpdate = ({ task_id, assignee_email, completed }: any) => {
    setTeamTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === task_id
          ? {
              ...task,
              assigned_to: task.assigned_to.map((a) =>
                a.email === assignee_email ? { ...a, completed } : a
              ),
            }
          : task
      )
    );
  };

  socket.on('assignee_status_updated', handleAssigneeUpdate);

  return () => {
    socket.off('assignee_status_updated', handleAssigneeUpdate);
  };
}, [teamId]);

  type JWTPayload = { email: string };

  let userEmail = 'you@example.com'; // fallback
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const decoded = jwtDecode<JWTPayload>(token);
      userEmail = decoded.email;
    } catch (err) {
      console.error('Failed to decode token:', err);
    }
  }
  return (
  <div className="text-white p-6 bg-[#121212] min-h-screen">
    <div className="w-full bg-[#1e1e2e] border border-gray-700 rounded-xl p-6 mb-6 flex flex-col md:flex-row justify-between gap-4">
  <div>
    <h1 className="text-4xl font-extrabold text-cyan-400 mb-1">
      {teamInfo ? teamInfo.name : 'Loading...'}
    </h1>
    <p className="text-lg text-mutedText">Team Dashboard</p>
  </div>

  <div className="text-right bg-[#2c2c3d] p-4 rounded-lg shadow border border-gray-600 self-start">
    <p className="text-lg font-bold text-white mb-1">
      Role: <span className="text-cyan-300 capitalize">{teamInfo?.role}</span>
    </p>
    <p className="text-sm text-gray-300">
      Created on:{' '}
      <span>
        {teamInfo?.created_at
          ? new Date(teamInfo.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : '—'}
      </span>
    </p>
</div>

</div>



      {showModal && editModalTask === null && (
  <TeamTaskModal
    teamId={parseInt(teamId!)}
    members={teamMembers}
    onClose={() => {
      setShowModal(false);
    }}
    onSuccess={() => {
      setShowModal(false);
      fetchTeamTasks();
    }}
  />
)}

{showModal && editModalTask !== null && (
  <EditTeamTaskModal
    taskName={editTaskName}
    setTaskName={setEditTaskName}
    dueDate={editDueDate}
    setDueDate={setEditDueDate}
    description={editDescription}
    setDescription={setEditDescription}
    onCancel={() => {
      setEditModalTask(null);
      setShowModal(false);
    }}
    onSave={async () => {
      await handleEditTask();
      setShowModal(false);
    }}
  />
)}
{teamId && (
  <section className="mb-10">
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div>
      <h2 className="text-xl font-semibold mb-2">Team Chat</h2>
      <TeamChatBox teamId={parseInt(teamId)} userEmail={userEmail} />
    </div>
    <div>
      <h2 className="text-xl font-semibold mb-2">Calendar</h2>
      <TeamCalendarView teamId={parseInt(teamId)} />
    </div>
  </div>
</section>

)}
{taskToDelete && (
  <DeleteConfirmModal
    taskName={taskToDelete}
    onCancel={() => setTaskToDelete(null)}
    onDelete={confirmDeleteTask}
  />
)}



  <section className="mb-10">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-xl font-semibold">Team Tasks</h2>
    {isAdmin && (
      <button
        onClick={() => setShowModal(true)}
        className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-500 text-sm shadow"
      >
        + Add Task
      </button>
    )}
  </div>    
<TeamTaskBoard
      tasks={teamTasks}
      onStatusChange={handleStatusChange}
      onEditTask={(task) => {
        setEditModalTask(task);
        setEditTaskName(task.task_name);
        setEditDueDate(task.due_date || '');
        setEditDescription(task.description || '');
        setShowModal(true);
      }}
      onDeleteTask={(taskName) => setTaskToDelete(taskName)}
      isAdmin={isAdmin}
      userEmail={userEmail}
        onToggleComplete={handleToggleAssigneeComplete}

    />

    <section className="mt-10 mb-10">
  <h2 className="text-xl font-semibold mb-2">Activity Feed</h2>
  <TeamActivityFeed teamId={parseInt(teamId!)} userEmail={userEmail} />
</section>


   

  </section>

     
    </div>
  );
};

export default TeamDashboard;
