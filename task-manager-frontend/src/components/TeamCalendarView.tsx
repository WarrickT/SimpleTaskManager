import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL, { withCredentials: true });

type TeamTask = {
  task_name: string;
  due_date: string;
  status: 'incomplete' | 'in_progress' | 'complete' | 'overdue' | 'on_hold';
};

type Props = {
  teamId: number;
};

const statusColors: Record<TeamTask['status'], string> = {
  incomplete: 'bg-gray-400',
  in_progress: 'bg-yellow-400',
  complete: 'bg-green-500',
  overdue: 'bg-red-500',
  on_hold: 'bg-blue-400',
};

const TeamCalendarView: React.FC<Props> = ({ teamId }) => {
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchTasks = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/teams/${teamId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTasks(data.tasks || []);
  };

  useEffect(() => {
    fetchTasks();
    socket.emit('join_team', teamId);
    socket.on('new_activity', fetchTasks);

    return () => {
      socket.off('new_activity', fetchTasks);
    };
  }, [teamId]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const daysArray = Array.from({ length: firstDayOfMonth + daysInMonth }, (_, i) =>
    i >= firstDayOfMonth ? i - firstDayOfMonth + 1 : null
  );

  const taskMap: Record<string, TeamTask[]> = {};
  tasks.forEach((task) => {
    if (!task.due_date) return;
    const day = new Date(task.due_date).toISOString().split('T')[0];
    if (!taskMap[day]) taskMap[day] = [];
    taskMap[day].push(task);
  });

  const formatDateKey = (day: number) => {
    const y = currentDate.getFullYear();
    const m = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + offset);
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  return (
    <div className="bg-[#1e1e2e] rounded-lg p-4">
      <div className="flex justify-between items-center mb-4 text-white">
        <button onClick={() => changeMonth(-1)} className="px-2 py-1 bg-gray-600 rounded hover:bg-gray-500">
          ‹ Prev
        </button>
        <h2 className="text-xl font-semibold">
          {currentDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={() => changeMonth(1)} className="px-2 py-1 bg-gray-600 rounded hover:bg-gray-500">
          Next ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-400 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 text-center">
        {daysArray.map((day, idx) => {
          if (day === null) return <div key={idx} />;
          const dateKey = formatDateKey(day);
          const dayTasks = taskMap[dateKey] || [];

          return (
            <div
              key={idx}
              onClick={() => setSelectedDate(dateKey)}
              title={dayTasks.map((t) => t.task_name).join(', ') || ''}
              className="cursor-pointer bg-[#2c2c3d] text-white rounded p-1 min-h-[60px] relative border border-gray-600 hover:border-white"
            >
              <div className="text-sm font-semibold">{day}</div>
              <div className="flex flex-wrap mt-1 justify-center gap-0.5">
                {dayTasks.map((task, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full ${statusColors[task.status]}`}
                    title={`${task.task_name} (${task.status})`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1e1e2e] p-6 rounded-lg max-w-md w-full text-white">
            <h3 className="text-lg font-semibold mb-2">
              Tasks for {new Date(selectedDate).toLocaleDateString()}
            </h3>
            {taskMap[selectedDate]?.length ? (
              <ul className="space-y-2">
                {taskMap[selectedDate].map((task, i) => (
                  <li key={i} className="border-b border-gray-600 pb-1">
                    <strong>{task.task_name}</strong> – <span className={statusColors[task.status].replace('bg-', 'text-')}>{task.status.replace('_', ' ')}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No tasks on this day.</p>
            )}
            <button onClick={() => setSelectedDate(null)} className="mt-4 px-4 py-1 bg-gray-700 rounded hover:bg-gray-600">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamCalendarView;
