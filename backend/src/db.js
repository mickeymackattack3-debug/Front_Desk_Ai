import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'frontdesk.db');

let db;

export function getDb() {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      service_categories TEXT DEFAULT '[]',
      business_hours TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      settings TEXT DEFAULT '{"booking_enabled": true, "auto_response": true}'
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id),
      lead_id TEXT REFERENCES leads(id),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'abandoned')),
      channel TEXT DEFAULT 'web' CHECK(channel IN ('web', 'sms', 'social')),
      visitor_name TEXT,
      visitor_contact TEXT,
      started_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      ended_at TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id),
      role TEXT NOT NULL CHECK(role IN ('visitor', 'assistant', 'system')),
      content TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id),
      conversation_id TEXT REFERENCES conversations(id),
      name TEXT,
      phone TEXT,
      email TEXT,
      service TEXT,
      location TEXT,
      timeline TEXT,
      notes TEXT,
      status TEXT DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'qualified', 'booked', 'converted', 'lost')),
      source TEXT DEFAULT 'web',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id),
      lead_id TEXT NOT NULL REFERENCES leads(id),
      conversation_id TEXT REFERENCES conversations(id),
      service TEXT NOT NULL,
      preferred_date TEXT,
      preferred_time TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_business ON conversations(business_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_leads_business ON leads(business_id);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_business ON bookings(business_id);
  `);
}

// Seed a demo business if empty
export function seedDemoBusiness() {
  const row = db.prepare('SELECT id FROM businesses LIMIT 1').get();
  if (!row) {
    const demoId = 'demo-001';
    db.prepare(`
      INSERT INTO businesses (id, name, slug, email, phone, service_categories)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(demoId, "Joe's Plumbing", 'joes-plumbing', 'joe@example.com', '555-0100',
      JSON.stringify(['Plumbing repair', 'Drain cleaning', 'Water heater install', 'Pipe replacement']));
    console.log(`  ✓ Seeded demo business: ${demoId}`);
  }
}

export { db };