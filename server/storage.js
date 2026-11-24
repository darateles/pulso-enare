import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@libsql/client';

const DATA_DIR = path.resolve(process.env.PULSO_DATA_DIR || process.env.PRUMO_DATA_DIR || 'data');
const URL_DB = process.env.TURSO_DATABASE_URL || '';
const TOKEN = process.env.TURSO_AUTH_TOKEN || '';
const REMOTE = Boolean(URL_DB);
const client = REMOTE ? createClient({ url: URL_DB, authToken: TOKEN }) : null;

const FILE_MAP = {
  user: 'user.json',
  questions: 'questions.json',
  sources: 'sources.json',
  social: 'social.json',
  radar_custom: 'radar.json',
  radar_state: 'radar-state.json',
};

let schemaReady = false;
async function ensureSchema() {
  if (!REMOTE || schemaReady) return;
  await client.execute(`CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  schemaReady = true;
}

export function storageMode() {
  return REMOTE ? 'cloud' : 'local';
}

export function dataDir() {
  return DATA_DIR;
}

export async function readKV(key, fallback) {
  if (REMOTE) {
    await ensureSchema();
    const r = await client.execute({ sql: 'SELECT value FROM kv WHERE key = ?', args: [key] });
    if (!r.rows.length) return fallback;
    try { return JSON.parse(String(r.rows[0].value)); } catch { return fallback; }
  }
  try { return JSON.parse(await fs.readFile(path.join(DATA_DIR, FILE_MAP[key] || `${key}.json`), 'utf8')); } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

export async function writeKV(key, value) {
  if (REMOTE) {
    await ensureSchema();
    await client.execute({
      sql: 'INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
      args: [key, JSON.stringify(value), new Date().toISOString()],
    });
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, FILE_MAP[key] || `${key}.json`);
  const tmp = `${file}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 1));
  await fs.rename(tmp, file);
}

export async function hasKV(key) {
  if (REMOTE) {
    await ensureSchema();
    const r = await client.execute({ sql: 'SELECT 1 FROM kv WHERE key = ?', args: [key] });
    return r.rows.length > 0;
  }
  try { await fs.access(path.join(DATA_DIR, FILE_MAP[key] || `${key}.json`)); return true; } catch { return false; }
}
