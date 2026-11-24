import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Copy, Crown, Link2, Plus, RefreshCw, Send,
  Swords, Timer, Trophy, UserPlus, Users, XCircle,
} from 'lucide-react';
import { api } from '../../api.js';
import { Button, Card, Chip, Empty, Field, InlineError, PageHead, Spinner } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';

export default function Battle() {
  const { user, updateUser, curriculum, toast } = useStore();
  const [params, setParams] = useSearchParams();
  const [stage, setStage] = useState('home');
  const [name, setName] = useState(user.battleName || '');
  const [area, setArea] = useState('todas');
  const [count, setCount] = useState(5);
  const [code, setCode] = useState(params.get('sala') || '');
  const [battle, setBattle] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [qStart, setQStart] = useState(Date.now());
  const answeredIds = useRef(new Set());
  const playerId = player?.id;

  const saveName = (v) => { setName(v); updateUser({ battleName: v }); };

  useEffect(() => {
    if (params.get('sala')) setCode(params.get('sala').toUpperCase());
  }, []);

  useEffect(() => {
    if (!battle || !['lobby', 'playing'].includes(battle.status) || stage === 'home') return undefined;
    const t = setInterval(async () => {
      try {
        const d = await api.battleGet(battle.id);
        setBattle(d.battle);
        if (d.questions?.length) setQuestions(d.questions);
        if (d.battle.status === 'finished') setStage('result');
      } catch {}
    }, 2200);
    return () => clearInterval(t);
  }, [battle?.id, battle?.status, stage]);

  useEffect(() => {
    if (battle?.status === 'playing' && stage === 'lobby') {
      setStage('play');
      setQStart(Date.now());
    }
  }, [battle?.status, stage]);

  const create = async () => {
    if (!name.trim()) { setError('Escolha um apelido.'); return; }
    setBusy(true); setError('');
    try {
      const d = await api.battleCreate({ name: 'Duelo de questões', area, count, nickname: name.trim() });
      saveName(name.trim());
      setBattle(d.battle); setPlayer(d.player); setQuestions(d.questions || []);
      setStage('lobby');
      params.set('sala', d.battle.code); setParams(params, { replace: true });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const join = async () => {
    if (!name.trim()) { setError('Escolha um apelido.'); return; }
    setBusy(true); setError('');
    try {
      const byCode = await api.battleByCode(code.trim().toUpperCase());
      const d = await api.battleJoin(byCode.battle.id, name.trim());
      saveName(name.trim());
      setBattle(d.battle); setPlayer(d.player); setQuestions(d.questions || []);
      setStage(d.battle.status === 'playing' ? 'play' : 'lobby');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const addBot = async () => {
    try { const d = await api.battleBot(battle.id); setBattle(d.battle); } catch (e) { setError(e.message); }
  };

  const start = async () => {
    setBusy(true);
    try {
      const d = await api.battleStart(battle.id);
      setBattle(d.battle); setQuestions(d.questions || []);
      setStage('play'); setQStart(Date.now());
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const q = questions[index];
  const topic = q ? curriculum.areas.flatMap((a) => a.topics).find((t) => t.id === q.topicId) : null;

  const submit = async () => {
    if (!q || selected == null || answered) return;
    const correct = q.answer === selected;
    answeredIds.current.add(q.id);
    setAnswered(true);
    try {
      await api.battleAnswer(battle.id, { playerId, questionId: q.id, chosen: selected, correct, seconds: Math.max(1, Math.round((Date.now() - qStart) / 1000)) });
    } catch {}
  };

  const next = async () => {
    if (index + 1 >= questions.length) {
      await api.battleFinish(battle.id, playerId).catch(() => {});
      setStage('result');
      const d = await api.battleGet(battle.id).catch(() => null);
      if (d) setBattle(d.battle);
      return;
    }
    setIndex((i) => i + 1); setSelected(null); setAnswered(false); setQStart(Date.now());
  };

  const copy = async () => {
    const link = `${location.origin}/pulso/battle?sala=${battle.code}`;
    try { await navigator.clipboard.writeText(link); toast('Link da sala copiado.'); } catch { toast('Copie o código acima.'); }
  };

  const ranking = useMemo(() => [...(battle?.players || [])].sort((a, b) => b.score - a.score), [battle?.players]);

  if (stage === 'home') {
    return (
      <>
        <PageHead eyebrow="Pulso Battle" title={<>Duelo de <em>questões.</em></>} subtitle="Crie uma sala, convide colegas e dispute 3 a 10 questões. O ranking é ao vivo e usa o banco oficial." actions={<Link to="/pulso" className="btn btn-ghost">Voltar à suíte</Link>} />
        <div className="battle-home">
          <Card>
            <span className="eyebrow">Criar sala</span>
            <h2>Desafie alguém</h2>
            <Field label="Seu apelido"><input maxLength={24} value={name} onChange={(e) => saveName(e.target.value)} placeholder="Como aparecer no ranking" /></Field>
            <div className="form-2">
              <Field label="Área"><select value={area} onChange={(e) => setArea(e.target.value)}><option value="todas">Misto</option>{curriculum.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
              <Field label="Questões"><select value={count} onChange={(e) => setCount(Number(e.target.value))}>{[3,5,10].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
            </div>
            <InlineError>{error}</InlineError>
            <Button onClick={create} disabled={busy} icon={Swords}>{busy ? <><Spinner /> Criando…</> : 'Criar sala'}</Button>
          </Card>
          <Card>
            <span className="eyebrow">Entrar</span>
            <h2>Tenho um código</h2>
            <Field label="Código da sala"><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ex.: A1B2C" maxLength={5} /></Field>
            <p className="muted-note">Quem cria compartilha um link. Combine um horário: a sala começa quando o anfitrião iniciar.</p>
            <InlineError>{error}</InlineError>
            <Button variant="soft" onClick={join} disabled={busy} icon={Users}>{busy ? <><Spinner /> Entrando…</> : 'Entrar na sala'}</Button>
          </Card>
        </div>
        <Card className="battle-rules"><Crown size={18} /><div><strong>Como funciona</strong><p>3 a 10 questões, 100 pontos por acerto + bônus de velocidade. Adicione adversário-treino para jogar sozinho. A sala expira ao final.</p></div></Card>
      </>
    );
  }

  if (stage === 'lobby') {
    return (
      <>
        <button className="back-link" onClick={() => { setStage('home'); setBattle(null); params.delete('sala'); setParams(params); }}><ArrowLeft size={15} /> Sair da sala</button>
        <PageHead eyebrow="Sala de espera" title={<>Código <em>{battle?.code}</em></>} subtitle="Compartilhe o link com seus colegas. O anfitrião inicia quando todos estiverem prontos." actions={<Button variant="soft" onClick={copy} icon={Copy}>Copiar convite</Button>} />
        <div className="battle-lobby">
          <Card>
            <div className="section-head small"><span className="eyebrow">Jogadores ({battle?.players.length}/8)</span><Users size={18} /></div>
            {battle?.players.map((p) => <div key={p.id} className="battle-player"><span className="avatar small">{p.name[0]}</span><strong>{p.name}</strong>{p.id === playerId && <Chip tone="accent">você</Chip>}{p.bot && <Chip tone="soft">treino</Chip>}</div>)}
            <div className="lobby-actions">
              <Button variant="ghost" onClick={addBot} icon={Plus}>Adicionar adversário-treino</Button>
              <Button onClick={start} disabled={busy} icon={Swords}>{busy ? <Spinner /> : 'Iniciar duelo'}</Button>
            </div>
            <InlineError>{error}</InlineError>
          </Card>
          <Card className="lobby-info">
            <Swords size={30} /><h3>Prepare o coração.</h3><p>{battle?.count} questões · área: {battle?.area === 'todas' ? 'mista' : curriculum.areas.find((a) => a.id === battle?.area)?.name}. A pontuação premia acerto e rapidez.</p>
          </Card>
        </div>
      </>
    );
  }

  if (stage === 'play' && q) {
    return (
      <div className="battle-play">
        <div className="battle-top"><Chip tone="accent"><Swords size={12} /> {battle.code}</Chip><span>{index + 1} / {questions.length}</span><Link to="/pulso/battle" className="text-link">sair</Link></div>
        <div className="battle-grid">
          <Card className="battle-question">
            <div className="q-meta">{topic && <span className="q-topic">{topic.title}</span>}<span className="q-area">{curriculum.areas.find((a) => a.id === q.area)?.short}</span></div>
            <p className="q-stem">{q.stem}</p>
            <div className="q-options">
              {q.options.map((o) => {
                let cls = selected === o.key ? 'selected' : '';
                if (answered && o.key === q.answer) cls = 'correct';
                else if (answered && o.key === selected) cls = 'wrong';
                return <button key={o.key} className={`q-option ${cls}`} disabled={answered} onClick={() => setSelected(o.key)}><span className="q-key">{o.key}</span><span>{o.text}</span>{answered && o.key === q.answer && <CheckCircle2 size={18} />}{answered && o.key === selected && o.key !== q.answer && <XCircle size={18} />}</button>;
              })}
            </div>
            {answered && <div className={`q-feedback ${q.answer === selected ? 'ok' : 'bad'}`}><div className="q-feedback-head">{q.answer === selected ? 'Acertou' : `Correta: ${q.answer}`}</div><p className="muted-note">{q.explanation}</p></div>}
            <div className="q-submit">{!answered ? <Button onClick={submit} disabled={selected == null} icon={Send}>Confirmar</Button> : <Button onClick={next} icon={ArrowRight}>{index + 1 >= questions.length ? 'Ver resultado' : 'Próxima'}</Button>}</div>
          </Card>
          <Card className="battle-ranking">
            <span className="eyebrow">Ao vivo</span>
            {ranking.map((p, i) => <div key={p.id} className="battle-rank-row"><span>{i + 1}</span><strong>{p.name}</strong><b>{p.score}</b></div>)}
            <p className="muted-note">Acertos valem 100 + até 50 de bônus por velocidade.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHead eyebrow="Resultado do duelo" title={<>Ranking <em>final.</em></>} subtitle={`Sala ${battle?.code} encerrada.`} actions={<Button onClick={() => { setStage('home'); setBattle(null); setPlayer(null); setQuestions([]); params.delete('sala'); setParams(params); }} icon={RefreshCw}>Nova batalha</Button>} />
      <Card className="battle-result">
        {ranking.map((p, i) => (
          <div key={p.id} className={`battle-result-row ${p.id === playerId ? 'me' : ''}`}>
            <span className="battle-place">{i === 0 ? <Trophy size={20} /> : i + 1}</span>
            <strong>{p.name}</strong>
            {p.id === playerId && <Chip tone="accent">você</Chip>}
            <b>{p.score} pts</b>
            <small>{p.answered}/{questions.length} respondidas</small>
          </div>
        ))}
      </Card>
      <div className="battle-result-actions"><Link to="/pulso/battle" className="btn btn-solid">Criar outra sala</Link><Link to="/caderno-erros" className="btn btn-ghost">Revisar erros</Link></div>
    </>
  );
}
