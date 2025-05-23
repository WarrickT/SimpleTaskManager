export type Task = {
  id: number;
  task_name: string;
  status: 'incomplete' | 'in_progress' | 'complete' | 'overdue' | 'on_hold';
  due_date?: string;
  date_created?: string;
  date_completed?: string | null;
  description?: string;
};

