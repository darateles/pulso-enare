import fs from 'node:fs/promises';
import path from 'node:path';
import { importFromUrl } from './importer.js';
import { initStore, addQuestions } from './store.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=') || true];
  }),
);

if (!args.url) {
  console.log('Uso: npm run import -- --url=https://.../prova.pdf [--answers=https://.../gabarito.pdf] [--type=1] [--area=clinica] [--instituicao=FGV] [--ano=2024] [--exam="ENARE 2024"]');
  process.exit(1);
}

const curriculum = JSON.parse(await fs.readFile(path.resolve('seed/curriculum.json'), 'utf8'));
await initStore();

const result = await importFromUrl({
  url: args.url,
  answerUrl: args.answers,
  answerType: args.type || '1',
  areaId: args.area,
  institution: args.instituicao || 'CLI',
  year: args.ano,
  exam: args.exam || 'Importação via CLI',
  curriculum,
});

const added = await addQuestions(result.questions);
console.log(`${result.questions.length} questões lidas, ${added.length} novas salvas, ${result.questions.filter((q) => !q.answer).length} sem gabarito.`);
