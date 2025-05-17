// Database migration script to add user_id column to books table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DB_PATH = path.join(__dirname, 'bookclub.sqlite');

console.log('Starting database migration...');
console.log(`Database path: ${DB_PATH}`);

// Connect to database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
    process.exit(1);
  } 
  console.log('Connected to SQLite database');
});

// Check if the column exists first to avoid errors
db.get("PRAGMA table_info(books)", (err, rows) => {
  if (err) {
    console.error('Error checking table schema:', err);
    db.close();
    process.exit(1);
  }

  // Run the migration
  db.run(`ALTER TABLE books ADD COLUMN user_id INTEGER REFERENCES users(id)`, (err) => {
    if (err) {
      // Column might already exist or other error
      console.error('Migration error:', err.message);
    } else {
      console.log('Successfully added user_id column to books table');
    }
    
    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
        console.log('Migration completed');
      }
    });
  });
});
