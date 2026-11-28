import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, CheckCircle2, Circle, RefreshCw, Sparkles, Timer,
  BookOpen, ListChecks, Repeat, Info, ChevronLeft, ChevronRight, GraduationCap, ArrowRight, Target,
} from 'lucide-react';
import { Button, Card, Chip, Empty, Modal, PageHead, Progress } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { accuracyBySpecialty, daysUntil, dueReviews, examPhase, fmtDate, iso, minutesLabel, WEEKDAYS } from '../utils.js';
import { generatePlan, planCounts } from '../planner.js';
import { currentLevel } from '../trilha.js';
import { SESSION_STAGE, STAGE_LABEL, STAGES, planStageCounts } from '../metodo.js';

const ICONS = { teoria: BookOpen, questoes: ListChecks, revisao: Repeat, simulado: Timer };

export default function Planner() {
  const { user, curriculum, updateUser, bumpActivity, toast } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [offset, setOffset] = useState(0);
  const [difficultyOpen, setDifficultyOpen] = useState(false);
  const [draftGroups, setDraftGroups] = useState([]);
  const counts = planCounts(user.plan);
  const stageCounts = useMemo(() => planStageCounts(user.plan), [user.plan]);
  const level = currentLevel(user);
  const due = useMemo(() => dueReviews(curriculum, user.progress), [curriculum, user.progress]);
  const phase = examPhase(user.examDate);
  const selectedGroups = user.difficultyGroups || [];
  const specialties = useMemo(() => {
    const map = new Map();
    for (const area of curriculum.areas) {
      for (const topic of area.topics) {
        const entry = map.get(topic.group) || { group: topic.group, areaName: area.name, color: area.color, count: 0 };
        entry.count += 1;
        map.set(topic.group, entry);
      }
    }
    return [...map.values()].sort((a, b) => a.areaName.localeCompare(b.areaName, 'pt-BR') || a.group.localeCompare(b.group, 'pt-BR'));
  }, [curriculum]);
  const weakSpecialties = useMemo(
    () => accuracyBySpecialty(curriculum, user.attempts).filter((item) => item.total >= 2 && item.pct < 70).slice(0, 6),
    [curriculum, user.attempts],
  );

  const weeks = user.plan.weeks || [];
  const visible = weeks.slice(offset, offset + 2);
  const totalWeeks = Math.ceil(Math.max(1, daysUntil(user.examDate)) / 7);

  const build = () => {
    if (!user.studyDays?.length) {
      toast('Defina ao menos um dia de estudo em Perfil e ajustes.', 'error');
      return;
    }
    const plan = generatePlan(user, curriculum, 8);
    updateUser({ plan, onboardingDone: true });
    setConfirm(false);
    setOffset(0);
    toast('Plano personalizado de 8 semanas gerado.');
  };

  const openDifficulty = () => {
    setDraftGroups([...selectedGroups]);
    setDifficultyOpen(true);
  };

  const toggleDraftGroup = (group) => {
    setDraftGroups((prev) => (prev.includes(group) ? prev.filter((item) => item !== group) : [...prev, group]));
  };

  const suggestWeak = () => {
    if (!weakSpecialties.length) {
      toast('Ainda não há questões suficientes para sugerir especialidades.', 'error');
      return;
    }
    setDraftGroups((prev) => [...new Set([...prev, ...weakSpecialties.map((item) => item.group)])]);
  };

  const saveDifficulty = (regenerate = false) => {
    const nextUser = { ...user, difficultyGroups: [...draftGroups] };
    if (regenerate) nextUser.plan = generatePlan(nextUser, curriculum, 8);
    updateUser(nextUser);
    setDifficultyOpen(false);
    if (regenerate) setOffset(0);
    toast(regenerate
      ? 'Preferências salvas e plano personalizado regerado.'
      : 'Preferências salvas. Regenere o plano para aplicar ao cronograma.');
  };

  const toggleSession = (session) => {
    updateUser((prev) => ({
      ...prev,
      plan: {
        ...prev.plan,
        weeks: prev.plan.weeks.map((w) => ({
          ...w,
          days: w.days.map((d) => ({ ...d, sessions: d.sessions.map((s) => (s.id === session.id ? { ...s, done: !s.done } : s)) })),
        })),
      },
    }));
    if (!session.done) {
      bumpActivity({ minutes: session.minutes });
      toast('Sessão concluída. Avanço registrado.', 'success');
    }
  };

  return (
    <>
      <PageHead
        eyebrow="Planner"
        title="Planner"
        subtitle="Plano Pro personalizado: todos os conteúdos liberados, prioridade para suas especialidades difíceis, seus erros e a incidência das provas."
        actions={<Button onClick={() => (counts.total ? setConfirm(true) : build())} icon={Sparkles}>{counts.total ? 'Regerar plano' : 'Gerar plano'}</Button>}
      />

      <div className="planner-top">
        <Card className="plan-config">
          <div className="section-head small">
            <div><span className="eyebrow">Sua rotina</span><h2>Capacidade semanal</h2></div>
            <Link to="/perfil?secao=planner" className="text-link">Editar em Minha conta <ArrowRight size={14} /></Link>
          </div>
          <div className="plan-routine">
            <div><span>Horas/dia</span><strong>{user.dailyHours}h</strong></div>
            <div><span>Início</span><strong>{fmtDate(user.startDate)}</strong></div>
            <div><span>Dias</span><strong>{user.studyDays.length}/semana</strong></div>
            <div><span>Meta</span><strong>{user.goalQuestions} questões</strong></div>
          </div>
          <div className="plan-summary">
            <div><span>Plano</span><strong>Pro · personalizado</strong></div>
            <div><span>Fase sugerida</span><strong>{phase.label}</strong></div>
            <div><span>Semanas até a prova</span><strong>{totalWeeks}</strong></div>
            <div><span>Sessões planejadas</span><strong>{counts.done}/{counts.total}</strong></div>
          </div>
          <Progress value={counts.total ? (counts.done / counts.total) * 100 : 0} tone="accent" />
          <div className="plan-cycle">
            {STAGES.filter((stage) => stage.id !== 'ativar').map((stage) => (
              <div key={stage.id}><span>{stage.label}</span><strong>{stageCounts[stage.id] || 0}</strong></div>
            ))}
          </div>
          <p className="muted-note">O ciclo distribui codificação, recuperação, revisão espaçada e treino intercalado — sem bloquear nenhum nível.</p>
        </Card>

        <Card className="plan-manual">
          <div className="section-head small"><div><span className="eyebrow">Revisão espaçada</span><h2>Fila de revisões</h2></div><Chip tone={due.length ? 'danger' : 'success'}>{due.length}</Chip></div>
          {due.length ? (
            <div className="review-list">
              {due.slice(0, 6).map(({ topic, area }) => (
                <Link key={topic.id} to={`/conteudos/${topic.id}`} className="mini-row">
                  <span className="dot" style={{ background: area.color }} />
                  <span>{topic.title}</span>
                  <small>{fmtDate(user.progress[topic.id]?.nextReview)}</small>
                </Link>
              ))}
            </div>
          ) : <p className="muted-note">Sem revisões vencidas. Conclua checklists e registre confiança para alimentar a fila.</p>}
          <div className="tip-box"><Info size={16} /><p>Errou um tema? Ele ganha prioridade automaticamente na próxima geração do plano.</p></div>
        </Card>
      </div>

      <Card className="plan-difficulty">
        <div className="section-head small">
          <div><span className="eyebrow">Personalização</span><h2>Especialidades com mais dificuldade</h2></div>
          <Chip tone={selectedGroups.length ? 'accent' : 'neutral'}>{selectedGroups.length ? `${selectedGroups.length} selecionadas` : 'prioridade automática'}</Chip>
        </div>
        <p className="muted-note">Marque o que quer priorizar. O plano usa todos os temas e combina suas escolhas com erros, peso e incidência das principais provas. Nível de referência: <Link to="/trilha" className="inline-icon"><GraduationCap size={13} /> {level.code} · {level.name}</Link>.</p>
        {selectedGroups.length ? (
          <div className="difficulty-selected">
            {selectedGroups.map((group) => <Chip key={group} tone="accent">{group}</Chip>)}
          </div>
        ) : (
          <div className="difficulty-selected empty"><span className="muted-note">Nenhuma especialidade marcada. O plano ainda prioriza peso, incidência, revisões e seus erros.</span></div>
        )}
        <div className="plan-actions">
          <Button variant="soft" size="sm" onClick={openDifficulty} icon={Target}>Escolher especialidades</Button>
          {weakSpecialties.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setDraftGroups([...new Set([...selectedGroups, ...weakSpecialties.map((item) => item.group)])]); setDifficultyOpen(true); }} icon={Sparkles}>
              Sugerir pelos meus erros
            </Button>
          )}
        </div>
        {weakSpecialties.length > 0 && (
          <p className="muted-note">Sugestão pelos erros: {weakSpecialties.slice(0, 3).map((item) => item.group).join(' · ')}.</p>
        )}
      </Card>

      {weeks.length > 0 && user.plan.mode !== 'personalizado' && (
        <div className="trilha-notice">
          <Info size={17} />
          <p><strong>Seu cronograma foi gerado no modelo antigo por nível.</strong> Regenere para aplicar o plano personalizado com todos os conteúdos e suas especialidades difíceis.</p>
          <Button size="sm" variant="soft" onClick={build} icon={RefreshCw}>Regerar agora</Button>
        </div>
      )}

      {!weeks.length ? (
        <Card>
          <Empty
            icon={CalendarDays}
            title="Seu planner ainda está em branco"
            text="Defina sua rotina acima e gere uma sequência de 8 semanas. Cada sessão leva a um checklist e a questões do tema."
            action={<Button onClick={build} icon={Sparkles}>Criar meu plano agora</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="week-nav">
            <div><span className="eyebrow">Cronograma</span><h2>{visible[0] ? `Semana de ${fmtDate(visible[0].days[0]?.date || visible[0].start, { day: '2-digit', month: 'long' })}` : 'Plano'}</h2></div>
            <div className="week-nav-actions">
              <Button variant="ghost" size="sm" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - 2))} icon={ChevronLeft}>Anterior</Button>
              <span>{offset / 2 + 1} de {Math.ceil(weeks.length / 2)}</span>
              <Button variant="ghost" size="sm" disabled={offset + 2 >= weeks.length} onClick={() => setOffset((o) => o + 2)}>Próxima <ChevronRight size={15} /></Button>
            </div>
          </div>

          <div className="kanban">
            {visible.map((w, wi) => (
              <div className="week-col" key={offset + wi}>
                <div className="week-col-head">
                  <strong>Semana {offset + wi + 1}</strong>
                  <span>{w.days.reduce((s, d) => s + d.sessions.length, 0)} sessões · {minutesLabel(w.days.reduce((s, d) => s + d.sessions.reduce((x, ss) => x + ss.minutes, 0), 0))}</span>
                </div>
                {w.days.map((day) => (
                  <div key={day.date} className={`day-block ${day.date === iso() ? 'today' : ''}`}>
                    <div className="day-label">
                      <strong>{WEEKDAYS[new Date(`${day.date}T12:00:00`).getDay()]}</strong>
                      <span>{fmtDate(day.date, { day: '2-digit', month: '2-digit' })}</span>
                      {day.date === iso() && <Chip tone="accent">hoje</Chip>}
                    </div>
                    {day.sessions.map((s) => {
                      const Icon = ICONS[s.type] || BookOpen;
                      return (
                        <div key={s.id} className={`plan-session ${s.done ? 'done' : ''} type-${s.type}`}>
                          <button className="check-round" onClick={() => toggleSession(s)} aria-label={s.done ? 'Desmarcar sessão' : 'Concluir sessão'}>
                            {s.done ? <CheckCircle2 size={19} /> : <Circle size={19} />}
                          </button>
                          <div className="plan-session-main">
                            <div className="plan-type"><Icon size={13} /> {STAGE_LABEL[SESSION_STAGE[s.type]] || s.type} · {s.minutes} min</div>
                            {s.topicId ? <Link to={`/conteudos/${s.topicId}`}>{s.title}</Link> : <button className="linkish" onClick={() => window.location.assign('/questoes/simulado')}>{s.title}</button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="plan-legend">
            <span><BookOpen size={14} /> Codificar</span><span><ListChecks size={14} /> Recuperar</span><span><Repeat size={14} /> Revisar</span><span><Timer size={14} /> Intercalar</span>
          </div>
        </>
      )}

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Regerar plano?">
        <p>Isso substitui as sessões ainda não concluídas por uma nova distribuição de 8 semanas. Seus checklists, tentativas e histórico são mantidos.</p>
        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setConfirm(false)}>Cancelar</Button>
          <Button onClick={build} icon={RefreshCw}>Regerar agora</Button>
        </div>
      </Modal>

      <Modal open={difficultyOpen} onClose={() => setDifficultyOpen(false)} title="Especialidades com mais dificuldade" size="lg">
        <p className="muted-note">Marque as especialidades que quer priorizar. O plano continua com todos os conteúdos liberados e não fica preso a um nível.</p>
        {weakSpecialties.length > 0 && (
          <Button variant="ghost" size="sm" onClick={suggestWeak} icon={Sparkles}>Usar sugestão dos meus erros ({weakSpecialties.map((item) => `${item.group} ${item.pct}%`).slice(0, 3).join(' · ')})</Button>
        )}
        <div className="difficulty-picker">
          {specialties.map((specialty) => (
            <button
              key={specialty.group}
              type="button"
              className={draftGroups.includes(specialty.group) ? 'active' : ''}
              onClick={() => toggleDraftGroup(specialty.group)}
              aria-pressed={draftGroups.includes(specialty.group)}
            >
              <span className="difficulty-dot" style={{ background: specialty.color }} />
              <span className="difficulty-copy"><strong>{specialty.group}</strong><small>{specialty.areaName} · {specialty.count} temas</small></span>
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setDifficultyOpen(false)}>Cancelar</Button>
          <Button variant="soft" onClick={() => saveDifficulty(false)}>Salvar</Button>
          {counts.total > 0 && <Button onClick={() => saveDifficulty(true)} icon={RefreshCw}>Salvar e regerar</Button>}
        </div>
      </Modal>
    </>
  );
}
