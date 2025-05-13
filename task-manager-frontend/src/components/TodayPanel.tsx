export default function TodayPanel({
  tasks,
  onLogout,
  onEditTask,
}: {
  tasks: any[],
  onLogout: () => void,
  onEditTask: (task: any) => void
}) {
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
  });

  const todayTasks = tasks.filter(
    (task) => task.due_date === today
  );

  return (
    <aside className="w-72 bg-surface text-lightText p-6 flex flex-col justify-between border-r border-soft shadow-inner">
      <div>
        <h2 className="text-xl font-bold mb-4">Your Tasks Today</h2>

        {todayTasks.length === 0 ? (
          <p className="text-mutedText">No tasks due today</p>
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

      <button
        onClick={onLogout}
        className="bg-danger hover:bg-red-600 text-white py-2 mt-8 rounded font-semibold transition"
      >
        Log Out
      </button>
    </aside>
  );
}
