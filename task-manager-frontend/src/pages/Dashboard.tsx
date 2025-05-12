import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';


type Task = {
  id: number;
  title: string;
  completed: boolean;
};


const Dashboard = () => {
  const [params] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
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
  
  const handleCompleteTask = async(title: string, completed: boolean) => {
    const token = localStorage.getItem('token');
    const newCompleted = !completed;
    console.log(newCompleted);

    try{
      const res = await fetch('http://localhost:5000/api/tasks/update', {
      method: 'PUT', 
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title, 
        completed: newCompleted
      })
    });

      if (res.ok){
        setTasks((prev) =>
          prev.map((task) =>
            task.title === title ? {...task, completed: newCompleted} :task
          )
        );
        
      }
      


    }
    catch(err){
      console.log("We have an error", err);
    }
    

    

  }

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
            <input
              type = "checkbox"
              checked = {task.completed ?? false}
              onChange = {() => handleCompleteTask(task.title, task.completed)}
            />
            {task.title}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;
