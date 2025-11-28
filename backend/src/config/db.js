import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, '..', '..', 'data', 'smartfall.db');
await fs.promises.mkdir(path.dirname(dbFile), { recursive: true });

const dbPromise = open({
  filename: dbFile,
  driver: sqlite3.Database
});

const bootstrap = async () => {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      contact_email TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      fall_detected_at TEXT NOT NULL,
      location_lat REAL,
      location_lng REAL,
      severity TEXT,
      score REAL,
      notes TEXT
    )
  `);
  return db;
};

export const getDb = async () => bootstrap();

