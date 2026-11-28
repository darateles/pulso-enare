import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, CheckCircle2, ChevronRight, Clock3, GraduationCap, Layers,
  Play, RefreshCw, Sparkles, Target, Trophy,
} from 'lucide-react';
import { Button, Card, Chip, Field, PageHead, Progress, Ring } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { examPhase, topicProgress, topicStatus } from '../utils.js';
import { TOPIC_STAGE_LABEL, topicStage } from '../metodo.js';
import {
  LEVELS, LEVEL_STATUS_LABEL, STUDY_PACES, currentLevel, levelById, levelStats, levelStatus,
  nextTopics, recommendLevel, semesterLabel,
} from '../trilha.js';
import { generatePlan, planCounts } from '../planner.js';

function subjectStats(topics, progress) {
  const totalSteps = topics.reduce((sum, t) => sum + t.checklist.length, 0);
  const doneSteps = topics.reduce((sum, t) => {
    const p = progress[t.id];
    return sum + (Array.isArray(p?.done) ? p.done.filter((i) => i < t.checklist.length).length : 0);
  }, 0);
  const mastered = topics.filter((t) => topicStatus(progress[t.id], t.checklist.length) === 'dominado').length;
  return { pct: totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 0, mastered, total: topics.length };
}

export default function Trilha() {
  const { user, curriculum, updateUser, toast } = useStore();
  const navigate = useNavigate();
  const current = currentLevel(user);
  const [selectedId, setSelectedId] = useState(current.id);
  const selected = levelById(selectedId);
  const recommendation = useMemo(() => recommendLevel(user), [user.dailyHours, user.studyDays, user.examDate, user.studyPace]);
  const pace = STUDY_PACES.find((item) => item.id === user.studyPace) || STUDY_PACES[1];
  const phase = examPhase(user.examDate);

  const allStats = useMemo(
    () => Object.fromEntries(LEVELS.map((level) => [level.id, levelStats(curriculum, level.id, user.progress)])),
    [curriculum, user.progress],
  );
  const stats = allStats[selectedId] || levelStats(curriculum, selectedId, user.progress);
  const currentStats = allStats[current.id];
  const next = useMemo(() => nextTopics(curriculum, user, 4), [curriculum, user]);
  const plan = planCounts(user.plan);
  const selectedStatus = levelStatus(selectedId, user, stats);

  const continueStudy = () => {
    const topic = next[0]?.t;
    if (topic) navigate(`/conteudos/${topic.id}`);
    else navigate('/questoes/simulado');
  };

  const changeSemester = (value) => {
    const semester = Number(value);
    updateUser({ semester });
    toast(`Semestre salvo como informação de perfil. Seu nível não mudou.`);
  };

  const changeLevel = (value) => {
    const level = Math.min(5, Math.max(1, Number(value) || 1));
    updateUser({ level, levelModel: 2 });
    setSelectedId(level);
    toast(`Nível ${level} definido como referência. Todo o conteúdo continua liberado.`);
  };

  const applyRecommended = () => {
    const level = recommendation.levelId;
    updateUser({ level, levelModel: 2 });
    setSelectedId(level);
    toast(`Nível ${level} · ${levelById(level).name} aplicado a partir do seu ritmo.`);
  };

  const rebuildPlan = () => {
    const plan = generatePlan(user, curriculum, 8);
    updateUser({ plan });
    toast('Plano personalizado refeito com todos os conteúdos liberados.');
  };

  return (
    <>
      <PageHead
        eyebrow="Trilha"
        title="Trilha"
        subtitle="5 níveis, 7 matérias e 90 temas."
        actions={<Chip tone="accent"><GraduationCap size={13} /> Nível {current.id}</Chip>}
      />

      <Card className="trilha-hero" style={{ '--level-tone': current.tone }}>
        <div className="trilha-hero-copy">
          <span className="eyebrow">Nível atual · {pace.label}</span>
          <h2>Nível {current.id}: {current.name}</h2>
          <div className="trilha-hero-meta">
            <span><Layers size={14} /> {currentStats.total} temas</span>
            <span><BookOpen size={14} /> {currentStats.subjects.length} matérias</span>
            <span><Trophy size={14} /> {currentStats.mastered} dominados</span>
            <span><Target size={14} /> {currentStats.pct}% do nível</span>
            <span><Clock3 size={14} /> {phase.label}</span>
          </div>
          <div className="trilha-hero-actions">
            <Button onClick={continueStudy} icon={Play}>Continuar de onde parei</Button>
            <Button variant="ghost" onClick={rebuildPlan} icon={RefreshCw}>Regerar plano personalizado</Button>
          </div>
        </div>
        <div className="trilha-hero-ring">
          <Ring value={currentStats.pct} size={124} stroke={9} tone="accent">
            <strong>{currentStats.pct}%</strong>
            <span>nível {current.id}</span>
          </Ring>
        </div>
      </Card>

      <div className="level-rail" aria-label="Níveis da trilha">
        {LEVELS.map((level) => {
          const s = allStats[level.id];
          const state = levelStatus(level.id, user, s);
          return (
            <button
              key={level.id}
              type="button"
              className={`level-card ${state} ${selectedId === level.id ? 'active' : ''}`}
              style={{ '--level-tone': level.tone }}
              onClick={() => setSelectedId(level.id)}
            >
              <span className="level-card-top">
                <span className="level-code">{level.code}</span>
                <span className="level-state">{LEVEL_STATUS_LABEL[state]}</span>
              </span>
              <strong>{level.name}</strong>
              <small>{level.paceLabel} · {s.total} temas</small>
              <Progress value={s.pct} tone={state === 'done' ? 'green' : 'accent'} />
              <span className="level-card-foot">{s.mastered}/{s.total} dominados</span>
            </button>
          );
        })}
      </div>

      <div className="trilha-layout">
        <section>
          {selectedId === current.id ? (
            <div className="trilha-list-head">
              <span className="eyebrow">Matérias do nível</span>
              <h2>Matérias e temas</h2>
            </div>
          ) : (
            <div className="trilha-level-head">
              <div>
                <span className="eyebrow">Nível {selected.id} · {selected.paceLabel}</span>
                <h2>{selected.name}</h2>
                <p>{selected.description}</p>
                <div className="trilha-level-tags">
                  <Chip tone={selectedStatus === 'done' ? 'success' : 'neutral'}>
                    {LEVEL_STATUS_LABEL[selectedStatus]}
                  </Chip>
                  <span>{stats.subjects.length} matérias</span>
                  <span>{stats.total} temas</span>
                  <span>{stats.mastered} dominados</span>
                </div>
              </div>
              <Ring value={stats.pct} size={92} stroke={7} tone={selectedStatus === 'done' ? 'green' : 'accent'}>
                <strong>{stats.pct}%</strong>
                <span>concluído</span>
              </Ring>
            </div>
          )}

          {selectedStatus === 'ahead' && (
            <div className="trilha-notice">
              <Sparkles size={17} />
              <p><strong>Este nível está liberado.</strong> Ele é uma referência de profundidade, não uma trava. O planner personalizado continua usando todos os temas e as suas especialidades difíceis.</p>
              <Button size="sm" variant="soft" onClick={() => setSelectedId(current.id)}>Voltar ao meu nível</Button>
            </div>
          )}
          {selectedStatus === 'review' && (
            <div className="trilha-notice soft">
              <Clock3 size={17} />
              <p><strong>Nível anterior.</strong> Use como revisão espaçada: releia o resumo, refaça os erros e avance só quando a recuperação for fácil.</p>
            </div>
          )}

          {stats.subjects.map(({ area, topics }) => {
            const s = subjectStats(topics, user.progress);
            return (
              <Card key={area.id} className="subject-card">
                <div className="subject-head">
                  <span className="subject-dot" style={{ background: area.color }} />
                  <div className="subject-title">
                    <strong>{area.name}</strong>
                    <small>{area.short} · {topics.length} temas · {s.mastered} dominados</small>
                  </div>
                  <div className="subject-meter">
                    <Progress value={s.pct} tone={s.pct === 100 ? 'green' : 'accent'} />
                    <span>{s.pct}%</span>
                  </div>
                </div>
                <div className="lesson-list">
                  {topics.map((t, index) => {
                    const p = user.progress[t.id] || {};
                    const stage = topicStage(p, t.checklist.length);
                    const progress = topicProgress(p, t.checklist.length);
                    return (
                      <Link key={t.id} to={`/conteudos/${t.id}`} className="lesson-row">
                        <span className="lesson-num">{String(index + 1).padStart(2, '0')}</span>
                        <div className="lesson-main">
                          <strong>{t.title}</strong>
                          <span>{t.group} · {t.summary}</span>
                        </div>
                        <div className="lesson-status">
                          <Chip tone={stage === 'dominado' ? 'success' : stage === 'revisado' ? 'accent' : stage === 'recuperado' ? 'warning' : 'neutral'}>
                            {stage === 'dominado' && <CheckCircle2 size={12} />}
                            {TOPIC_STAGE_LABEL[stage]}
                          </Chip>
                        </div>
                        <div className="lesson-progress">
                          <Progress value={progress} tone={stage === 'dominado' || stage === 'revisado' ? 'green' : 'accent'} />
                          <small>{progress}%</small>
                        </div>
                        <ChevronRight size={16} className="lesson-arrow" />
                      </Link>
                    );
                  })}
                </div>
              </Card>
            );
          })}

          {!stats.subjects.length && (
            <Card>
              <p className="muted-note">Este nível ainda não tem temas mapeados.</p>
            </Card>
          )}
        </section>

        <aside className="trilha-side">
          <Card>
            <div className="section-head small">
              <div><span className="eyebrow">Nível da trilha</span><h3>Definido pelo seu ritmo</h3></div>
              <Chip tone="accent">{recommendation.level.code}</Chip>
            </div>
            <p className="muted-note">O semestre não define seu nível. A recomendação usa horas por dia, dias por semana, profundidade escolhida e proximidade da prova.</p>
            <div className="level-preview recommended" style={{ '--level-tone': recommendation.level.tone }}>
              <span className="level-preview-code small">{recommendation.level.code}</span>
              <div>
                <strong>Recomendado: nível {recommendation.level.id} · {recommendation.level.name}</strong>
                <p>{recommendation.reason}</p>
              </div>
            </div>
            <Field label="Nível de referência" hint="Todo o conteúdo fica liberado; o planner não fica preso a ele.">
              <select value={current.id} onChange={(e) => changeLevel(e.target.value)}>
                {LEVELS.map((level) => <option key={level.id} value={level.id}>{level.code} · {level.name}{level.id === recommendation.levelId ? ' (recomendado)' : ''}</option>)}
              </select>
            </Field>
            <Button variant="soft" size="sm" onClick={applyRecommended} icon={Sparkles}>Aplicar nível recomendado</Button>
            <div className="trilha-profile-field">
              <Field label="Semestre da faculdade" hint="Apenas informação de perfil. Alterar não muda seu nível.">
                <select value={user.semester || 1} onChange={(e) => changeSemester(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((s) => <option key={s} value={s}>{semesterLabel(s)}</option>)}
                </select>
              </Field>
            </div>
            <Button variant="ghost" size="sm" onClick={rebuildPlan} icon={RefreshCw}>Regerar plano personalizado</Button>
          </Card>

          <Card className="trilha-plan">
            <div className="section-head small">
              <div><span className="eyebrow">Plano de 8 semanas</span><h3>Seu cronograma</h3></div>
              <Chip tone={plan.done ? 'success' : 'neutral'}>{plan.done}/{plan.total}</Chip>
            </div>
            <div className="plan-mini">
              <div><strong>{plan.done}</strong><span>concluídas</span></div>
              <div><strong>{Math.max(0, plan.total - plan.done)}</strong><span>restantes</span></div>
              <div><strong>{(user.plan?.weeks || []).length}</strong><span>semanas</span></div>
            </div>
            <Progress value={plan.total ? (plan.done / plan.total) * 100 : 0} tone="accent" />
            <Button variant="ghost" size="sm" onClick={() => navigate('/planner')} icon={Clock3}>Abrir planner</Button>
          </Card>

        </aside>
      </div>
    </>
  );
}
