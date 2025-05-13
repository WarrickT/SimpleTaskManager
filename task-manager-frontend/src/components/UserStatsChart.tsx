import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function UserStatsChart({ data }: { data: any }) {
  const chartData = [
    { name: 'Incomplete', value: data.incomplete },
    { name: 'In Progress', value: data.in_progress },
    { name: 'Complete', value: data.complete },
    { name: 'Overdue', value: data.overdue },
    { name: 'On Hold', value: data.on_hold },
  ];

  return (
    <div className="w-full max-w-[600px] h-[300px] bg-surface rounded p-4 shadow overflow-hidden">
      <h2 className="text-lg font-semibold mb-2">Your Task Statistics</h2>
      <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#fff' }}
            angle={-20}
            textAnchor="end"
            interval={0}
            height={70}
        />
        <YAxis stroke="#ccc" />
        <Tooltip />
        <Bar dataKey="value">
            {chartData.map((entry, index) => {
            const colors: Record<string, string> = {
                'Incomplete': '#facc15',
                'In Progress': '#fb923c',
                'Complete': '#34d399',
                'Overdue': '#f87171',
                'On Hold': '#a1a1aa',
            };
            return (
                <Cell key={`cell-${index}`} fill={colors[entry.name]} />
            );
            })}
        </Bar>
        </BarChart>

      </ResponsiveContainer>
    </div>
  );
}
