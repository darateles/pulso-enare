import { topicStatus } from './utils.js';

/**
 * Trilha em níveis — o "curso" do Pulso.
 *
 * Cada nível reúne os temas de um bloco de semestres da faculdade.
 * A ordem dentro do nível é a ordem do currículo, matéria por matéria.
 * O nível do usuário é derivado do semestre informado no onboarding.
 */
export const LEVELS = [
  {
    id: 1,
    code: 'N1',
    name: 'Fundamentos',
    title: 'Fundamentos e SUS',
    semesters: [1, 2],
    semesterLabel: '1º e 2º semestre',
    description: 'Bases da saúde coletiva, APS, ética, epidemiologia e cuidado da criança e da mulher. O alicerce para interpretar o restante do curso.',
    goal: 'Entender o sistema, a população e os princípios do cuidado antes de mergulhar na clínica.',
    tone: '#3f7a4e',
  },
  {
    id: 2,
    code: 'N2',
    name: 'Clínica essencial',
    title: 'Clínica essencial',
    semesters: [3, 4],
    semesterLabel: '3º e 4º semestre',
    description: 'Os temas que mais aparecem nas provas: cardiologia, endocrinologia, infectologia, pneumologia, pré-natal e saúde mental.',
    goal: 'Reconhecer as síndromes mais frequentes e conduzir os primeiros passos de cada caso.',
    tone: '#2c6b9e',
  },
  {
    id: 3,
    code: 'N3',
    name: 'Especialidades',
    title: 'Especialidades clínicas',
    semesters: [5, 6],
    semesterLabel: '5º e 6º semestre',
    description: 'Aprofundamento em nefrologia, neurologia, hematologia, reumatologia, endocrinologia e pediatria. Aqui o raciocínio clínico ganha precisão.',
    goal: 'Diferenciar diagnósticos, interpretar exames e escolher condutas com segurança.',
    tone: '#a84368',
  },
  {
    id: 4,
    code: 'N4',
    name: 'Prática e urgências',
    title: 'Prática clínica e urgências',
    semesters: [7, 8],
    semesterLabel: '7º e 8º semestre',
    description: 'Cirurgia, obstetrícia, urgências e situações de plantão. O nível que conecta a teoria ao atendimento real.',
    goal: 'Agir com prioridade e estabilizar o paciente nas situações que não podem esperar.',
    tone: '#c45a2b',
  },
  {
    id: 5,
    code: 'N5',
    name: 'Alta complexidade',
    title: 'Alta complexidade e reta final',
    semesters: [9, 12],
    semesterLabel: '9º ao 12º semestre',
    description: 'Oncologia, trauma grave, medicina fetal, prematuridade e temas decisivos do internato. Revisão final com foco no que decide a prova.',
    goal: 'Integrar tudo o que aprendeu e resolver os casos mais complexos do ENARE.',
    tone: '#7b5b8f',
  },
];

/** Mapa explícito de cada um dos 90 temas para o seu nível. */
export const TOPIC_LEVEL = {
  // Nível 1 — Fundamentos e SUS
  'cm-etica': 1,
  'go-contracepcao': 1,
  'ped-imunizacoes': 1,
  'ped-puericultura': 1,
  'ped-adolescencia': 1,
  'ped-aleitamento': 1,
  'prev-aps': 1,
  'prev-cronicas': 1,
  'prev-imunizacao': 1,
  'prev-mfc': 1,
  'prev-saude-mulher': 1,
  'prev-determinantes': 1,
  'prev-idoso': 1,
  'prev-epidemiologia': 1,
  'prev-infecto': 1,
  'prev-sus': 1,
  'prev-vigilancia': 1,
  'prev-etica': 1,
  'prev-estatistica': 1,
  'prev-trabalhador': 1,
  'prev-saude-mental': 1,

  // Nível 2 — Clínica essencial
  'cm-endo-dm': 2,
  'cm-gastro': 2,
  'cm-infecto-hiv': 2,
  'cm-cardio-has': 2,
  'cm-cardio-sca': 2,
  'cm-hemato': 2,
  'cm-infecto-arboviro': 2,
  'cm-pneumo': 2,
  'cm-dermato': 2,
  'go-infeccoes': 2,
  'go-prenatal': 2,
  'go-ciclo': 2,
  'go-climaterio': 2,
  'ped-gastro': 2,
  'ped-infecto': 2,
  'prev-urgencias': 2,
  'sm-depressao': 2,
  'sm-ansiedade': 2,
  'sm-tdah': 2,

  // Nível 3 — Especialidades clínicas
  'cm-cardio-ic': 3,
  'cm-infecto-sepse': 3,
  'cm-infecto-hepatites': 3,
  'cm-nefro': 3,
  'cm-neuro': 3,
  'cm-reumato': 3,
  'cm-endo-tireo': 3,
  'cm-infecto-tb': 3,
  'cm-geri': 3,
  'cm-cardio-valvo': 3,
  'ped-neonatal': 3,
  'ped-ictericia': 3,
  'ped-cardio': 3,
  'ped-endo': 3,
  'ped-pneumo': 3,
  'sm-psicose': 3,
  'sm-bipolar': 3,
  'sm-substancias': 3,

  // Nível 4 — Prática clínica e urgências
  'cir-abdome-agudo': 4,
  'cir-trauma-atls': 4,
  'cir-vias-biliares': 4,
  'cir-coloprocto': 4,
  'cir-periop': 4,
  'cir-trauma-orto': 4,
  'cir-hernia': 4,
  'cir-queimados': 4,
  'cir-urologia': 4,
  'go-hemorragias': 4,
  'go-infecto-gestacao': 4,
  'go-hipertensivas': 4,
  'go-sangramento': 4,
  'go-parto': 4,
  'go-urgencias': 4,
  'ped-urgencias': 4,
  'sm-urgencias': 4,

  // Nível 5 — Alta complexidade e reta final
  'cm-onco': 5,
  'cm-urgencias': 5,
  'cir-trauma-abdominal': 5,
  'cir-trauma-toracico': 5,
  'cir-onco-cp': 5,
  'go-cancer-colo': 5,
  'go-cancer-mama': 5,
  'go-onco-gine': 5,
  'go-endometriose': 5,
  'go-intercorrencias': 5,
  'go-urogine': 5,
  'ped-prematuridade': 5,
  'ped-hemato': 5,
  'ped-neuro': 5,
  'sm-demencia': 5,
};

export const SEMESTERS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}º`,
  level: semesterLevel(i + 1),
}));

export function normalizeSemester(value) {
  return Math.min(12, Math.max(1, Math.round(Number(value) || 1)));
}

/** Converte o semestre da faculdade no nível da trilha. */
export function semesterLevel(value) {
  const semester = normalizeSemester(value);
  if (semester <= 2) return 1;
  if (semester <= 4) return 2;
  if (semester <= 6) return 3;
  if (semester <= 8) return 4;
  return 5;
}

export function semesterLabel(value) {
  return `${normalizeSemester(value)}º semestre`;
}

export function levelById(id) {
  return LEVELS.find((level) => level.id === Number(id)) || LEVELS[0];
}

export function topicLevelId(topicId) {
  return TOPIC_LEVEL[topicId] || 1;
}

export function topicLevel(topicId) {
  return levelById(topicLevelId(topicId));
}

export function currentLevelId(user) {
  return Number(user?.level) || semesterLevel(user?.semester);
}

export function currentLevel(user) {
  return levelById(currentLevelId(user));
}

/** Retorna as matérias do nível, cada uma com seus temas na ordem do currículo. */
export function levelSubjects(curriculum, levelId) {
  const id = Number(levelId);
  return curriculum.areas
    .map((area) => ({
      area,
      topics: area.topics.filter((topic) => topicLevelId(topic.id) === id),
    }))
    .filter((subject) => subject.topics.length);
}

export function levelStats(curriculum, levelId, progress = {}) {
  const subjects = levelSubjects(curriculum, levelId);
  const topics = subjects.flatMap((subject) => subject.topics);
  const totalSteps = topics.reduce((sum, topic) => sum + topic.checklist.length, 0);
  const doneSteps = topics.reduce((sum, topic) => {
    const p = progress[topic.id];
    const done = Array.isArray(p?.done) ? p.done.filter((i) => i < topic.checklist.length).length : 0;
    return sum + done;
  }, 0);
  const mastered = topics.filter((topic) => topicStatus(progress[topic.id], topic.checklist.length) === 'dominado').length;
  const started = topics.filter((topic) => (progress[topic.id]?.done || []).length > 0).length;
  return {
    subjects,
    topics,
    total: topics.length,
    mastered,
    started,
    pct: totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 0,
  };
}

export function levelStatus(levelId, user, stats) {
  const current = currentLevelId(user);
  if (levelId < current) return stats.mastered === stats.total ? 'done' : stats.pct > 0 ? 'review' : 'base';
  if (levelId === current) return 'current';
  return 'ahead';
}

export const LEVEL_STATUS_LABEL = {
  done: 'Concluído',
  review: 'Revisão',
  base: 'Base',
  current: 'Seu nível',
  ahead: 'À frente',
};

/** Próximos temas: prioriza o nível atual, depois os seguintes. */
export function nextTopics(curriculum, user, limit = 4) {
  const current = currentLevelId(user);
  const order = [
    ...LEVELS.slice(current - 1).map((level) => level.id),
    ...LEVELS.slice(0, current - 1).map((level) => level.id),
  ];
  const out = [];
  for (const levelId of order) {
    const pool = levelSubjects(curriculum, levelId)
      .flatMap(({ area, topics }) => topics.map((t) => ({ t, a: area })))
      .filter(({ t }) => topicStatus(user.progress?.[t.id], t.checklist.length) !== 'dominado')
      .sort((x, y) => {
        const px = user.progress?.[x.t.id] || {};
        const py = user.progress?.[y.t.id] || {};
        const startedX = (px.done || []).length > 0 ? 1 : 0;
        const startedY = (py.done || []).length > 0 ? 1 : 0;
        if (startedX !== startedY) return startedY - startedX;
        return (y.t.weight * 2 + y.t.incidence) - (x.t.weight * 2 + x.t.incidence);
      });
    out.push(...pool);
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}
