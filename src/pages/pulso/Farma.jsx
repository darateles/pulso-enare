import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, BookmarkCheck, CheckCircle2, Pill, Search, Sparkles, XCircle } from 'lucide-react';
import farma from '../../../seed/farma.json';
import { Button, Card, Chip, Empty, PageHead, Segmented } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';
import { normalize, shuffle } from '../../utils.js';

export default function Farma() {
  const { user, updateUser, toast } = useStore();
  const [mode, setMode] = useState('biblia');
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('todas');
  const [open, setOpen] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const saved = user.farmaSaved || [];
  const classes = [...new Set(farma.drugs.map((d) => d.class))];

  const filtered = useMemo(() => farma.drugs.filter((d) => {
    if (cls !== 'todas' && d.class !== cls) return false;
    if (q && !normalize(`${d.name} ${d.class} ${d.mechanism} ${d.tags.join(' ')}`).includes(normalize(q))) return false;
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name)), [q, cls]);

  const toggleSave = (id) => {
    updateUser((prev) => ({ ...prev, farmaSaved: saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id] }));
  };

  const makeCard = (d) => {
    const id = `farma-${d.id}`;
    if (user.flashcards.some((c) => c.id === id)) { toast('Já está nos flashcards.'); return; }
    updateUser((prev) => ({ ...prev, flashcards: [{ id, front: `Mecanismo e classe de ${d.name}?`, back: `${d.class}. ${d.mechanism}\nDose: ${d.dose}`, deck: 'Farmacologia', tags: ['farma'], createdAt: new Date().toISOString() }, ...prev.flashcards] }));
    toast('Flashcard criado no deck Farmacologia.');
  };

  const startQuiz = () => {
    setQuiz(shuffle(farma.drugs).slice(0, 10).map((d) => {
      const distractors = shuffle(farma.drugs.filter((x) => x.id !== d.id)).slice(0, 3).map((x) => x.name);
      return { d, options: shuffle([d.name, ...distractors]), answer: d.name };
    }));
    setQi(0); setSelected(null); setRevealed(false); setScore(0); setMode('quiz');
  };

  const qd = quiz?.[qi];

  if (mode === 'quiz' && qd) {
    return (
      <>
        <PageHead eyebrow="Pulso Farma · quiz" title="Quiz de farmacologia" subtitle={`Questão ${qi + 1} de ${quiz.length} · ${score} acertos`} actions={<Button variant="ghost" onClick={() => setMode('biblia')}>Sair do quiz</Button>} />
        <Card className="farma-quiz">
          <span className="eyebrow">Identifique o fármaco</span>
          <p className="q-stem">{qd.d.mechanism}</p>
          <div className="q-options">{qd.options.map((o, i) => {
            const k = 'ABCDE'[i]; let c = selected === o ? 'selected' : '';
            if (revealed && o === qd.answer) c = 'correct'; else if (revealed && o === selected) c = 'wrong';
            return <button key={o} className={`q-option ${c}`} disabled={revealed} onClick={() => setSelected(o)}><span className="q-key">{k}</span><span>{o}</span>{revealed && o === qd.answer && <CheckCircle2 size={18} />}{revealed && o === selected && o !== qd.answer && <XCircle size={18} />}</button>;
          })}</div>
          {!revealed ? <Button onClick={() => { setRevealed(true); if (selected === qd.answer) setScore((s) => s + 1); }} disabled={!selected}>Confirmar</Button> : (
            <div className="q-feedback neutral"><div className="q-feedback-head">Correta: {qd.d.name} · {qd.d.class}</div><p>{qd.d.mechanism} Dose de referência: {qd.d.dose}</p><div className="q-feedback-actions"><Button size="sm" onClick={() => { if (qi + 1 >= quiz.length) { setMode('biblia'); toast(`Quiz concluído: ${score}/${quiz.length}.`); } else { setQi((i) => i + 1); setSelected(null); setRevealed(false); } }}>Próxima</Button></div></div>
          )}
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHead eyebrow="Pulso Farma" title="Farmacologia" subtitle="Farmacologia orientada a mecanismo, dose, efeitos adversos e interações. Biblioteca para consulta e quiz para recuperação." actions={<><Button variant="soft" onClick={startQuiz} icon={Sparkles}>Quiz de mecanismos</Button><Link to="/pulso" className="btn btn-ghost">Suíte</Link></>} />
      <div className="radar-toolbar">
        <div className="filter-search"><Search size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar fármaco, classe, efeito" /></div>
        <div className="filter-scroll"><Segmented options={[{ value: 'todas', label: 'Todas' }, ...classes.map((c) => ({ value: c, label: c }))]} value={cls} onChange={setCls} label="Classe" /></div>
      </div>
      {!filtered.length ? <Card><Empty icon={Pill} title="Nenhum fármaco" text="Limpe os filtros." /></Card> : (
        <div className="farma-grid">
          {filtered.map((d) => (
            <Card key={d.id} className="farma-card">
              <div className="farma-head"><Chip tone="soft">{d.class}</Chip><button className="icon-btn" onClick={() => toggleSave(d.id)} aria-label="Salvar">{saved.includes(d.id) ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button></div>
              <h3>{d.name}</h3>
              <p>{d.mechanism}</p>
              <div className="farma-foot"><Chip tone="neutral">Dose: {d.dose.split(';')[0]}</Chip><Button size="sm" variant="ghost" onClick={() => setOpen(d)}>Abrir</Button></div>
            </Card>
          ))}
        </div>
      )}
      {open && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <Card className="farma-modal">
            <div className="farma-head"><Chip tone="accent">{open.class}</Chip><button className="icon-btn" onClick={() => setOpen(null)}>×</button></div>
            <h2>{open.name}</h2>
            <div className="drug-block"><span className="eyebrow">Mecanismo</span><p>{open.mechanism}</p></div>
            <div className="drug-block"><span className="eyebrow">Dose de referência</span><p>{open.dose}</p></div>
            <div className="drug-grid"><div><span className="eyebrow">Indicações</span><ul>{open.indications.map((x) => <li key={x}>{x}</li>)}</ul></div><div><span className="eyebrow">Efeitos adversos</span><ul>{open.adverse.map((x) => <li key={x}>{x}</li>)}</ul></div></div>
            <div className="drug-block"><span className="eyebrow">Interações</span><p>{open.interactions.join(' · ')}</p></div>
            <div className="drug-block"><span className="eyebrow">Gestação</span><p>Categoria {open.pregnancy}</p></div>
            <div className="modal-actions"><Button variant="soft" onClick={() => makeCard(open)} icon={Sparkles}>Criar flashcard</Button></div>
          </Card>
        </div>
      )}
    </>
  );
}
