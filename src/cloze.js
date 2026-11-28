const CLOZE_RE = /\{\{([\s\S]*?)\}\}/g;

/**
 * Converte "Uma {{zebra}} é um animal com {{listras::padrão}}."
 * em partes de texto e lacunas numeradas.
 */
export function parseCloze(text = '') {
  const source = String(text || '');
  const parts = [];
  const deletions = [];
  let last = 0;
  let match;
  let index = 0;

  while ((match = CLOZE_RE.exec(source))) {
    if (match.index > last) parts.push({ type: 'text', text: source.slice(last, match.index) });
    const raw = match[1].trim();
    if (!raw) { last = CLOZE_RE.lastIndex; continue; }
    const [answerPart, ...hintParts] = raw.split('::');
    const answer = answerPart.trim();
    if (!answer) { last = CLOZE_RE.lastIndex; continue; }
    index += 1;
    const hint = hintParts.join('::').trim();
    parts.push({ type: 'cloze', index, answer, hint });
    deletions.push({ index, answer, hint });
    last = CLOZE_RE.lastIndex;
  }

  if (last < source.length) parts.push({ type: 'text', text: source.slice(last) });
  return { parts, deletions, hasCloze: deletions.length > 0 };
}

export function clozeFront(text, targetIndex) {
  const { parts } = parseCloze(text);
  return parts.map((part) => {
    if (part.type === 'text') return part.text;
    return part.index === targetIndex ? '[_____]' : part.answer;
  }).join('');
}

export function clozeBack(text, targetIndex) {
  const { parts } = parseCloze(text);
  return parts.map((part) => {
    if (part.type === 'text') return part.text;
    return part.answer;
  }).join('');
}

export function buildClozeCards({ text, deck = 'Cloze', tags = [] } = {}) {
  const parsed = parseCloze(text);
  if (!parsed.deletions.length) return [];
  const group = globalThis.crypto?.randomUUID?.() || `cloze-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const createdAt = new Date().toISOString();
  return parsed.deletions.map((deletion) => ({
    id: `${group}-c${deletion.index}`,
    clozeGroup: group,
    clozeIndex: deletion.index,
    clozeText: String(text),
    clozeAnswer: deletion.answer,
    clozeHint: deletion.hint || '',
    front: clozeFront(text, deletion.index),
    back: clozeBack(text, deletion.index),
    deck,
    tags,
    createdAt,
  }));
}
