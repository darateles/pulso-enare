import crypto from 'node:crypto';
import * as cheerio from 'cheerio';
import { extractText } from 'unpdf';
import { Agent } from 'undici';
import { hashStem } from './store.js';

// Alguns sites oficiais servem cadeia TLS incompleta; o importador é somente leitura.
const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });

const MAX_BYTES = 18 * 1024 * 1024;

const AREA_HINTS = [
  ['clinica', /cl[ií]nica m[eé]dica/i],
  ['cirurgia', /cirurgia geral/i],
  ['pediatria', /pediatria/i],
  ['go', /ginecologia e obstetr[ií]cia|obstetr[ií]cia e ginecologia/i],
  ['preventiva', /medicina preventiva|sa[uú]de coletiva|medicina de fam[ií]lia/i],
];

export async function fetchText(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('URL inválida.');
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error('Use uma URL http(s).');
  const res = await fetch(parsed, {
    redirect: 'follow',
    dispatcher,
    signal: AbortSignal.timeout(45_000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36 PulsoEstudos/1.0',
      Accept: 'text/html,application/pdf,text/plain;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`A fonte respondeu ${res.status}.`);
  const type = (res.headers.get('content-type') || '').toLowerCase();
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_BYTES) throw new Error('Arquivo maior que 18 MB.');
  if (type.includes('pdf') || buffer.subarray(0, 4).toString() === '%PDF') {
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
    return { text: Array.isArray(text) ? text.join('\n') : text, kind: 'pdf' };
  }
  if (type.includes('html') || type.includes('text')) {
    const html = buffer.toString('utf8');
    if (type.includes('text/plain')) return { text: html, kind: 'txt' };
    const $ = cheerio.load(html);
    $('script,style,noscript,nav,footer,header,form,svg').remove();
    $('br').replaceWith('\n');
    $('p,div,li,h1,h2,h3,h4,tr').each((_, el) => {
      $(el).append('\n');
    });
    return { text: $('main').length ? $('main').text() : $('body').text(), kind: 'html' };
  }
  throw new Error('Formato não suportado. Use página HTML ou PDF.');
}

function cleanLine(line) {
  return line.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

function mapAreaName(name) {
  for (const [id, re] of AREA_HINTS) if (re.test(name)) return id;
  return null;
}

export function parseQuestions(rawText, { areaId, startAt = 1 } = {}) {
  const lines = rawText.split(/\r?\n/).map(cleanLine);
  let currentArea = areaId || null;
  const blocks = [];
  let current = null;
  let expected = startAt;

  const push = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (const line of lines) {
    if (!line) continue;
    if (line.length < 80) {
      const detected = mapAreaName(line);
      if (detected) {
        push();
        currentArea = detected;
        continue;
      }
      // Ignore page headers, instructions and answer-key lines.
      if (/resid[eê]ncia m[eé]dica|fgv conhecimento|p[aá]gina \d+|tipo \d|gabarito|quest[aã]o anulada|leia-se|concurso/i.test(line)) continue;
    }
    const m = line.match(/^(\d{1,3})\s*(?:[.)\-–]\s*)?(.*)$/);
    const candidate = m && Number(m[1]) === expected && (m[2].length > 0 || line.trim().length < 5);
    if (candidate && (current || blocks.length === 0 || true)) {
      push();
      current = { number: Number(m[1]), area: currentArea, stem: [m[2]], options: [] };
      expected += 1;
      continue;
    }
    if (!current) continue;
    const opt = line.match(/^\(?([A-E])\)?[.)\-–]\s*(.+)$/);
    if (opt) {
      current.options.push({ key: opt[1], text: opt[2].trim() });
    } else if (current.options.length && current.stem.length && line.length < 4 && /^[A-E]$/.test(line)) {
      // Rare layout where the option letter is alone.
      current.options.push({ key: line, text: '' });
    } else if (current.options.length) {
      const last = current.options[current.options.length - 1];
      last.text = `${last.text} ${line}`.trim();
    } else {
      current.stem.push(line);
    }
  }
  push();

  return blocks
    .map((block) => ({
      ...block,
      stem: block.stem.join(' ').replace(/\s+/g, ' ').trim(),
      options: block.options.map((o) => ({ key: o.key, text: o.text.replace(/\s+/g, ' ').trim() })),
    }))
    .filter((q) => q.stem.length >= 40 && q.options.length === 5 && q.options.every((o) => o.text.length > 0));
}

export function parseAnswerKey(text, type = '1') {
  const normalized = text.replace(/\u00a0/g, ' ');
  const patterns = [
    new RegExp(`(?:TIPO|PROVA)\\s*0?${type}\\b([\\s\\S]*?)(?=(?:TIPO|PROVA)\\s*0?[1-4]\\b|MINIST[EÉ]RIO|$)`, 'i'),
  ];
  let section = null;
  for (const re of patterns) {
    const m = normalized.match(re);
    if (m) {
      section = m[1];
      break;
    }
  }
  if (!section) section = normalized;
  const map = new Map();
  const tokens = section.split(/\s+/);
  const pending = [];
  for (const token of tokens) {
    if (/^\d{1,3}$/.test(token)) pending.push(Number(token));
    else if (/^[A-E*]$/.test(token) && pending.length) {
      map.set(pending.shift(), token === '*' ? null : token);
    }
  }
  return map;
}

const STOP = new Set('para com dos das que como sobre pela pelo entre seus suas sinais quadro manejo diagnóstico tratamento principais'.split(' '));
function tokens(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .split(/[^a-z0-9]+/).filter((t) => t.length >= 5 && !STOP.has(t));
}

export function guessTopic(areaId, text, curriculum) {
  const area = curriculum.areas.find((a) => a.id === areaId);
  if (!area) return null;
  const hay = new Set(tokens(text));
  let best = null;
  let bestScore = -1;
  for (const topic of area.topics) {
    const bag = [...tokens(topic.title), ...tokens(topic.summary), ...tokens(topic.keyPoints.join(' '))];
    let score = 0;
    for (const t of new Set(bag)) if (hay.has(t)) score += 1;
    score += topic.weight * 0.08;
    if (score > bestScore) {
      bestScore = score;
      best = topic.id;
    }
  }
  return best;
}

export function buildQuestions(blocks, { answerMap, areaDefault, curriculum, source }) {
  const out = [];
  for (const block of blocks) {
    const area = block.area || areaDefault;
    if (!area) continue;
    const answer = answerMap?.get(block.number)?.toUpperCase() || null;
    const topicId = guessTopic(area, `${block.stem} ${block.options.map((o) => o.text).join(' ')}`, curriculum);
    out.push({
      area,
      topicId,
      sourceKey: source.url ? `${source.url}#${block.number}` : null,
      stem: block.stem.slice(0, 5000),
      options: block.options,
      answer,
      status: answer ? 'active' : 'sem-gabarito',
      explanation: answer ? '' : 'Importada sem gabarito. Confira a resposta na fonte oficial.',
      difficulty: 3,
      tags: ['Importada'],
      hash: hashStem(block.stem),
      source: { ...source, question: block.number },
    });
  }
  return out;
}

export async function importFromFile({ name, data, answerText, answerType, areaId, institution, year, exam, curriculum }) {
  const buffer = Buffer.from(String(data || '').replace(/^data:.*;base64,/, ''), 'base64');
  if (!buffer.length) throw new Error('Arquivo vazio.');
  if (buffer.length > MAX_BYTES) throw new Error('Arquivo maior que 18 MB.');
  let text;
  if (buffer.subarray(0, 4).toString() === '%PDF' || /\.pdf$/i.test(name || '')) {
    const result = await extractText(new Uint8Array(buffer), { mergePages: true });
    text = Array.isArray(result.text) ? result.text.join('\n') : result.text;
  } else {
    text = buffer.toString('utf8');
  }
  if (!text || text.length < 80) throw new Error('Não consegui ler texto suficiente do arquivo. Use PDF com texto selecionável ou TXT.');
  const detectedArea = areaId || mapAreaName(text.slice(0, 5000));
  const answerMap = answerText ? parseAnswerKey(answerText, answerType || '1') : null;
  const blocks = parseQuestions(text, { areaId: areaId || detectedArea });
  const questions = buildQuestions(blocks, {
    answerMap,
    areaDefault: areaId || detectedArea,
    curriculum,
    source: {
      institution: institution || 'Arquivo importado',
      exam: exam || name || 'Importação por arquivo',
      year: year ? Number(year) : null,
      type: 'Importada',
      url: null,
      answerUrl: null,
    },
  });
  return { questions, textLength: text.length };
}

export async function importFromUrl({ url, answerUrl, answerType, areaId, institution, year, exam, curriculum }) {
  const sourceLabel = `${institution || 'Fonte externa'}${year ? ` · ${year}` : ''}`;
  const { text } = await fetchText(url);
  let answerMap = null;
  if (answerUrl) {
    try {
      const key = await fetchText(answerUrl);
      answerMap = parseAnswerKey(key.text, answerType || '1');
    } catch {
      answerMap = null;
    }
  }
  const blocks = parseQuestions(text, { areaId });
  const questions = buildQuestions(blocks, {
    answerMap,
    areaDefault: areaId,
    curriculum,
    source: {
      institution: institution || 'Fonte externa',
      exam: exam || sourceLabel,
      year: year ? Number(year) : null,
      type: 'Importada',
      url,
      answerUrl: answerUrl || null,
    },
  });
  return { questions, extracted: text.length, kind: blocks.length ? 'ok' : 'empty' };
}

export function importStats(questions) {
  return {
    id: crypto.randomBytes(6).toString('hex'),
    total: questions.length,
    withAnswer: questions.filter((q) => q.answer).length,
  };
}
