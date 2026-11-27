import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, BookOpen, CheckCircle2, ChevronRight, Clock3, GraduationCap, Layers,
  Play, RefreshCw, Sparkles, Target, Trophy,
} from 'lucide-react';
import { Button, Card, Chip, Field, PageHead, Progress, Ring } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { topicProgress, topicStatus } from '../utils.js';
import {
  LEVELS, LEVEL_STATUS_LABEL, currentLevel, levelById, levelStats, levelStatus,
  nextTopics, semesterLabel, semesterLevel,
} from '../trilha.js';
import { generatePlan } from '../planner.js';

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

  const allStats = useMemo(
    () => Object.fromEntries(LEVELS.map((level) => [level.id, levelStats(curriculum, level.id, user.progress)])),
    [curriculum, user.progress],
  );
  const stats = allStats[selectedId] || levelStats(curriculum, selectedId, user.progress);
  const currentStats = allStats[current.id];
  const next = useMemo(() => nextTopics(curriculum, user, 4), [curriculum, user]);
  const selectedStatus = levelStatus(selectedId, user, stats);

  const continueStudy = () => {
    const topic = next[0]?.t;
    if (topic) navigate(`/conteudos/${topic.id}`);
    else navigate('/questoes/simulado');
  };

  const changeSemester = (value) => {
    const semester = Number(value);
    const level = semesterLevel(semester);
    updateUser({ semester, level });
    setSelectedId(level);
    toast(`Nível ${level} ativado para o ${semester}º semestre.`);
  };

  const rebuildPlan = () => {
    const plan = generatePlan({ ...user, level: current.id }, curriculum, 8);
    updateUser({ plan });
    toast(`Plano de 8 semanas refeito com prioridade no Nível ${current.id}.`);
  };

  return (
    <>
      <PageHead
        eyebrow="Trilha de estudos · curso em níveis"
        title={<>Do fundamento <em>ao internato.</em></>}
        subtitle="Cada nível corresponde a um bloco de semestres. Dentro dele, você estuda matéria por matéria, tema por tema, com checklist, questões e revisão espaçada."
        actions={<Chip tone="accent"><GraduationCap size={13} /> Nível {current.id} ativo</Chip>}
      />

      <Card className="trilha-hero" style={{ '--level-tone': current.tone }}>
        <div className="trilha-hero-copy">
          <span className="eyebrow">Seu nível atual · {semesterLabel(user.semester)}</span>
          <h2>Nível {current.id}: <em>{current.name}</em></h2>
          <p>{current.description}</p>
          <div className="trilha-hero-meta">
            <span><Layers size={14} /> {currentStats.total} temas</span>
            <span><BookOpen size={14} /> {currentStats.subjects.length} matérias</span>
            <span><Trophy size={14} /> {currentStats.mastered} dominados</span>
            <span><Target size={14} /> {currentStats.pct}% do nível</span>
          </div>
          <div className="trilha-hero-actions">
            <Button onClick={continueStudy} icon={Play}>Continuar de onde parei</Button>
            <Button variant="ghost" onClick={rebuildPlan} icon={RefreshCw}>Regerar plano do nível</Button>
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
              <small>{level.semesterLabel} · {s.total} temas</small>
              <Progress value={s.pct} tone={state === 'done' ? 'green' : 'accent'} />
              <span className="level-card-foot">{s.mastered}/{s.total} dominados</span>
            </button>
          );
        })}
      </div>

      <div className="trilha-layout">
        <section>
          <div className="trilha-level-head">
            <div>
              <span className="eyebrow">Nível {selected.id} · {selected.semesterLabel}</span>
              <h2>{selected.name}</h2>
              <p>{selected.description}</p>
              <div className="trilha-level-tags">
                <Chip tone={selectedStatus === 'current' ? 'accent' : selectedStatus === 'done' ? 'success' : 'neutral'}>
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

          {selectedStatus === 'ahead' && (
            <div className="trilha-notice">
              <Sparkles size={17} />
              <p><strong>Este nível está à frente do seu semestre.</strong> Você pode antecipar temas, mas o planner dará prioridade ao Nível {current.id} até você concluir os fundamentos.</p>
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
                    const status = topicStatus(p, t.checklist.length);
                    const progress = topicProgress(p, t.checklist.length);
                    return (
                      <Link key={t.id} to={`/conteudos/${t.id}`} className="lesson-row">
                        <span className="lesson-num">{String(index + 1).padStart(2, '0')}</span>
                        <div className="lesson-main">
                          <strong>{t.title}</strong>
                          <span>{t.group} · {t.summary}</span>
                        </div>
                        <div className="lesson-status">
                          {status === 'dominado' ? (
                            <Chip tone="success"><CheckCircle2 size={12} /> dominado</Chip>
                          ) : status === 'estudando' ? (
                            <Chip tone="warning">em estudo</Chip>
                          ) : (
                            <Chip tone="neutral">novo</Chip>
                          )}
                        </div>
                        <div className="lesson-progress">
                          <Progress value={progress} tone={status === 'dominado' ? 'green' : 'accent'} />
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
            <span className="eyebrow">Seu momento</span>
            <h3>{semesterLabel(user.semester)}</h3>
            <p className="muted-note">Nível {current.id} · {current.name}. Ao mudar o semestre, a trilha e o planner passam a priorizar o novo bloco.</p>
            <Field label="Atualizar semestre">
              <select value={user.semester || 1} onChange={(e) => changeSemester(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s}>{s}º semestre · Nível {semesterLevel(s)}</option>
                ))}
              </select>
            </Field>
            <Button variant="soft" size="sm" onClick={rebuildPlan} icon={RefreshCw}>Aplicar no plano</Button>
          </Card>

          <Card className="trilha-next">
            <div className="section-head small">
              <div><span className="eyebrow">Próximos passos</span><h3>O que estudar agora</h3></div>
            </div>
            {next.length ? next.map(({ t, a }) => (
              <Link key={t.id} to={`/conteudos/${t.id}`} className="mini-row">
                <span className="dot" style={{ background: a.color }} />
                <span>{t.title}</span>
                <ArrowRight size={14} />
              </Link>
            )) : <p className="muted-note">Você dominou todos os temas da trilha. Hora de simulado e revisão.</p>}
            <Button variant="ghost" size="sm" onClick={() => navigate('/planner')} icon={Clock3}>Abrir planner</Button>
          </Card>

          <Card className="trilha-method">
            <span className="eyebrow">Método do curso</span>
            <h3>Como avançar de nível</h3>
            <ol>
              <li><strong>Teoria dirigida.</strong> Leia o guia do tema e monte um resumo ativo.</li>
              <li><strong>Checklist.</strong> Marque só o que executou de verdade.</li>
              <li><strong>Questões.</strong> Resolva o tema e leia todos os comentários.</li>
              <li><strong>Revisão.</strong> Refaça os erros em D+7 e D+30.</li>
            </ol>
            <p className="muted-note">Um tema é dominado quando o checklist está completo e sua confiança é 4 ou 5. O nível avança quando todos os temas estiverem dominados.</p>
          </Card>
        </aside>
      </div>
    </>
  );
}
