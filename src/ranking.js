
/**
 * Ranking diário do Pulso.
 *
 * A pontuação é calculada a partir dos dados já salvos (tentativas e atividade),
 * não de um contador enviado pelo cliente. Isso reduz a possibilidade de
 * manipular o próprio placar.
 */
export const RANKING_RULES = [
  { label: 'Cada acerto', points: '+10', detail: 'até 300 pontos por dia' },
  { label: 'Meta de questões', points: '+60', detail: 'atingir a meta diária de questões' },
  { label: 'Meta de tempo', points: '+40', detail: 'atingir a carga de horas do dia' },
  { label: 'Meta de checklist', points: '+30', detail: 'concluir ao menos 3 etapas' },
  { label: 'Todas as metas', points: '+50', detail: 'fechar as três metas no mesmo dia' },
  { label: 'Questionário sem erros', points: '+100', detail: 'mínimo de 10 questões e 100% de acerto' },
];

export function rankingDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
}

export function dateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '').slice(0, 10);
  return rankingDate(date);
}

export function rankingId(account = '') {
  let hash = 0;
  for (const char of String(account || 'anon')) hash = (hash * 31 + char.charCodeAt(0)) % 10000;
  return String(hash).padStart(4, '0');
}

export function dailyGoalTargets(user = {}) {
  return {
    questions: Math.max(5, Number(user.goalQuestions) || 40),
    minutes: Math.max(30, Math.round((Number(user.dailyHours) || 3) * 60)),
    checklist: 3,
  };
}

export function dailyScore(user = {}, date = rankingDate()) {
  const attempts = (user.attempts || []).filter((a) => dateKey(a.createdAt) === date);
  // Conta cada questão uma única vez por dia; repetir a mesma questão não farma pontos.
  const unique = new Map();
  for (const attempt of attempts) unique.set(attempt.questionId || attempt.id, attempt);
  const questions = unique.size;
  const correct = [...unique.values()].filter((a) => a.correct).length;
  const activity = user.activity?.[date] || {};
  const targets = dailyGoalTargets(user);
  const accuracy = questions ? Math.round((correct / questions) * 100) : 0;
  const minutes = Number(activity.minutes) || 0;
  const checklist = Number(activity.checklist) || 0;

  const goals = {
    questions: { value: questions, target: targets.questions, done: questions >= targets.questions, points: 60 },
    minutes: { value: minutes, target: targets.minutes, done: minutes >= targets.minutes, points: 40 },
    checklist: { value: checklist, target: targets.checklist, done: checklist >= targets.checklist, points: 30 },
  };
  const goalsDone = Object.values(goals).filter((goal) => goal.done).length;
  const allGoals = goalsDone === 3;
  const perfect = questions >= 10 && correct === questions;
  const answerPoints = Math.min(300, correct * 10);
  const goalsPoints = Object.values(goals).reduce((sum, goal) => sum + (goal.done ? goal.points : 0), 0);
  const allBonus = allGoals ? 50 : 0;
  const perfectBonus = perfect ? 100 : 0;

  return {
    date,
    points: answerPoints + goalsPoints + allBonus + perfectBonus,
    answerPoints,
    goalsPoints,
    allBonus,
    perfectBonus,
    questions,
    correct,
    accuracy,
    minutes,
    checklist,
    goals,
    goalsDone,
    goalsTotal: 3,
    allGoals,
    perfect,
  };
}

export function rankingEntry(user = {}, account = '', date = rankingDate()) {
  return {
    id: rankingId(account),
    name: user.name || 'Estudante',
    ...dailyScore(user, date),
  };
}

export function sortRanking(entries = [], meId = null) {
  return [...entries]
    .sort((a, b) => b.points - a.points || b.accuracy - a.accuracy || a.name.localeCompare(b.name))
    .map((entry, index) => ({ ...entry, position: index + 1, isMe: entry.id === meId }));
}
