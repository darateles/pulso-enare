import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Eye, MessageSquareQuote, RotateCcw, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button, Card, Chip, Empty, PageHead, Progress, Segmented } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';
import { addDays, iso, shuffle } from '../../utils.js';

export default function Recall() {
  const { user, updateUser, curriculum, toast } = useStore();
  const [area, setArea] = useState('todas');
  const [started, setStarted] = useState(false);
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [index, setIndex] = useState(0);
  const [queue, setQueue] = useState([]);
  const records = user.recallDone || {};
  const today = iso();

  const prompts = useMemo(() => curriculum.areas.flatMap((a) => a.topics.map((t) => ({
    id: `recall-${t.id}`, area: a, topic: t,
    question: `Explique, com conduta objetiva, ${t.focus}.`,
    model: `${t.keyPoints.join('. ')}. ${t.summary}`,
  }))), [curriculum]);

  const due = prompts.filter((p) => !records[p.id] || records[p.id].due <= today);
  const filtered = (area === 'todas' ? due : due.filter((p) => p.area.id === area));
  const current = queue[index];

  const begin = () => { setQueue(shuffle(filtered).slice(0, 12)); setIndex(0); setAnswer(''); setRevealed(false); setStarted(true); };
  const grade = (g) => {
    const intervals = { 1: 1, 2: 4, 3: 10 };
    updateUser((prev) => ({ ...prev, recallDone: { ...prev.recallDone, [current.id]: { due: iso(addDays(new Date(), intervals[g])), last: new Date().toISOString(), grade: g } } }));
    if (index + 1 >= queue.length) { setStarted(false); toast('Sessão de recordação concluída.'); }
    else { setIndex((i) => i + 1); setAnswer(''); setRevealed(false); }
  };

  if (started && current) {
    return (
      <div className="recall-session">
        <div className="battle-top"><Chip tone="accent">{current.area.short}</Chip><span>{index + 1} / {queue.length}</span><button className="text-link" onClick={() => setStarted(false)}>encerrar</button></div>
        <Progress value={(index / queue.length) * 100} tone="accent" />
        <Card className="recall-card">
          <span className="eyebrow">{current.topic.title}</span>
          <h2>{current.question}</h2>
          <p className="muted-note">Escreva sem consultar. Depois compare com a resposta-modelo e avalie sua recuperação.</p>
          <textarea rows={8} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Sua resposta…" disabled={revealed} />
          {!revealed ? <Button onClick={() => setRevealed(true)} icon={Eye}>Revelar resposta-modelo</Button> : (
            <>
              <div className="recall-model"><span className="eyebrow">Resposta-modelo</span><p>{current.model}</p></div>
              <div className="recall-grade"><span>Como foi?</span><Button variant="soft" onClick={() => grade(1)} icon={ThumbsDown}>Esqueci</Button><Button variant="ghost" onClick={() => grade(2)}>Parcial</Button><Button onClick={() => grade(3)} icon={ThumbsUp}>Dominei</Button></div>
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <>
      <PageHead eyebrow="Pulso Recall" title="Recall" subtitle="Recordação discursiva: escreva, compare e agende. É mais difícil que reconhecer — e por isso transfere melhor para a prova." actions={<Link to="/pulso" className="btn btn-ghost">Voltar à suíte</Link>} />
      <div className="recall-grid-top">
        <Card className="recall-start"><Sparkles size={24} /><h2>{filtered.length} prompts disponíveis</h2><p>Sessão curta de até 12 perguntas. As vencidas entram primeiro.</p><Segmented options={[{ value: 'todas', label: 'Todas' }, ...curriculum.areas.map((a) => ({ value: a.id, label: a.short }))]} value={area} onChange={setArea} label="Área" /><Button onClick={begin} disabled={!filtered.length} icon={MessageSquareQuote}>Iniciar recordação</Button></Card>
        <Card><span className="eyebrow">Fila</span>{curriculum.areas.map((a) => { const n = due.filter((p) => p.area.id === a.id).length; return <div key={a.id} className="acc-row"><span>{a.short}</span><Progress value={n / Math.max(1, prompts.filter((p) => p.area.id === a.id).length) * 100} tone="accent" /><strong>{n}</strong></div>; })}<p className="muted-note">Recordações vencidas por área.</p></Card>
      </div>
      <Card className="battle-rules"><CheckCircle2 size={18} /><div><strong>Como avaliar</strong><p>“Esqueci” volta amanhã; “parcial” em 4 dias; “dominei” em 10. Seja rigoroso: resposta vaga não é domínio.</p></div></Card>
    </>
  );
}
