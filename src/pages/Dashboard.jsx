import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, CalendarDays, CheckCircle2, Circle, Clock3, Play, Trophy,
} from 'lucide-react';
import { Button, Card, Empty, PageHead, Progress, Stat } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { daysUntil, dueReviews, fmtDate, globalStats, iso, minutesLabel } from '../utils.js';
import { todaySessions } from '../planner.js';
import { currentLevel, levelStats, nextTopics, semesterLabel } from '../trilha.js';
import { SESSION_STAGE, STAGE_LABEL } from '../metodo.js';
import { dailyScore, rankingDate, rankingId } from '../ranking.js';

export default function Dashboard() {
  const { user, curriculum, account, updateUser, bumpActivity } = useStore();
  const navigate = useNavigate();
  const stats = useMemo(() => globalStats(curriculum, user.progress), [curriculum, user.progress]);
  const due = useMemo(() => dueReviews(curriculum, user.progress), [curriculum, user.progress]);
  const today = useMemo(() => todaySessions(user.plan), [user.plan]);
  const level = currentLevel(user);
  const levelData = useMemo(() => levelStats(curriculum, level.id, user.progress), [curriculum, level.id, user.progress]);
  const rank = useMemo(() => dailyScore(user, rankingDate()), [user]);
  const myRankingId = rankingId(account || 'davi');
  const focus = useMemo(() => nextTopics(curriculum, user, 3), [curriculum, user]);
  const count = daysUntil(user.examDate);
  const firstName = (user.name || 'estudante').split(' ')[0];

  const toggleSession = (session) => {
    updateUser((prev) => ({
      ...prev,
      plan: {
        ...prev.plan,
        weeks: prev.plan.weeks.map((week) => ({
          ...week,
          days: week.days.map((day) => ({
            ...day,
            sessions: day.sessions.map((item) => (item.id === session.id ? { ...item, done: !item.done } : item)),
          })),
        })),
      },
    }));
    if (!session.done) bumpActivity({ minutes: session.minutes });
  };

  return (
    <>
      <PageHead
        eyebrow="Início"
        title={`Hoje, ${firstName}`}
        subtitle={`${fmtDate(iso(), { weekday: 'long', day: '2-digit', month: 'long' })} · ${count} dias até a prova`}
        actions={<Link to="/planner" className="btn btn-soft"><CalendarDays size={15} /> Abrir planner</Link>}
      />

      <div className="home-grid">
        <Card>
          <div className="section-head small">
            <div><span className="eyebrow">Hoje</span><h2>Plano do dia</h2></div>
            <Link to="/planner" className="text-link">Ver semana</Link>
          </div>
          {today.length ? today.map((session) => (
            <div key={session.id} className={`today-session ${session.done ? 'done' : ''}`}>
              <button className="check-round" onClick={() => toggleSession(session)} aria-label={session.done ? 'Desmarcar' : 'Marcar como feito'}>
                {session.done ? <CheckCircle2 size={22} /> : <Circle size={22} />}
              </button>
              <div className="today-session-main">
                <strong>{session.title}</strong>
                <span><Clock3 size={13} /> {session.minutes} min · {STAGE_LABEL[SESSION_STAGE[session.type]] || session.type}</span>
              </div>
              {session.topicId && <Button size="sm" variant="ghost" onClick={() => navigate(`/conteudos/${session.topicId}`)}>Abrir</Button>}
              {session.type === 'simulado' && <Button size="sm" variant="soft" onClick={() => navigate('/questoes/simulado')}>Iniciar</Button>}
            </div>
          )) : (
            <Empty
              icon={CalendarDays}
              title="Sem sessões hoje"
              text="Gere o planner para distribuir a semana."
              action={<Button onClick={() => navigate('/planner')} icon={Play}>Abrir planner</Button>}
            />
          )}
        </Card>

        <Card>
          <div className="section-head small">
            <div><span className="eyebrow">Metas de hoje</span><h2>{rank.goalsDone}/3</h2></div>
            <Trophy size={18} />
          </div>
          <div className="home-goal-list">
            {Object.entries(rank.goals).map(([key, goal]) => {
              const labels = { questions: 'Questões', minutes: 'Tempo', checklist: 'Checklist' };
              const value = key === 'minutes' ? minutesLabel(goal.value) : goal.value;
              const target = key === 'minutes' ? minutesLabel(goal.target) : goal.target;
              const percent = goal.target ? Math.min(100, Math.round((goal.value / goal.target) * 100)) : 0;
              return (
                <div key={key} className={`home-goal ${goal.done ? 'done' : ''}`}>
                  <div className="home-goal-head"><span>{labels[key]}</span><strong>{value}/{target}</strong></div>
                  <Progress value={percent} tone={goal.done ? 'green' : 'accent'} />
                </div>
              );
            })}
          </div>
          <div className="home-ranking-line">
            <span>ID #{myRankingId}</span>
            <strong>{rank.points} pts</strong>
            <Link to="/ranking" className="text-link">Ranking <ArrowRight size={13} /></Link>
          </div>
        </Card>
      </div>

      <div className="stats-row">
        <Stat label="Questões hoje" value={rank.questions} note={`${rank.correct} acertos`} />
        <Stat label="Tempo hoje" value={minutesLabel(rank.minutes)} note="Atividade registrada" />
        <Stat label="Temas dominados" value={stats.mastered} note={`de ${stats.totalTopics}`} tone="dark" />
        <Stat label="Revisões vencidas" value={due.length} note={due.length ? 'Prioridade' : 'Em dia'} tone={due.length ? 'alert' : ''} />
      </div>

      <Card>
        <div className="section-head small">
          <div><span className="eyebrow">Trilha · {semesterLabel(user.semester)}</span><h2>Nível {level.id} · {level.name}</h2></div>
          <Link to="/trilha" className="text-link">Abrir trilha</Link>
        </div>
        <div className="dash-trilha-topics">
          {focus.map(({ t, a }) => (
            <Link key={t.id} to={`/conteudos/${t.id}`} className="dash-trilha-topic">
              <span className="focus-area" style={{ background: a.color }}>{a.short}</span>
              <span className="dash-trilha-topic-copy"><strong>{t.title}</strong><small>{t.group}</small></span>
              <ArrowRight size={15} />
            </Link>
          ))}
        </div>
        <Progress value={levelData.pct} tone="accent" />
        <div className="dash-trilha-foot">
          <span>{levelData.mastered} de {levelData.total} temas dominados</span>
          <Link to="/trilha" className="text-link">Continuar</Link>
        </div>
      </Card>
    </>
  );
}
