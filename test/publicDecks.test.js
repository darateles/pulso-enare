import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePublicCard, summarizePublicDeck } from '../server/publicDecks.js';

test('cartão público remove imagem inválida e normaliza campos', () => {
  const card = sanitizePublicCard({
    front: '  Qual é o tratamento?  ',
    back: '  Resposta  ',
    image: 'javascript:alert(1)',
    imageAlt: '  Figura  ',
    tags: ['cardio', 'cardio', '', ' prova '],
    clozeIndex: '2',
  });
  assert.equal(card.front, 'Qual é o tratamento?');
  assert.equal(card.back, 'Resposta');
  assert.equal(card.image, undefined);
  assert.equal(card.imageAlt, 'Figura');
  assert.deepEqual(card.tags, ['cardio', 'prova']);
  assert.equal(card.clozeIndex, 2);
});

test('cartão público limita imagem e preserva data URL válida', () => {
  const small = `data:image/png;base64,${'a'.repeat(40)}`;
  assert.equal(sanitizePublicCard({ front: 'Frente', image: small }).image, small);
  const svg = `data:image/svg+xml;base64,${'a'.repeat(40)}`;
  assert.equal(sanitizePublicCard({ front: 'Frente', image: svg }).image, undefined);
  const huge = `data:image/png;base64,${'a'.repeat(300_001)}`;
  assert.equal(sanitizePublicCard({ front: 'Frente', image: huge }).image, undefined);
});

test('cartão público corta textos muito longos', () => {
  const card = sanitizePublicCard({ front: 'a'.repeat(5000), back: 'b'.repeat(9000) });
  assert.equal(card.front.length, 4000);
  assert.equal(card.back.length, 8000);
});

test('resumo público não expõe o deck completo nem a conta do autor', () => {
  const deck = {
    id: 'pub-1',
    title: 'Cardio',
    account: 'davi',
    authorName: 'Davi',
    authorId: '1234',
    cards: [
      { front: 'Um', back: '1' },
      { front: 'Dois', back: '2' },
      { front: 'Três', back: '3' },
      { front: 'Quatro', back: '4' },
    ],
  };
  const summary = summarizePublicDeck(deck, 'davi');
  assert.equal('cards' in summary, false);
  assert.equal('account' in summary, false);
  assert.equal(summary.isMine, true);
  assert.equal(summary.preview.length, 3);
  assert.equal(summary.preview[0].front, 'Um');
  assert.equal(summarizePublicDeck(deck, 'outro').isMine, false);
});
