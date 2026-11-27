import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyScore, dateKey, rankingId, rankingEntry, sortRanking } from '../src/ranking.js';

const DATE = '2026-11-27';
const attempts = (total, correct) => Array.from({ length: total }, (_, i) => ({
  id: `a${i}`, questionId: `q${i}`, topicId: 'cm-cardio-has', area: 'clinica',
  chosen: 'A', correct: i < correct, createdAt: `${DATE}T15:00:00.000Z`,
}));

function user(overrides = {}) {
  return {
    name: 'Teste', goalQuestions: 10, dailyHours: 1,
    activity: { [DATE]: { minutes: 60, questions: 10, checklist: 3 } },
    attempts: attempts(10, 10),
    ...overrides,
  };
}

test('ID público do ranking tem quatro dígitos', () => {
  assert.match(rankingId('pulso'), /^\d{4}$/);
  assert.match(rankingId('maria'), /^\d{4}$/);
  assert.equal(rankingId('pulso'), rankingId('pulso'));
});

test('data do ranking usa o fuso de São Paulo', () => {
  assert.equal(dateKey('2026-01-01T02:00:00.000Z'), '2025-12-31');
});

test('dia perfeito fecha metas e ganha todos os bônus', () => {
  const score = dailyScore(user(), DATE);
  assert.equal(score.points, 380);
  assert.equal(score.accuracy, 100);
  assert.equal(score.goalsDone, 3);
  assert.equal(score.allGoals, true);
  assert.equal(score.perfect, true);
  assert.equal(score.perfectBonus, 100);
  assert.equal(score.allBonus, 50);
});

test('erros reduzem pontos e removem o bônus de 100%', () => {
  const score = dailyScore(user({ attempts: attempts(10, 5) }), DATE);
  assert.equal(score.points, 230);
  assert.equal(score.accuracy, 50);
  assert.equal(score.perfect, false);
  assert.equal(score.perfectBonus, 0);
});

test('repetir a mesma questão não farma pontos', () => {
  const repeated = [...attempts(10, 10), ...attempts(10, 10)];
  const score = dailyScore(user({ attempts: repeated }), DATE);
  assert.equal(score.questions, 10);
  assert.equal(score.points, 380);
});

test('ranking ordena por pontos e marca o participante atual', () => {
  const entries = [
    rankingEntry(user({ name: 'Maria', attempts: attempts(10, 5) }), 'maria', DATE),
    rankingEntry(user({ name: 'Pulso' }), 'pulso', DATE),
  ];
  const sorted = sortRanking(entries, rankingId('pulso'));
  assert.equal(sorted[0].name, 'Pulso');
  assert.equal(sorted[0].isMe, true);
  assert.equal(sorted[0].position, 1);
  assert.equal(sorted[1].position, 2);
});
