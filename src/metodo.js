import { addDays, iso } from './utils.js';

/**
 * Método Pulso — camada de aprendizagem baseada em evidências.
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

/** Princípios e referências usados na página Método. */
export const PRINCIPLES = [
  {
    id: 'recuperacao',
    name: 'Prática de recuperação',
    summary: 'Tentar lembrar sem consultar é mais eficaz do que reler ou grifar.',
    application: 'Questões fechadas, recall livre e flashcards antes de abrir o resumo.',
    evidence: 'Efeito de teste (testing effect).',
    refs: [
      { label: 'Roediger & Karpicke, 2006', href: 'https://doi.org/10.1111/j.1467-9280.2006.01693.x' },
      { label: 'Dunlosky et al., 2013', href: 'https://doi.org/10.1177/1529100612453266' },
      { label: 'Larsen, Butler & Roediger, 2008 (medicina)', href: 'https://doi.org/10.1111/j.1365-2923.2008.03124.x' },
    ],
  },
  {
    id: 'espacamento',
    name: 'Prática espaçada',
    summary: 'Distribuir o estudo no tempo retém mais do que concentrar tudo em um dia.',
    application: 'Revisões adaptativas em D+1, D+3, D+7, D+14, D+30 e D+60.',
    evidence: 'Efeito de espaçamento (spacing effect).',
    refs: [
      { label: 'Cepeda et al., 2006', href: 'https://doi.org/10.1037/0033-2909.132.3.354' },
      { label: 'Dunlosky et al., 2013', href: 'https://doi.org/10.1177/1529100612453266' },
    ],
  },
  {
    id: 'intercalacao',
    name: 'Intercalação',
    summary: 'Alternar temas e tipos de problema ajuda a discriminar quando aplicar cada conduta.',
    application: 'Treino intercalado e simulados mistos, em vez de só blocos de uma matéria.',
    evidence: 'Evidência robusta em matemática; promissora em ciências da saúde.',
    refs: [
      { label: 'Rohrer & Taylor, 2007', href: 'https://doi.org/10.1007/s11251-007-9015-8' },
      { label: 'Dunlosky et al., 2013', href: 'https://doi.org/10.1177/1529100612453266' },
    ],
  },
  {
    id: 'elaboracao',
    name: 'Elaboração e autoexplicação',
    summary: 'Perguntar “por quê?” e explicar com as próprias palavras aprofunda a compreensão.',
    application: 'Perguntas-guia antes da teoria, resumo ativo e justificativa da conduta.',
    evidence: 'Elaborative interrogation e self-explanation.',
    refs: [
      { label: 'Chi et al., 1994', href: 'https://doi.org/10.1207/s15516709cog1803_3' },
      { label: 'Dunlosky et al., 2013', href: 'https://doi.org/10.1177/1529100612453266' },
    ],
  },
  {
    id: 'feedback',
    name: 'Feedback corretivo',
    summary: 'Saber por que errou vale mais do que apenas ver o gabarito.',
    application: 'Comentário da alternativa, caderno de erros e nova tentativa depois.',
    evidence: 'Feedback orientado a tarefa e processo.',
    refs: [
      { label: 'Hattie & Timperley, 2007', href: 'https://doi.org/10.3102/003465430298487' },
      { label: 'Butler & Winne, 1995', href: 'https://doi.org/10.3102/00346543065002245' },
    ],
  },
  {
    id: 'metacognicao',
    name: 'Metacognição e calibração',
    summary: 'Perceber o que você realmente sabe evita a armadilha da familiaridade.',
    application: 'Autoavaliação de confiança comparada ao desempenho real em questões.',
    evidence: 'Julgamentos de aprendizagem e calibração.',
    refs: [
      { label: 'Dunlosky & Metcalfe, 2009', href: 'https://scholar.google.com/scholar?q=Dunlosky+Metcalfe+2009+Metacognition' },
      { label: 'Bjork, Dunlosky & Kornell, 2013', href: 'https://doi.org/10.1146/annurev-psych-113011-143823' },
    ],
  },
  {
    id: 'carga',
    name: 'Carga cognitiva',
    summary: 'Segmentar o conteúdo e usar exemplos reduz a sobrecarga de quem está começando.',
    application: 'Sessões curtas, um tema por vez e complexidade progressiva por nível.',
    evidence: 'Teoria da carga cognitiva.',
    refs: [
      { label: 'Sweller, 1988', href: 'https://doi.org/10.1207/s15516709cog1202_4' },
      { label: 'van Merriënboer & Sweller, 2005', href: 'https://doi.org/10.1007/s10648-005-3951-0' },
    ],
  },
  {
    id: 'deliberada',
    name: 'Prática deliberada',
    summary: 'Treinar o ponto fraco com objetivo claro e feedback supera repetir o que já se sabe.',
    application: 'Treino que prioriza lacunas, erros recentes e temas de maior peso.',
    evidence: 'Prática deliberada e feedback especializado.',
    refs: [
      { label: 'Ericsson, Krampe & Tesch-Römer, 1993', href: 'https://doi.org/10.1037/0033-295X.100.3.363' },
    ],
  },
];

export const LOW_UTILITY = [
  'Reler o mesmo material várias vezes',
  'Grifar sem transformar em pergunta',
  'Maratonar tudo na véspera',
  'Estudar só o que já domina',
  'Confundir familiaridade com domínio',
];

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
