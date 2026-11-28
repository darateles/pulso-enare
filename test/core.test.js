import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestions, parseAnswerKey, guessTopic } from '../server/importer.js';
import { generatePlan, planCounts } from '../src/planner.js';
import { addDays, iso } from '../src/utils.js';
import { readFile } from 'node:fs/promises';

const SAMPLE = `Cirurgia Geral
1
Paciente de 45 anos apresenta dor abdominal em fossa ilíaca direita há 2 dias, com febre e defesa localizada. A conduta mais adequada é:
(A) alta com analgésico.
(B) antibiótico ambulatorial.
(C) apendicectomia.
(D) colonoscopia.
(E) observação por 48 horas.

2
Homem de 30 anos chega com queimadura de segundo grau em 20% da superfície corporal. A reposição volêmica inicial segue:
(A) regra de Parkland.
(B) apenas cristaloide oral.
(C) diurético.
(D) albumina isolada.
(E) hemotransfusão.
`;
const KEY = `TIPO 1
1 2
C A
TIPO 2
1 2
A C`;

test('extrai questões e alternativas', () => {
  const qs = parseQuestions(SAMPLE);
  assert.equal(qs.length, 2);
  assert.equal(qs[0].area, 'cirurgia');
  assert.equal(qs[0].options.length, 5);
  assert.match(qs[0].stem, /dor abdominal/);
});

test('lê gabarito por tipo', () => {
  const key = parseAnswerKey(KEY, '1');
  assert.equal(key.get(1), 'C');
  assert.equal(key.get(2), 'A');
  const key2 = parseAnswerKey(KEY, '2');
  assert.equal(key2.get(1), 'A');
});

test('associa subtópico por palavras-chave', async () => {
  const curriculum = JSON.parse(await readFile(new URL('../seed/curriculum.json', import.meta.url), 'utf8'));
  const topic = guessTopic('cirurgia', 'apendicite dor abdominal em fossa ilíaca direita com defesa', curriculum);
  assert.equal(topic, 'cir-abdome-agudo');
});

test('planner cria semanas com sessões e simulado', async () => {
  const curriculum = JSON.parse(await readFile(new URL('../seed/curriculum.json', import.meta.url), 'utf8'));
  const week = new Date();
  const start = `${week.getFullYear()}-${String(week.getMonth() + 1).padStart(2, '0')}-${String(week.getDate()).padStart(2, '0')}`;
  const plan = generatePlan({ startDate: start, dailyHours: 3, studyDays: [1, 2, 3, 4, 5], progress: {}, attempts: [] }, curriculum, 2);
  assert.equal(plan.weeks.length, 2);
  assert.ok(planCounts(plan).total > 0);
  for (const w of plan.weeks) {
    assert.equal(w.days.flatMap((d) => d.sessions).filter((s) => s.type === 'simulado').length, 1);
  }
});

test('planner personalizado ignora o nível de referência', async () => {
  const curriculum = JSON.parse(await readFile(new URL('../seed/curriculum.json', import.meta.url), 'utf8'));
  const base = {
    startDate: iso(),
    examDate: iso(addDays(new Date(), 120)),
    dailyHours: 3,
    studyDays: [1, 2, 3, 4, 5],
    progress: {},
    attempts: [],
    difficultyGroups: ['Cardiologia', 'Nefrologia'],
  };
  const low = generatePlan({ ...base, level: 1 }, curriculum, 2);
  const high = generatePlan({ ...base, level: 5 }, curriculum, 2);
  const sequence = (plan) => plan.weeks
    .flatMap((week) => week.days)
    .flatMap((day) => day.sessions)
    .map((session) => `${session.type}:${session.topicId || 'simulado'}`)
    .join('|');
  assert.equal(sequence(low), sequence(high));
  assert.equal(low.mode, 'personalizado');
  assert.deepEqual(low.difficultyGroups, ['Cardiologia', 'Nefrologia']);
  assert.equal(low.referenceLevel, 1);
  assert.equal(high.referenceLevel, 5);
});
