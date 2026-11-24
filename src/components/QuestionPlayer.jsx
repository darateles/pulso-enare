import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, CheckCircle2, ChevronLeft, Circle,
  Clock3, Crown, Flag, Lightbulb, RotateCcw, Send, XCircle,
} from 'lucide-react';
import { Button, Card, Chip, Progress } from './ui.jsx';
import { useStore } from '../store.jsx';
import { fmtDate, minutesLabel } from '../utils.js';

function mmss(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function QuestionPlayer({ pool, mode = 'treino', duration = 0, onFinish, single = false, onClose }) {
  const { curriculum, user, addAttempt, toggleBookmark, setQuestionNote, toast } = useStore();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(single);
  const [left, setLeft] = useState(duration * 60);
  const [showNote, setShowNote] = useState(false);
  const start = useRef(Date.now());
  const qStart = useRef(Date.now());
  const submitted = useRef(new Set());
  const finishedRef = useRef(false);
  const finishRef = useRef(null);

  const q = pool[index];
  const meta = useMemo(() => {
    if (!q) return null;
    const area = curriculum.areas.find((a) => a.id === q.area);
    const topic = area?.topics.find((t) => t.id === q.topicId);
    return { area, topic };
  }, [q, curriculum]);

  useEffect(() => { window.scrollTo(0, 0); }, [q?.id]);

  useEffect(() => {
    if (!duration || done) return undefined;
    const t = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(t);
          finishRef.current?.();
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [duration, done]);

  if (!q) return <Card><p>Nenhuma questão encontrada com esses filtros.</p></Card>;

  const reveal = () => {
    if (selected == null) return;
    setRevealed(true);
    const seconds = Math.round((Date.now() - qStart.current) / 1000);
    if (!submitted.current.has(q.id)) {
      submitted.current.add(q.id);
      addAttempt(q, selected, seconds);
    }
    setAnswers((a) => ({ ...a, [q.id]: selected }));
  };

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const results = pool.map((question) => ({
      question,
      chosen: answers[question.id] ?? (question.id === q.id ? selected : null),
      correct: question.answer ? (answers[question.id] ?? (question.id === q.id ? selected : null)) === question.answer : null,
    }));
    onFinish?.({
      results,
      total: results.length,
      right: results.filter((r) => r.correct).length,
      answered: results.filter((r) => r.chosen).length,
      seconds: Math.round((Date.now() - start.current) / 1000),
    });
  };

  finishRef.current = finish;

  const next = () => {
    if (index + 1 >= pool.length) { finish(); return; }
    setIndex((i) => i + 1);
    setSelected(answers[pool[index + 1].id] || null);
    setRevealed(Boolean(answers[pool[index + 1].id]));
    setShowNote(false);
    qStart.current = Date.now();
  };

  const prev = () => {
    if (index === 0) return;
    setIndex((i) => i - 1);
    setSelected(answers[pool[index - 1].id] || null);
    setRevealed(Boolean(answers[pool[index - 1].id]));
    setShowNote(false);
  };

  const correctKey = q.answer;
  const picked = selected;
  const isRight = correctKey && picked === correctKey;
  const answeredCount = Object.keys(answers).length + (revealed && !answers[q.id] ? 1 : 0);

  return (
    <div className="player">
      <div className="player-bar">
        <div className="player-bar-left">
          {single && onClose && <Button variant="ghost" size="sm" onClick={onClose} icon={ArrowLeft}>Voltar</Button>}
          <span className="q-counter">{single ? 'Questão avulsa' : `${index + 1} / ${pool.length}`}</span>
          {q.source?.year && <Chip>{q.source.exam || `ENARE ${q.source.year}`}</Chip>}
          {q.status === 'annulled' && <Chip tone="warning">anulada</Chip>}
        </div>
        <div className="player-bar-right">
          {duration > 0 && <span className={`timer ${left < 60 ? 'urgent' : ''}`}><Clock3 size={15} /> {mmss(left)}</span>}
          <button className="icon-btn" onClick={() => toggleBookmark(q.id)} aria-label="Salvar questão">
            {user.bookmarks.includes(q.id) ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
          </button>
        </div>
      </div>
      {!single && <Progress value={((index) / pool.length) * 100} tone="accent" />}

      <Card className="question-card">
        <div className="q-meta">
          <span className="q-area" style={{ color: meta?.area?.color }}>{meta?.area?.short}</span>
          {meta?.topic && <Link to={`/conteudos/${meta.topic.id}`} className="q-topic">{meta.topic.title}</Link>}
          {q.source?.url && <a href={q.source.url} target="_blank" rel="noreferrer" className="q-source">fonte oficial ↗</a>}
        </div>
        <p className="q-stem">{q.stem}</p>
        <div className="q-options">
          {q.options.map((o) => {
            let cls = '';
            if (revealed && o.key === correctKey) cls = 'correct';
            else if (revealed && o.key === picked) cls = 'wrong';
            else if (picked === o.key) cls = 'selected';
            return (
              <button key={o.key} className={`q-option ${cls}`} onClick={() => { if (!revealed) setSelected(o.key); }} disabled={revealed}>
                <span className="q-key">{o.key}</span>
                <span>{o.text}</span>
                {revealed && o.key === correctKey && <CheckCircle2 size={19} />}
                {revealed && o.key === picked && o.key !== correctKey && <XCircle size={19} />}
              </button>
            );
          })}
        </div>

        {!revealed ? (
          <div className="q-submit">
            {q.status === 'sem-gabarito' && <Chip tone="warning">sem gabarito</Chip>}
            <Button onClick={reveal} disabled={!selected} icon={Send}>Confirmar resposta</Button>
          </div>
        ) : (
          <div className={`q-feedback ${isRight ? 'ok' : q.answer ? 'bad' : 'neutral'}`}>
            <div className="q-feedback-head">
              {q.answer
                ? (isRight ? <><CheckCircle2 size={19} /> Você acertou</> : <><XCircle size={19} /> Resposta correta: {correctKey}</>)
                : <><Flag size={18} /> {q.status === 'annulled' ? 'Questão anulada pela banca' : 'Questão sem gabarito cadastrado'}</>}
            </div>
            <div className="q-explanation"><Lightbulb size={17} /><p>{q.explanation || 'Sem comentário disponível.'}</p></div>
            <div className="q-feedback-actions">
              <Button variant="ghost" size="sm" onClick={() => setShowNote((n) => !n)} icon={Bookmark}>Anotar</Button>
              {!single && <Button onClick={next} icon={ArrowRight}>Próxima</Button>}
              {single && <Button variant="ghost" onClick={() => { setRevealed(false); setSelected(null); }} icon={RotateCcw}>Refazer</Button>}
            </div>
            {showNote && (
              <textarea rows={3} className="q-note" value={user.questionNotes?.[q.id] || ''} onChange={(e) => setQuestionNote(q.id, e.target.value)} placeholder="O que você errou e não pode esquecer?" />
            )}
          </div>
        )}
      </Card>

      <div className="player-footer">
        <Button variant="ghost" size="sm" onClick={prev} disabled={index === 0} icon={ChevronLeft}>Anterior</Button>
        {!single && (
          <div className="player-dots">
            {pool.map((x, i) => <button key={x.id} className={`${answers[x.id] ? 'answered' : ''} ${i === index ? 'current' : ''}`} onClick={() => { setIndex(i); setSelected(answers[x.id] || null); setRevealed(Boolean(answers[x.id])); }} aria-label={`Ir para questão ${i + 1}`} />)}
          </div>
        )}
        {!single && <Button variant="ghost" size="sm" onClick={finish}>Encerrar ({answeredCount}/{pool.length})</Button>}
      </div>
    </div>
  );
}

export function Results({ data, onRestart, exitTo = '/questoes' }) {
  const pct = data.total ? Math.round((data.right / data.total) * 100) : 0;
  return (
    <Card className="results-card">
      <span className="eyebrow">Resultado</span>
      <h2>{pct >= 70 ? 'Bom desempenho.' : pct >= 50 ? 'Dá para ajustar.' : 'Agora você sabe onde dói.'}</h2>
      <p>Você acertou <strong>{data.right}</strong> de <strong>{data.total}</strong> ({pct}%). Tempo: {minutesLabel(data.seconds / 60)}.</p>
      <div className="result-grid">
        {data.results.map((r, i) => (
          <div key={r.question.id} className={`result-row ${r.correct ? 'ok' : r.correct === false ? 'bad' : ''}`}>
            <span>{i + 1}</span>
            <Link to={`/questoes?q=${r.question.id}`}>{r.question.stem.slice(0, 100)}…</Link>
            <strong>{r.correct ? 'acerto' : r.chosen ? 'erro' : 'branco'}</strong>
          </div>
        ))}
      </div>
      <div className="results-actions">
        <Button onClick={onRestart} icon={RotateCcw}>Novo treino</Button>
        <Link to="/caderno-erros" className="btn btn-ghost">Revisar erros</Link>
        <Link to={exitTo} className="btn btn-ghost">Sair do treino</Link>
      </div>
    </Card>
  );
}
