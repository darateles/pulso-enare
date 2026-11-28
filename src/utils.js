export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAYS_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export function iso(d = new Date()) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function parseISO(s) {
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return new Date(s);
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function fmtDate(s, opts = { day: '2-digit', month: 'short' }) {
  const d = typeof s === 'string' ? parseISO(s) : s;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', opts).format(d);
}

export function fmtLong(s) {
  return fmtDate(s, { weekday: 'long', day: '2-digit', month: 'long' });
}

export function daysUntil(s) {
  const target = parseISO(s);
  if (!target) return 0;
  const now = parseISO(iso());
  return Math.round((target - now) / 86400000);
}

export function examPhase(examDate) {
  if (!examDate) {
    return { id: 'sem-data', label: 'Sem data', days: null, description: 'Defina a data da prova para calibrar a reta final.' };
  }
  const days = daysUntil(examDate);
  if (!Number.isFinite(days)) {
    return { id: 'sem-data', label: 'Sem data', days: null, description: 'Defina a data da prova para calibrar a reta final.' };
  }
  if (days <= 30) {
    return { id: 'prova', label: 'Reta final', days, description: 'Prioridade máxima para o que mais cai, revisão e simulados.' };
  }
  if (days <= 90) {
    return { id: 'intensivo', label: 'Intensivo', days, description: 'Questões, revisão dirigida e especialidades de maior incidência.' };
  }
  if (days <= 180) {
    return { id: 'consolidacao', label: 'Consolidação', days, description: 'Aprofundar o que mais cai e fechar lacunas por desempenho.' };
  }
  if (days <= 365) {
    return { id: 'construcao', label: 'Construção', days, description: 'Base consistente com os temas de maior peso no ENARE.' };
  }
  return { id: 'fundamentos', label: 'Fundamentos', days, description: 'Tempo para construir base, revisão espaçada e constância.' };
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function minutesLabel(m) {
  const v = Math.round(Number(m) || 0);
  if (!v) return '0 min';
  if (v < 60) return `${v} min`;
  const h = Math.floor(v / 60);
  const r = v % 60;
  return r ? `${h}h ${r}min` : `${h}h`;
}

export function topicStatus(progress = {}, checklistLength = 7) {
  const done = Array.isArray(progress.done) ? progress.done.length : 0;
  if (progress.mastered || (done >= checklistLength && (progress.confidence || 0) >= 4)) return 'dominado';
  if (done > 0) return 'estudando';
  return 'novo';
}

export function topicProgress(progress = {}, checklistLength = 7) {
  const done = Array.isArray(progress.done) ? progress.done.filter((i) => i < checklistLength).length : 0;
  return Math.round((done / checklistLength) * 100);
}

export function areaStats(area, progress) {
  const totalSteps = area.topics.reduce((s, t) => s + t.checklist.length, 0);
  const doneSteps = area.topics.reduce((s, t) => {
    const p = progress[t.id];
    return s + (Array.isArray(p?.done) ? p.done.filter((i) => i < t.checklist.length).length : 0);
  }, 0);
  const started = area.topics.filter((t) => (progress[t.id]?.done || []).length > 0).length;
  const mastered = area.topics.filter((t) => topicStatus(progress[t.id], t.checklist.length) === 'dominado').length;
  return {
    pct: totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 0,
    started,
    mastered,
    total: area.topics.length,
  };
}

export function globalStats(curriculum, progress) {
  const areas = curriculum.areas.map((a) => ({ area: a, ...areaStats(a, progress) }));
  const steps = areas.reduce((s, a) => s + a.area.topics.reduce((x, t) => x + t.checklist.length, 0), 0);
  const done = areas.reduce((s, a) => s + a.area.topics.reduce((x, t) => {
    const p = progress[t.id];
    return x + (Array.isArray(p?.done) ? p.done.filter((i) => i < t.checklist.length).length : 0);
  }, 0), 0);
  return {
    pct: steps ? Math.round((done / steps) * 100) : 0,
    mastered: areas.reduce((s, a) => s + a.mastered, 0),
    started: areas.reduce((s, a) => s + a.started, 0),
    totalTopics: curriculum.areas.reduce((s, a) => s + a.topics.length, 0),
    areas,
  };
}

export function dueReviews(curriculum, progress) {
  const today = iso();
  const out = [];
  for (const a of curriculum.areas) {
    for (const t of a.topics) {
      const p = progress[t.id];
      if (p?.nextReview && p.nextReview <= today) out.push({ topic: t, area: a, progress: p });
    }
  }
  return out.sort((x, y) => x.progress.nextReview.localeCompare(y.progress.nextReview));
}

export function streak(user) {
  let count = 0;
  let d = parseISO(iso());
  const active = (day) => {
    const a = user.activity?.[day];
    return a && ((a.minutes || 0) > 0 || (a.questions || 0) > 0 || (a.checklist || 0) > 0);
  };
  if (!active(iso(d)) && !active(iso(addDays(d, -1)))) return 0;
  if (!active(iso(d))) d = addDays(d, -1);
  while (active(iso(d))) {
    count += 1;
    d = addDays(d, -1);
  }
  return count;
}

export function accuracyByArea(curriculum, attempts) {
  return curriculum.areas.map((area) => {
    const arr = attempts.filter((a) => a.area === area.id && a.correct !== null);
    const right = arr.filter((a) => a.correct).length;
    return { area, total: arr.length, right, pct: arr.length ? Math.round((right / arr.length) * 100) : null };
  });
}

export function accuracyBySpecialty(curriculum, attempts) {
  const topicInfo = new Map();
  const groups = new Map();
  for (const area of curriculum.areas) {
    for (const topic of area.topics) {
      topicInfo.set(topic.id, { group: topic.group, areaId: area.id, areaName: area.name });
      if (!groups.has(topic.group)) {
        groups.set(topic.group, {
          group: topic.group,
          areaId: area.id,
          areaName: area.name,
          total: 0,
          right: 0,
        });
      }
    }
  }
  for (const attempt of attempts) {
    if (attempt.correct === null || attempt.correct === undefined) continue;
    const info = topicInfo.get(attempt.topicId);
    if (!info) continue;
    const item = groups.get(info.group);
    item.total += 1;
    if (attempt.correct) item.right += 1;
  }
  return [...groups.values()]
    .map((item) => ({ ...item, pct: item.total ? Math.round((item.right / item.total) * 100) : null }))
    .sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101) || b.total - a.total);
}

export function topicPriority(topic, {
  progress = {},
  attempts = [],
  difficultyGroups = [],
  specialtyStats = new Map(),
  phase = examPhase(),
} = {}) {
  const p = progress?.[topic.id] || {};
  const done = Array.isArray(p.done) ? p.done.length : 0;
  const confidence = Number(p.confidence) || 0;
  let wrong = 0;
  for (const attempt of attempts) {
    if (attempt.topicId === topic.id && attempt.correct === false) wrong += 1;
  }
  const groupStat = specialtyStats.get(topic.group);
  const groupAccuracy = groupStat?.total ? groupStat.pct / 100 : null;
  const freshness = done > 0 ? 0.65 : 1.6;
  const due = p.nextReview && p.nextReview <= iso() ? 1.8 : 1;
  const base = (Number(topic.weight) || 0) * (1 + (4 - confidence) * 0.35) * freshness + wrong * 1.1;
  const difficulty = difficultyGroups.includes(topic.group) ? 2.5 : 1;
  const lowAccuracy = groupAccuracy == null ? 1 : 1 + (1 - groupAccuracy) * 0.8;
  const incidence = 1 + (Number(topic.incidence) || 0) / 25;
  const phaseBoost = {
    prova: 1.8,
    intensivo: 1.45,
    consolidacao: 1.2,
    construcao: 1.05,
    fundamentos: 1,
    'sem-data': 1,
  }[phase.id] || 1;
  const started = done > 0 ? 1.15 : 1;
  return Math.max(0.2, base * difficulty * lowAccuracy * incidence * phaseBoost * started * due);
}

export function weakTopics(curriculum, attempts, progress, limit = 5) {
  const out = [];
  for (const a of curriculum.areas) {
    for (const t of a.topics) {
      const arr = attempts.filter((x) => x.topicId === t.id && x.correct !== null);
      const wrong = arr.filter((x) => !x.correct).length;
      if (!wrong) continue;
      out.push({ topic: t, area: a, wrong, total: arr.length, pct: Math.round((wrong / arr.length) * 100), priority: wrong * 10 + t.weight * 3 - (progress[t.id]?.confidence || 0) });
    }
  }
  return out.sort((a, b) => b.priority - a.priority).slice(0, limit);
}

export function weightedPick(items, weightFn, rng = Math.random) {
  if (!items.length) return null;
  const total = items.reduce((s, x) => s + Math.max(0.001, weightFn(x)), 0);
  let r = rng() * total;
  for (const item of items) {
    r -= Math.max(0.001, weightFn(item));
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function normalize(s = '') {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function pct(n, d) {
  return d ? Math.round((n / d) * 100) : 0;
}

export function uid() {
  return (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`);
}

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('') || 'P';
}

export function groupBy(array, fn) {
  return array.reduce((acc, item) => {
    (acc[fn(item)] ||= []).push(item);
    return acc;
  }, {});
}
