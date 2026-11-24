import { addDays, iso, parseISO, shuffle, uid } from './utils.js';

const TYPES = {
  teoria: { label: 'Teoria dirigida', minutes: 50, icon: 'book' },
  questoes: { label: 'Questões', minutes: 30, icon: 'list' },
  revisao: { label: 'Revisão ativa', minutes: 20, icon: 'repeat' },
  simulado: { label: 'Simulado semanal', minutes: 90, icon: 'timer' },
};

function difficultyWeight(topic, progress, attempts) {
  const p = progress?.[topic.id] || {};
  const done = (p.done || []).length;
  const conf = p.confidence || 0;
  const arr = attempts.filter((a) => a.topicId === topic.id && a.correct !== null);
  const wrong = arr.filter((a) => !a.correct).length;
  const freshness = done > 0 ? 0.6 : 1.6;
  return Math.max(0.4, topic.weight * (1 + (4 - conf) * 0.35) * freshness + wrong * 0.8);
}

export function generatePlan(user, curriculum, weekCount = 4) {
  const topics = curriculum.areas.flatMap((a) => a.topics.map((t) => ({ ...t, areaName: a.name, areaColor: a.color })));
  const pool = [];
  for (const t of topics) {
    const n = Math.max(1, Math.round(difficultyWeight(t, user.progress, user.attempts || []) * 1.4));
    for (let i = 0; i < n; i++) pool.push(t);
  }
  let bag = shuffle(pool);
  const nextTopic = (excluded, areaCounts) => {
    for (let i = 0; i < bag.length; i++) {
      const candidate = bag[i];
      if (excluded.has(candidate.id)) continue;
      if ((areaCounts[candidate.area] || 0) >= 2) continue;
      bag.splice(i, 1);
      if (bag.length < 12) bag = shuffle(pool);
      return candidate;
    }
    return null;
  };

  const start = parseISO(user.startDate) > parseISO(iso()) ? parseISO(user.startDate) : parseISO(iso());
  const perDay = user.dailyHours >= 5 ? 3 : user.dailyHours >= 3 ? 2 : 1;
  const studyDays = new Set(user.studyDays);
  const weeks = [];
  let cursor = start;
  let bagResets = 0;
  for (let w = 0; w < weekCount; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(cursor, d);
      if (!studyDays.has(date.getDay())) continue;
      const sessions = [];
      const areaCounts = {};
      const excluded = new Set();
      const count = date.getDay() === 0 || date.getDay() === 6 ? Math.max(1, perDay - 1) : perDay;
      for (let s = 0; s < count; s++) {
        const topic = nextTopic(excluded, areaCounts);
        if (!topic) {
          bagResets += 1;
          if (bagResets > 8) break;
          s -= 1;
          continue;
        }
        excluded.add(topic.id);
        areaCounts[topic.area] = (areaCounts[topic.area] || 0) + 1;
        const type = s === 0 ? 'teoria' : s === count - 1 && date.getDay() !== 0 ? 'questoes' : 'revisao';
        sessions.push({
          id: uid(), type, topicId: topic.id, areaId: topic.area,
          title: type === 'teoria' ? topic.title : type === 'questoes' ? `${topic.title} · questões` : `Revisar: ${topic.title}`,
          minutes: TYPES[type].minutes, done: false,
        });
      }
      if (sessions.length) days.push({ date: iso(date), sessions });
    }
    if (days.length) {
      days[days.length - 1].sessions.push({
        id: uid(), type: 'simulado', topicId: null, areaId: null,
        title: 'Simulado semanal · 20 questões mistas', minutes: 90, done: false,
      });
      weeks.push({ start: iso(cursor), days });
    }
    cursor = addDays(cursor, 7);
  }
  return { generatedAt: new Date().toISOString(), weeks };
}

export function todaySessions(plan) {
  const today = iso();
  for (const w of plan.weeks || []) {
    const day = w.days.find((d) => d.date === today);
    if (day) return day.sessions;
  }
  return [];
}

export function planCounts(plan) {
  let total = 0;
  let done = 0;
  for (const w of plan.weeks || []) for (const d of w.days) for (const s of d.sessions) {
    total += 1;
    if (s.done) done += 1;
  }
  return { total, done };
}
