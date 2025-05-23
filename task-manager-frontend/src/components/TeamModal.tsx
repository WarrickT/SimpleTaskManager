
type Props = {
  teamName: string;
  setTeamName: (name: string) => void;
  password: string;
  setPassword: (pw: string) => void;
  isJoining: boolean;
  setIsJoining: (val: boolean) => void;
  onSubmit: () => void;
onCancel: () => void;
};

const TeamModal = ({
  teamName,
  setTeamName,
  password,
  setPassword,
  isJoining,
  setIsJoining,
  onSubmit,
  onCancel,
}: Props) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-surface text-lightText p-6 rounded shadow-lg w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {isJoining ? 'Join a Team' : 'Create a Team'}
        </h3>

        <input
          type="text"
          placeholder="Team name"
          className="w-full mb-3 p-2 border border-soft bg-background text-lightText rounded"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-2 border border-soft bg-background text-lightText rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex justify-between">
          <button onClick={() => setIsJoining(!isJoining)} className="text-sm underline">
            {isJoining ? 'Switch to Create' : 'Switch to Join'}
          </button>
          <button
            onClick={onCancel}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
            Cancel
        </button>
          <button
            onClick={onSubmit}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-cyan-600"
          >
            {isJoining ? 'Join Team' : 'Create Team'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamModal;
