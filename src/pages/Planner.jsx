import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CalendarDays, CheckCircle2, Circle, Clock3, RefreshCw, Sparkles, Timer,
  BookOpen, ListChecks, Repeat, Info, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button, Card, Chip, Empty, Field, InlineError, Modal, PageHead, Progress } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { fmtDate, fmtLong, iso, minutesLabel, WEEKDAYS, WEEKDAYS_LONG, dueReviews, daysUntil } from '../utils.js';
import { generatePlan, planCounts } from '../planner.js';

const ICONS = { teoria: BookOpen, questoes: ListChecks, revisao: Repeat, simulado: Timer };

export default function Planner() {
  const { user, curriculum, updateUser, bumpActivity, toast } = useStore();
  const [form, setForm] = useState({ dailyHours: user.dailyHours, studyDays: user.studyDays, startDate: user.startDate });
  const [confirm, setConfirm] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const counts = planCounts(user.plan);
  const due = useMemo(() => dueReviews(curriculum, user.progress), [curriculum, user.progress]);

  const weeks = user.plan.weeks || [];
  const visible = weeks.slice(offset, offset + 2);
  const totalWeeks = Math.ceil(Math.max(1, daysUntil(user.examDate)) / 7);

  const build = () => {
    if (!form.studyDays.length) {
      setError('Escolha ao menos um dia de estudo.');
      return;
    }
    const plan = generatePlan({ ...user, ...form }, curriculum, 8);
    updateUser({ ...form, plan, onboardingDone: true });
    setConfirm(false);
    setOffset(0);
    setError('');
    toast('Plano de 8 semanas gerado. Você pode ajustar sempre que precisar.');
  };

  const toggleDay = (d) => {
    setForm((f) => ({ ...f, studyDays: f.studyDays.includes(d) ? f.studyDays.filter((x) => x !== d) : [...f.studyDays, d].sort() }));
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

  const phase = daysUntil(user.examDate) > 180 ? 'Fundamentação' : daysUntil(user.examDate) > 90 ? 'Consolidação' : daysUntil(user.examDate) > 30 ? 'Questões e revisão' : 'Reta final';

  return (
    <>
      <PageHead
        eyebrow="Plano de estudo"
        title={<>Um plano claro <em>para cada etapa.</em></>}
        subtitle="O planner distribui suas horas conforme peso, incidência, confiança e erros recentes. Sessões curtas, com revisão espaçada."
        actions={<Button onClick={() => (counts.total ? setConfirm(true) : build())} icon={Sparkles}>{counts.total ? 'Regerar plano' : 'Gerar plano'}</Button>}
      />

      <div className="planner-top">
        <Card className="plan-config">
          <div className="section-head small"><div><span className="eyebrow">Configuração</span><h2>Capacidade semanal</h2></div></div>
          <div className="config-grid">
            <Field label="Horas por dia">
              <select value={form.dailyHours} onChange={(e) => setForm({ ...form, dailyHours: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>{h} hora{h > 1 ? 's' : ''}</option>)}
              </select>
            </Field>
            <Field label="Início">
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </Field>
          </div>
          <Field label="Dias disponíveis">
            <div className="day-picker compact">
              {WEEKDAYS.map((d, i) => <button key={d} type="button" className={form.studyDays.includes(i) ? 'active' : ''} onClick={() => toggleDay(i)}>{d}</button>)}
            </div>
          </Field>
          <InlineError>{error}</InlineError>
          <div className="plan-summary">
            <div><span>Fase sugerida</span><strong>{phase}</strong></div>
            <div><span>Semanas até a prova</span><strong>{totalWeeks}</strong></div>
            <div><span>Sessões planejadas</span><strong>{counts.done}/{counts.total}</strong></div>
          </div>
          <Progress value={counts.total ? (counts.done / counts.total) * 100 : 0} tone="accent" />
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
                            <div className="plan-type"><Icon size={13} /> {s.type} · {s.minutes} min</div>
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
            <span><BookOpen size={14} /> Teoria dirigida</span><span><ListChecks size={14} /> Questões</span><span><Repeat size={14} /> Revisão</span><span><Timer size={14} /> Simulado</span>
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
    </>
  );
}
