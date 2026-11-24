import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Download, Flame, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { Button, Card, Chip, Empty, PageHead, Progress, Ring, Stat } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { accuracyByArea, daysUntil, fmtDate, globalStats, iso, minutesLabel, pct, streak, weakTopics, WEEKDAYS } from '../utils.js';

export default function Desempenho() {
  const { user, curriculum, questions } = useStore();
  const navigate = useNavigate();
  const stats = useMemo(() => globalStats(curriculum, user.progress), [curriculum, user.progress]);
  const answered = user.attempts.filter((a) => a.correct !== null);
  const right = answered.filter((a) => a.correct).length;
  const overall = pct(right, answered.length);
  const areas = accuracyByArea(curriculum, user.attempts);
  const weak = weakTopics(curriculum, user.attempts, user.progress, 8);
  const days = useMemo(() => {
    const arr = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = iso(d);
      arr.push({ key, label: WEEKDAYS[d.getDay()], q: user.activity?.[key]?.questions || 0, m: user.activity?.[key]?.minutes || 0 });
    }
    return arr;
  }, [user.activity]);
  const maxQ = Math.max(5, ...days.map((d) => d.q));
  const recent = [...answered].slice(-12).reverse();

  const exportCsv = () => {
    const rows = [['data', 'area', 'topico', 'escolha', 'correta']];
    for (const a of user.attempts) rows.push([a.createdAt, a.area, a.topicId, a.chosen, a.correct]);
    const csv = rows.map((r) => r.map((x) => `"${String(x ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'pulso-desempenho.csv'; link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHead
        eyebrow="Dados de estudo"
        title={<>O que os números <em>dizem.</em></>}
        subtitle="Sem narrativa: precisão por área, temas frágeis, constância e cobertura. Use para decidir a próxima hora."
        actions={<Button variant="soft" onClick={exportCsv} icon={Download}>Exportar CSV</Button>}
      />

      <div className="stats-row">
        <Stat label="Precisão geral" value={answered.length ? `${overall}%` : '—'} note={`${right} acertos em ${answered.length}`} tone={overall < 55 && answered.length ? 'alert' : ''} />
        <Stat label="Cobertura do edital" value={`${stats.pct}%`} note={`${stats.started} temas iniciados`} />
        <Stat label="Sequência atual" value={<span className="inline-icon"><Flame size={20} /> {streak(user)}</span>} note="Dias com atividade" />
        <Stat label="Banco disponível" value={questions.length} note="Questões para treinar" tone="dark" />
      </div>

      <div className="perf-grid">
        <Card className="perf-main">
          <div className="section-head small"><div><span className="eyebrow">Precisão por área</span><h2>Onde você acerta e erra</h2></div><BarChart3 size={19} /></div>
          {answered.length ? areas.map(({ area, total, right: r, pct: p }) => (
            <div key={area.id} className="perf-area">
              <div className="perf-area-head"><span className="focus-area" style={{ background: area.color }}>{area.short}</span><strong>{area.name}</strong><span>{p === null ? 'sem dados' : `${p}% · ${r}/${total}`}</span></div>
              <Progress value={p || 0} tone={p === null ? 'green' : p < 55 ? 'accent' : 'green'} />
            </div>
          )) : <Empty icon={TrendingUp} title="Ainda sem precisão" text="Resolva questões para os gráficos aparecerem." action={<Button onClick={() => navigate('/questoes')}>Ir ao banco</Button>} />}
          <div className="perf-coverage">
            {stats.areas.map(({ area, ...s }) => (
              <div key={area.id} className="coverage-row">
                <div><span className="dot" style={{ background: area.color }} />{area.short}</div>
                <Progress value={s.pct} tone="green" />
                <small>{s.mastered}/{s.total} dominados</small>
              </div>
            ))}
          </div>
        </Card>

        <Card className="perf-ring-card">
          <Ring value={overall} size={150} stroke={11} tone={overall >= 60 ? 'green' : 'accent'}>
            <strong>{answered.length ? `${overall}%` : '—'}</strong><span>precisão</span>
          </Ring>
          <h3>{!answered.length ? 'Comece a medir' : overall >= 70 ? 'Acima da meta' : overall >= 55 ? 'Na linha' : 'Abaixo da meta'}</h3>
          <p>Meta sugerida: 70% de acerto em questões inéditas antes de aumentar a carga.</p>
          <div className="ring-breakdown">
            <div><strong>{right}</strong><span>acertos</span></div>
            <div><strong>{answered.length - right}</strong><span>erros</span></div>
            <div><strong>{user.attempts.filter((a) => !a.chosen).length}</strong><span>em branco</span></div>
          </div>
        </Card>
      </div>

      <div className="perf-grid two">
        <Card>
          <div className="section-head small"><div><span className="eyebrow">Últimos 14 dias</span><h2>Volume de questões</h2></div><span>{days.reduce((s, d) => s + d.q, 0)} questões</span></div>
          <div className="activity-chart">
            {days.map((d) => <div key={d.key} className="activity-col" title={`${fmtDate(d.key)}: ${d.q} questões`}><span style={{ height: `${Math.max(3, (d.q / maxQ) * 100)}%` }} /><small>{d.label[0]}</small></div>)}
          </div>
          <p className="muted-note">Meta média: {Math.round(user.goalQuestions / 7)} questões/dia. Total de tempo: {minutesLabel(days.reduce((s, d) => s + d.m, 0))}.</p>
        </Card>

        <Card>
          <div className="section-head small"><div><span className="eyebrow">Lacunas</span><h2>Prioridade de correção</h2></div><TrendingDown size={18} /></div>
          {weak.length ? weak.map((w) => (
            <div key={w.topic.id} className="weak-row">
              <span className="focus-area" style={{ background: w.area.color }}>{w.area.short}</span>
              <div><Link to={`/conteudos/${w.topic.id}`}>{w.topic.title}</Link><small>{w.wrong} erros em {w.total} · incidência {w.topic.incidence}%</small></div>
              <Button size="sm" variant="ghost" onClick={() => navigate(`/questoes/treino?topic=${w.topic.id}`)}>Treinar <Target size={13} /></Button>
            </div>
          )) : <p className="muted-note">Ainda sem erros registrados. Quando errar, o tema aparece aqui.</p>}
        </Card>
      </div>

      <Card>
        <div className="section-head small"><div><span className="eyebrow">Histórico</span><h2>Tentativas recentes</h2></div><Chip>{user.attempts.length}</Chip></div>
        {recent.length ? recent.map((a) => {
          const q = questions.find((x) => x.id === a.questionId);
          const area = curriculum.areas.find((x) => x.id === a.area);
          return (
            <div key={a.id} className="recent-row">
              <span className={`recent-mark ${a.correct ? 'ok' : 'bad'}`}>{a.correct ? 'C' : 'E'}</span>
              <span className="recent-area" style={{ color: area?.color }}>{area?.short}</span>
              <span>{q ? q.stem.slice(0, 105) : 'Questão removida'}…</span>
              <small>{fmtDate(a.createdAt)}</small>
              {q && <Link to={`/questoes?q=${q.id}`}>abrir</Link>}
            </div>
          );
        }) : <p className="muted-note">Nenhuma tentativa registrada.</p>}
      </Card>

      <div className="final-note">
        <span>Faltam {daysUntil(user.examDate)} dias.</span>
        <p>Precisão baixa em área de alto peso é mais urgente que volume total. O planner já usa esses dados; você não precisa decidir no escuro.</p>
        <Button onClick={() => navigate('/planner')} icon={ArrowRight}>Rever prioridades</Button>
      </div>
    </>
  );
}
