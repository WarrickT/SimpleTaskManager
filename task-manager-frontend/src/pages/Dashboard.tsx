import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const Dashboard = () => {
  const [params] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
    }
  }, [params]);

  const fetchTasks = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:5000/api/tasks', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setTasks(data.tasks);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAddTask = async () => {
    const token = localStorage.getItem('token');
    if (!newTask.trim()) return;

    await fetch('http://localhost:5000/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title: newTask })
    });

    setNewTask('');
    fetchTasks(); // Refresh list
  };

  return (
    <div>
      <h2>Welcome to the Dashboard</h2>

      <input
        type="text"
        placeholder="New Task"
        value={newTask}
        onChange={(e) => setNewTask(e.target.value)}
      />
      <button onClick={handleAddTask}>Add Task</button>

      <ul>
        {tasks.map((task: any) => (
          <li key={task.id}>
            {task.title} - {task.completed ? '✅' : '❌'}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;
