import React, { useEffect, useMemo, useState } from 'react';
import {
  Award, CheckCircle2, Circle, Crown, Flame, RefreshCw, Target, Timer, Trophy,
} from 'lucide-react';
import { Button, Card, Chip, PageHead, Progress } from '../components/ui.jsx';
import { api } from '../api.js';
import { useStore } from '../store.jsx';
import { fmtDate, minutesLabel } from '../utils.js';
import { RANKING_RULES, dailyScore, rankingDate, rankingId, rankingEntry } from '../ranking.js';

const GOAL_META = {
  questions: { label: 'Questões', icon: Target, tone: 'accent' },
  minutes: { label: 'Tempo de estudo', icon: Timer, tone: 'green' },
  checklist: { label: 'Checklist', icon: CheckCircle2, tone: 'green' },
};

export default function Ranking() {
  const { user, account, toast } = useStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const local = useMemo(() => dailyScore(user, rankingDate()), [user]);
  const myId = data?.me?.id || rankingId(account || 'davi');
  const me = data?.me || { ...local, id: myId, name: user.name || 'Você', position: 1, isMe: true };
  const entries = data?.entries?.length ? data.entries : [{ ...me }];
  const date = data?.date || rankingDate();
  const perfect = me.perfect;
  const goalsDone = me.goalsDone || 0;

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await api.ranking();
      setData(result);
      setError('');
    } catch (err) {
      setError(err.message || 'Não foi possível carregar o ranking.');
      const fallback = rankingEntry(user, account || 'davi', rankingDate());
      setData({ date: rankingDate(), entries: [{ ...fallback, position: 1, isMe: true }], me: { ...fallback, position: 1, isMe: true } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <PageHead
        eyebrow={`Ranking diário · ${fmtDate(date, { day: '2-digit', month: 'long' })}`}
        title="Ranking diário"
        subtitle="Pontuação por metas e acertos. O placar é recalculado no servidor."
        actions={<Button variant="soft" onClick={() => { load(true); toast('Ranking atualizado.'); }} icon={RefreshCw}>{loading ? 'Atualizando…' : 'Atualizar'}</Button>}
      />

      {error && <div className="ranking-offline"><Chip tone="warning">Ranking local</Chip> {error} Exibindo seus dados deste dispositivo.</div>}

      <Card className="ranking-hero">
        <div className="ranking-hero-main">
          <div className="ranking-identity">
            <span className="ranking-id">ID #{myId}</span>
            <Chip tone="accent"><Crown size={12} /> {me.name}</Chip>
          </div>
          <div className="ranking-points">{me.points}<small>pontos hoje</small></div>
          <p>{goalsDone}/3 metas concluídas · {me.questions ? `${me.accuracy}% de acerto` : 'sem questões hoje'} {perfect ? '· questionário sem erros' : '· bônus de 100% ainda disponível'}.</p>
          <div className="ranking-goals-strip">
            {Object.entries(me.goals || {}).map(([key, goal]) => {
              const meta = GOAL_META[key];
              const Icon = meta?.icon || Circle;
              return (
                <span key={key} className={goal.done ? 'done' : ''}>
                  <Icon size={13} /> {meta?.label || key}: {key === 'minutes' ? minutesLabel(goal.value) : goal.value}/{key === 'minutes' ? minutesLabel(goal.target) : goal.target}
                </span>
              );
            })}
          </div>
        </div>
        <div className="ranking-position">
          <span>posição</span>
          <strong>#{me.position}</strong>
          <small>de {entries.length}</small>
        </div>
      </Card>

      <div className="ranking-layout">
        <Card className="ranking-board">
          <div className="section-head small">
            <div><span className="eyebrow">Placar do dia</span><h2>Quem está na frente</h2></div>
            <Chip tone="neutral">{entries.length} participante{entries.length === 1 ? '' : 's'}</Chip>
          </div>
          <div className="ranking-table">
            <div className="ranking-row ranking-head">
              <span>#</span><span>ID</span><span>Nome</span><span>Pontos</span><span>Metas</span><span>Acerto</span>
            </div>
            {entries.map((entry) => (
              <div key={entry.id} className={`ranking-row ${entry.isMe ? 'me' : ''} ${entry.perfect ? 'perfect' : ''}`}>
                <span className="ranking-place">{entry.position === 1 ? <Trophy size={15} /> : entry.position}</span>
                <span className="ranking-id-cell">#{entry.id}</span>
                <span className="ranking-name">{entry.name}{entry.isMe && <small>você</small>}</span>
                <strong>{entry.points}</strong>
                <span>{entry.goalsDone}/3</span>
                <span>{entry.questions ? `${entry.accuracy}%` : '—'}</span>
              </div>
            ))}
          </div>
          <p className="muted-note">O placar zera todos os dias. Em caso de empate, vale a maior precisão do dia.</p>
        </Card>

        <div className="ranking-side">
          <Card>
            <div className="section-head small"><div><span className="eyebrow">Metas de hoje</span><h2>Feche o dia</h2></div><Flame size={18} /></div>
            <div className="ranking-goals">
              {Object.entries(me.goals || {}).map(([key, goal]) => {
                const meta = GOAL_META[key];
                const Icon = meta?.icon || Circle;
                const pct = goal.target ? Math.min(100, Math.round((goal.value / goal.target) * 100)) : 0;
                return (
                  <div key={key} className="ranking-goal">
                    <span className={`ranking-goal-icon ${goal.done ? 'done' : ''}`}><Icon size={15} /></span>
                    <div>
                      <strong>{meta?.label || key}</strong>
                      <small>{key === 'minutes' ? `${minutesLabel(goal.value)} de ${minutesLabel(goal.target)}` : `${goal.value} de ${goal.target}`} · +{goal.points} pts</small>
                      <Progress value={pct} tone={goal.done ? 'green' : 'accent'} />
                    </div>
                    {goal.done ? <CheckCircle2 size={17} className="ranking-check" /> : <Circle size={17} className="ranking-check" />}
                  </div>
                );
              })}
            </div>
            <div className="ranking-bonus">
              <Award size={17} />
              <div><strong>Todas as metas +50</strong><span>Questionário 100% com 10+ questões +100</span></div>
            </div>
          </Card>

          <Card>
            <div className="section-head small"><div><span className="eyebrow">Como pontuar</span><h2>Regras do placar</h2></div><Trophy size={18} /></div>
            <div className="ranking-rules">
              {RANKING_RULES.map((rule) => (
                <div key={rule.label}><strong>{rule.points}</strong><span><b>{rule.label}</b>{rule.detail}</span></div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
