import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClozeCards, clozeBack, clozeFront, parseCloze } from '../src/cloze.js';

test('reconhece uma lacuna simples', () => {
  const parsed = parseCloze('Uma zebra é um animal com {{listras}}.');
  assert.equal(parsed.deletions.length, 1);
  assert.equal(parsed.deletions[0].answer, 'listras');
  assert.equal(clozeFront('Uma zebra é um animal com {{listras}}.', 1), 'Uma zebra é um animal com [_____].');
  assert.equal(clozeBack('Uma zebra é um animal com {{listras}}.', 1), 'Uma zebra é um animal com listras.');
});

test('reconhece múltiplas lacunas e dicas', () => {
  const text = 'Uma {{zebra::animal}} é um animal com {{listras::padrão}}.';
  const parsed = parseCloze(text);
  assert.equal(parsed.deletions.length, 2);
  assert.deepEqual(parsed.deletions.map((item) => item.answer), ['zebra', 'listras']);
  assert.equal(parsed.deletions[0].hint, 'animal');
  assert.equal(parsed.deletions[1].hint, 'padrão');
});

test('cada lacuna gera um cartão independente', () => {
  const text = 'Uma {{zebra}} é um animal com {{listras}}.';
  const cards = buildClozeCards({ text, deck: 'Cloze test', tags: ['teste'] });
  assert.equal(cards.length, 2);
  assert.equal(new Set(cards.map((card) => card.id)).size, 2);
  assert.equal(cards[0].clozeIndex, 1);
  assert.equal(cards[0].clozeAnswer, 'zebra');
  assert.equal(cards[0].front, 'Uma [_____] é um animal com listras.');
  assert.equal(cards[0].back, 'Uma zebra é um animal com listras.');
  assert.equal(cards[0].deck, 'Cloze test');
  assert.deepEqual(cards[0].tags, ['teste']);
});
