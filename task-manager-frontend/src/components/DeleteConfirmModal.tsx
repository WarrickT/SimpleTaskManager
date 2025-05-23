
type Props = {
  taskName: string;
  onCancel: () => void;
  onDelete: () => void;
};

const DeleteConfirmModal = ({ taskName, onCancel, onDelete }: Props) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-surface text-lightText p-6 rounded shadow-lg w-full max-w-sm">
        <h3 className="text-lg font-semibold mb-4 text-red-600">Delete Task</h3>
        <p className="mb-4">Are you sure you want to delete <strong>{taskName}</strong>?</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={onDelete} className="bg-danger text-white px-4 py-2 rounded hover:bg-red-600">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
