import fs from 'node:fs/promises';
import { readKV, writeKV } from './storage.js';

const curriculum = JSON.parse(await fs.readFile('seed/curriculum.json', 'utf8'));
const topicArea = new Map(curriculum.areas.flatMap((a) => a.topics.map((t) => [t.id, a.id])));
const data = await readKV('questions', { version: 1, questions: [] });
let changed = 0;
for (const q of data.questions) {
  const area = topicArea.get(q.topicId);
  if (area && q.area !== area) { q.area = area; changed += 1; }
}
await writeKV('questions', data);
console.log(`Áreas sincronizadas: ${changed}`);
