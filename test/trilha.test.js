import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  LEVELS, TOPIC_LEVEL, levelSubjects, nextTopics, semesterLevel, currentLevelId,
} from '../src/trilha.js';

const curriculum = JSON.parse(await readFile(new URL('../seed/curriculum.json', import.meta.url), 'utf8'));
const allTopics = curriculum.areas.flatMap((area) => area.topics);

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

test('semestre da faculdade define o nível da trilha', () => {
  const expected = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5];
  expected.forEach((level, index) => assert.equal(semesterLevel(index + 1), level));
  assert.equal(currentLevelId({ semester: 5 }), 3);
  assert.equal(currentLevelId({ semester: 5, level: 4 }), 4);
});

test('próximos temas priorizam o nível atual', () => {
  const next = nextTopics(curriculum, { semester: 5, level: 3, progress: {} }, 6);
  assert.equal(next.length, 6);
  for (const { t } of next) assert.equal(TOPIC_LEVEL[t.id], 3);
});
