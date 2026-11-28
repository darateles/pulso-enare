import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, Layers, RotateCcw, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button, Card, Chip, Empty, PageHead, Segmented } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';
import { addDays, iso } from '../../utils.js';

export default function Flashcards() {
  const { user, updateUser, curriculum, toast } = useStore();
  const [params] = useSearchParams();
  const [deck, setDeck] = useState(params.get('deck') || 'todos');
  const [revealed, setRevealed] = useState(false);
  const [i, setI] = useState(0);
  const [session, setSession] = useState(false);
  const [queue, setQueue] = useState([]);
  const reviews = user.flashReviews || {};
  const today = iso();
  const decks = [...new Set([...(params.get('deck') ? [params.get('deck')] : []), ...user.flashcards.map((c) => c.deck)])];
  const due = useMemo(() => user.flashcards.filter((c) => (deck === 'todos' || c.deck === deck) && (!reviews[c.id] || reviews[c.id].due <= today)), [user.flashcards, deck, reviews, today]);
  const card = queue[i];

  const grade = (g) => {
    if (!card) return;
    const days = { 1: 1, 2: 3, 3: 7, 4: 21 }[g];
    updateUser((prev) => ({ ...prev, flashReviews: { ...prev.flashReviews, [card.id]: { due: iso(addDays(new Date(), days)), grade: g, at: new Date().toISOString() } } }));
    if (i + 1 >= queue.length) { setSession(false); setRevealed(false); setI(0); toast('Sessão concluída.'); } else { setRevealed(false); setI((x) => x + 1); }
  };

  const startSession = () => { setQueue(due); setSession(true); setI(0); setRevealed(false); };

  const starter = () => {
    const topics = curriculum.areas.flatMap((a) => a.topics).filter((t) => t.weight >= 4).slice(0, 20);
    const cards = topics.map((t) => ({ id: `starter-${t.id}`, front: `Quais são os pontos-chave de ${t.title}?`, back: t.keyPoints.join('\n'), deck: 'Starter ENARE', tags: [t.area], createdAt: new Date().toISOString() }));
    updateUser((prev) => ({ ...prev, flashcards: [...cards, ...prev.flashcards] }));
    toast('Deck inicial criado com 20 cartões de alta prioridade.');
  };

  if (!user.flashcards.length) {
    return (
      <><PageHead eyebrow="Flashcards" title="Flashcards" subtitle="Nenhum cartão ainda. Importe do Anki ou crie um deck a partir dos temas de maior incidência." actions={<Link to="/pulso/import" className="btn btn-ghost">Importar</Link>} />
        <Card><Empty icon={Layers} title="Nenhum cartão" text="Crie um deck inicial de alta prioridade ou importe seu material." action={<Button onClick={starter} icon={Sparkles}>Gerar deck inicial</Button>} /></Card>
      </>
    );
  }

  return (
    <>
      <PageHead eyebrow="Flashcards" title="Flashcards" subtitle="Repetição espaçada com autoavaliação. Cartões vencidos aparecem primeiro." actions={<Link to="/pulso/import" className="btn btn-ghost">Importar mais</Link>} />
      <div className="radar-toolbar"><Segmented options={[{ value: 'todos', label: `Todos (${user.flashcards.length})` }, ...decks.map((d) => ({ value: d, label: d }))]} value={deck} onChange={(v) => { setDeck(v); setI(0); setRevealed(false); setSession(false); }} label="Deck" /><span className="filter-count">{due.length} vencidos</span></div>
      {!session ? (
        <Card className="flash-start"><Layers size={26} /><h2>{due.length} cartões para revisar</h2><p>Sessão curta. Revele apenas depois de tentar lembrar.</p><Button onClick={startSession} disabled={!due.length}>Iniciar revisão</Button></Card>
      ) : card ? (
        <Card className="flash-card">
          <div className="battle-top"><Chip tone="soft">{card.deck}</Chip><span>{i + 1} / {queue.length}</span><button className="text-link" onClick={() => setSession(false)}>pausar</button></div>
          <div className="flash-front">{card.front}</div>
          {!revealed ? <Button onClick={() => setRevealed(true)} icon={Eye}>Mostrar verso</Button> : (
            <><div className="flash-back">{card.back}</div><div className="recall-grade"><span>Como foi?</span><Button variant="soft" onClick={() => grade(1)} icon={ThumbsDown}>Errei</Button><Button variant="ghost" onClick={() => grade(2)}>Difícil</Button><Button variant="ghost" onClick={() => grade(3)}>Bom</Button><Button onClick={() => grade(4)} icon={ThumbsUp}>Fácil</Button></div></>
          )}
        </Card>
      ) : <Card><Empty icon={CheckCircle2} title="Fila vazia" text="Volte amanhã ou importe mais cartões." /></Card>}
    </>
  );
}
