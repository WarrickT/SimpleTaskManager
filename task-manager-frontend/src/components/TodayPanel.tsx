import type { Task } from '../types';

type Props = {
  tasks: Task[];
  onLogout: () => void;
  onEditTask: (task: Task) => void;
  onManageTeams: () => void; 
  onSelectTeam: (teamId: number) => void;      
  onSelectPersonal: () => void;  
  teams: {
    team_id: number;
    name: string;
    role: string;
    joined_at: string;
  }[];
};


export default function TodayPanel({
  tasks,
  onLogout,
  onEditTask,
  onManageTeams,
  onSelectTeam,
  onSelectPersonal,
  teams,
}: Props) {


  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
  });

  const todayTasks = tasks.filter(
    (task) => task.due_date === today
  );

return (
  <aside className="w-72 bg-surface text-lightText p-6 flex flex-col justify-between border-r border-soft shadow-inner">
    <div className="flex-1 overflow-y-auto">
      <div className="mb-6">
        <button
          onClick={onSelectPersonal}
          className="w-full mb-4 bg-zinc-700 text-white py-2 rounded font-semibold hover:bg-zinc-600 transition"
        >
          Personal Tasks
        </button>
        <h2 className="text-xl font-bold mb-2">Your Teams</h2>
        {teams.length === 0 ? (
          <p className="text-mutedText text-sm">You haven't joined any teams yet.</p>
        ) : (
          <ul className="space-y-2">
            {teams.map((team) => (
              <li
                  key={team.team_id}
                  onClick={() => onSelectTeam(team.team_id)}
                  className="bg-background px-3 py-2 rounded border border-soft text-sm cursor-pointer hover:bg-primary/10 transition"
                >
                <div className="font-semibold">{team.name}</div>
                <div className="text-mutedText text-xs capitalize">{team.role}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Your Tasks Today</h2>
        {todayTasks.length === 0 ? (
          <p className="text-mutedText text-sm">No tasks due today</p>
        ) : (
          <ul className="space-y-2">
            {todayTasks.map((task) => (
              <li
                key={task.id}
                onClick={() => onEditTask(task)}
                className="text-sm bg-background px-3 py-2 rounded border border-soft cursor-pointer hover:bg-primary/20 transition"
              >
                {task.task_name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>

    <div className="mt-6">
      <button
        onClick={onManageTeams}
        className="w-full bg-primary hover:bg-cyan-600 text-white py-2 rounded font-semibold transition"
      >
        Manage Teams
      </button>
    </div>

    <button
      onClick={onLogout}
      className="bg-danger hover:bg-red-600 text-white py-2 mt-6 rounded font-semibold transition"
    >
      Log Out
    </button>
  </aside>
);

}
