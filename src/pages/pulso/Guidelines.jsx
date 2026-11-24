import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, BookmarkCheck, ExternalLink, Search, ScrollText, Sparkles } from 'lucide-react';
import guidelines from '../../../seed/guidelines.json';
import { Button, Card, Chip, Empty, PageHead, Segmented } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';
import { fmtDate, normalize } from '../../utils.js';

export default function Guidelines() {
  const { user, updateUser, toast } = useStore();
  const [spec, setSpec] = useState('todas');
  const [q, setQ] = useState('');
  const [read, setRead] = useState(null);
  const specialties = [...new Set(guidelines.items.map((i) => i.specialty))];

  const filtered = useMemo(() => guidelines.items.filter((i) => {
    if (spec !== 'todas' && i.specialty !== spec) return false;
    if (q && !normalize(`${i.title} ${i.summary} ${i.tags.join(' ')} ${i.society}`).includes(normalize(q))) return false;
    return true;
  }).sort((a, b) => b.year - a.year), [spec, q]);

  const toggle = (id) => {
    const has = user.guidelineSaved.includes(id);
    updateUser((prev) => ({ ...prev, guidelineSaved: has ? prev.guidelineSaved.filter((x) => x !== id) : [...prev.guidelineSaved, id] }));
    toast(has ? 'Removida das salvas.' : 'Salva para ler depois.');
  };

  return (
    <>
      <PageHead eyebrow="Pulso Guidelines" title={<>Evidência <em>em movimento.</em></>} subtitle="Uma curadoria de diretrizes, consensos e protocolos com o que muda na prática. Salve, leia e conecte ao tema estudado." actions={<Link to="/pulso" className="btn btn-ghost">Voltar à suíte</Link>} />
      <Card className="guideline-banner"><Sparkles size={19} /><div><strong>Radar de atualizações</strong><p>Priorize o que tem impacto em prova e plantão. Cada ficha resume o ponto clínico; o link leva à fonte para leitura integral.</p></div></Card>
      <div className="radar-toolbar">
        <div className="filter-search"><Search size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar tema ou sociedade" /></div>
        <div className="filter-scroll"><Segmented options={[{ value: 'todas', label: 'Todas' }, ...specialties.map((s) => ({ value: s, label: s }))]} value={spec} onChange={setSpec} label="Especialidade" /></div>
      </div>
      {!filtered.length ? <Card><Empty icon={ScrollText} title="Nada encontrado" text="Troque o filtro ou limpe a busca." /></Card> : (
        <div className="guideline-list">
          {filtered.map((g) => (
            <Card key={g.id} className="guideline-card">
              <div className="guideline-top"><Chip tone="soft">{g.specialty}</Chip><span>{g.society} · {g.year}</span><button className="icon-btn" onClick={() => toggle(g.id)} aria-label="Salvar">{user.guidelineSaved.includes(g.id) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button></div>
              <h3>{g.title}</h3>
              <p>{g.summary}</p>
              <div className="guideline-bottom">
                <div>{g.tags.map((t) => <Chip key={t} tone="neutral">#{t}</Chip>)}</div>
                <Button size="sm" variant="ghost" onClick={() => setRead(g)}>Ler resumo</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {read && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setRead(null); }}>
          <Card className="guideline-reader">
            <div className="guideline-top"><Chip tone="accent">{read.specialty}</Chip><button className="icon-btn" onClick={() => setRead(null)}>×</button></div>
            <span className="eyebrow">{read.society} · {read.year}</span>
            <h2>{read.title}</h2>
            <p>{read.summary}</p>
            <div className="reader-note"><strong>Ponto de estudo</strong><p>Transforme o resumo em três flashcards e uma questão. Ao terminar, marque o subtópico correspondente no checklist.</p></div>
            <div className="modal-actions"><Button variant="soft" onClick={() => toggle(read.id)} icon={Bookmark}>Salvar</Button><a href={read.url} target="_blank" rel="noreferrer" className="btn btn-solid">Abrir fonte <ExternalLink size={14} /></a></div>
          </Card>
        </div>
      )}
    </>
  );
}
