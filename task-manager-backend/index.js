require('dotenv').config();
const express = require('express');
const passport = require('passport');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const pool = require('./db');

require('./auth/google'); // Load the Passport strategy

const app = express();

// Middleware
//Allowing frontend to access backend
app.use(cors({
  origin: 'http://localhost:5173', 
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

  
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
