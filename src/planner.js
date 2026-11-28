import { addDays, accuracyBySpecialty, examPhase, iso, parseISO, topicPriority, topicStatus, uid } from './utils.js';

const TYPES = {
  teoria: { label: 'Codificar', minutes: 50, icon: 'book' },
  questoes: { label: 'Recuperar', minutes: 30, icon: 'list' },
  revisao: { label: 'Revisar', minutes: 20, icon: 'repeat' },
  simulado: { label: 'Intercalar', minutes: 90, icon: 'timer' },
};

function sessionFor(type, topic = null) {
  return {
    id: uid(),
    type,
    topicId: topic?.id || null,
    areaId: topic?.area || null,
    title: type === 'simulado'
      ? 'Simulado semanal · 20 questões mistas'
      : type === 'teoria'
        ? topic.title
        : type === 'questoes'
          ? `${topic.title} · recuperação`
          : `Revisar: ${topic.title}`,
    minutes: TYPES[type].minutes,
    done: false,
  };
}

/**
 * Planner personalizado: todos os temas ficam disponíveis. A ordem nasce do
 * que o aluno marcou como difícil, dos erros, do peso/incidência das provas e
 * da proximidade da prova — sem bloquear ou privilegiar um nível fixo.
 */
export function generatePlan(user, curriculum, weekCount = 4) {
  const progress = user.progress || {};
  const attempts = user.attempts || [];
  const difficultyGroups = Array.isArray(user.difficultyGroups) ? user.difficultyGroups : [];
  const phase = examPhase(user.examDate);
  const specialtyStats = new Map(
    accuracyBySpecialty(curriculum, attempts).map((item) => [item.group, item]),
  );
  const topics = curriculum.areas.flatMap((a) => a.topics.map((t) => ({ ...t, areaName: a.name, areaColor: a.color })));
  const start = parseISO(user.startDate) > parseISO(iso()) ? parseISO(user.startDate) : parseISO(iso());
  const studyDays = new Set(user.studyDays);
  const perDay = user.dailyHours >= 5 ? 3 : user.dailyHours >= 3 ? 2 : 1;

  const weeksDates = [];
  let cursor = start;
  for (let w = 0; w < weekCount; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(cursor, d);
      if (studyDays.has(date.getDay())) week.push(iso(date));
    }
    weeksDates.push(week);
    cursor = addDays(cursor, 7);
  }
  const dates = weeksDates.flat();
  const dayMap = new Map(dates.map((date) => [date, []]));
  const loads = new Map(dates.map((date) => [date, 0]));
  const keys = new Set();

  const capacityFor = (date) => {
    const day = new Date(`${date}T12:00:00`).getDay();
    return day === 0 || day === 6 ? Math.max(1, perDay - 1) : perDay;
  };

  const add = (date, type, topic) => {
    if (!date || !dayMap.has(date)) return false;
    const key = `${date}|${type}|${topic.id}`;
    if (keys.has(key)) return false;
    keys.add(key);
    dayMap.get(date).push({ type, topic });
    loads.set(date, (loads.get(date) || 0) + 1);
    return true;
  };

  // Tenta a data desejada e desloca no máximo alguns dias de estudo.
  const scheduleAt = (index, type, topic, shift = 3) => {
    for (let k = 0; k <= shift; k += 1) {
      const date = dates[index + k];
      if (!date) return false;
      if (loads.get(date) < capacityFor(date)) return add(date, type, topic);
    }
    return false;
  };

  // Revisões que já venceram ou vencem dentro da janela do plano.
  for (const topic of topics) {
    const due = progress[topic.id]?.nextReview;
    if (!due) continue;
    const index = dates.findIndex((date) => date >= due);
    if (index >= 0) scheduleAt(index, 'revisao', topic, 6);
  }

  const queue = topics
    .filter((topic) => topicStatus(progress[topic.id], topic.checklist.length) !== 'dominado')
    .map((topic) => ({
      ...topic,
      priority: topicPriority(topic, { progress, attempts, difficultyGroups, specialtyStats, phase }),
    }))
    .sort((a, b) => b.priority - a.priority);

  const introduced = new Set();
  for (let i = 0; i < dates.length; i += 1) {
    const date = dates[i];
    const dateCapacity = capacityFor(date);
    const areaCounts = (dayMap.get(date) || []).reduce((acc, session) => {
      acc[session.topic.area] = (acc[session.topic.area] || 0) + 1;
      return acc;
    }, {});

    // No máximo um tema novo por dia: o restante da capacidade é recuperação/revisão.
    let newToday = 0;
    while (newToday < 1 && loads.get(date) < dateCapacity) {
      const index = queue.findIndex((topic) => !introduced.has(topic.id) && (areaCounts[topic.area] || 0) < 2);
      if (index < 0) break;
      const [topic] = queue.splice(index, 1);
      introduced.add(topic.id);
      areaCounts[topic.area] = (areaCounts[topic.area] || 0) + 1;
      add(date, 'teoria', topic);
      scheduleAt(i + 1, 'questoes', topic, 2);
      scheduleAt(i + 3, 'revisao', topic, 3);
      scheduleAt(i + 7, 'revisao', topic, 4);
      newToday += 1;
    }
  }

  const order = { questoes: 0, revisao: 1, teoria: 2 };
  const weeks = weeksDates.map((weekDates, w) => {
    const days = weekDates.map((date) => {
      const sessions = (dayMap.get(date) || [])
        .sort((a, b) => (order[a.type] ?? 3) - (order[b.type] ?? 3))
        .map(({ type, topic }) => sessionFor(type, topic));
      return { date, sessions };
    });
    const last = days[days.length - 1];
    if (last) last.sessions.push(sessionFor('simulado'));
    return { start: iso(addDays(start, w * 7)), days };
  }).filter((week) => week.days.length);

  return {
    generatedAt: new Date().toISOString(),
    mode: 'personalizado',
    referenceLevel: Number(user.level) || 1,
    phase: phase.id,
    difficultyGroups,
    weeks,
  };
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
