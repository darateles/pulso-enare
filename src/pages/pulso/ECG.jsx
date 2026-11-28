import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, CheckCircle2, ChevronRight, HeartPulse, Lock, RotateCcw, XCircle } from 'lucide-react';
import ecg from '../../../seed/ecg.json';
import { Button, Card, Chip, Empty, PageHead, Progress, Segmented } from '../../components/ui.jsx';
import { answerKey, answerText, isCorrectAnswer } from '../../quiz.js';
import { useStore } from '../../store.jsx';
import ECGStrip from '../../components/ECGStrip.jsx';

export default function ECG() {
  const { user, updateUser, toast } = useStore();
  const [level, setLevel] = useState(1);
  const [open, setOpen] = useState(null);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const done = user.ecgProgress || {};
  const levelDone = (n) => ecg.cases.filter((c) => c.level === n && done[c.id]).length;
  const locked = (n) => {
    if (n === 1) return false;
    if (n === 2) return levelDone(1) < 3;
    return levelDone(2) < 4;
  };
  const cases = useMemo(() => ecg.cases.filter((c) => c.level === level), [level]);
  const progress = (levelDone(1) + levelDone(2) + levelDone(3)) / ecg.cases.length * 100;
  const correctKey = open ? answerKey(open.answer, open.options) : null;
  const correctText = open ? answerText(open.answer, open.options) : '';

  const openCase = (c) => { setOpen(c); setSelected(null); setRevealed(false); };
  const answer = () => {
    setRevealed(true);
    const correct = isCorrectAnswer(open.answer, open.options, selected);
    if (correct) toast('Traçado correto.');
    updateUser((prev) => ({ ...prev, ecgProgress: { ...prev.ecgProgress, [open.id]: { correct, seen: true, at: new Date().toISOString() } } }));
  };

  return (
    <>
      <PageHead eyebrow="Pulso ECG" title="ECG" subtitle="Traçados progressivos com explicação objetiva. Nível 1: ritmo e frequência. Nível 2: bloqueios e isquemia. Nível 3: ritmos de parada." actions={<Link to="/pulso" className="btn btn-ghost">Voltar à suíte</Link>} />
      <Card className="ecg-progress"><div><span className="eyebrow">Trilha de ECG</span><h2>{levelDone(1) + levelDone(2) + levelDone(3)} de {ecg.cases.length} traçados concluídos</h2><Progress value={progress} tone="accent" /></div><div className="ecg-levels">{[1,2,3].map((n) => <button key={n} disabled={locked(n)} className={level === n ? 'active' : ''} onClick={() => setLevel(n)}>{locked(n) ? <Lock size={13} /> : <HeartPulse size={13} />} Nível {n}</button>)}</div></Card>
      <div className="ecg-grid">
        {cases.map((c, i) => {
          const p = done[c.id];
          return (
            <Card key={c.id} className={`ecg-card ${p ? 'done' : ''}`}>
              <ECGStrip params={c.params} seed={i + 1} />
              <div className="ecg-card-body">
                <div className="section-head small"><span className="eyebrow">Traçado {i + 1}</span>{p && <Chip tone={p.correct ? 'success' : 'warning'}>{p.correct ? 'acertou' : 'errou'}</Chip>}</div>
                <h3>Qual o diagnóstico?</h3>
                <Button size="sm" variant="ghost" onClick={() => openCase(c)}>Analisar traçado <ChevronRight size={14} /></Button>
              </div>
            </Card>
          );
        })}
      </div>
      {!cases.length && <Card><Empty icon={Activity} title="Nível bloqueado" text="Conclua os níveis anteriores para liberar." /></Card>}

      {open && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <Card className="ecg-modal">
            <div className="atlas-modal-head"><Chip tone="accent">Nível {open.level}</Chip><button className="icon-btn" onClick={() => setOpen(null)}>×</button></div>
            <ECGStrip params={open.params} seed={Number(open.id.split('-')[1])} />
            <h3>Qual o diagnóstico do traçado?</h3>
            <div className="q-options">
              {open.options.map((o, i) => {
                const k = 'ABCDE'[i];
                let cls = selected === k ? 'selected' : '';
                if (revealed && k === correctKey) cls = 'correct';
                else if (revealed && k === selected) cls = 'wrong';
                return <button key={o} className={`q-option ${cls}`} disabled={revealed} onClick={() => setSelected(k)}><span className="q-key">{k}</span><span>{o}</span>{revealed && k === correctKey && <CheckCircle2 size={18} />}{revealed && k === selected && k !== correctKey && <XCircle size={18} />}</button>;
              })}
            </div>
            {!revealed ? <Button onClick={answer} disabled={!selected}>Confirmar diagnóstico</Button> : (
              <div className="q-feedback neutral"><div className="q-feedback-head">{selected === correctKey ? 'Acertou' : `Correta: ${correctText}`}</div><p>{open.explanation}</p><div className="q-feedback-actions"><Button size="sm" variant="ghost" onClick={() => { setRevealed(false); setSelected(null); }} icon={RotateCcw}>Refazer</Button><Button size="sm" onClick={() => { setOpen(null); setSelected(null); setRevealed(false); }}>Próximo caso</Button></div></div>
            )}
            <p className="muted-note">Traçado esquemático para treino, não substitui ECG real.</p>
          </Card>
        </div>
      )}
    </>
  );
}
