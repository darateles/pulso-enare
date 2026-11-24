import fs from 'node:fs/promises';
import path from 'node:path';
import { initStore, getUser } from './store.js';
import { writeKV, storageMode } from './storage.js';

if (storageMode() !== 'cloud') {
  console.error('Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');
  process.exit(1);
}

const read = async (file, fallback) => {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
};

await initStore();
let n = 0;
const user = await read('data/user.json', null);
if (user) {
  const current = await getUser();
  const merged = { ...current, ...user, updatedAt: new Date().toISOString() };
  await writeKV('user', merged);
  n += 1;
}
const questions = await read('data/questions.json', null);
if (questions?.questions?.length) { await writeKV('questions', questions); n += 1; }
const sources = await read('data/sources.json', null);
if (sources?.sources?.length) { await writeKV('sources', sources); n += 1; }
const social = await read('data/social.json', null);
if (social) { await writeKV('social', social); n += 1; }
const radar = await read('data/radar.json', null);
if (radar) { await writeKV('radar_custom', radar); n += 1; }
const radarState = await read('data/radar-state.json', null);
if (radarState) { await writeKV('radar_state', radarState); n += 1; }

console.log(`Migração concluída (${n} chaves).`);
