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
      const { title } = req.body;
  
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: 'Invalid task title' });
      }
  
      await pool.query(
        'INSERT INTO tasks (user_email, title) VALUES ($1, $2)',
        [user.email, title]
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
      'SELECT * FROM tasks WHERE user_email = $1 ORDER BY id DESC',
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
  const {title, completed} = req.body;

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    await pool.query(
      'UPDATE tasks SET completed = $1 WHERE user_email = $2 AND title = $3 ',
      [completed, user.email, title]
    );
    res.status(200).json({ message: 'Task updated' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error updating task' });
  }

});
  
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
