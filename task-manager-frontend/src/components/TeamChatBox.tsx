import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL, { withCredentials: true });

type Message = {
  sender_email: string;
  message: string;
  sent_at: string;
  fromHistory?: boolean;
};

type Props = {
  teamId: number;
  userEmail: string;
};

const getDateLabel = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const TeamChatBox: React.FC<Props> = ({ teamId, userEmail }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    socket.emit('join_team', teamId);

    const fetchHistory = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/teams/${teamId}/chat`);
        const data = await res.json();
        const adjusted = (data.messages || []).map((msg: Message) => ({
          ...msg,
          sent_at: new Date(new Date(msg.sent_at).getTime() - 4 * 60 * 60 * 1000).toISOString(),
          fromHistory: true,
        }));
        setMessages(adjusted);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };

    fetchHistory();

    socket.on('new_message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('new_message');
    };
  }, [teamId]);

  const handleSend = () => {
    if (newMessage.trim()) {
      socket.emit('send_message', {
        teamId,
        email: userEmail,
        message: newMessage,
      });
      setNewMessage('');
    }
  };

  let lastDateLabel = '';

  return (
    <div className="bg-[#1e1e2e] rounded-lg p-4">
      <div className="h-64 overflow-y-auto mb-3 border p-2 rounded text-white text-sm">
        {messages.map((msg, i) => {
          const label = getDateLabel(msg.sent_at);
          const timeStr = new Date(msg.sent_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          const showLabel = label !== lastDateLabel;
          lastDateLabel = label;

          return (
            <div key={i}>
              {showLabel && (
                <div className="text-center text-xs text-gray-400 my-2 border-b border-gray-600 pb-1">
                  {label}
                </div>
              )}
              <div className="mb-1">
                <span className="font-semibold text-cyan-300">
                  {msg.sender_email === userEmail ? 'You' : msg.sender_email}
                </span>
                : {msg.message}
                <span className="ml-2 text-xs text-gray-400">({timeStr})</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 px-2 py-1 bg-[#2c2c3d] text-white border border-gray-600 rounded"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          className="px-4 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-500"
          onClick={handleSend}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default TeamChatBox;
