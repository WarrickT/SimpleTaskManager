import { useEffect, useState } from 'react';
import io from 'socket.io-client';

type Activity = {
  actor_email: string;
  action: string;
  target: string;
  created_at: string;
  destination?: string;
};

type Props = {
  teamId: number;
  userEmail: string;
};

const socket = io(import.meta.env.VITE_API_URL, { withCredentials: true });

const TeamActivityFeed: React.FC<Props> = ({ teamId, userEmail }) => {
  const [log, setLog] = useState<Activity[]>([]);

  const fetchActivity = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/teams/${teamId}/activity`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setLog(data.logs || []);
    } catch (err) {
      console.error('Error fetching activity log:', err);
    }
  };

  useEffect(() => {
    fetchActivity();
    socket.emit('join_team', teamId);
    socket.on('new_activity', (payload) => {
      console.log('[New Activity]', payload);
      fetchActivity();
    });
    return () => {
      socket.off('new_activity', fetchActivity);
    };
  }, [teamId]);

  const formatTimestamp = (utc: string) => {
    const date = new Date(utc);
    date.setHours(date.getHours() - 4);
    return date.toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderMessage = (entry: Activity) => {
    const actor = entry.actor_email === userEmail ? 'You' : entry.actor_email;
    switch (entry.action) {
      case 'edited_task':
        return `${actor} edited task '${entry.target}'`;
      case 'deleted_task':
        return `${actor} deleted task '${entry.target}'`;
      case 'updated_task':
      case 'updated_task_status':
        return `${actor} updated status for '${entry.target}' to '${entry.destination?.replace('_', ' ')}'`;
      default:
        return `${actor} performed '${entry.action}' on '${entry.target}'`;
    }
  };

  return (
    <div className="bg-[#1e1e2e] rounded-lg p-4 max-h-64 overflow-y-auto border">
      {log.length === 0 ? (
        <p className="text-mutedText italic">No activity recorded yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {log.map((entry, i) => (
            <li key={i} className="text-gray-200">
              • {renderMessage(entry)}{' '}
              <span className="text-xs text-gray-400">({formatTimestamp(entry.created_at)})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TeamActivityFeed;
