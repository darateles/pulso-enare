import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, Image as ImageIcon, Layers, Sparkles, ThumbsDown, ThumbsUp, Users } from 'lucide-react';
import { Button, Card, Chip, Empty, PageHead, Segmented } from '../../components/ui.jsx';
import ClozeText from '../../components/ClozeText.jsx';
import { buildClozeCards } from '../../cloze.js';
import { useStore } from '../../store.jsx';
import { addDays, iso } from '../../utils.js';
import atlas from '../../../seed/atlas.json';
import clozeSeed from '../../../seed/cloze.json';

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

  const clozeStarter = () => {
    const existing = new Set(user.flashcards.map((card) => card.clozeGroup).filter(Boolean));
    const cards = [];
    for (const item of clozeSeed.cards) {
      if (existing.has(item.id)) continue;
      const built = buildClozeCards({
        text: item.text,
        deck: clozeSeed.deck,
        tags: [item.area, item.topicId, 'cloze'].filter(Boolean),
      });
      cards.push(...built.map((card) => ({ ...card, id: `${item.id}-c${card.clozeIndex}`, clozeGroup: item.id })));
    }
    if (!cards.length) { toast('O deck interativo já está no seu acervo.'); return; }
    updateUser((prev) => ({ ...prev, flashcards: [...cards, ...prev.flashcards] }));
    toast(`${cards.length} cartões interativos criados.`);
  };

  const imageStarter = () => {
    const existing = new Set(user.flashcards.map((c) => c.id));
    const cards = atlas.items
      .map((item) => ({
        id: `atlas-${item.id}`,
        front: `Identifique a imagem: ${item.category}`,
        back: `${item.title}\n${item.structures.join(' · ')}`,
        image: item.image,
        imageAlt: item.title,
        deck: 'Atlas visual',
        tags: ['atlas', item.category],
        createdAt: new Date().toISOString(),
      }))
      .filter((card) => !existing.has(card.id));
    if (!cards.length) { toast('O deck de imagens já está no seu acervo.'); return; }
    updateUser((prev) => ({ ...prev, flashcards: [...cards, ...prev.flashcards] }));
    toast(`${cards.length} flashcards com imagem criados.`);
  };

  if (!user.flashcards.length) {
    return (
      <><PageHead eyebrow="Flashcards" title="Flashcards" subtitle="Nenhum cartão ainda. Importe do Anki, envie imagens ou use os decks prontos." actions={<div className="page-actions"><Button variant="soft" onClick={clozeStarter} icon={Layers}>Deck interativo</Button><Button variant="soft" onClick={imageStarter} icon={ImageIcon}>Deck com imagens</Button><Link to="/flashcards/publicos" className="btn btn-ghost">Públicos</Link><Link to="/pulso/import" className="btn btn-ghost">Importar</Link></div>} />
        <Card><Empty icon={Layers} title="Nenhum cartão" text="Crie um deck inicial, use lacunas médicas ou importe seu material." action={<div className="empty-actions"><Button onClick={starter} icon={Sparkles}>Deck inicial</Button><Button variant="soft" onClick={clozeStarter} icon={Layers}>Deck interativo</Button><Button variant="soft" onClick={imageStarter} icon={ImageIcon}>Deck com imagens</Button><Link to="/flashcards/publicos" className="btn btn-ghost">Flashcards públicos</Link></div>} /></Card>
      </>
    );
  }

  return (
    <>
      <PageHead eyebrow="Flashcards" title="Flashcards" subtitle="Repetição espaçada com autoavaliação. Cartões vencidos aparecem primeiro." actions={<div className="page-actions"><Button variant="soft" onClick={clozeStarter} icon={Layers}>Deck interativo</Button><Button variant="soft" onClick={imageStarter} icon={ImageIcon}>Deck com imagens</Button><Link to="/flashcards/publicos" className="btn btn-ghost">Públicos</Link><Link to="/pulso/import" className="btn btn-ghost">Importar mais</Link></div>} />
      <Card className="public-deck-callout">
        <span className="public-deck-intro-icon"><Users size={19} /></span>
        <div><strong>Flashcards públicos</strong><span>Importe decks compartilhados por outros alunos ou publique o seu.</span></div>
        <Link to="/flashcards/publicos" className="btn btn-ghost btn-sm">Abrir biblioteca</Link>
      </Card>
      <div className="radar-toolbar"><Segmented options={[{ value: 'todos', label: `Todos (${user.flashcards.length})` }, ...decks.map((d) => ({ value: d, label: d }))]} value={deck} onChange={(v) => { setDeck(v); setI(0); setRevealed(false); setSession(false); }} label="Deck" /><span className="filter-count">{due.length} vencidos</span>{deck !== 'todos' && <Link to={`/flashcards/publicos?deck=${encodeURIComponent(deck)}`} className="text-link">Publicar este deck</Link>}</div>
      {!session ? (
        <Card className="flash-start"><Layers size={26} /><h2>{due.length} cartões para revisar</h2><p>Sessão curta. Revele apenas depois de tentar lembrar.</p><Button onClick={startSession} disabled={!due.length}>Iniciar revisão</Button></Card>
      ) : card ? (
        <Card className="flash-card">
          <div className="battle-top"><Chip tone="soft">{card.deck}</Chip>{card.clozeText && <Chip tone="accent">lacuna</Chip>}<span>{i + 1} / {queue.length}</span><button className="text-link" onClick={() => setSession(false)}>pausar</button></div>
          {!revealed && (
            card.clozeText
              ? <div className="flash-front cloze-front"><ClozeText text={card.clozeText} index={card.clozeIndex} /></div>
              : <>
                  {card.image && <img className="flash-image" src={card.image} alt={card.imageAlt || card.front || 'Imagem do flashcard'} />}
                  <div className="flash-front">{card.front}</div>
                </>
          )}
          {!revealed && card.clozeHint && <p className="cloze-hint">Dica: {card.clozeHint}</p>}
          {!revealed ? <Button onClick={() => setRevealed(true)} icon={Eye}>Mostrar verso</Button> : (
            <>
              {card.imageBack && <img className="flash-image" src={card.imageBack} alt={card.back || 'Imagem do verso'} />}
              <div className="flash-back">{card.clozeText ? <ClozeText text={card.clozeText} index={card.clozeIndex} revealed /> : card.back}</div>
              <div className="recall-grade"><span>Como foi?</span><Button variant="soft" onClick={() => grade(1)} icon={ThumbsDown}>Errei</Button><Button variant="ghost" onClick={() => grade(2)}>Difícil</Button><Button variant="ghost" onClick={() => grade(3)}>Bom</Button><Button onClick={() => grade(4)} icon={ThumbsUp}>Fácil</Button></div>
            </>
          )}
        </Card>
      ) : <Card><Empty icon={CheckCircle2} title="Fila vazia" text="Volte amanhã ou importe mais cartões." /></Card>}
    </>
  );
}
