import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Layers, Plus, RefreshCw } from 'lucide-react';
import { Button, Card, Chip, Empty } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { useTopic } from '../useTopic.js';
import TopicPageShell from '../components/TopicPageShell.jsx';

export default function TopicoFlashcards() {
  const data = useTopic();
  const { updateUser, toast } = useStore();
  if (!data.found) return <Card><p>Tema não encontrado. <Link to="/trilha">Voltar à trilha.</Link></p></Card>;
  const { t, topicCards, guide } = data;

  const createDeck = () => {
    const existing = new Set(topicCards.map((card) => card.id));
    const cards = [
      {
        id: `tc-${t.id}-0`,
        front: `Quais são os pontos críticos e a conduta em ${t.title}?`,
        back: `${t.summary}\n\n${t.keyPoints.map((point) => `• ${point}`).join('\n')}`,
        deck: t.title,
        tags: [t.id, 'guia'],
        createdAt: new Date().toISOString(),
      },
      ...t.keyPoints.map((point, index) => ({
        id: `tc-${t.id}-${index + 1}`,
        front: `Explique e aplique: ${point}`,
        back: `${t.title} — ${t.summary}\n\nFoco: ${t.focus}.\n\nPegadinha: ${guide.traps?.[index % (guide.traps?.length || 1)] || 'compare critérios antes de decidir.'}`,
        deck: t.title,
        tags: [t.id, 'guia'],
        createdAt: new Date().toISOString(),
      })),
    ].filter((card) => !existing.has(card.id));
    if (!cards.length) { toast('Este baralho já está completo.'); return; }
    updateUser((prev) => ({ ...prev, flashcards: [...cards, ...prev.flashcards] }));
    toast(`Baralho criado com ${cards.length} flashcards.`);
  };

  return (
    <TopicPageShell data={data} eyebrow="Recuperação ativa" title="Flashcards do tema">
      <Card>
        <div className="section-head small">
          <div><span className="eyebrow">Recuperação ativa</span><h2>Flashcards do tema</h2></div>
          <Chip tone={topicCards.length ? 'success' : 'neutral'}>{topicCards.length} cartões</Chip>
        </div>
        <p className="muted-note">Um baralho curto com critérios, conduta e pegadinhas. Use a frente para tentar lembrar e só depois vire o cartão.</p>
        <div className="related-actions">
          <Button variant="soft" onClick={createDeck} icon={topicCards.length ? RefreshCw : Plus}>
            {topicCards.length ? 'Completar baralho' : 'Criar baralho do tema'}
          </Button>
          {topicCards.length > 0 && (
            <Link to={`/flashcards?deck=${encodeURIComponent(t.title)}`} className="btn btn-ghost btn-sm">
              <Layers size={14} /> Revisar no modo flashcards
            </Link>
          )}
          <Link to="/pulso/import" className="btn btn-ghost btn-sm">Importar do Anki</Link>
        </div>
      </Card>

      {topicCards.length ? (
        <div className="flashcard-topic-list">
          {topicCards.map((card) => (
            <article key={card.id} className="flashcard-topic-card">
              {card.image && <img className="flashcard-topic-image" src={card.image} alt={card.imageAlt || card.front || 'Imagem do flashcard'} />}
              <span className="eyebrow">Frente</span>
              <strong>{card.front}</strong>
              <span className="eyebrow">Verso</span>
              <p>{card.back}</p>
            </article>
          ))}
        </div>
      ) : (
        <Card>
          <Empty
            icon={Layers}
            title="Nenhum cartão neste tema ainda"
            text="Crie o baralho para transformar os pontos-chave em recuperação ativa."
            action={<Button onClick={createDeck} icon={Plus}>Criar baralho</Button>}
          />
        </Card>
      )}

      <div className="topic-next-actions">
        <Link to={`/conteudos/${t.id}/questoes`} className="btn btn-soft">Agora recupere com questões <ArrowRight size={15} /></Link>
        <Link to={`/conteudos/${t.id}`} className="btn btn-ghost">Voltar ao conteúdo</Link>
      </div>
    </TopicPageShell>
  );
}
