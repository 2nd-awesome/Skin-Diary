const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dbPath = process.env.DB_PATH || path.join(__dirname, "data", "skin-diary.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    passcode_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS entries (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date       TEXT    NOT NULL,              -- YYYY-MM-DD in the user's local time
    rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
    note       TEXT    NOT NULL DEFAULT '',
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, date)
  );
`);

module.exports = db;
