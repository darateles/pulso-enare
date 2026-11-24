import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenCheck, CheckCircle2, FlaskConical, Search, XCircle } from 'lucide-react';
import research from '../../../seed/research.json';
import { Button, Card, Chip, Empty, PageHead, Segmented } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';
import { normalize } from '../../utils.js';

export default function Research() {
  const { user, updateUser, toast } = useStore();
  const [area, setArea] = useState('todas');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const done = user.researchDone || {};
  const areas = [...new Set(research.modules.map((m) => m.area))];

  const filtered = useMemo(() => research.modules.filter((m) => {
    if (area !== 'todas' && m.area !== area) return false;
    if (q && !normalize(`${m.title} ${m.abstract} ${m.concepts.join(' ')}`).includes(normalize(q))) return false;
    return true;
  }), [area, q]);

  const answer = () => {
    setRevealed(true);
    const correct = selected === open.answer;
    updateUser((prev) => ({ ...prev, researchDone: { ...prev.researchDone, [open.id]: { correct, at: new Date().toISOString() } } }));
    toast(correct ? 'Interpretação correta.' : 'Reveja o raciocínio no comentário.');
  };

  return (
    <>
      <PageHead eyebrow="Pulso Research" title={<>Ler artigo é uma <em>competência.</em></>} subtitle="Delineamento, viés, medida de associação e relevância clínica em casos curtos. Treine para não aceitar título de abstract." actions={<Link to="/pulso" className="btn btn-ghost">Voltar à suíte</Link>} />
      <Card className="guideline-banner"><FlaskConical size={19} /><div><strong>Leitura crítica aplicada</strong><p>Não é aula de estatística isolada: cada caso pede uma decisão de interpretação. O comentário explica o raciocínio e os conceitos envolvidos.</p></div></Card>
      <div className="radar-toolbar">
        <div className="filter-search"><Search size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar conceito ou desenho" /></div>
        <Segmented options={[{ value: 'todas', label: 'Todos' }, ...areas.map((a) => ({ value: a, label: a }))]} value={area} onChange={setArea} label="Filtro" />
      </div>
      {!filtered.length ? <Card><Empty icon={FlaskConical} title="Nada encontrado" text="Limpe os filtros." /></Card> : (
        <div className="research-grid">
          {filtered.map((m) => (
            <Card key={m.id} className="research-card">
              <div className="guideline-top"><Chip tone="soft">{m.design}</Chip>{done[m.id] && <Chip tone={done[m.id].correct ? 'success' : 'warning'}>{done[m.id].correct ? 'resolvido' : 'revisar'}</Chip>}</div>
              <h3>{m.title}</h3>
              <p>{m.abstract.slice(0, 150)}…</p>
              <Button size="sm" variant="ghost" onClick={() => { setOpen(m); setSelected(null); setRevealed(false); }} icon={BookOpenCheck}>Resolver caso</Button>
            </Card>
          ))}
        </div>
      )}
      {open && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <Card className="research-modal">
            <div className="guideline-top"><Chip tone="accent">{open.design}</Chip><button className="icon-btn" onClick={() => setOpen(null)}>×</button></div>
            <h2>{open.title}</h2>
            <div className="research-abstract">{open.abstract}</div>
            <p><strong>{open.question}</strong></p>
            <div className="q-options">{open.options.map((o, i) => {
              const k = 'ABCDE'[i]; let c = selected === k ? 'selected' : '';
              if (revealed && k === open.answer) c = 'correct'; else if (revealed && k === selected) c = 'wrong';
              return <button key={o} className={`q-option ${c}`} disabled={revealed} onClick={() => setSelected(k)}><span className="q-key">{k}</span><span>{o}</span>{revealed && k === open.answer && <CheckCircle2 size={18} />}{revealed && k === selected && k !== open.answer && <XCircle size={18} />}</button>;
            })}</div>
            {!revealed ? <Button onClick={answer} disabled={!selected}>Confirmar interpretação</Button> : <div className="q-feedback neutral"><div className="q-feedback-head">Comentário</div><p>{open.explanation}</p><div className="concepts">{open.concepts.map((c) => <Chip key={c} tone="neutral">{c}</Chip>)}</div></div>}
          </Card>
        </div>
      )}
    </>
  );
}
