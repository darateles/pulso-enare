import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Eye, Image as ImageIcon, Layers, ScanEye, Search, XCircle } from 'lucide-react';
import atlas from '../../../seed/atlas.json';
import { Button, Card, Chip, Empty, PageHead, Segmented } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';
import { normalize } from '../../utils.js';

export default function Atlas() {
  const { user, updateUser, toast } = useStore();
  const [cat, setCat] = useState('todas');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [showStruct, setShowStruct] = useState(false);

  const filtered = useMemo(() => atlas.items.filter((i) => {
    if (cat !== 'todas' && i.category !== cat) return false;
    if (q && !normalize(`${i.title} ${i.description} ${i.structures.join(' ')}`).includes(normalize(q))) return false;
    return true;
  }), [cat, q]);

  const openItem = (item) => { setOpen(item); setSelected(null); setRevealed(false); setShowStruct(false); };
  const mark = (item) => { updateUser((prev) => ({ ...prev, atlasSeen: { ...prev.atlasSeen, [item.id]: new Date().toISOString() } })); toast('Ficha revisada.'); };
  const addAtlasCard = (item) => {
    const id = `atlas-${item.id}`;
    if (user.flashcards.some((card) => card.id === id)) { toast('Esta imagem já está nos flashcards.'); return; }
    updateUser((prev) => ({
      ...prev,
      flashcards: [{
        id,
        front: `Identifique a imagem: ${item.title}`,
        back: `${item.title}\n${item.structures.join(' · ')}`,
        image: item.image,
        imageAlt: item.title,
        deck: 'Atlas visual',
        tags: ['atlas', item.category],
        createdAt: new Date().toISOString(),
      }, ...prev.flashcards],
    }));
    toast('Flashcard com imagem criado.');
  };

  return (
    <>
      <PageHead eyebrow="Pulso Atlas" title="Atlas" subtitle="Anatomia, histologia e patologia com estruturas-chave e correlação clínica. Imagens de acervos abertos, com crédito e licença." actions={<Link to="/pulso" className="btn btn-ghost">Voltar à suíte</Link>} />
      <div className="radar-toolbar">
        <div className="filter-search"><Search size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar estrutura ou tecido" /></div>
        <Segmented options={[{ value: 'todas', label: 'Todas' }, { value: 'Anatomia', label: 'Anatomia' }, { value: 'Histologia', label: 'Histologia' }, { value: 'Patologia', label: 'Patologia' }]} value={cat} onChange={setCat} label="Categoria" />
      </div>
      {!filtered.length ? <Card><Empty icon={ImageIcon} title="Nenhuma ficha" text="Limpe a busca ou troque a categoria." /></Card> : (
        <div className="atlas-grid">
          {filtered.map((item) => (
            <button key={item.id} className="atlas-card" onClick={() => openItem(item)}>
              <img src={item.image} alt={item.title} loading="lazy" />
              <span className="atlas-overlay"><Chip tone="light">{item.category}</Chip><strong>{item.title}</strong><span><Eye size={14} /> {user.atlasSeen[item.id] ? 'revisado' : 'abrir ficha'}</span></span>
            </button>
          ))}
        </div>
      )}
      <Card className="battle-rules info"><ScanEye size={18} /><div><strong>Uso do atlas</strong><p>Descreva a imagem em voz alta antes de abrir os nomes. Reconhecimento passivo engana: feche a ficha e tente listar as estruturas de memória.</p></div></Card>

      {open && (
        <div className="overlay atlas-viewer" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <Card className="atlas-modal">
            <div className="atlas-modal-head"><Chip tone="accent">{open.category}</Chip><button className="icon-btn" onClick={() => setOpen(null)}>×</button></div>
            <img src={open.image} alt={open.title} />
            <div className="atlas-modal-body">
              <h2>{open.title}</h2>
              <p>{open.description}</p>
              <small>{open.credit}</small>
              <div className="atlas-actions">
                <Button variant="soft" size="sm" onClick={() => setShowStruct((s) => !s)}>{showStruct ? 'Esconder' : 'Ver'} estruturas-chave</Button>
                <Button variant="ghost" size="sm" onClick={() => addAtlasCard(open)} icon={Layers}>Criar flashcard</Button>
              </div>
              {showStruct && <ul className="atlas-structures">{open.structures.map((s) => <li key={s}>{s}</li>)}</ul>}
              <div className="atlas-quiz">
                <span className="eyebrow">Teste rápido</span>
                <p><strong>{open.question}</strong></p>
                {open.options.map((o, i) => {
                  const key = 'ABCDE'[i];
                  let cls = selected === key ? 'selected' : '';
                  if (revealed && key === open.answer) cls = 'correct';
                  else if (revealed && key === selected) cls = 'wrong';
                  return <button key={o} className={`q-option ${cls}`} disabled={revealed} onClick={() => setSelected(key)}><span className="q-key">{key}</span><span>{o}</span>{revealed && key === open.answer && <CheckCircle2 size={17} />}{revealed && key === selected && key !== open.answer && <XCircle size={17} />}</button>;
                })}
                {!revealed ? <Button size="sm" onClick={() => { setRevealed(true); if (selected === open.answer) mark(open); }} disabled={!selected}>Conferir</Button> : <div className="atlas-feedback"><p>{open.explanation}</p><Button size="sm" variant="ghost" onClick={() => mark(open)}>Marcar ficha revisada</Button></div>}
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
