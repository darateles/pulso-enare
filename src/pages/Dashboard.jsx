import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, CalendarDays, CheckCircle2, Circle, Clock3, Flame, GraduationCap, HeartPulse, Library,
  ListChecks, Play, RefreshCw, Sparkles, TrendingUp, Trophy,
} from 'lucide-react';
import { Button, Card, Chip, Empty, PageHead, Progress, Ring, Stat } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import {
  accuracyByArea, daysUntil, dueReviews, fmtDate, globalStats, greeting, iso, minutesLabel,
  streak, weakTopics, WEEKDAYS, pct,
} from '../utils.js';
import { todaySessions } from '../planner.js';
import { currentLevel, levelStats, nextTopics, semesterLabel } from '../trilha.js';
import { SESSION_STAGE, STAGE_LABEL, STAGES, calibration, calibrationLabel } from '../metodo.js';
import { dailyScore, rankingDate, rankingId } from '../ranking.js';

export default function Dashboard() {
  const { user, curriculum, questions, account, updateUser, bumpActivity } = useStore();
  const navigate = useNavigate();
  const stats = useMemo(() => globalStats(curriculum, user.progress), [curriculum, user.progress]);
  const due = useMemo(() => dueReviews(curriculum, user.progress), [curriculum, user.progress]);
  const weak = useMemo(() => weakTopics(curriculum, user.attempts, user.progress, 3), [curriculum, user.attempts, user.progress]);
  const today = useMemo(() => todaySessions(user.plan), [user.plan]);
  const todayStages = useMemo(() => today.reduce((acc, session) => {
    const stage = SESSION_STAGE[session.type];
    if (stage && stage !== 'ativar') acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {}), [today]);
  const level = currentLevel(user);
  const levelData = useMemo(() => levelStats(curriculum, level.id, user.progress), [curriculum, level.id, user.progress]);
  const cal = useMemo(() => calibration(user.progress, user.attempts), [user.progress, user.attempts]);
  const rank = useMemo(() => dailyScore(user, rankingDate()), [user]);
  const myRankingId = rankingId(account || 'davi');
  const attemptsToday = user.attempts.filter((a) => a.createdAt?.slice(0, 10) === iso());
  const rightToday = attemptsToday.filter((a) => a.correct).length;
  const last7 = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = iso(d);
      days.push({ key, label: WEEKDAYS[d.getDay()], a: user.activity?.[key] || {} });
    }
    return days;
  }, [user.activity]);
  const weekMinutes = last7.reduce((s, d) => s + (d.a.minutes || 0), 0);
  const goalPct = pct(attemptsToday.length, user.goalQuestions);
  const acc = accuracyByArea(curriculum, user.attempts).filter((a) => a.total >= 3).sort((a, b) => (a.pct ?? 100) - (b.pct ?? 100));
  const focus = useMemo(() => {
    const inLevel = nextTopics(curriculum, user, 3);
    if (inLevel.length) return inLevel;
    const all = curriculum.areas.flatMap((a) => a.topics.map((t) => ({ t, a })));
    return all
      .filter(({ t }) => (user.progress[t.id]?.done || []).length < t.checklist.length)
      .sort((x, y) => {
        const px = user.progress[x.t.id] || {};
        const py = user.progress[y.t.id] || {};
        return (y.t.weight * 10 - (py.confidence || 0) * 4) - (x.t.weight * 10 - (px.confidence || 0) * 4);
      })
      .slice(0, 3);
  }, [curriculum, user]);

  const count = daysUntil(user.examDate);
  const bpm = 58 + Math.min(34, streak(user) * 2 + Math.min(8, Math.round(attemptsToday.length * 1.5)));
  const firstName = (user.name || 'estudante').split(' ')[0];

  const toggleSession = (session) => {
    updateUser((prev) => ({
      ...prev,
      plan: {
        ...prev.plan,
        weeks: prev.plan.weeks.map((w) => ({
          ...w,
          days: w.days.map((d) => ({
            ...d,
            sessions: d.sessions.map((s) => (s.id === session.id ? { ...s, done: !s.done } : s)),
          })),
        })),
      },
    }));
    if (!session.done) bumpActivity({ minutes: session.minutes });
  };

  return (
    <>
      <PageHead
        eyebrow={`Painel de estudos · ${greeting()}, ${firstName}`}
        title={<>Seu plano. <em>Seu progresso.</em></>}
        subtitle={<>Faltam <strong>{count} dias</strong> para a prova de {fmtDate(user.examDate, { day: '2-digit', month: 'long', year: 'numeric' })}. Organize seus próximos passos e acompanhe sua evolução.</>}
        actions={<Button onClick={() => navigate('/questoes/treino?modo=rapido')} icon={Play}>Treino rápido</Button>}
      />

      <div className="dash-grid">
        <Card className="hero-card">
          <div className="hero-top">
            <div>
              <Chip tone="accent"><HeartPulse size={13} /> em ritmo · {streak(user)} dias</Chip>
              <h2>Seu progresso, <em>mais claro a cada dia.</em></h2>
              <div className="monitor-strip"><span><HeartPulse size={13} /> {bpm} bpm</span><span>PA de estudo {Math.min(140, 90 + stats.pct)}/{Math.min(90, 60 + stats.started)}</span><span>perfusão {stats.pct}%</span></div>
              <p>Você está no Nível {level.id} · {level.name}. Já iniciou {stats.started} subtópicos e domina {stats.mastered}. O plano combina codificação, recuperação, revisão espaçada e treino intercalado.</p>
              <div className="hero-actions">
                <Button variant="light" onClick={() => navigate('/trilha')} icon={GraduationCap}>Ver minha trilha</Button>
                <Button variant="ghost-light" onClick={() => navigate('/planner')} icon={CalendarDays}>Abrir planner</Button>
              </div>
            </div>
            <Ring value={stats.pct} size={132} stroke={10} tone="accent">
              <strong>{stats.pct}%</strong>
              <span>cobertura</span>
            </Ring>
          </div>
          <div className="hero-footer">
            <div><span>Meta de questões hoje</span><strong>{attemptsToday.length}/{user.goalQuestions}</strong></div>
            <Progress value={goalPct} tone="light" />
            <small>{attemptsToday.length >= user.goalQuestions ? 'Meta batida. Excelente.' : `Faltam ${Math.max(0, user.goalQuestions - attemptsToday.length)} questões para a meta diária.`}</small>
          </div>
        </Card>

        <Card className="countdown-card">
          <span className="eyebrow"><HeartPulse size={12} /> Pressão de prova</span>
          <svg className="countdown-ecg" viewBox="0 0 260 38" preserveAspectRatio="none" aria-hidden="true"><path d="M0 22h66l9-13 11 24 10-18 7 6h67l9-10 10 19 9-14 7 6h55" /></svg>
          <div className="countdown-number">{count}</div>
          <p>dias até o ENARE</p>
          <div className="countdown-split">
            <div><strong>{Math.floor(count / 7)}</strong><span>semanas</span></div>
            <div><strong>{Math.max(0, count - 90)}</strong><span>dias úteis aprox.</span></div>
          </div>
          <Link to="/planner" className="text-link">Ajustar rotina <ArrowRight size={14} /></Link>
        </Card>
      </div>

      <Card className="dash-trilha" style={{ '--level-tone': level.tone }}>
        <div className="dash-trilha-head">
          <div>
            <span className="eyebrow">Sua trilha · Nível {level.id} · {semesterLabel(user.semester)}</span>
            <h2>{level.name}</h2>
            <p>{level.goal}</p>
          </div>
          <Ring value={levelData.pct} size={82} stroke={7} tone="accent">
            <strong>{levelData.pct}%</strong>
            <span>nível</span>
          </Ring>
        </div>
        <div className="dash-trilha-topics">
          {focus.map(({ t, a }) => (
            <Link key={t.id} to={`/conteudos/${t.id}`} className="dash-trilha-topic">
              <span className="focus-area" style={{ background: a.color }}>{a.short}</span>
              <span className="dash-trilha-topic-copy"><strong>{t.title}</strong><small>{t.group} · incidência {t.incidence}%</small></span>
              <ArrowRight size={15} />
            </Link>
          ))}
        </div>
        <div className="dash-trilha-foot">
          <span>{levelData.mastered} de {levelData.total} temas dominados · {levelData.subjects.length} matérias no nível</span>
          <Button size="sm" onClick={() => navigate('/trilha')} icon={GraduationCap}>Abrir trilha</Button>
        </div>
      </Card>

      <div className="dash-method">
        <div className="dash-method-head">
          <span className="eyebrow">Ciclo de hoje</span>
        </div>
        <div className="dash-method-steps">
          {STAGES.filter((stage) => stage.id !== 'ativar').map((stage) => (
            <div key={stage.id} className={todayStages[stage.id] ? 'active' : ''}>
              <span>{stage.label}</span>
              <strong>{todayStages[stage.id] || 0}</strong>
            </div>
          ))}
          <Link to="/planner" className="dash-method-link">Ver plano <ArrowRight size={14} /></Link>
        </div>
      </div>

      <div className="stats-row">
        <Stat label="Questões resolvidas" value={user.attempts.length} note={`${rightToday} acertos hoje`} />
        <Stat label="Tempo na semana" value={minutesLabel(weekMinutes)} note="Últimos 7 dias" />
        <Stat label="Subtópicos dominados" value={stats.mastered} note={`de ${stats.totalTopics}`} tone="dark" />
        <Stat label="Revisões vencidas" value={due.length} note={due.length ? 'Prioridade alta' : 'Em dia'} tone={due.length ? 'alert' : ''} />
      </div>

      <div className="dash-cols">
        <section>
          <div className="section-head">
            <div><span className="eyebrow">Execução</span><h2>Seu dia</h2></div>
            <Link to="/planner" className="text-link">Plano completo <ArrowRight size={14} /></Link>
          </div>
          <Card className="today-card">
            {today.length ? today.map((s) => (
              <div key={s.id} className={`today-session ${s.done ? 'done' : ''}`}>
                <button className="check-round" onClick={() => toggleSession(s)} aria-label={s.done ? 'Desmarcar' : 'Marcar como feito'}>
                  {s.done ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                </button>
                <div className="today-session-main">
                  <strong>{s.title}</strong>
                  <span><Clock3 size={13} /> {s.minutes} min · {STAGE_LABEL[SESSION_STAGE[s.type]] || s.type}</span>
                </div>
                {s.topicId && <Button size="sm" variant="ghost" onClick={() => navigate(`/conteudos/${s.topicId}`)}>Abrir</Button>}
                {s.type === 'simulado' && <Button size="sm" variant="soft" onClick={() => navigate('/questoes/simulado')}>Iniciar</Button>}
              </div>
            )) : (
              <Empty
                icon={CalendarDays}
                title="Nenhuma sessão hoje"
                text="Gere seu planner semanal para transformar prioridade em rotina."
                action={<Button onClick={() => navigate('/planner')} icon={Sparkles}>Montar plano</Button>}
              />
            )}
          </Card>

          <div className="section-head spaced">
            <div><span className="eyebrow">Recuperação ativa</span><h2>Onde você errou</h2></div>
            {weak.length > 0 && <Link to="/caderno-erros" className="text-link">Abrir caderno <ArrowRight size={14} /></Link>}
          </div>
          {weak.length ? (
            <div className="focus-list">
              {weak.map(({ topic: t, area: a, wrong, total, pct: errorPct }) => (
                <Link key={t.id} to={`/conteudos/${t.id}`} className="focus-item">
                  <span className="focus-area" style={{ background: a.color }}>{a.short}</span>
                  <div><strong>{t.title}</strong><span>{a.name} · {wrong} de {total} erros · {errorPct}%</span></div>
                  <Chip tone="danger">{wrong} {wrong === 1 ? 'erro' : 'erros'}</Chip>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <Card className="empty-inline">
              <p className="muted-note">Nenhum erro registrado ainda. Resolva questões para o Pulso identificar seus pontos fracos.</p>
              <Button size="sm" variant="soft" onClick={() => navigate('/questoes/treino?modo=rapido')} icon={Play}>Treinar agora</Button>
            </Card>
          )}
        </section>

        <aside>
          <Card className="side-card">
            <div className="section-head small">
              <div><span className="eyebrow">Revisão espaçada</span><h2>Vencidas</h2></div>
              <Chip tone={due.length ? 'danger' : 'success'}>{due.length}</Chip>
            </div>
            {due.length ? due.slice(0, 4).map(({ topic, area }) => (
              <Link key={topic.id} to={`/conteudos/${topic.id}`} className="mini-row">
                <span className="dot" style={{ background: area.color }} />
                <span>{topic.title}</span>
                <ArrowRight size={14} />
              </Link>
            )) : <p className="muted-note">Nada atrasado. Conclua checklists para programar novas revisões.</p>}
            {due.length > 0 && <Button variant="soft" size="sm" onClick={() => navigate('/conteudos?status=revisao')}>Revisar agora</Button>}
          </Card>

          <Card className="side-card">
            <div className="section-head small">
              <div><span className="eyebrow">Precisão</span><h2>Por área</h2></div>
            </div>
            {acc.length ? acc.slice(0, 4).map(({ area, pct: p }) => (
              <div key={area.id} className="acc-row">
                <span>{area.short}</span>
                <Progress value={p} tone={p < 55 ? 'accent' : 'green'} />
                <strong>{p}%</strong>
              </div>
            )) : <p className="muted-note">Resolva ao menos 3 questões por área para ver sua precisão.</p>}
            <Link to="/desempenho" className="text-link">Ver desempenho <TrendingUp size={14} /></Link>
          </Card>

          <Card className="side-card">
            <div className="section-head small">
              <div><span className="eyebrow">Metacognição</span><h2>Calibração</h2></div>
              <Chip tone={(cal.gap ?? 0) > 15 ? 'warning' : 'neutral'}>confiança × acerto</Chip>
            </div>
            <div className="calibration-grid">
              <div><span>Confiança</span><strong>{cal.confidence != null ? `${cal.confidence}%` : '—'}</strong></div>
              <div><span>Acerto real</span><strong>{cal.accuracy != null ? `${cal.accuracy}%` : '—'}</strong></div>
            </div>
            <p className="muted-note">{calibrationLabel(cal.gap)}</p>
          </Card>

          <Card className="side-card ranking-mini">
            <div className="section-head small">
              <div><span className="eyebrow">Ranking diário</span><h2>ID #{myRankingId}</h2></div>
              <Trophy size={18} />
            </div>
            <div className="ranking-mini-points">
              <strong>{rank.points}</strong>
              <span>pontos hoje</span>
              <Chip tone={rank.perfect ? 'success' : 'neutral'}>{rank.perfect ? '100%' : `${rank.goalsDone}/3 metas`}</Chip>
            </div>
            <Progress value={Math.min(100, Math.round((rank.points / 580) * 100))} tone="accent" />
            <p className="muted-note">{rank.perfect ? 'Questionário sem erros: bônus aplicado.' : 'Feche as metas e acerte tudo para ganhar os bônus.'}</p>
            <Button size="sm" variant="soft" onClick={() => navigate('/ranking')} icon={Trophy}>Ver ranking</Button>
          </Card>

          <Card className="mini-week">
            <div className="section-head small"><span className="eyebrow">Constância</span><span>{minutesLabel(weekMinutes)}</span></div>
            <div className="week-bars">
              {last7.map((d) => {
                const max = Math.max(60, ...last7.map((x) => x.a.minutes || 0));
                return <div key={d.key} className="week-bar"><span style={{ height: `${Math.max(4, ((d.a.minutes || 0) / max) * 100)}%` }} /><small>{d.label}</small></div>;
              })}
            </div>
          </Card>
        </aside>
      </div>

      <div className="quick-strip">
        <Link to="/questoes" className="quick-tile"><Library size={20} /><span>Banco de questões</span><small>Filtre por tema e incidência</small></Link>
        <Link to="/questoes/importar" className="quick-tile"><RefreshCw size={20} /><span>Importar prova</span><small>Cole uma URL ou use fonte oficial</small></Link>
        <Link to="/conteudos" className="quick-tile"><ListChecks size={20} /><span>Mapa do edital</span><small>Filtre os 90 temas por nível</small></Link>
        <Link to="/pulso" className="quick-tile"><Sparkles size={20} /><span>Pulso Pro</span><small>18 ferramentas integradas</small></Link>
      </div>
    </>
  );
}
