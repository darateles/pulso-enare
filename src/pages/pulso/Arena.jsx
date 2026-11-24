import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, Flag, Trophy, Users } from 'lucide-react';
import { api } from '../../api.js';
import { Button, Card, Chip, Empty, Field, InlineError, PageHead, Spinner } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';
import { fmtDate, fmtLong } from '../../utils.js';

export default function Arena() {
  const { curriculum, user, updateUser, toast } = useStore();
  const [arenas, setArenas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(null);
  const [player, setPlayer] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState('list');
  const [name, setName] = useState(user.battleName || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [left, setLeft] = useState(900);
  const answersRef = useRef({});
  answersRef.current = answers;
  const finishRef = useRef(null);

  useEffect(() => {
    api.arenaList().then((d) => setArenas(d.arenas)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (stage !== 'play') return undefined;
    const t = setInterval(() => setLeft((l) => {
      if (l <= 1) { clearInterval(t); finishRef.current?.(); return 0; }
      return l - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [stage]);

  const q = questions[index];
  const topic = q ? curriculum.areas.flatMap((a) => a.topics).find((t) => t.id === q.topicId) : null;

  const join = async (arena) => {
    if (!name.trim()) { setError('Escolha um apelido antes.'); return; }
    setBusy(true); setError('');
    try {
      updateUser({ battleName: name.trim() });
      const d = await api.arenaJoin(arena.id, name.trim());
      setCurrent(d.arena); setPlayer(d.player); setQuestions(d.questions);
      setAnswers({}); setIndex(0); setLeft(Math.max(300, d.questions.length * 90)); setStage('play');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const submitOne = (key) => setAnswers((a) => ({ ...a, [q.id]: { chosen: key, correct: key === q.answer, seconds: 60 } }));

  const finish = async () => {
    if (!player) return;
    try {
      await api.arenaSubmit(current.id, player.id, answersRef.current);
      const list = await api.arenaList();
      setArenas(list.arenas);
      setStage('done');
    } catch (e) { setError(e.message); }
  };
  finishRef.current = finish;

  if (stage === 'play' && q) {
    return (
      <div className="battle-play">
        <div className="battle-top"><Chip tone="accent"><Trophy size={12} /> {current.name}</Chip><span>{index + 1} / {questions.length}</span><span className="timer"><Clock3 size={14} /> {String(Math.floor(left / 60)).padStart(2,'0')}:{String(left % 60).padStart(2,'0')}</span><button className="text-link" onClick={finish}>encerrar</button></div>
        <div className="battle-grid">
          <Card className="battle-question">
            <div className="q-meta">{topic && <span className="q-topic">{topic.title}</span>}</div>
            <p className="q-stem">{q.stem}</p>
            <div className="q-options">{q.options.map((o) => <button key={o.key} className={`q-option ${answers[q.id]?.chosen === o.key ? 'selected' : ''}`} onClick={() => submitOne(o.key)}><span className="q-key">{o.key}</span><span>{o.text}</span>{answers[q.id]?.chosen === o.key && <CheckCircle2 size={18} />}</button>)}</div>
            <div className="q-submit"><Button variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>Anterior</Button>{index + 1 < questions.length ? <Button onClick={() => setIndex((i) => i + 1)} icon={ArrowRight}>Próxima</Button> : <Button onClick={finish} icon={Flag}>Enviar simulado</Button>}</div>
          </Card>
          <Card className="battle-ranking"><span className="eyebrow">Progresso</span>{questions.map((x, i) => <button key={x.id} className={`arena-dot ${answers[x.id] ? 'answered' : ''} ${i === index ? 'current' : ''}`} onClick={() => setIndex(i)}>{i + 1}</button>)}<p className="muted-note">Sem feedback até o envio. Marque suas dúvidas e siga.</p></Card>
        </div>
      </div>
    );
  }

  if (stage === 'done') {
    const a = arenas.find((x) => x.id === current.id);
    return (
      <><PageHead eyebrow="Arena" title={<>Simulado <em>enviado.</em></>} subtitle={`Sua participação em ${current.name} foi registrada.`} actions={<Button onClick={() => setStage('list')} variant="soft">Voltar às arenas</Button>} />
        <Card className="arena-done"><Trophy size={36} /><h2>{Object.values(answers).filter((x) => x.correct).length} acertos</h2><p>de {questions.length} questões. O ranking é atualizado conforme os participantes enviam.</p><Chip tone="soft">{current.name}</Chip></Card>
      </>
    );
  }

  return (
    <>
      <PageHead eyebrow="Pulso Arena" title={<>Simulados <em>coletivos.</em></>} subtitle="Eventos periódicos com janela de participação, ranking e questões oficiais. Competir calibra ritmo e exposição." actions={<Link to="/pulso" className="btn btn-ghost">Voltar à suíte</Link>} />
      <Card className="arena-name"><Field label="Seu apelido no ranking"><input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Como quer aparecer" /></Field><InlineError>{error}</InlineError></Card>
      {loading ? <Card><Spinner /> Carregando arenas…</Card> : (
        <div className="arena-grid">
          {arenas.map((a) => (
            <Card key={a.id} className={`arena-card ${a.closed ? 'closed' : ''}`}>
              <div className="arena-card-top"><Chip tone={a.closed ? 'soft' : 'accent'}>{a.closed ? 'encerrada' : 'aberta'}</Chip><span><Users size={13} /> {a.joined}</span></div>
              <h3>{a.name}</h3>
              <p>{a.blurb}</p>
              <div className="arena-meta"><CalendarDays size={14} /> {fmtDate(a.startsAt)} a {fmtDate(a.endsAt)} · {a.count} questões</div>
              <Button size="sm" onClick={() => join(a)} disabled={a.closed || busy}>{busy ? 'Entrando…' : a.joined > 0 ? 'Participar' : 'Ser o primeiro'}</Button>
            </Card>
          ))}
        </div>
      )}
      <Card className="battle-rules"><Trophy size={18} /><div><strong>Ranking sem vaidade</strong><p>A arena usa 10 a 20 questões do banco. O tempo total é calculado por questão. Você pode refazer o simulado em modo treino depois.</p></div></Card>
    </>
  );
}
