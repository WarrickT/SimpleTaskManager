require('dotenv').config();
const express = require('express');
const passport = require('passport');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const pool = require('./db');
const bcrypt = require('bcrypt');
// SocketIO setup
const http = require('http');
const { Server } = require('socket.io');
const app = express();


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://simpletaskmanager-frontend.onrender.com'],
    credentials: true
  }
});

require('./auth/google'); // Load the Passport strategy


const defaultStats = {
  incomplete: 0,
  in_progress: 0,
  complete: 0,
  overdue: 0,
  on_hold: 0,
};


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

async function autoUpdateOverdueTasks(email) {
  const today = new Date().toISOString().split('T')[0];
  await pool.query(
    `UPDATE taskstatusdb SET status = 'overdue'
     WHERE email = $1 AND due_date < $2 AND status != 'overdue'`,
    [email, today]
  );
}

app.use(cors({
  origin: ['http://localhost:5173', 'https://simpletaskmanager-frontend.onrender.com'], 
  credentials: true
}));
app.use(cookieParser());
app.use(passport.initialize());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend running');
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = req.user.token;
    const redirectBase = 'http://localhost:5173';
    //process.env.FRONTEND_URL || 
    res.redirect(`${redirectBase}/dashboard?token=${token}`);
      }
);

app.post('/api/tasks', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const { task_name, due_date, description, team_id } = req.body;
    
    if (!task_name || typeof task_name !== 'string') {
      return res.status(400).json({ message: 'Invalid task title' });
    }
    await pool.query(
      `INSERT INTO taskstatusdb 
      (email, task_name, status, due_date, description, date_created, team_id)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
      [user.email, task_name, 'incomplete', due_date, description || null, team_id || null]
    );

    await autoUpdateOverdueTasks(user.email);
    await updateUserStats(user.email);
    res.status(201).json({ message: 'Task created' });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Invalid token' });
  }
});

app.get('/api/tasks', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    await autoUpdateOverdueTasks(user.email);
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
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  const { task_name, status } = req.body;
  if (status === 'overdue') return res.status(400).json({ message: 'Cannot manually set status to overdue' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    await pool.query(
      `UPDATE taskstatusdb SET status = $1 WHERE email = $2 AND task_name = $3`,
      [status, user.email, task_name]
    );
    await autoUpdateOverdueTasks(user.email);
    await updateUserStats(user.email);

    res.status(200).json({ message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error updating task' });
  }
});

app.post('/api/tasks/delete', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  const { task_name } = req.body;

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    await pool.query(
      `DELETE FROM taskstatusdb WHERE email = $1 AND task_name = $2`,
      [user.email, task_name]
    );
    await autoUpdateOverdueTasks(user.email);
    await updateUserStats(user.email);
    res.status(200).json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error deleting task' });
  }
});

app.get('/api/teams', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const email = user.email;

    const result = await pool.query(`
      SELECT tm.team_id, t.name, tm.role, tm.joined_at
      FROM team_members_db tm
      JOIN teamsdb t ON tm.team_id = t.id
      WHERE tm.email = $1
    `, [email]);

    res.json({ teams: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch teams' });
  }
});

app.post('/api/team-tasks', async (req, res) => {
  console.log('Creating team task with:', req.body);

  const { task_name, description, due_date, team_id, assigned_to } = req.body;

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  const user = jwt.verify(token, process.env.JWT_SECRET);
  const assigned_by = user.email;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insert task into taskstatusdb
    const result = await client.query(
      `INSERT INTO taskstatusdb 
        (email, task_name, description, due_date, team_id, assigned_by, status, date_created)
       VALUES ($1, $2, $3, $4, $5, $6, 'incomplete', NOW())
       RETURNING id`,
      [assigned_by, task_name, description, due_date, team_id, assigned_by]
    );

    const taskId = result.rows[0].id;

    // Insert assignees using emails
    if (Array.isArray(assigned_to) && assigned_to.length > 0) {
      for (const user_email of assigned_to) {
        await client.query(
          `INSERT INTO task_assignees (task_id, user_email, assigned_at, assigned_by)
           VALUES ($1, $2, NOW(), $3)`,
          [taskId, user_email, assigned_by]
        );
      }
    }

    await client.query('COMMIT');
    io.to(`team_${team_id}`).emit('new_activity', {
      actor_email: assigned_by,
      action: 'created_task',
      target: task_name,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({ message: 'Team task created', taskId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating team task:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});


app.get('/api/teams/:teamId/tasks', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const { teamId } = req.params;

    console.log('[TeamTasks] Fetching tasks for team:', teamId);

    const query = `
      SELECT 
        t.id,
        t.task_name,
        t.description,
        t.status,
        t.due_date,
        t.date_created,
        t.date_completed,
        t.team_id,
        t.assigned_by,
        COALESCE(
          json_agg(
            json_build_object(
              'email', a.user_email,
              'name', a.user_email,
              'completed', a.completed
            )
          ) FILTER (WHERE a.user_email IS NOT NULL), '[]'
        ) AS assigned_to
      FROM taskstatusdb t
      LEFT JOIN task_assignees a ON t.id = a.task_id
      WHERE t.team_id = $1
      GROUP BY t.id
      ORDER BY t.date_created DESC
    `;

    const result = await pool.query(query, [teamId]);
    console.log('[TeamTasks] Query success. Found:', result.rows.length, 'tasks');

    res.json({ tasks: result.rows });
  } catch (err) {
    console.error('[TeamTasks] Error:', err);
    res.status(500).json({ message: 'Failed to fetch team tasks', error: err.message });
  }
});


app.get('/api/teams/:teamId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const { teamId } = req.params;

    // Get team basic info
    const teamResult = await pool.query(
      'SELECT id, name, created_at FROM teamsdb WHERE id = $1',
      [teamId]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Get role of current user in this team
    const roleResult = await pool.query(
      'SELECT role FROM team_members_db WHERE team_id = $1 AND email = $2',
      [teamId, user.email]
    );

    const role = roleResult.rows[0]?.role || 'member';

    res.json({
      team: {
        ...teamResult.rows[0],
        role, // Now included for frontend
      },
    });
  } catch (err) {
    console.error('Error fetching team info:', err);
    res.status(500).json({ message: 'Failed to fetch team info' });
  }
});



app.get('/api/teams/:teamId/members', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    const { teamId } = req.params;

    const result = await pool.query(
      `SELECT email AS name, id AS user_id 
       FROM team_members_db 
       WHERE team_id = $1`,
      [teamId]
    );

    res.json({ members: result.rows });
  } catch (err) {
    console.error('Error fetching team members:', err);
    res.status(500).json({ message: 'Failed to fetch team members' });
  }
});

app.put('/api/teams/:teamId/tasks/update', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const { teamId } = req.params;
    const { task_name, status } = req.body;

    await pool.query(
      `UPDATE taskstatusdb SET status = $1 WHERE task_name = $2 AND team_id = $3`,
      [status, task_name, teamId]
    );
    await pool.query(
      `INSERT INTO team_activity_log (team_id, actor_email, action, target, destination)
      VALUES ($1, $2, $3, $4, $5)`,
      [teamId, user.email, 'updated_task', task_name, status]
    );

    io.to(`team_${teamId}`).emit('new_activity', {
    actor_email: user.email,
    action: 'updated_task',
    target: task_name,
    destination: status, // Add this
    timestamp: new Date().toISOString()
  });


    res.status(200).json({ message: 'Task status updated' });
  } catch (err) {
    console.error('[TeamTaskUpdate]', err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

app.put('/api/teams/:teamId/tasks/edit', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const { teamId } = req.params;
    const { original_name, new_name, due_date, description } = req.body;

    // Find the task first
    const taskResult = await pool.query(
      `SELECT id FROM taskstatusdb WHERE task_name = $1 AND team_id = $2`,
      [original_name, teamId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const taskId = taskResult.rows[0].id;

    await pool.query(
      `UPDATE taskstatusdb
       SET task_name = $1, due_date = $2, description = $3
       WHERE id = $4 AND team_id = $5`,
      [new_name, due_date || null, description || null, taskId, teamId]
    );

    await pool.query(
      `INSERT INTO team_activity_log (team_id, actor_email, action, target)
      VALUES ($1, $2, $3, $4)`,
      [teamId, user.email, 'edited_task', task_name]
    );

    io.to(`team_${teamId}`).emit('new_activity', {
    actor_email: user.email,
    action: 'edited_task', // same as above
    target: task_name,     // same as above
    timestamp: new Date().toISOString() // send time to display
  });

    res.status(200).json({ message: 'Team task updated' });
  } catch (err) {
    console.error('[EditTeamTask]', err);
    res.status(500).json({ message: 'Failed to edit team task' });
  }
});

app.post('/api/teams/:teamId/tasks/delete', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const { teamId } = req.params;
    const { task_name } = req.body;

    // Delete the task (and optionally its assignees)
    await pool.query(
      `DELETE FROM taskstatusdb WHERE task_name = $1 AND team_id = $2`,
      [task_name, teamId]
    );

    // Optionally log activity
    await pool.query(
      `INSERT INTO team_activity_log (team_id, actor_email, action, target)
       VALUES ($1, $2, 'deleted_task', $3)`,
      [teamId, user.email, task_name]
    );

    io.to(`team_${teamId}`).emit('new_activity', {
      actor_email: user.email,
      action: 'deleted_task',
      target: task_name,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({ message: 'Task deleted' });
  } catch (err) {
    console.error('[DeleteTeamTask]', err);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});


app.put('/api/teams/:teamId/tasks/assignee-status', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const { teamId } = req.params; // ✅ FIX: Grab teamId here
    const { task_id, assignee_email, completed } = req.body;

    if (!task_id || !assignee_email || typeof completed !== 'boolean') {
      return res.status(400).json({ message: 'Missing or invalid parameters' });
    }

    if (user.email !== assignee_email) {
      return res.status(403).json({ message: 'Not authorized to update another user\'s status' });
    }

    const result = await pool.query(
      `UPDATE task_assignees
       SET completed = $1
       WHERE task_id = $2 AND user_email = $3`,
      [completed, task_id, assignee_email]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Assignee not found for this task' });
    }

    io.to(`team_${teamId}`).emit('assignee_status_updated', {
      task_id,
      assignee_email,
      completed,
    });

    res.status(200).json({ message: 'Assignee status updated' });
  } catch (err) {
    console.error('[AssigneeStatusUpdate] Error:', err);
    res.status(500).json({ message: 'Failed to update assignee status' });
  }
});



app.put('/api/tasks/edit', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  const { original_name, new_name, due_date, description } = req.body;

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const email = user.email;

    const result = await pool.query(
      `SELECT status FROM taskstatusdb WHERE email = $1 AND task_name = $2`,
      [email, original_name]
    );

    const currentStatus = result.rows[0]?.status;
    const newStatus = currentStatus === 'overdue' ? 'incomplete' : currentStatus;

    await pool.query(
      `UPDATE taskstatusdb 
       SET task_name = $1, due_date = $2, description = $3, status = $4 
       WHERE email = $5 AND task_name = $6`,
      [new_name, due_date || null, description || null, newStatus, email, original_name]
    );
    

    await autoUpdateOverdueTasks(email);
    await updateUserStats(email);
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

app.post('/api/teams/create', async (req, res) => {
  try {
    const { name, password } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const user = jwt.verify(token, process.env.JWT_SECRET);

    const password_hash = await bcrypt.hash(password, 10);

    // Create team
    const teamResult = await pool.query(
      `INSERT INTO teamsdb (name, password_hash, created_at)
       VALUES ($1, $2, NOW()) RETURNING id`,
      [name, password_hash]
    );

    const teamId = teamResult.rows[0].id;

    // Add user to team as admin
    await pool.query(
      `INSERT INTO team_members_db (team_id, email, role, joined_at)
       VALUES ($1, $2, 'admin', NOW())`,
      [teamId, user.email]
    );

    res.status(200).json({ message: 'Team created', teamId });
  } catch (err) {
    console.error('Error creating team:', err);
    res.status(500).json({ message: 'Error creating team' });
  }
});


// Join an existing team with correct password
app.post('/api/teams/join', async (req, res) => {
  try {
    const { name, password } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const user = jwt.verify(token, process.env.JWT_SECRET);

    // Look up team
    const teamRes = await pool.query(
      `SELECT id, password_hash FROM teamsdb WHERE name = $1`,
      [name]
    );

    if (teamRes.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const team = teamRes.rows[0];
    const isMatch = await bcrypt.compare(password, team.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid team password' });
    }

    // Add user to team as member
    await pool.query(
      `INSERT INTO team_members_db (team_id, email, role, joined_at)
       VALUES ($1, $2, 'member', NOW())`,
      [team.id, user.email]
    );

    res.status(200).json({ message: 'Joined team', teamId: team.id });
  } catch (err) {
    console.error('Error joining team:', err);
    res.status(500).json({ message: 'Error joining team' });
  }
});

app.get('/api/teams/:teamId/chat', async (req, res) => {
  try {
    const { teamId } = req.params;
    const result = await pool.query(
      `SELECT sender_email, message, sent_at 
       FROM team_chat 
       WHERE team_id = $1 
       ORDER BY sent_at ASC`,
      [teamId]
    );

    res.json({ messages: result.rows });
  } catch (err) {
    console.error('Failed to fetch chat history:', err);
    res.status(500).json({ message: 'Error fetching chat history' });
  }
});

app.get('/api/teams/:teamId/activity', async (req, res) => {
  const { teamId } = req.params;
  try {
    const result = await pool.query(
    `SELECT actor_email, action, target, destination, created_at
    FROM team_activity_log
    WHERE team_id = $1
    ORDER BY created_at DESC
    LIMIT 50`,
    [teamId]
  );
    res.json({ logs: result.rows });
  } catch (err) {
    console.error('[TeamActivityFeed]', err);
    res.status(500).json({ message: 'Failed to fetch activity feed' });
  }
});


io.on('connection', (socket) => {
  console.log('🔌 A user connected:', socket.id);

  socket.on('join_team', (teamId) => {
    socket.join(`team_${teamId}`);
  });

  socket.on('send_message', async ({ teamId, email, message }) => {
    try {
      await pool.query(
        'INSERT INTO team_chat (team_id, sender_email, message) VALUES ($1, $2, $3)',
        [teamId, email, message]
      );
      io.to(`team_${teamId}`).emit('new_message', {
        sender_email: email,
        message,
        sent_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to insert chat message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

