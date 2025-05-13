require('dotenv').config();
const express = require('express');
const passport = require('passport');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const pool = require('./db');

require('./auth/google'); // Load the Passport strategy

const app = express();

async function updateUserStats(email) {
  const statuses = ['incomplete', 'in_progress', 'complete', 'overdue', 'on_hold'];
  const counts = {};

  for (const status of statuses) {
    const res = await pool.query(
      'SELECT COUNT(*) FROM taskstatusdb WHERE email = $1 AND status = $2',
      [email, status]
    );
    counts[status] = parseInt(res.rows[0].count);
  }

  // Upsert user_statistics
  await pool.query(
    `INSERT INTO user_statistics (username, incomplete, in_progress, complete, overdue, on_hold)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (username)
     DO UPDATE SET 
       incomplete = $2,
       in_progress = $3,
       complete = $4,
       overdue = $5,
       on_hold = $6`,
    [email, counts.incomplete, counts.in_progress, counts.complete, counts.overdue, counts.on_hold]
  );
}

// Middleware
//Allowing frontend to access backend
app.use(cors({
  origin: 'http://localhost:5173', 
  //Change back to https://simpletaskmanager-frontend.onrender.com
  credentials: true
}));
app.use(cookieParser());
app.use(passport.initialize());
app.use(express.json()); // ⬅ Add this near top to parse JSON bodies


// Test route
app.get('/', (req, res) => {
  res.send('Backend running');
});

// Auth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    // Send JWT token to frontend via redirect
    const token = req.user.token;
    res.redirect(`http://localhost:5173/dashboard?token=${token}`);
    //change to https://simpletaskmanager-frontend.onrender.com
    //http://localhost:5173
  }
);

app.post('/api/tasks', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
  
    if (!token) return res.status(401).json({ message: 'No token' });
  
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      const { task_name, due_date, description } = req.body;
  
      if (!task_name || typeof task_name !== 'string') {
        return res.status(400).json({ message: 'Invalid task title' });
      }
  
      await pool.query(
        `INSERT INTO taskstatusdb (email, task_name, status, due_date, description, date_created)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [user.email, task_name, 'incomplete', due_date, description || null]
      );
      await updateUserStats(user.email);

        
      res.status(201).json({ message: 'Task created' });
    } catch (err) {
      console.error(err);
      res.status(401).json({ message: 'Invalid token' });
    }
  });

app.get('/api/tasks', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT * FROM taskstatusdb WHERE email = $1 ORDER BY date_created DESC',
      [user.email]
    );
    
    res.json({ tasks: result.rows });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Invalid token' });
  }
});

app.put('/api/tasks/update', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token' });

  const { task_name, status } = req.body;

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const email = user.email;

    const allowedStatuses = ['incomplete', 'in_progress', 'complete', 'overdue', 'on_hold'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await pool.query(
      `UPDATE taskstatusdb SET status = $1 WHERE email = $2 AND task_name = $3`,
      [status, email, task_name]
    );
    await updateUserStats(user.email);

    res.status(200).json({ message: 'Status updated' });

  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error updating task' });
  }
});

app.post('/api/tasks/delete', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token' });

  const { task_name } = req.body;

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const email = user.email;

    await pool.query(
      `DELETE FROM taskstatusdb WHERE email = $1 AND task_name = $2`,
      [email, task_name]
    );
    await updateUserStats(user.email);

    res.status(200).json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error deleting task' });
  }
});

app.put('/api/tasks/edit', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token' });

  const { original_name, new_name, due_date } = req.body;

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const email = user.email;

    await pool.query(
      `UPDATE taskstatusdb SET task_name = $1, due_date = $2 WHERE email = $3 AND task_name = $4`,
      [new_name, due_date || null, email, original_name]
    );

    res.status(200).json({ message: 'Task updated' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error editing task' });
  }
});

app.get('/api/user-stats', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT * FROM user_statistics WHERE username = $1', [user.email]);
    if (result.rows.length === 0) return res.json({ message: 'No stats yet', ...defaultStats });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

const defaultStats = {
  incomplete: 0,
  in_progress: 0,
  complete: 0,
  overdue: 0,
  on_hold: 0,
};

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
