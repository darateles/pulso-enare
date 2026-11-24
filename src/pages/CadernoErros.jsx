import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Filter, NotebookPen, RotateCcw, Trash2 } from 'lucide-react';
import { Button, Card, Chip, Empty, PageHead, Segmented } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { fmtDate, normalize } from '../utils.js';

export default function CadernoErros() {
  const { user, curriculum, questions, setQuestionNote, dismissError, toast } = useStore();
  const [area, setArea] = useState('todas');

  const wrong = useMemo(() => {
    const latest = new Map();
    for (const a of user.attempts) if (a.correct === false) latest.set(a.questionId, a);
    return [...latest.values()]
      .filter((a) => !user.errorDismissed?.[a.questionId])
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [user.attempts, user.errorDismissed]);

  const filtered = wrong.filter((a) => area === 'todas' || a.area === area);
  const unused = curriculum.areas.filter((a) => wrong.some((w) => w.area === a.id));

  return (
    <>
      <PageHead
        eyebrow="Caderno de erros"
        title={<>Erros que viram <em>pontos.</em></>}
        subtitle="Cada erro traz a explicação do gabarito e um espaço de anotação. Refaça, entenda a pegadinha e só então marque como revisado."
        actions={<Button onClick={() => toast('Caderno organizado por erro mais recente.')} variant="soft" icon={NotebookPen}>{filtered.length} {filtered.length === 1 ? 'pendente' : 'pendentes'}</Button>}
      />

      {unused.length > 0 && (
        <Card className="error-filter">
          <Filter size={16} />
          <Segmented options={[{ value: 'todas', label: 'Todas' }, ...unused.map((a) => ({ value: a.id, label: a.short }))]} value={area} onChange={setArea} label="Filtrar área" />
        </Card>
      )}

      {!filtered.length ? (
        <Card><Empty icon={CheckCircle2} title="Caderno em dia" text="Nenhum erro pendente nesse recorte. Continue treinando: quando errar, a questão aparece aqui automaticamente." action={<Link to="/questoes" className="btn btn-solid">Ir ao banco</Link>} /></Card>
      ) : filtered.map((a) => {
        const q = questions.find((x) => x.id === a.questionId);
        const areaMeta = curriculum.areas.find((x) => x.id === a.area);
        const topic = areaMeta?.topics.find((t) => t.id === a.topicId);
        if (!q) return null;
        return (
          <Card key={a.questionId} className="error-card">
            <div className="error-head">
              <span className="focus-area" style={{ background: areaMeta?.color }}>{areaMeta?.short}</span>
              {topic && <Link to={`/conteudos/${topic.id}`} className="q-topic">{topic.title}</Link>}
              <Chip tone="danger">erro em {fmtDate(a.createdAt)}</Chip>
            </div>
            <p className="q-stem">{q.stem}</p>
            <div className="q-options">
              {q.options.map((o) => (
                <div key={o.key} className={`q-option ${o.key === q.answer ? 'correct' : o.key === a.chosen ? 'wrong' : ''}`}>
                  <span className="q-key">{o.key}</span><span>{o.text}</span>
                  {o.key === q.answer && <CheckCircle2 size={18} />}
                </div>
              ))}
            </div>
            <div className="q-explanation"><strong>Comentário:</strong><p>{q.explanation}</p></div>
            <textarea rows={3} className="q-note" value={user.questionNotes?.[q.id] || ''} onChange={(e) => setQuestionNote(q.id, e.target.value)} placeholder="Por que você errou? Qual detalhe não pode escapar na próxima?" />
            <div className="error-actions">
              <Link to={`/questoes?q=${q.id}`} className="btn btn-soft btn-sm"><RotateCcw size={14} /> Refazer questão</Link>
              <Button size="sm" variant="ghost" icon={Trash2} onClick={() => { dismissError(q.id); toast('Marcada como revisada.'); }}>Marcar revisada</Button>
              {q.source?.url && <a className="text-link" href={q.source.url} target="_blank" rel="noreferrer">fonte oficial ↗</a>}
            </div>
          </Card>
        );
      })}
    </>
  );
}
