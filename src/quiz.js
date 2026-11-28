const KEYS = 'ABCDE';

/**
 * Aceita gabaritos em formatos diferentes: letra ("B"), minúscula ("b") ou o
 * texto completo da alternativa. Retorna a letra correspondente.
 */
export function answerKey(answer, options = []) {
  const raw = String(answer ?? '').trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (KEYS.includes(upper) && upper.length === 1) return upper;
  const index = (options || []).findIndex((option) => String(option).trim() === raw);
  return index >= 0 && index < KEYS.length ? KEYS[index] : null;
}

export function isCorrectAnswer(answer, options, selected) {
  const key = answerKey(answer, options);
  return Boolean(key) && String(selected || '').toUpperCase() === key;
}

export function answerText(answer, options = []) {
  const key = answerKey(answer, options);
  if (!key) return String(answer ?? '');
  const index = KEYS.indexOf(key);
  return String(options?.[index] ?? answer ?? '');
}
