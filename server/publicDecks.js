import crypto from 'node:crypto';
import { readKV, writeKV } from './storage.js';
import { rankingId } from '../src/ranking.js';

const KEY = 'public_decks';
const MAX_DECKS = 200;
const MAX_CARDS = 100;
const MAX_IMAGE = 300_000;

function cleanText(value, max) {
  return String(value || '').trim().slice(0, max);
}

export function sanitizePublicCard(card = {}) {
  const image = typeof card.image === 'string' && /^(data:image\/(?:png|jpe?g|webp|gif);|https?:\/\/|\/)/.test(card.image) && card.image.length <= MAX_IMAGE
    ? card.image
    : undefined;
  return {
    front: cleanText(card.front, 4000),
    back: cleanText(card.back, 8000),
    image,
    imageAlt: cleanText(card.imageAlt, 300) || undefined,
    clozeText: cleanText(card.clozeText, 8000) || undefined,
    clozeIndex: Number(card.clozeIndex) || undefined,
    clozeAnswer: cleanText(card.clozeAnswer, 500) || undefined,
    clozeHint: cleanText(card.clozeHint, 300) || undefined,
    clozeGroup: cleanText(card.clozeGroup, 120) || undefined,
    tags: Array.isArray(card.tags) ? [...new Set(card.tags.map((tag) => cleanText(tag, 60)).filter(Boolean))].slice(0, 20) : [],
  };
}

function withoutOwner(deck) {
  const { account: _owner, ...rest } = deck;
  return rest;
}

export function summarizePublicDeck(deck, account) {
  const cards = Array.isArray(deck.cards) ? deck.cards : [];
  const { account: _owner, cards: _cards, ...meta } = deck;
  return {
    ...meta,
    isMine: deck.account === account,
    preview: cards.slice(0, 3).map((card) => ({
      front: card.front,
      back: card.back,
      image: card.image && !card.image.startsWith('data:') ? card.image : undefined,
      imageAlt: card.imageAlt,
      clozeText: card.clozeText,
      clozeIndex: card.clozeIndex,
    })),
  };
}

export async function listPublicDecks(account = '') {
  const data = await readKV(KEY, { version: 1, decks: [] });
  return (data.decks || [])
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map((deck) => summarizePublicDeck(deck, account));
}

export async function getPublicDeck(account = '', id) {
  const data = await readKV(KEY, { version: 1, decks: [] });
  const deck = (data.decks || []).find((item) => item.id === id);
  if (!deck) throw Object.assign(new Error('Deck público não encontrado.'), { status: 404 });
  return { ...withoutOwner(deck), isMine: deck.account === account };
}

export async function publishPublicDeck({ account, authorName, title, description, cards }) {
  const cleanTitle = cleanText(title, 80);
  if (cleanTitle.length < 3) throw Object.assign(new Error('O título do deck precisa ter pelo menos 3 caracteres.'), { status: 400 });
  if (!Array.isArray(cards) || !cards.length) throw Object.assign(new Error('Escolha um deck com pelo menos um cartão.'), { status: 400 });
  if (cards.length > MAX_CARDS) throw Object.assign(new Error(`Publique no máximo ${MAX_CARDS} cartões por deck.`), { status: 400 });

  const data = await readKV(KEY, { version: 1, decks: [] });
  const deck = {
    id: `pub-${crypto.randomBytes(8).toString('hex')}`,
    title: cleanTitle,
    description: cleanText(description, 240),
    authorName: cleanText(authorName, 80) || cleanText(account, 40),
    authorId: rankingId(account),
    account,
    cards: cards.map(sanitizePublicCard).filter((card) => card.front || card.clozeText),
    cardCount: cards.length,
    imports: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!deck.cards.length) throw Object.assign(new Error('O deck não tem cartões válidos para publicar.'), { status: 400 });
  deck.cardCount = deck.cards.length;
  const decks = [deck, ...(data.decks || [])].slice(0, MAX_DECKS);
  await writeKV(KEY, { version: 1, decks });
  return summarizePublicDeck(deck, account);
}

export async function removePublicDeck(account, id) {
  const data = await readKV(KEY, { version: 1, decks: [] });
  const target = (data.decks || []).find((deck) => deck.id === id);
  if (!target) throw Object.assign(new Error('Deck público não encontrado.'), { status: 404 });
  if (target.account !== account) throw Object.assign(new Error('Você só pode remover os seus decks.'), { status: 403 });
  const decks = (data.decks || []).filter((deck) => deck.id !== id);
  await writeKV(KEY, { version: 1, decks });
  return { removed: true };
}

export async function takePublicDeck(account, id, { countImport = true } = {}) {
  const data = await readKV(KEY, { version: 1, decks: [] });
  const target = (data.decks || []).find((deck) => deck.id === id);
  if (!target) throw Object.assign(new Error('Deck público não encontrado.'), { status: 404 });
  if (countImport) {
    target.imports = (Number(target.imports) || 0) + 1;
    target.updatedAt = new Date().toISOString();
    await writeKV(KEY, { version: 1, decks: data.decks });
  }
  return { ...withoutOwner(target), isMine: target.account === account };
}
