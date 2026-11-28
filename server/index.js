import express from 'express';
import compression from 'compression';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Agent } from 'undici';
import AdmZip from 'adm-zip';
import * as cheerio from 'cheerio';
import { DatabaseSync } from 'node:sqlite';
import os from 'node:os';
import {
  initStore, getUser, saveUser, getQuestions, addQuestions, backupUser, resetUser,
  getSources, listAccounts, DATA_DIR,
} from './store.js';
import { importFromFile, importFromUrl, parseQuestions, parseAnswerKey, buildQuestions, fetchText } from './importer.js';
import { readKV, writeKV, storageMode } from './storage.js';
import {
  createBattle, getBattle, getBattleByCode, joinBattle, addBot, startBattle, answerBattle,
  finishBattle, publicBattle, getArenas, joinArena, submitArena, getArena, arenaPublic,
} from './social.js';
import {
  getPublicDeck, listPublicDecks, publishPublicDeck, removePublicDeck, takePublicDeck,
} from './publicDecks.js';
import { rankingDate, rankingEntry, rankingId, sortRanking } from '../src/ranking.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function loadEnv() {
  for (const file of [path.join(root, '.env'), path.resolve(root, '..', '.env')]) {
    try {
      const content = await fs.readFile(file, 'utf8');
      for (const line of content.split('\n')) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
      }
    } catch {}
  }
}
await loadEnv();

const curriculum = JSON.parse(await fs.readFile(path.join(root, 'seed', 'curriculum.json'), 'utf8'));
const topicIndex = new Map(curriculum.areas.flatMap((a) => a.topics.map((t) => [t.id, { ...t, areaName: a.name }])));

const app = express();
const PORT = Number(process.env.PORT) || 4175;
const HOST = process.env.HOST || '127.0.0.1';
const APP_PASSWORD = process.env.APP_PASSWORD || '';
// Fallback seguro: sem SESSION_SECRET explícito, deriva o segredo da senha do app.
// Isso evita o bug em que o login retorna 200 mas a sessão nunca é lida.
const SESSION_SECRET = process.env.SESSION_SECRET
  || ((APP_PASSWORD || process.env.APP_USERS)
    ? crypto.createHash('sha256').update(`pulso-session:${APP_PASSWORD}:${process.env.APP_USERS || ''}`).digest('hex')
    : '');
const SESSION_COOKIE = 'pulso_session';
const ACCOUNTS = new Map(
  (process.env.APP_USERS || (APP_PASSWORD ? `${process.env.APP_USER || 'pulso'}:${APP_PASSWORD}` : ''))
    .split(',').map((pair) => pair.trim()).filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf(':');
      const user = pair.slice(0, i).trim();
      const pass = pair.slice(i + 1);
      return [user, crypto.createHash('sha256').update(`${user}:${pass}`).digest()];
    }).filter(([u]) => u),
);
if ((APP_PASSWORD || process.env.APP_USERS) && !process.env.SESSION_SECRET) {
  console.warn('[pulso] SESSION_SECRET ausente: usando segredo derivado das credenciais. Defina SESSION_SECRET em produção.');
}
app.disable('x-powered-by');
app.use(compression({ threshold: 512 }));
if (process.env.TRUST_PROXY) app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'same-origin');
  res.set('X-Frame-Options', 'DENY');
  next();
});

app.use(express.json({ limit: '30mb' }));

const loginAttempts = new Map();

function cookieValue(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}

function signSession(user, exp) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(`${user}.${exp}`).digest('base64url');
}

function readSession(req) {
  if (!SESSION_SECRET) return null;
  const raw = cookieValue(req, SESSION_COOKIE);
  if (!raw) return null;
  const [encoded, expRaw, sig] = raw.split('.');
  const exp = Number(expRaw);
  if (!encoded || !sig || !exp || exp < Date.now()) return null;
  const user = Buffer.from(encoded, 'base64url').toString('utf8');
  if (!ACCOUNTS.has(user)) return null;
  const expected = signSession(user, exp);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return user;
}

function setSession(req, res, user) {
  const exp = Date.now() + 30 * 86400000;
  const value = `${Buffer.from(user).toString('base64url')}.${exp}.${signSession(user, exp)}`;
  const secure = req.secure || String(req.headers['x-forwarded-proto'] || '').includes('https');
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(value)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000${secure ? '; Secure' : ''}`);
}

function validCredentials(user, pass) {
  const expected = ACCOUNTS.get(user);
  if (!expected) return false;
  const got = crypto.createHash('sha256').update(`${user}:${pass}`).digest();
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
}

app.post('/api/login', (req, res) => {
  const ip = req.ip || 'local';
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, start: now };
  if (now - record.start > 10 * 60 * 1000) { record.count = 0; record.start = now; }
  if (record.count >= 10) return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos.' });
  const { username = '', password = '' } = req.body || {};
  const user = String(username).trim().toLowerCase();
  if (!validCredentials(user, String(password))) {
    record.count += 1;
    loginAttempts.set(ip, record);
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  }
  loginAttempts.delete(ip);
  setSession(req, res, user);
  ok(res, { account: user });
});

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
  ok(res, { ok: true });
});

app.get('/api/session', (req, res) => {
  const user = readSession(req);
  ok(res, { authenticated: Boolean(user), account: user || null });
});

if (ACCOUNTS.size) {
  app.use('/api', (req, res, next) => {
    if (['/health', '/login', '/logout', '/session'].includes(req.path)) return next();
    const user = readSession(req);
    if (!user) return res.status(401).json({ error: 'Sessão expirada.' });
    req.pulsoUser = user;
    next();
  });
}

function ok(res, data) {
  res.set('Cache-Control', 'no-store');
  res.json(data);
}

app.get('/api/ranking', async (req, res, next) => {
  try {
    const date = rankingDate();
    const accounts = listAccounts();
    const users = await Promise.all(accounts.map(async (account) => ({ account, user: await getUser(account) })));
    const entries = users.map(({ account, user }) => rankingEntry(user, account, date));
    const meId = rankingId(req.pulsoUser || 'davi');
    const ranking = sortRanking(entries, meId);
    ok(res, { date, entries: ranking.slice(0, 50), me: ranking.find((entry) => entry.isMe) || null });
  } catch (err) { next(err); }
});

app.get('/api/bootstrap', async (req, res, next) => {
  try {
    const [user, sources, count] = await Promise.all([getUser(req.pulsoUser), getSources(), getQuestions()]);
    ok(res, {
      user,
      sources,
      curriculum: { exam: curriculum.exam, areas: curriculum.areas },
      meta: { totalQuestions: count.length, account: req.pulsoUser },
    });
  } catch (err) { next(err); }
});

/* ---------------- Flashcards públicos ---------------- */
app.get('/api/flashcards/public', async (req, res, next) => {
  try {
    ok(res, { decks: await listPublicDecks(req.pulsoUser) });
  } catch (err) { next(err); }
});

app.get('/api/flashcards/public/:id', async (req, res, next) => {
  try {
    ok(res, { deck: await getPublicDeck(req.pulsoUser, req.params.id) });
  } catch (err) { next(err); }
});

app.post('/api/flashcards/public', async (req, res, next) => {
  try {
    const { deck: deckName, title, description } = req.body || {};
    const user = await getUser(req.pulsoUser);
    const cards = (user.flashcards || []).filter((card) => card.deck === deckName);
    if (!cards.length) return res.status(400).json({ error: 'Escolha um deck seu com pelo menos um cartão.' });
    const deck = await publishPublicDeck({
      account: req.pulsoUser,
      authorName: user.name,
      title: title || deckName,
      description,
      cards,
    });
    ok(res, { deck });
  } catch (err) { next(err); }
});

app.delete('/api/flashcards/public/:id', async (req, res, next) => {
  try {
    ok(res, await removePublicDeck(req.pulsoUser, req.params.id));
  } catch (err) { next(err); }
});

app.post('/api/flashcards/public/:id/import', async (req, res, next) => {
  try {
    const user = await getUser(req.pulsoUser);
    const alreadyImported = (user.flashcards || []).some((card) => card.sharedFrom?.id === req.params.id);
    const deck = await takePublicDeck(req.pulsoUser, req.params.id, { countImport: !alreadyImported });
    const createdAt = new Date().toISOString();
    const cards = deck.cards.map((card, index) => ({
      ...card,
      id: `shared-${deck.id}-${index + 1}`,
      deck: deck.title,
      sharedFrom: {
        id: deck.id,
        title: deck.title,
        author: deck.authorName,
        authorId: deck.authorId,
      },
      createdAt,
    }));
    ok(res, { deck, cards });
  } catch (err) { next(err); }
});

app.get('/api/flashcards/public/:id/export', async (req, res, next) => {
  try {
    const deck = await getPublicDeck(req.pulsoUser, req.params.id);
    const safeName = String(deck.title || 'flashcards').replace(/[^\w\-]+/g, '-').toLowerCase();
    res.setHeader('Content-Disposition', `attachment; filename="pulso-${safeName || 'flashcards'}.json"`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.stringify({
      app: 'pulso',
      version: 1,
      type: 'flashcards',
      exportedAt: new Date().toISOString(),
      deck: {
        title: deck.title,
        description: deck.description,
        authorName: deck.authorName,
        authorId: deck.authorId,
        cards: deck.cards,
      },
    }, null, 2));
  } catch (err) { next(err); }
});

app.post('/api/questions/:id/report', async (req, res, next) => {
  try {
    const data = await readKV('question_reports', { reports: [] });
    data.reports.push({
      id: crypto.randomUUID(), questionId: req.params.id, account: req.pulsoUser,
      chosen: req.body?.chosen || null, note: String(req.body?.note || '').slice(0, 500),
      at: new Date().toISOString(),
    });
    await writeKV('question_reports', { reports: data.reports.slice(-2000) });
    ok(res, { ok: true });
  } catch (err) { next(err); }
});

app.get('/api/questions', async (_req, res, next) => {
  try { ok(res, { questions: await getQuestions() }); } catch (err) { next(err); }
});

app.put('/api/state', async (req, res, next) => {
  try {
    ok(res, await saveUser(req.pulsoUser, req.body || {}));
  } catch (err) { next(err); }
});

app.post('/api/attempts', async (req, res, next) => {
  try {
    const user = await getUser(req.pulsoUser);
    const { questionId } = req.body || {};
    const question = (await getQuestions()).find((q) => q.id === questionId);
    if (!question) return res.status(404).json({ error: 'Questão não encontrada.' });
    const chosen = req.body.chosen || null;
    const attempt = {
      id: crypto.randomUUID(),
      questionId,
      topicId: question.topicId,
      area: question.area,
      chosen,
      correct: question.answer ? chosen === question.answer : null,
      seconds: Number(req.body.seconds) || 0,
      createdAt: new Date().toISOString(),
    };
    user.attempts = [...(user.attempts || []), attempt];
    const day = new Date().toISOString().slice(0, 10);
    user.activity = user.activity || {};
    user.activity[day] = user.activity[day] || { minutes: 0, questions: 0, checklist: 0 };
    user.activity[day].questions += 1;
    await saveUser(req.pulsoUser, user);
    ok(res, attempt);
  } catch (err) { next(err); }
});

app.post('/api/topics/:topicId/review', async (req, res, next) => {
  try {
    const user = await getUser(req.pulsoUser);
    const { recall } = req.body || {};
    const progress = user.progress[req.params.topicId] || {};
    const intervals = { 1: 1, 2: 3, 3: 7, 4: 15, 5: 30 };
    const days = intervals[Math.min(5, Math.max(1, Number(recall) || 3))] || 7;
    const base = new Date();
    base.setDate(base.getDate() + days);
    user.progress[req.params.topicId] = {
      ...progress,
      confidence: Number(recall) || progress.confidence || 3,
      lastReview: new Date().toISOString(),
      nextReview: base.toISOString().slice(0, 10),
    };
    await saveUser(req.pulsoUser, user);
    ok(res, user.progress[req.params.topicId]);
  } catch (err) { next(err); }
});

app.post('/api/import/questions', async (req, res, next) => {
  try {
    const { url, answerUrl, answerType, areaId, institution, year, exam } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Informe a URL da prova.' });
    if (areaId && !curriculum.areas.some((a) => a.id === areaId)) return res.status(400).json({ error: 'Área inválida.' });
    const result = await importFromUrl({
      url, answerUrl, answerType, areaId, institution, year, exam, curriculum,
    });
    if (!result.questions.length) {
      return res.status(422).json({ error: 'Não encontrei questões no formato esperado. Verifique se o PDF tem texto selecionável e alternativas A–E.' });
    }
    const added = await addQuestions(result.questions);
    ok(res, { found: result.questions.length, added: added.length, withoutAnswer: result.questions.filter((q) => !q.answer).length });
  } catch (err) { next(err); }
});

app.post('/api/import/file', async (req, res, next) => {
  try {
    const { name, data, answerText, answerType, areaId, institution, year, exam } = req.body || {};
    if (!data) return res.status(400).json({ error: 'Envie um arquivo PDF ou TXT.' });
    if (areaId && !curriculum.areas.some((a) => a.id === areaId)) return res.status(400).json({ error: 'Área inválida.' });
    const result = await importFromFile({
      name, data, answerText, answerType, areaId, institution, year, exam, curriculum,
    });
    if (!result.questions.length) {
      return res.status(422).json({ error: 'Não encontrei questões no formato esperado. Verifique o PDF (texto selecionável e alternativas A–E) ou selecione a área quando o arquivo não tiver cabeçalho.' });
    }
    const added = await addQuestions(result.questions);
    ok(res, { found: result.questions.length, added: added.length, withoutAnswer: result.questions.filter((q) => !q.answer).length });
  } catch (err) { next(err); }
});

app.post('/api/import/text', async (req, res, next) => {
  try {
    const { text, answerText, answerType, areaId, institution, year, exam } = req.body || {};
    if (!text || String(text).length < 80) return res.status(400).json({ error: 'Cole o texto da prova com as alternativas.' });
    const answerMap = answerText ? parseAnswerKey(answerText, answerType || '1') : null;
    const blocks = parseQuestions(String(text), { areaId });
    const questions = buildQuestions(blocks, {
      answerMap,
      areaDefault: areaId,
      curriculum,
      source: { institution: institution || 'Texto colado', exam: exam || 'Importação manual', year: year ? Number(year) : null, type: 'Importada', url: null, answerUrl: null },
    });
    if (!questions.length) return res.status(422).json({ error: 'Não encontrei questões com 5 alternativas. Verifique o formato (1. enunciado, (A) a (E)).' });
    const added = await addQuestions(questions);
    ok(res, { found: questions.length, added: added.length });
  } catch (err) { next(err); }
});

app.post('/api/import/source/:id', async (req, res, next) => {
  try {
    const source = (await getSources()).find((s) => s.id === req.params.id);
    if (!source) return res.status(404).json({ error: 'Fonte não encontrada.' });
    const result = await importFromUrl({
      url: source.url,
      answerUrl: source.answerUrl,
      answerType: source.answerType,
      institution: source.institution,
      year: source.year,
      exam: source.label,
      curriculum,
    });
    const added = await addQuestions(result.questions);
    ok(res, { found: result.questions.length, added: added.length });
  } catch (err) { next(err); }
});

app.post('/api/ai/question', async (req, res, next) => {
  try {
    const { topicId } = req.body || {};
    const topic = topicIndex.get(topicId);
    if (!topic) return res.status(400).json({ error: 'Escolha um subtópico.' });
    const key = process.env.VENICE_API_KEY || process.env.VENICE_KEY;
    if (!key) return res.status(503).json({ error: 'Configure VENICE_API_KEY para gerar questões.' });
    const model = process.env.VENICE_MODEL || 'deepseek-v4-1-flash-uncensored';
    const prompt = `Crie UMA questão inédita de residência médica, estilo ENARE, sobre "${topic.title}" (${topic.areaName}). Foque em: ${topic.focus}. Nível difícil, caso clínico curto, cinco alternativas (A-E), apenas uma correta. Retorne SOMENTE JSON válido no formato:
{"stem":"enunciado","options":[{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."},{"key":"E","text":"..."}],"answer":"C","explanation":"2 a 4 frases explicando a correta e o principal distrator."}
Sem markdown.`;
    const r = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      dispatcher: new Agent({ connect: { rejectUnauthorized: false } }),
      signal: AbortSignal.timeout(120_000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Encoding': 'identity' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 1400, temperature: 0.5, venice_parameters: { disable_thinking: true } }),
    });
    if (!r.ok) throw new Error(`IA respondeu ${r.status}.`);
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content || '';
    const jsonText = content.match(/\{[\s\S]*\}/)?.[0];
    const parsed = JSON.parse(jsonText);
    if (!parsed.stem || !Array.isArray(parsed.options) || parsed.options.length !== 5 || !'ABCDE'.includes(parsed.answer)) {
      throw new Error('A IA retornou um formato inválido. Tente novamente.');
    }
    const q = {
      id: `ia-${crypto.randomBytes(5).toString('hex')}`,
      sourceKey: `ia-${crypto.randomBytes(5).toString('hex')}`,
      area: topic.area,
      topicId,
      stem: parsed.stem,
      options: parsed.options,
      answer: String(parsed.answer).toUpperCase(),
      status: 'active',
      explanation: parsed.explanation || '',
      difficulty: 4,
      tags: ['Gerada por IA'],
      source: { institution: 'Pulso IA', exam: `Gerada · ${topic.title}`, year: new Date().getFullYear(), type: 'IA', question: 1, url: null, ai: true },
    };
    await addQuestions([q]);
    ok(res, q);
  } catch (err) { next(err); }
});

app.get('/api/export', async (req, res, next) => {
  try {
    const [user, questions] = await Promise.all([getUser(req.pulsoUser), getQuestions()]);
    res.setHeader('Content-Disposition', `attachment; filename="pulso-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ app: 'pulso', version: 1, exportedAt: new Date().toISOString(), user, questions }, null, 2));
  } catch (err) { next(err); }
});

app.post('/api/import/backup', async (req, res, next) => {
  try {
    const { user, questions } = req.body || {};
    if (!user || typeof user !== 'object') return res.status(400).json({ error: 'Backup inválido.' });
    await backupUser(req.pulsoUser, 'antes-import');
    await saveUser(req.pulsoUser, user);
    if (Array.isArray(questions) && questions.length) await addQuestions(questions);
    ok(res, { restored: true });
  } catch (err) { next(err); }
});

app.post('/api/backup', async (req, res, next) => {
  try { ok(res, { file: path.basename(await backupUser(req.pulsoUser, 'manual')) }); } catch (err) { next(err); }
});

app.post('/api/reset', async (req, res, next) => {
  try { ok(res, await resetUser(req.pulsoUser)); } catch (err) { next(err); }
});

/* ---------------- Batalhas ---------------- */
app.post('/api/battles', async (req, res, next) => {
  try {
    const { name, area = 'todas', count = 5, nickname } = req.body || {};
    const pool = (await getQuestions()).filter((q) => q.answer && (area === 'todas' || q.area === area));
    if (pool.length < 5) return res.status(422).json({ error: 'Poucas questões nessa área.' });
    const qs = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(10, Math.max(3, Number(count))));
    const b = await createBattle({ name, area, count: qs.length, questionIds: qs.map((q) => q.id) });
    const joined = await joinBattle(b.id, nickname || 'Anfitrião');
    ok(res, { battle: publicBattle(joined.battle, true), player: joined.player });
  } catch (err) { next(err); }
});

app.get('/api/battles/code/:code', async (req, res, next) => {
  try {
    const b = await getBattleByCode(req.params.code);
    if (!b) return res.status(404).json({ error: 'Código não encontrado.' });
    ok(res, { battle: publicBattle(b, false) });
  } catch (err) { next(err); }
});

app.get('/api/battles/:id', async (req, res, next) => {
  try {
    const b = await getBattle(req.params.id);
    if (!b) return res.status(404).json({ error: 'Batalha não encontrada.' });
    const qs = (await getQuestions()).filter((q) => b.questionIds.includes(q.id));
    ok(res, { battle: publicBattle(b, true), questions: qs });
  } catch (err) { next(err); }
});

app.post('/api/battles/:id/join', async (req, res, next) => {
  try {
    const { player, battle } = await joinBattle(req.params.id, req.body?.name);
    const qs = (await getQuestions()).filter((q) => battle.questionIds.includes(q.id));
    ok(res, { battle: publicBattle(battle, true), player, questions: qs });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/battles/:id/bot', async (req, res, next) => {
  try {
    const b = await addBot(req.params.id);
    ok(res, { battle: publicBattle(b, false) });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/battles/:id/start', async (req, res, next) => {
  try {
    const b = await startBattle(req.params.id);
    const qs = (await getQuestions()).filter((q) => b.questionIds.includes(q.id));
    ok(res, { battle: publicBattle(b, true), questions: qs });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/battles/:id/answer', async (req, res, next) => {
  try {
    const q = (await getQuestions()).find((x) => x.id === req.body?.questionId);
    if (!q) return res.status(404).json({ error: 'Questão não encontrada.' });
    const correct = q.answer && String(req.body?.chosen).toUpperCase() === String(q.answer).toUpperCase();
    const p = await answerBattle(req.params.id, req.body?.playerId, { ...req.body, correct });
    ok(res, { player: { id: p.id, score: p.score, answered: p.answers.length } });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/battles/:id/finish', async (req, res, next) => {
  try { ok(res, { battle: publicBattle(await finishBattle(req.params.id, req.body?.playerId), false) }); } catch (err) { res.status(400).json({ error: err.message }); }
});

/* ---------------- Arena ---------------- */
app.get('/api/arena', async (_req, res, next) => {
  try { ok(res, { arenas: await getArenas(await getQuestions()) }); } catch (err) { next(err); }
});

app.post('/api/arena/:id/join', async (req, res, next) => {
  try {
    const { arena, player } = await joinArena(req.params.id, req.body?.name, await getQuestions());
    const qs = (await getQuestions()).filter((q) => arena.questionIds.includes(q.id));
    ok(res, { arena: arenaPublic(arena), player, questions: qs });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/arena/:id', async (req, res, next) => {
  try {
    const a = await getArena(req.params.id);
    if (!a) return res.status(404).json({ error: 'Arena não encontrada.' });
    const qs = (await getQuestions()).filter((q) => a.questionIds.includes(q.id));
    ok(res, { arena: arenaPublic(a), questions: qs });
  } catch (err) { next(err); }
});

app.post('/api/arena/:id/submit', async (req, res, next) => {
  try { await submitArena(req.params.id, req.body?.playerId, req.body?.answers || {}); ok(res, { ok: true, arena: arenaPublic(await getArena(req.params.id)) }); } catch (err) { res.status(400).json({ error: err.message }); }
});

/* ---------------- Radar ---------------- */
async function radarItems() {
  const seed = JSON.parse(await fs.readFile(path.join(root, 'seed', 'radar.json'), 'utf8'));
  const custom = await readKV('radar_custom', { items: [] });
  const state = await readKV('radar_state', {});
  return [...seed.items, ...custom.items].map((i) => ({
    ...i,
    watched: Boolean(state[i.id]?.hash),
    changedAt: state[i.id]?.changedAt || null,
    checkedAt: state[i.id]?.checkedAt || null,
  }));
}

app.get('/api/radar', async (_req, res, next) => {
  try { ok(res, { items: await radarItems() }); } catch (err) { next(err); }
});

app.post('/api/radar', async (req, res, next) => {
  try {
    const { exam, institution, uf, date, url, note } = req.body || {};
    if (!exam || !url) return res.status(400).json({ error: 'Informe nome e URL.' });
    const data = await readKV('radar_custom', { items: [] });
    const item = { id: `custom-${crypto.randomBytes(4).toString('hex')}`, exam, institution: institution || 'Fonte própria', uf: uf || '—', date: date || null, status: 'monitorado', url, note: note || 'Fonte adicionada manualmente.', custom: true };
    data.items.push(item);
    await writeKV('radar_custom', data);
    ok(res, item);
  } catch (err) { next(err); }
});

app.delete('/api/radar/:id', async (req, res, next) => {
  try {
    const data = await readKV('radar_custom', { items: [] });
    data.items = data.items.filter((i) => i.id !== req.params.id);
    await writeKV('radar_custom', data);
    ok(res, { deleted: true });
  } catch (err) { next(err); }
});

app.post('/api/radar/check', async (_req, res, next) => {
  try {
    const items = await radarItems();
    const state = await readKV('radar_state', {});
    let changed = 0;
    let checked = 0;
    const queue = items.slice(0, 20);
    const worker = async () => {
      while (queue.length) {
        const item = queue.shift();
        try {
          const r = await fetch(item.url, { dispatcher: new Agent({ connect: { rejectUnauthorized: false } }), headers: { 'User-Agent': 'Mozilla/5.0 PulsoRadar/1.0' }, signal: AbortSignal.timeout(18_000) });
          const body = (await r.text()).slice(0, 180_000);
          const hash = crypto.createHash('sha1').update(body).digest('hex');
          const prev = state[item.id];
          if (prev?.hash && prev.hash !== hash) {
            state[item.id] = { hash, changedAt: new Date().toISOString(), checkedAt: new Date().toISOString() };
            changed += 1;
          } else {
            state[item.id] = { hash, changedAt: prev?.changedAt || null, checkedAt: new Date().toISOString() };
          }
          checked += 1;
        } catch {
          state[item.id] = { ...(state[item.id] || {}), checkedAt: new Date().toISOString(), error: true };
        }
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    await writeKV('radar_state', state);
    ok(res, { checked, changed, at: new Date().toISOString() });
  } catch (err) { next(err); }
});

/* ---------------- Calendário ---------------- */
app.get('/api/calendar.ics', async (req, res, next) => {
  try {
    const user = await getUser(req.pulsoUser);
    const fmt = (s) => String(s).replace(/-/g, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pulso//Planner ENARE//PT-BR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Pulso ENARE'];
    for (const w of user.plan.weeks || []) {
      for (const d of w.days) {
        for (const s of d.sessions) {
          if (s.done) continue;
          const start = s.type === 'simulado' ? '090000' : s.type === 'questoes' ? '100000' : '080000';
          const end = s.type === 'simulado' ? '103000' : s.type === 'questoes' ? '103000' : '085000';
          lines.push('BEGIN:VEVENT');
          lines.push(`UID:${s.id}@pulso.local`);
          lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
          lines.push(`DTSTART;TZID=America/Sao_Paulo:${fmt(d.date)}T${start}`);
          lines.push(`DTEND;TZID=America/Sao_Paulo:${fmt(d.date)}T${end}`);
          lines.push(`SUMMARY:${(s.title || 'Sessão de estudo').replace(/[,;]/g, ' ')}`);
          lines.push(`DESCRIPTION:${s.type} · ${s.minutes} min · Pulso`);
          lines.push('BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:Pulso', 'END:VALARM');
          lines.push('END:VEVENT');
        }
      }
    }
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="pulso.ics"');
    res.send(lines.concat('END:VCALENDAR').join('\r\n'));
  } catch (err) { next(err); }
});

/* ---------------- Anki ---------------- */
app.post('/api/import/anki', async (req, res, next) => {
  const tmp = path.join(os.tmpdir(), `pulso-anki-${crypto.randomBytes(5).toString('hex')}`);
  try {
    const raw = String(req.body?.file || '').replace(/^data:.*;base64,/, '');
    if (!raw) return res.status(400).json({ error: 'Envie um arquivo .apkg.' });
    await fs.mkdir(tmp, { recursive: true });
    const zip = new AdmZip(Buffer.from(raw, 'base64'));
    const entry = zip.getEntry('collection.anki21') || zip.getEntry('collection.anki2');
    if (!entry) return res.status(422).json({ error: 'Coleção Anki não encontrada no arquivo.' });
    zip.extractEntryTo(entry, tmp, false, true);
    const dbFile = path.join(tmp, entry.entryName);
    const db = new DatabaseSync(dbFile, { readOnly: true });
    const rows = db.prepare('SELECT flds, tags FROM notes LIMIT 5000').all();
    db.close();
    const strip = (html) => {
      const $ = cheerio.load(String(html || ''));
      $('br').replaceWith('\n');
      return $.root().text().replace(/\n{3,}/g, '\n\n').trim();
    };
    const cards = rows.map((r) => {
      const parts = String(r.flds || '').split('\x1f');
      return { front: strip(parts[0]), back: strip(parts[1] || ''), tags: String(r.tags || '').split(' ').filter(Boolean) };
    }).filter((c) => c.front && c.back);
    ok(res, { cards, total: cards.length });
  } catch (err) { next(err); } finally {
    fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
});

app.get('/api/health', (_req, res) => ok(res, { ok: true, storage: storageMode() }));

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(root, 'dist');
  app.use(express.static(dist, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html') || filePath.endsWith('sw.js')) {
        res.setHeader('Cache-Control', 'no-store, must-revalidate');
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  app.get('/{*splat}', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.sendFile(path.join(dist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => res.redirect('http://localhost:5173'));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  const message = err.name === 'TimeoutError' ? 'A fonte demorou demais para responder.' : (err.message || 'Erro interno.');
  res.status(Number(err.status) || 500).json({ error: message });
});

await initStore();
app.listen(PORT, HOST, () => {
  console.log(`Pulso API em http://${HOST}:${PORT}${APP_PASSWORD ? ' (protegido por senha)' : ''}`);
});
