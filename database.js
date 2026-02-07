const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./finance.db');

db.serialize(() => {
    // 1. Enable Foreign Key support (Crucial for SQLite)
    db.run("PRAGMA foreign_keys = ON");

    // 2. User Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        contact TEXT,
        password TEXT
    )`);

    // 3. Transactions Table (Improved with Foreign Key link)
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        description TEXT,
        category TEXT,
        amount REAL,
        type TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    )`);
});

module.exports = db;