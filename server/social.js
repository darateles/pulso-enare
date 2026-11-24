import crypto from 'node:crypto';
import { readKV, writeKV } from './storage.js';
const now = () => new Date().toISOString();
const codes = new Map();

const BOTS = [
  ['Bia R.', 0.72], ['Caio M.', 0.64], ['Lia S.', 0.81], ['Rafa T.', 0.58], ['Nina P.', 0.69],
];

async function load() {
  return readKV('social', { battles: {}, arenas: {} });
}
async function save(data) {
  await writeKV('social', data);
}

function code() {
  let c;
  do { c = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5); } while (codes.has(c));
  codes.set(c, true);
  return c;
}

function cleanPlayer(p) {
  return { id: p.id, name: p.name, bot: p.bot, score: p.score, answered: p.answers.length, finishedAt: p.finishedAt };
}

export function publicBattle(b, includeQuestions = false) {
  return {
    id: b.id, code: b.code, type: b.type, name: b.name, area: b.area, count: b.questionIds.length,
    status: b.status, createdAt: b.createdAt, maxPlayers: b.maxPlayers,
    players: b.players.map(cleanPlayer),
    questionIds: includeQuestions ? b.questionIds : undefined,
    endsAt: b.endsAt,
  };
}

export async function createBattle({ name, area, count, questionIds }) {
  const data = await load();
  const cutoff = Date.now() - 48 * 3600 * 1000;
  for (const [bid, b] of Object.entries(data.battles)) {
    if (new Date(b.createdAt).getTime() < cutoff) delete data.battles[bid];
  }
  const id = crypto.randomUUID();
  const b = {
    id, code: code(), type: 'battle', name: name || 'Batalha', area,
    questionIds, players: [], status: 'lobby', createdAt: now(), maxPlayers: 8,
  };
  data.battles[id] = b;
  await save(data);
  return b;
}

export async function getBattle(id) {
  const data = await load();
  return data.battles[id];
}

export async function getBattleByCode(c) {
  const data = await load();
  return Object.values(data.battles).find((b) => b.code === String(c).toUpperCase());
}

export async function joinBattle(id, name) {
  const data = await load();
  const b = data.battles[id];
  if (!b) throw new Error('Batalha não encontrada.');
  if (b.status === 'finished') throw new Error('Batalha encerrada.');
  if (b.players.length >= b.maxPlayers) throw new Error('Sala cheia.');
  const player = { id: crypto.randomUUID(), name: String(name || 'Jogador').slice(0, 24), bot: false, score: 0, answers: [], joinedAt: now() };
  b.players.push(player);
  await save(data);
  return { battle: b, player };
}

export async function addBot(id) {
  const data = await load();
  const b = data.battles[id];
  if (!b) throw new Error('Batalha não encontrada.');
  if (b.players.length >= b.maxPlayers) throw new Error('Sala cheia.');
  const [name, skill] = BOTS[b.players.filter((p) => p.bot).length % BOTS.length];
  const bot = { id: crypto.randomUUID(), name, bot: true, skill, score: 0, answers: [], joinedAt: now() };
  b.players.push(bot);
  await save(data);
  return b;
}

export async function startBattle(id) {
  const data = await load();
  const b = data.battles[id];
  if (!b) throw new Error('Batalha não encontrada.');
  if (b.players.length < 1) throw new Error('Adicione ao menos um jogador.');
  b.status = 'playing';
  b.startedAt = now();
  for (const bot of b.players.filter((p) => p.bot)) {
    bot.answers = b.questionIds.map((qid) => ({
      questionId: qid,
      chosen: Math.random() < bot.skill ? '?' : '?',
      seconds: 8 + Math.floor(Math.random() * 28),
      correct: Math.random() < bot.skill,
    }));
    bot.score = bot.answers.reduce((s, a) => s + (a.correct ? 100 + Math.max(0, 50 - a.seconds) : 0), 0);
    bot.finishedAt = now();
  }
  await save(data);
  return b;
}

export async function answerBattle(id, playerId, { questionId, chosen, correct, seconds }) {
  const data = await load();
  const b = data.battles[id];
  if (!b) throw new Error('Batalha não encontrada.');
  const p = b.players.find((x) => x.id === playerId);
  if (!p) throw new Error('Jogador não encontrado.');
  if (b.status !== 'playing') throw new Error('Batalha não iniciada.');
  if (!b.questionIds.includes(questionId)) throw new Error('Questão não pertence a esta batalha.');
  if (p.answers.some((a) => a.questionId === questionId)) return p;
  const sec = Math.min(120, Math.max(1, Number(seconds) || 30));
  const points = correct ? 100 + Math.max(0, 50 - sec) : 0;
  p.answers.push({ questionId, chosen, correct: Boolean(correct), seconds: sec, points });
  p.score += points;
  if (p.answers.length >= b.questionIds.length) p.finishedAt = now();
  const allDone = b.players.every((x) => x.finishedAt || x.answers.length >= b.questionIds.length);
  if (allDone) b.status = 'finished';
  await save(data);
  return p;
}

export async function finishBattle(id, playerId) {
  const data = await load();
  const b = data.battles[id];
  if (!b) throw new Error('Batalha não encontrada.');
  const p = b.players.find((x) => x.id === playerId);
  if (p) {
    p.finishedAt = now();
    p.answers = b.questionIds.map((qid) => p.answers.find((a) => a.questionId === qid) || { questionId: qid, chosen: null, correct: false, seconds: 60, points: 0 });
    p.score = p.answers.reduce((s, a) => s + (a.points || 0), 0);
  }
  if (b.players.every((x) => x.finishedAt)) b.status = 'finished';
  await save(data);
  return b;
}

function weekKey(d = new Date()) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(x.getUTCFullYear(), 0, 4));
  return `${x.getUTCFullYear()}-${String(Math.ceil((((x - y) / 86400000) + 1) / 7)).padStart(2, '0')}`;
}

export function arenaTemplates() {
  const wk = weekKey();
  const definitions = [
    ['Arena semanal · Clínica Médica', 'clinica', 10, 2, 'Alta incidência: cardio, infecto e urgências.'],
    ['Arena semanal · Cirurgia', 'cirurgia', 10, 4, 'Trauma, abdome agudo e perioperatório.'],
    ['Arena de sábado · Prova mista', 'todas', 20, 6, 'Simulado coletivo com ranking geral.'],
  ];
  return definitions.map(([name, area, count, dayOffset, blurb], i) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + dayOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);
    return { id: `arena-${wk}-${i + 1}`, name, area, count, blurb, startsAt: start.toISOString(), endsAt: end.toISOString() };
  });
}

export async function getArenas(questions) {
  const data = await load();
  const out = [];
  for (const t of arenaTemplates()) {
    if (!data.arenas[t.id]) {
      data.arenas[t.id] = {
        ...t, type: 'arena', code: 'ARENA', status: 'open', players: [], questionIds: [],
      };
    }
    const a = data.arenas[t.id];
    if (!a.questionIds.length) {
      const pool = questions.filter((q) => q.answer && (t.area === 'todas' || q.area === t.area));
      a.questionIds = pool.sort(() => Math.random() - 0.5).slice(0, t.count).map((q) => q.id);
    }
    out.push({ ...t, joined: a.players.length, closed: new Date(a.endsAt) < new Date() });
  }
  await save(data);
  return out;
}

export async function joinArena(id, name, questions) {
  const data = await load();
  await getArenas(questions);
  const a = data.arenas[id];
  if (!a) throw new Error('Arena não encontrada.');
  if (new Date(a.endsAt) < new Date()) throw new Error('Arena encerrada.');
  const player = { id: crypto.randomUUID(), name: String(name || 'Competidor').slice(0, 24), bot: false, score: 0, answers: [], joinedAt: now() };
  a.players.push(player);
  await save(data);
  return { arena: a, player };
}

export async function submitArena(id, playerId, answers) {
  const data = await load();
  const a = data.arenas[id];
  if (!a) throw new Error('Arena não encontrada.');
  const p = a.players.find((x) => x.id === playerId);
  if (!p) throw new Error('Jogador não encontrado.');
  p.answers = a.questionIds.map((qid) => {
    const ans = answers[qid] || {};
    return { questionId: qid, chosen: ans.chosen || null, correct: Boolean(ans.correct), seconds: Number(ans.seconds) || 60, points: ans.correct ? 100 : 0 };
  });
  p.score = p.answers.reduce((s, x) => s + x.points, 0);
  p.finishedAt = now();
  await save(data);
  return a;
}

export async function getArena(id) {
  const data = await load();
  return data.arenas[id];
}

export function arenaPublic(a) {
  return {
    id: a.id, name: a.name, area: a.area, blurb: a.blurb, startsAt: a.startsAt, endsAt: a.endsAt,
    questionIds: a.questionIds, status: a.status,
    players: a.players.map(cleanPlayer).sort((x, y) => y.score - x.score),
  };
}
