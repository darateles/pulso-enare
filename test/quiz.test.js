import test from 'node:test';
import assert from 'node:assert/strict';
import { answerKey, answerText, isCorrectAnswer } from '../src/quiz.js';

const options = ['Ritmo sinusal normal', 'Fibrilação atrial', 'Taquicardia ventricular'];

test('aceita gabarito por texto completo', () => {
  assert.equal(answerKey('Fibrilação atrial', options), 'B');
  assert.equal(isCorrectAnswer('Fibrilação atrial', options, 'B'), true);
  assert.equal(isCorrectAnswer('Fibrilação atrial', options, 'A'), false);
  assert.equal(answerText('Fibrilação atrial', options), 'Fibrilação atrial');
});

test('aceita gabarito por letra e normaliza minúsculas', () => {
  assert.equal(answerKey('b', options), 'B');
  assert.equal(isCorrectAnswer('b', options, 'B'), true);
  assert.equal(isCorrectAnswer('B', options, 'b'), true);
  assert.equal(answerText('B', options), 'Fibrilação atrial');
});

test('retorna falso quando o gabarito não corresponde a nenhuma alternativa', () => {
  assert.equal(answerKey('Diagnóstico inexistente', options), null);
  assert.equal(isCorrectAnswer('Diagnóstico inexistente', options, 'A'), false);
});

test('todos os casos de ECG têm gabarito resolvível', async () => {
  const { readFile } = await import('node:fs/promises');
  const ecg = JSON.parse(await readFile(new URL('../seed/ecg.json', import.meta.url), 'utf8'));
  for (const item of ecg.cases) {
    const key = answerKey(item.answer, item.options);
    assert.ok(key, item.id);
    assert.equal(isCorrectAnswer(item.answer, item.options, key), true, item.id);
  }
});
