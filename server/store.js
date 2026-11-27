import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { readKV, writeKV, hasKV, dataDir } from './storage.js';

const DATA_DIR = dataDir();
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const SEED_DIR = path.resolve('seed');

const today = () => new Date().toISOString().slice(0, 10);

function levelForSemester(semester) {
  if (semester <= 2) return 1;
  if (semester <= 4) return 2;
  if (semester <= 6) return 3;
  if (semester <= 8) return 4;
  return 5;
}

export function defaultUser() {
  return {
    version: 1,
    profileVersion: 2,
    onboardingDone: false,
    name: '',
    examDate: '2027-09-12',
    startDate: today(),
    semester: 1,
    level: 1,
    dailyHours: 3,
    studyDays: [1, 2, 3, 4, 5, 6],
    goalQuestions: 40,
    progress: {},
    attempts: [],
    bookmarks: [],
    questionNotes: {},
    errorDismissed: {},
    notes: [],
    maps: [],
    flashcards: [],
    flashReviews: {},
    recall: {},
    recallDone: {},
    focusSessions: [],
    battleName: '',
    mentorNotes: [],
    guidelineSaved: [],
    radarSaved: [],
    atlasSeen: {},
    podcastProgress: {},
    ecgProgress: {},
    plan: { generatedAt: null, weeks: [] },
    activity: {},
    settings: { theme: 'light', plan: 'pro' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function readJSON(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

function accountNames() {
  const raw = process.env.APP_USERS || '';
  const names = raw.split(',').map((pair) => pair.split(':')[0].trim()).filter(Boolean);
  const single = (process.env.APP_USER || '').trim();
  if (single && !names.includes(single)) names.push(single);
  if (!names.length) names.push('davi');
  return [...new Set(names)];
}

export async function initStore() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  if ((await hasKV('user')) && !(await hasKV('user:davi'))) {
    await writeKV('user:davi', await readKV('user', defaultUser()));
  }
  for (const name of accountNames()) {
    if (!(await hasKV(`user:${name}`))) {
      const u = defaultUser();
      if (name !== 'davi') u.name = name.charAt(0).toUpperCase() + name.slice(1);
      u.onboardingDone = false;
      await writeKV(`user:${name}`, u);
      continue;
    }
    // Migração: contas antigas não tinham semestre. Pede o onboarding uma vez,
    // preservando todo o progresso já existente.
    const raw = await readKV(`user:${name}`, null);
    if (raw && raw.profileVersion !== 2) {
      const semester = Math.min(12, Math.max(1, Math.round(Number(raw.semester) || 1)));
      await writeKV(`user:${name}`, {
        ...defaultUser(),
        ...raw,
        semester,
        level: levelForSemester(semester),
        onboardingDone: false,
        profileVersion: 2,
      });
    }
  }
  if (!(await hasKV('questions'))) {
    const seed = await readJSON(path.join(SEED_DIR, 'questions.json'), { version: 1, questions: [] });
    await writeKV('questions', seed);
  }
  if (!(await hasKV('sources'))) {
    const seed = await readJSON(path.join(SEED_DIR, 'sources.json'), { version: 1, sources: [] });
    await writeKV('sources', seed);
  }
}

export async function getUser(account = 'davi') {
  const raw = await readKV(`user:${account}`, defaultUser());
  const user = { ...defaultUser(), ...raw };
  user.semester = Math.min(12, Math.max(1, Math.round(Number(user.semester) || 1)));
  user.level = levelForSemester(user.semester);
  return user;
}

export async function saveUser(account, incoming) {
  const current = await getUser(account);
  const base = defaultUser();
  const next = {
    ...base,
    ...current,
    ...incoming,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  next.attempts = Array.isArray(next.attempts) ? next.attempts.slice(-8000) : [];
  next.notes = Array.isArray(next.notes) ? next.notes.slice(0, 1500) : [];
  next.maps = Array.isArray(next.maps) ? next.maps.slice(0, 300) : [];
  next.flashcards = Array.isArray(next.flashcards) ? next.flashcards.slice(0, 20000) : [];
  next.focusSessions = Array.isArray(next.focusSessions) ? next.focusSessions.slice(-4000) : [];
  next.mentorNotes = Array.isArray(next.mentorNotes) ? next.mentorNotes.slice(0, 500) : [];
  next.bookmarks = Array.isArray(next.bookmarks) ? [...new Set(next.bookmarks)] : [];
  next.studyDays = Array.isArray(next.studyDays) ? next.studyDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : base.studyDays;
  next.semester = Math.min(12, Math.max(1, Math.round(Number(next.semester) || 1)));
  next.level = levelForSemester(next.semester);
  next.dailyHours = Math.min(16, Math.max(0.5, Number(next.dailyHours) || 3));
  next.goalQuestions = Math.min(400, Math.max(5, Number(next.goalQuestions) || 40));
  if (!next.progress || typeof next.progress !== 'object') next.progress = {};
  if (!next.activity || typeof next.activity !== 'object') next.activity = {};
  if (!next.questionNotes || typeof next.questionNotes !== 'object') next.questionNotes = {};
  await writeKV(`user:${account}`, next);
  return next;
}

export async function backupUser(account = 'davi', label = 'manual') {
  const user = await getUser(account);
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(BACKUP_DIR, `pulso-${account}-${label}-${stamp}.json`);
  await fs.writeFile(file, JSON.stringify(user, null, 1));
  const entries = (await fs.readdir(BACKUP_DIR)).sort();
  while (entries.length > 30) await fs.unlink(path.join(BACKUP_DIR, entries.shift())).catch(() => {});
  return file;
}

export async function getQuestions() {
  const raw = await readKV('questions', { version: 1, questions: [] });
  return raw.questions || [];
}

export async function saveQuestions(questions) {
  await writeKV('questions', { version: 1, questions });
}

export async function getSources() {
  const raw = await readKV('sources', { version: 1, sources: [] });
  return raw.sources || [];
}

export async function addQuestions(newQuestions) {
  const all = await getQuestions();
  const seen = new Set(all.map((q) => q.hash || hashStem(q.stem)));
  const seenSource = new Set(all.map((q) => q.sourceKey || (q.source?.url ? `${q.source.url}#${q.source.question}` : null)).filter(Boolean));
  const added = [];
  for (const q of newQuestions) {
    const hash = q.hash || hashStem(q.stem);
    const sourceKey = q.sourceKey || (q.source?.url ? `${q.source.url}#${q.source.question}` : null);
    if (!hash || seen.has(hash) || (sourceKey && seenSource.has(sourceKey))) continue;
    seen.add(hash);
    if (sourceKey) seenSource.add(sourceKey);
    added.push({
      ...q,
      id: q.id || `imp-${crypto.randomBytes(6).toString('hex')}`,
      hash,
      createdAt: new Date().toISOString(),
    });
  }
  if (added.length) await saveQuestions([...all, ...added]);
  return added;
}

export function hashStem(stem = '') {
  const normalized = stem
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 260);
  return crypto.createHash('sha1').update(normalized).digest('hex');
}

export async function resetUser(account = 'davi') {
  await backupUser(account, 'antes-reset');
  await writeKV(`user:${account}`, defaultUser());
  return getUser(account);
}

export { DATA_DIR };
