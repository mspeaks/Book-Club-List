// Simple Express server for Book Club backend
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = path.join(__dirname, 'bookclub.sqlite');

app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create tables if they don't exist
const initDb = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      description TEXT,
      link TEXT,
      recommended_by TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS book_topics (
      book_id INTEGER,
      topic_id INTEGER,
      PRIMARY KEY (book_id, topic_id),
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (topic_id) REFERENCES topics(id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER,
      voter_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(book_id, voter_id),
      FOREIGN KEY (book_id) REFERENCES books(id)
    )`);
    // New table for book statuses
    db.run(`CREATE TABLE IF NOT EXISTS book_statuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('recommend', 'already_read', 'skimmed', 'want_to_read', 'reading_now')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(book_id, user_id, status),
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`); 
    
    // Create comments table
    db.run(`CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
  });
};

initDb();

app.get('/', (req, res) => {
  res.send('Book Club backend is running!');
});

// --- USERS ---
// Simple login: POST /login { name }
app.post('/login', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.get('SELECT * FROM users WHERE name = ?', [name], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (user) {
      res.json({ id: user.id, name: user.name });
    } else {
      return res.status(404).json({ error: 'User not found' });
    }
  });
});

// Register new user: POST /register { name }
app.post('/register', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.run('INSERT INTO users (name) VALUES (?)', [name], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name });
  });
});

// Get all users: GET /users
app.get('/users', (req, res) => {
  db.all('SELECT id, name FROM users ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- TOPICS ---
// Get all topics
app.get('/topics', (req, res) => {
  db.all('SELECT * FROM topics ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Topic search for autocomplete
app.get('/topics/search', (req, res) => {
  const q = req.query.q || '';
  db.all('SELECT * FROM topics WHERE name LIKE ? ORDER BY name', [`%${q}%`], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a new topic
app.post('/topics', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.run('INSERT INTO topics (name) VALUES (?)', [name], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name });
  });
});

// --- BOOKS ---
// Get all books with topics and vote counts
app.get('/books', (req, res) => {
  db.all(`SELECT b.*, (
    SELECT COUNT(*) FROM votes v WHERE v.book_id = b.id
  ) as votes,
  (
    SELECT COUNT(*) FROM book_statuses s WHERE s.book_id = b.id AND s.status = 'already_read'
  ) as already_read,
  (
    SELECT COUNT(*) FROM book_statuses s WHERE s.book_id = b.id AND s.status = 'reading_now'
  ) as reading_now,
  (
    SELECT COUNT(*) FROM book_statuses s WHERE s.book_id = b.id AND s.status = 'skimmed'
  ) as skimmed,
  (
    SELECT COUNT(*) FROM book_statuses s WHERE s.book_id = b.id AND s.status = 'want_to_read'
  ) as want_to_read
  FROM books b`, (err, books) => {
    if (err) return res.status(500).json({ error: err.message });
    // Fetch topics for each book
    db.all('SELECT bt.book_id, t.name FROM book_topics bt JOIN topics t ON bt.topic_id = t.id', (err2, topicRows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      const bookTopics = {};
      topicRows.forEach(row => {
        if (!bookTopics[row.book_id]) bookTopics[row.book_id] = [];
        bookTopics[row.book_id].push(row.name);
      });
      // Attach topics to books
      books.forEach(book => {
        book.topics = bookTopics[book.id] || [];
      });
      res.json(books);
    });
  });
});

// Add a new book with topics
app.post('/books', (req, res) => {
  const { title, author, description, link, recommended_by, topics, user_id, cover } = req.body;
  if (!title || !author || !topics || !Array.isArray(topics) || topics.length === 0 || !user_id) {
    return res.status(400).json({ error: 'Title, author, user_id, and at least one topic are required' });
  }
  db.run(
    'INSERT INTO books (title, author, description, link, recommended_by, user_id, cover) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [title, author, description, link, recommended_by, user_id, cover],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      const bookId = this.lastID;
      // Insert into book_topics
      const placeholders = topics.map(() => '(?, ?)').join(',');
      const params = topics.flatMap(topicId => [bookId, topicId]);
      db.run(
        `INSERT INTO book_topics (book_id, topic_id) VALUES ${placeholders}`,
        params,
        function(err2) {
          if (err2) return res.status(400).json({ error: err2.message });
          res.status(201).json({ id: bookId, title, author, description, link, recommended_by, user_id, cover, topics });
        }
      );
    }
  );
});

// Get details for a single book
app.get('/books/:id', (req, res) => {
  const bookId = req.params.id;
  const sql = `
    SELECT b.*, 
      GROUP_CONCAT(t.name) as topics,
      (SELECT COUNT(*) FROM votes v WHERE v.book_id = b.id) as votes
    FROM books b
    LEFT JOIN book_topics bt ON b.id = bt.book_id
    LEFT JOIN topics t ON bt.topic_id = t.id
    WHERE b.id = ?
    GROUP BY b.id
  `;
  db.get(sql, [bookId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Book not found' });
    row.topics = row.topics ? row.topics.split(',') : [];
    row.votes = Number(row.votes || 0);
    res.json(row);
  });
});

// --- BOOK STATUSES ---
// Set a user's status for a book
app.post('/books/:id/status', (req, res) => {
  const bookId = req.params.id;
  const { user_id, status } = req.body;
  const allowed = ['already_read', 'skimmed', 'want_to_read', 'reading_now'];
  if (!user_id || !status || !allowed.includes(status)) {
    return res.status(400).json({ error: 'user_id and valid status are required' });
  }
  
  // Debug info for troubleshooting
  console.log(`Processing status update: book_id=${bookId}, user_id=${user_id}, status=${status}`);
  
  // Treat all statuses the same: allow multiple 'reading_now' per user
  db.run(
    `INSERT OR IGNORE INTO book_statuses (book_id, user_id, status) VALUES (?, ?, ?)`,
    [bookId, user_id, status],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Remove a user's status for a book
app.delete('/books/:id/status', (req, res) => {
  const bookId = req.params.id;
  const { user_id, status } = req.body;
  const allowed = ['already_read', 'skimmed', 'want_to_read', 'reading_now'];
  if (!user_id || !status || !allowed.includes(status)) {
    return res.status(400).json({ error: 'user_id and valid status are required' });
  }
  db.run(
    `DELETE FROM book_statuses WHERE book_id = ? AND user_id = ? AND status = ?`,
    [bookId, user_id, status],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// --- VOTES ---
// Remove a user's vote for a book
app.delete('/books/:id/vote', (req, res) => {
  const bookId = req.params.id;
  const { voter_id } = req.body;
  if (!voter_id) return res.status(400).json({ error: 'voter_id is required' });
  db.run(
    `DELETE FROM votes WHERE book_id = ? AND voter_id = ?`,
    [bookId, voter_id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});
// Delete a book (only by recommending user)
app.delete('/books/:id', (req, res) => {
  const bookId = req.params.id;
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  // Check if the book exists and belongs to this user
  db.get('SELECT * FROM books WHERE id = ?', [bookId], (err, book) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.user_id !== user_id) return res.status(403).json({ error: 'You can only delete your own recommendations.' });
    // Delete book_topics and votes first due to FK constraints
    db.run('DELETE FROM book_topics WHERE book_id = ?', [bookId], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      db.run('DELETE FROM votes WHERE book_id = ?', [bookId], (err3) => {
        if (err3) return res.status(500).json({ error: err3.message });
        db.run('DELETE FROM books WHERE id = ?', [bookId], (err4) => {
          if (err4) return res.status(500).json({ error: err4.message });
          res.json({ success: true });
        });
      });
    });
  });
});

// Vote for a book
app.post('/books/:id/vote', (req, res) => {
  const bookId = req.params.id;
  const { voter_id } = req.body;
  if (!voter_id) return res.status(400).json({ error: 'voter_id is required' });
  db.run(
    'INSERT OR IGNORE INTO votes (book_id, voter_id) VALUES (?, ?)',
    [bookId, voter_id],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(200).json({ message: 'Already voted' });
      }
      res.status(201).json({ message: 'Vote recorded' });
    }
  );
});

// --- USER-SPECIFIC ENDPOINTS ---
// Books recommended by user
app.get('/users/:id/books', (req, res) => {
  const userId = req.params.id;
  const sql = `
    SELECT b.*, GROUP_CONCAT(t.name) as topics,
      (SELECT COUNT(*) FROM votes v WHERE v.book_id = b.id) as votes
    FROM books b
    LEFT JOIN book_topics bt ON b.id = bt.book_id
    LEFT JOIN topics t ON bt.topic_id = t.id
    WHERE b.user_id = ?
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `;
  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    rows.forEach(r => {
      r.topics = r.topics ? r.topics.split(',') : [];
      r.votes = Number(r.votes || 0);
    });
    res.json(rows);
  });
});
// Books user voted for
app.get('/users/:id/votes', (req, res) => {
  const userId = req.params.id;
  const sql = `
    SELECT b.*, GROUP_CONCAT(t.name) as topics,
      (SELECT COUNT(*) FROM votes v WHERE v.book_id = b.id) as votes
    FROM votes v
    JOIN books b ON v.book_id = b.id
    LEFT JOIN book_topics bt ON b.id = bt.book_id
    LEFT JOIN topics t ON bt.topic_id = t.id
    WHERE v.voter_id = ?
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `;
  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    rows.forEach(r => {
      r.topics = r.topics ? r.topics.split(',') : [];
      r.votes = Number(r.votes || 0);
    });
    res.json(rows);
  });
});

// Books with their statuses for a user
app.get('/users/:id/statuses', (req, res) => {
  const userId = req.params.id;
  // Return all book statuses for this user
  db.all(
    `SELECT bs.book_id, bs.status FROM book_statuses bs WHERE bs.user_id = ?`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// --- COMMENTS ---
// Get comment count for a book
app.get('/books/:id/comments/count', (req, res) => {
  const bookId = req.params.id;
  db.get('SELECT COUNT(*) as count FROM comments WHERE book_id = ?', [bookId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ count: row.count });
  });
});

// Get all comments for a book
app.get('/books/:id/comments', (req, res) => {
  const bookId = req.params.id;
  const sql = `
    SELECT c.*, u.name as user_name
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.book_id = ?
    ORDER BY c.created_at DESC
  `;
  db.all(sql, [bookId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a comment to a book
app.post('/books/:id/comments', (req, res) => {
  const bookId = req.params.id;
  const { user_id, content } = req.body;
  if (!user_id || !content) {
    return res.status(400).json({ error: 'user_id and content are required' });
  }
  db.run(
    `INSERT INTO comments (book_id, user_id, content) VALUES (?, ?, ?)`,
    [bookId, user_id, content],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      // Get the created comment with user name
      db.get(
        `SELECT c.*, u.name as user_name FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
        [this.lastID],
        (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          res.status(201).json(row);
        }
      );
    }
  );
});

// Delete a comment
app.delete('/books/:bookId/comments/:commentId', (req, res) => {
  const { bookId, commentId } = req.params;
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  // Check if the user is the comment owner
  db.get(
    `SELECT * FROM comments WHERE id = ? AND book_id = ?`,
    [commentId, bookId],
    (err, comment) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!comment) return res.status(404).json({ error: 'Comment not found' });
      
      if (comment.user_id !== parseInt(user_id)) {
        return res.status(403).json({ error: 'You can only delete your own comments' });
      }
      
      db.run(
        `DELETE FROM comments WHERE id = ?`,
        [commentId],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, message: 'Comment deleted' });
        }
      );
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
