import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGES, adaptiveReview, calibration, checklistStage, planStageCounts, stageStatus,
  topicCalibration, topicStage,
} from '../src/metodo.js';

test('o ciclo tem cinco etapas na ordem do método', () => {
  assert.deepEqual(STAGES.map((stage) => stage.id), ['ativar', 'codificar', 'recuperar', 'revisar', 'intercalar']);
});

test('checklist de 7 etapas é dividido em codificar, recuperar e revisar', () => {
  assert.deepEqual(
    Array.from({ length: 7 }, (_, i) => checklistStage(i, 7)),
    ['codificar', 'codificar', 'codificar', 'codificar', 'codificar', 'recuperar', 'revisar'],
  );
});

test('estado do tema avança conforme o checklist', () => {
  assert.equal(topicStage({}, 7), 'novo');
  assert.equal(topicStage({ done: [0, 1] }, 7), 'codificado');
  assert.equal(topicStage({ done: [0, 1, 2, 3, 4, 5] }, 7), 'recuperado');
  assert.equal(topicStage({ done: [0, 1, 2, 3, 4, 5, 6] }, 7), 'revisado');
  assert.equal(topicStage({ done: [0, 1, 2, 3, 4, 5, 6], confidence: 4 }, 7), 'dominado');
});

test('etapas do checklist alimentam o stepper', () => {
  const status = stageStatus({ done: [0, 1, 2, 3, 4], activation: 'minha hipótese' }, 7);
  assert.equal(status.ativar, 'done');
  assert.equal(status.codificar, 'done');
  assert.equal(status.recuperar, 'current');
});

test('revisão adaptativa cresce com notas boas e encurta com lapsos', () => {
  const first = adaptiveReview({}, 3, new Date('2026-01-01T12:00:00'));
  assert.equal(first.reps, 1);
  assert.ok(first.interval >= 1);
  const good = adaptiveReview({ reps: 2, ease: 2.5 }, 5, new Date('2026-01-10T12:00:00'));
  const bad = adaptiveReview({ reps: 2, ease: 2.5 }, 1, new Date('2026-01-10T12:00:00'));
  assert.ok(good.interval > bad.interval);
  assert.ok(good.ease > bad.ease);
});

test('calibração compara confiança e acerto', () => {
  const attempts = [
    { topicId: 'a', correct: true }, { topicId: 'a', correct: false },
    { topicId: 'b', correct: false },
  ];
  const overall = calibration({ a: { confidence: 5 }, b: { confidence: 4 } }, attempts);
  assert.equal(overall.confidence, 90);
  assert.equal(overall.accuracy, 33);
  assert.ok(overall.gap > 0);
  const topic = topicCalibration({ a: { confidence: 3 } }, attempts, 'a');
  assert.equal(topic.confidence, 60);
  assert.equal(topic.accuracy, 50);
});

test('contagem do plano separa as etapas do ciclo', () => {
  const plan = {
    weeks: [{
      days: [{
        sessions: [
          { type: 'teoria' }, { type: 'questoes' }, { type: 'revisao' }, { type: 'simulado' }, { type: 'teoria' },
        ],
      }],
    }],
  };
  assert.deepEqual(planStageCounts(plan), { codificar: 2, recuperar: 1, revisar: 1, intercalar: 1 });
});
