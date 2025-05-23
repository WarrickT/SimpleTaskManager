
type Props = {
  taskName: string;
  setTaskName: (val: string) => void;
  dueDate: string;
  setDueDate: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

const EditTeamTaskModal = ({
  taskName,
  setTaskName,
  dueDate,
  setDueDate,
  description,
  setDescription,
  onSave,
  onCancel,
}: Props) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-surface text-lightText p-6 rounded shadow-lg w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Edit Task</h3>

        <input
          type="text"
          className="w-full mb-2 p-2 border border-soft bg-background text-lightText rounded"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
        />

        <input
          type="date"
          className="w-full mb-2 p-2 border border-soft bg-background text-lightText rounded"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <textarea
          placeholder="Task description"
          className="w-full mb-2 p-2 border border-soft bg-background text-lightText rounded"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={onSave} className="bg-primary text-white px-4 py-2 rounded hover:bg-cyan-600">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default EditTeamTaskModal;
