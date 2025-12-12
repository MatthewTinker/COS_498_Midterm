//This scripts purpose is to set the database up for the server to use.
//It imports the database 

const Database = require('sqlite3').Database;
const path = require('path');

// Connect to database file
const dbPath = path.join(__dirname, '..', 'database', 'cos498.db');
const db = new Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Database connected');
        // Initialize tables after connection is established
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                username TEXT UNIQUE NOT NULL PRIMARY KEY,
                pass TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                display_name TEXT NOT NULL,
                profile_customization TEXT,
                account_lock INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                session_id INTEGER NOT NULL PRIMARY KEY,
                username TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (username) REFERENCES users(username)
            );
            CREATE TABLE IF NOT EXISTS comments (
                comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
                author TEXT NOT NULL,
                body TEXT NOT NULL,
                timestamps DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (author) REFERENCES users(username)
            );
            CREATE TABLE IF NOT EXISTS login (
                login_id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                IP TEXT NOT NULL,
                time_stamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                lock_status INTEGER NOT NULL,
                FOREIGN KEY (username) REFERENCES users(username)
            );
        `, (err) => {
            if (err) {
                console.error('Error creating tables:', err);
            } else {
                console.log('Database tables initialized');
            }
        });
    }
});
module.exports = db;