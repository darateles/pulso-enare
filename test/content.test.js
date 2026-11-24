import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const curriculum = JSON.parse(await readFile(new URL('../seed/curriculum.json', import.meta.url), 'utf8'));
const questions = JSON.parse(await readFile(new URL('../seed/questions.json', import.meta.url), 'utf8')).questions;

test('matriz tem sete áreas e cada tópico tem grupo e guia', () => {
  assert.equal(curriculum.areas.length, 7);
  for (const area of curriculum.areas) {
    for (const topic of area.topics) {
      assert.ok(topic.group, topic.id);
      assert.ok(topic.guide?.sequence?.length >= 5, topic.id);
      assert.ok(topic.checklist.length >= 7, topic.id);
    }
  }
});

test('toda resposta existe entre as alternativas', () => {
  for (const q of questions) {
    if (!q.answer) continue;
    assert.ok(q.options.some((o) => o.key === q.answer), q.id);
  }
});

test('área da questão coincide com a área do tópico', () => {
  const topicArea = new Map(curriculum.areas.flatMap((a) => a.topics.map((t) => [t.id, a.id])));
  for (const q of questions) assert.equal(q.area, topicArea.get(q.topicId), q.id);
});
