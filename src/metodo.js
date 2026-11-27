import { addDays, iso } from './utils.js';

/**
 * Ciclo de estudo — camada interna que organiza a aprendizagem.
 *
 * Não existe um único "método ideal" universal. A literatura converge em
 * alguns princípios com forte suporte:
 *  1. prática de recuperação (testing effect);
 *  2. prática espaçada / distribuída;
 *  3. intercalação de tipos de problema;
 *  4. elaboração e autoexplicação;
 *  5. feedback corretivo;
 *  6. metacognição e calibração.
 *
 * O app transforma esses princípios em um ciclo de 5 etapas.
 */
export const STAGES = [
  {
    id: 'ativar',
    label: 'Ativar',
    short: 'Ativar',
    description: 'Recupere o que já sabe e transforme o tema em perguntas.',
    why: 'O conhecimento prévio ancora a informação nova.',
    minutes: 5,
  },
  {
    id: 'codificar',
    label: 'Codificar',
    short: 'Codificar',
    description: 'Entenda, elabore e conecte o conteúdo a exemplos concretos.',
    why: 'Elaboração e exemplos dão sentido ao que seria decorado.',
    minutes: 30,
  },
  {
    id: 'recuperar',
    label: 'Recuperar',
    short: 'Recuperar',
    description: 'Feche o material, tente lembrar e depois responda questões.',
    why: 'Testar a memória fortalece mais do que reler.',
    minutes: 20,
  },
  {
    id: 'revisar',
    label: 'Revisar',
    short: 'Revisar',
    description: 'Volte em intervalos crescentes, com recuperação ativa.',
    why: 'O espaçamento combate o esquecimento de longo prazo.',
    minutes: 15,
  },
  {
    id: 'intercalar',
    label: 'Intercalar',
    short: 'Intercalar',
    description: 'Misture temas e áreas em treinos e simulados.',
    why: 'A mistura treina discriminação e transferência.',
    minutes: 30,
  },
];

export const STAGE_LABEL = Object.fromEntries(STAGES.map((stage) => [stage.id, stage.label]));

export const SESSION_STAGE = {
  teoria: 'codificar',
  questoes: 'recuperar',
  revisao: 'revisar',
  simulado: 'intercalar',
};

/** Mapeia cada item do checklist para uma etapa do ciclo. */
export function checklistStage(index, total = 7) {
  if (index >= total - 1) return 'revisar';
  if (index === total - 2) return 'recuperar';
  return 'codificar';
}

export function stageProgress(progress = {}, checklistLength = 7) {
  const done = new Set(Array.isArray(progress.done) ? progress.done : []);
  const groups = { codificar: [], recuperar: [], revisar: [] };
  for (let i = 0; i < checklistLength; i += 1) groups[checklistStage(i, checklistLength)].push(i);
  return {
    codificar: { done: groups.codificar.filter((i) => done.has(i)).length, total: groups.codificar.length },
    recuperar: { done: groups.recuperar.filter((i) => done.has(i)).length, total: groups.recuperar.length },
    revisar: { done: groups.revisar.filter((i) => done.has(i)).length, total: groups.revisar.length },
    activated: Boolean(progress.activation?.trim()),
  };
}

export function stageStatus(progress = {}, checklistLength = 7) {
  const p = stageProgress(progress, checklistLength);
  const complete = (s) => s.total > 0 && s.done >= s.total;
  return {
    ativar: p.activated ? 'done' : 'current',
    codificar: complete(p.codificar) ? 'done' : p.codificar.done > 0 ? 'current' : 'next',
    recuperar: complete(p.recuperar) ? 'done' : p.recuperar.done > 0 || p.codificar.done >= p.codificar.total ? 'current' : 'next',
    revisar: complete(p.revisar) || Boolean(progress.nextReview) ? 'done' : p.recuperar.done > 0 ? 'current' : 'next',
    intercalar: progress.interleavedAt ? 'current' : 'next',
  };
}

export const TOPIC_STAGE_LABEL = {
  novo: 'A iniciar',
  codificado: 'Codificado',
  recuperado: 'Recuperado',
  revisado: 'Revisado',
  dominado: 'Dominado',
};

export function topicStage(progress = {}, checklistLength = 7) {
  const done = new Set(Array.isArray(progress.done) ? progress.done.filter((i) => i < checklistLength) : []);
  if (progress.mastered || (done.size >= checklistLength && (progress.confidence || 0) >= 4)) return 'dominado';
  if (done.has(checklistLength - 1)) return 'revisado';
  if (done.has(checklistLength - 2)) return 'recuperado';
  if (done.size > 0) return 'codificado';
  return 'novo';
}

export const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];

/**
 * Repetição espaçada adaptativa (inspirada em SM-2/Leitner).
 * A nota 1–5 ajusta o intervalo e a facilidade do tema.
 */
export function adaptiveReview(previous = {}, rating = 3, today = new Date()) {
  const score = Math.min(5, Math.max(1, Math.round(Number(rating) || 3)));
  const reps = Math.max(0, Number(previous.reps) || 0) + 1;
  const easeBefore = Math.min(2.9, Math.max(1.3, Number(previous.ease) || 2.5));
  const delta = score >= 5 ? 0.15 : score >= 4 ? 0.1 : score === 3 ? 0 : score === 2 ? -0.15 : -0.25;
  const ease = Math.min(2.9, Math.max(1.3, easeBefore + delta));
  const base = REVIEW_INTERVALS[Math.min(reps - 1, REVIEW_INTERVALS.length - 1)];
  const modifier = score <= 2 ? 0.6 : score === 3 ? 1 : score === 4 ? 1.15 : 1.3;
  const interval = Math.max(1, Math.round(base * modifier * (ease / 2.5)));
  return {
    reps,
    ease: Number(ease.toFixed(2)),
    interval,
    lastRating: score,
    lastReview: today.toISOString(),
    nextReview: iso(addDays(today, interval)),
  };
}

export function topicCalibration(progress = {}, attempts = [], topicId) {
  const confidence = Number(progress?.[topicId]?.confidence) || 0;
  const answered = attempts.filter((a) => a.topicId === topicId && a.correct !== null);
  const accuracy = answered.length ? Math.round((answered.filter((a) => a.correct).length / answered.length) * 100) : null;
  const confidencePct = confidence ? confidence * 20 : null;
  return {
    confidence: confidencePct,
    accuracy,
    total: answered.length,
    gap: confidencePct != null && accuracy != null ? confidencePct - accuracy : null,
  };
}

export function calibration(progress = {}, attempts = []) {
  const values = Object.values(progress || {})
    .map((p) => Number(p?.confidence) || 0)
    .filter(Boolean);
  const answered = attempts.filter((a) => a.correct !== null);
  const confidencePct = values.length ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 20) : null;
  const accuracy = answered.length ? Math.round((answered.filter((a) => a.correct).length / answered.length) * 100) : null;
  return {
    confidence: confidencePct,
    accuracy,
    gap: confidencePct != null && accuracy != null ? confidencePct - accuracy : null,
    samples: values.length,
    answered: answered.length,
  };
}

export function planStageCounts(plan = {}) {
  const counts = { codificar: 0, recuperar: 0, revisar: 0, intercalar: 0 };
  for (const week of plan.weeks || []) {
    for (const day of week.days || []) {
      for (const session of day.sessions || []) {
        const stage = SESSION_STAGE[session.type];
        if (stage) counts[stage] += 1;
      }
    }
  }
  return counts;
}

export function calibrationLabel(gap) {
  if (gap == null) return 'Sem dados suficientes';
  if (gap > 15) return 'Você está se sentindo mais seguro do que o desempenho mostra. Teste antes de reler.';
  if (gap < -15) return 'Você acerta mais do que imagina. Registre confiança com mais frequência.';
  return 'Boa calibração: sua confiança acompanha o desempenho.';
}
