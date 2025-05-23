import { useState } from 'react';
import type { TeamTask } from './TeamTaskBoard';

type Props = {
  teamId: number;
  //assignedBy: string; // current user email
  onClose: () => void;
  onSuccess: () => void;
  members: { email: string; name: string }[]; // updated to use email
  initialTask?: TeamTask | null;
};

const TeamTaskModal = ({ teamId, /*assignedBy,*/ onClose, onSuccess, members, initialTask }: Props) => {
  const [taskName, setTaskName] = useState(initialTask?.task_name || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [dueDate, setDueDate] = useState(initialTask?.due_date || '');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]); // use email

  const toggleAssignee = (email: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/team-tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        task_name: taskName,
        description,
        due_date: dueDate,
        team_id: teamId,
        //assigned_by: assignedBy,
        assigned_to: selectedAssignees.length > 0 ? selectedAssignees : [],
      }),
    });

    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      alert('Failed to create task');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-surface text-lightText p-6 rounded shadow-lg w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Add Team Task</h3>

        <input
        type="text"
        placeholder="Task name"
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        className="w-full mb-2 p-2 rounded bg-[#1e1e2e] text-white placeholder-gray-400 border border-soft"
      />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full mb-2 p-2 rounded bg-[#1e1e2e] text-white placeholder-gray-400 border border-soft"
      />

      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="w-full mb-4 p-2 rounded bg-[#1e1e2e] text-white border border-soft"
      />


        <div className="mb-4">
          <h4 className="font-medium mb-1">Assign to:</h4>
          <div className="flex flex-wrap gap-2">
            {members.map((user) => (
              <label
                key={user.email}
                className="flex items-center gap-2 text-sm bg-background px-2 py-1 rounded border border-soft cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedAssignees.includes(user.email)}
                  onChange={() => toggleAssignee(user.email)}
                />
                {user.name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-cyan-600"
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamTaskModal;
