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
