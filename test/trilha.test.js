import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  LEVELS, TOPIC_LEVEL, currentLevelId, levelSubjects, nextTopics, recommendLevel,
} from '../src/trilha.js';
import { addDays, iso } from '../src/utils.js';

const curriculum = JSON.parse(await readFile(new URL('../seed/curriculum.json', import.meta.url), 'utf8'));
const allTopics = curriculum.areas.flatMap((area) => area.topics);
const future = (days) => iso(addDays(new Date(), days));

test('todos os temas do currículo têm exatamente um nível', () => {
  assert.equal(allTopics.length, Object.keys(TOPIC_LEVEL).length);
  for (const topic of allTopics) {
    assert.ok(Number.isInteger(TOPIC_LEVEL[topic.id]), topic.id);
    assert.ok(TOPIC_LEVEL[topic.id] >= 1 && TOPIC_LEVEL[topic.id] <= 5, topic.id);
  }
  const ids = new Set(allTopics.map((topic) => topic.id));
  for (const id of Object.keys(TOPIC_LEVEL)) assert.ok(ids.has(id), id);
});

test('os cinco níveis particionam os temas sem repetição', () => {
  const seen = new Set();
  for (const level of LEVELS) {
    for (const subject of levelSubjects(curriculum, level.id)) {
      for (const topic of subject.topics) {
        assert.ok(!seen.has(topic.id), topic.id);
        seen.add(topic.id);
      }
    }
  }
  assert.equal(seen.size, allTopics.length);
});

test('semestre é apenas perfil e não define o nível', () => {
  assert.equal(currentLevelId({ semester: 5 }), 1);
  assert.equal(currentLevelId({ semester: 5, level: 4 }), 4);
  const base = {
    dailyHours: 3,
    studyDays: [1, 2, 3, 4, 5],
    studyPace: 'equilibrado',
    examDate: future(240),
  };
  const first = recommendLevel({ ...base, semester: 1 });
  const last = recommendLevel({ ...base, semester: 12 });
  assert.equal(first.levelId, last.levelId);
  assert.equal(first.reason, last.reason);
});

test('mais horas, constância e ritmo avançado elevam a recomendação', () => {
  const low = recommendLevel({
    dailyHours: 1,
    studyDays: [1, 2],
    studyPace: 'base',
    examDate: future(700),
  });
  const high = recommendLevel({
    dailyHours: 6,
    studyDays: [1, 2, 3, 4, 5, 6],
    studyPace: 'avancado',
    examDate: future(45),
  });
  assert.ok(high.levelId > low.levelId);
  assert.ok(high.weeklyHours > low.weeklyHours);
  assert.equal(high.phase.id, 'intensivo');
});

test('próximos temas usam prioridade personalizada e não bloqueiam por nível', () => {
  const next = nextTopics(curriculum, {
    level: 3,
    dailyHours: 4,
    studyDays: [1, 2, 3, 4, 5],
    examDate: future(60),
    progress: {},
    attempts: [],
    difficultyGroups: ['Cardiologia'],
  }, 8);
  assert.equal(next.length, 8);
  const levels = new Set(next.map(({ t }) => TOPIC_LEVEL[t.id]));
  assert.ok(levels.size > 1, 'a lista deve atravessar mais de um nível');
  assert.ok(next.some(({ t }) => t.group === 'Cardiologia'));
});
