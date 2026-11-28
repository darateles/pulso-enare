import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Download, Eye, Layers, Search, Trash2, Upload, Users,
} from 'lucide-react';
import {
  Button, Card, Chip, Empty, Field, InlineError, Modal, PageHead, Spinner,
} from '../components/ui.jsx';
import ClozeText from '../components/ClozeText.jsx';
import { api } from '../api.js';
import { useStore } from '../store.jsx';
import { fmtDate, normalize } from '../utils.js';

function safeFileName(value = '') {
  return String(value || 'flashcards').replace(/[^\w\-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'flashcards';
}

export default function FlashcardsPublicos() {
  const { user, updateUser, toast } = useStore();
  const [params] = useSearchParams();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishForm, setPublishForm] = useState({ deck: '', title: '', description: '' });
  const [previewDeck, setPreviewDeck] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const handledPreset = useRef('');

  const myDecks = useMemo(() => {
    const counts = new Map();
    for (const card of user.flashcards || []) {
      if (!card.deck) continue;
      counts.set(card.deck, (counts.get(card.deck) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [user.flashcards]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.publicDecks();
      setDecks(data.decks || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalCards = useMemo(() => decks.reduce((sum, deck) => sum + (Number(deck.cardCount) || 0), 0), [decks]);
  const filtered = useMemo(() => {
    const term = normalize(query).trim();
    if (!term) return decks;
    return decks.filter((deck) => normalize(`${deck.title} ${deck.authorName} ${deck.description || ''}`).includes(term));
  }, [decks, query]);

  const openPublish = (preset = '') => {
    const selected = myDecks.find((deck) => deck.name === preset)?.name || myDecks[0]?.name || '';
    if (!selected) {
      toast('Crie ou importe um deck antes de publicar.', 'error');
      return;
    }
    setPublishError('');
    setPublishForm({ deck: selected, title: selected, description: '' });
    setPublishOpen(true);
  };

  useEffect(() => {
    const preset = params.get('deck');
    if (!preset || handledPreset.current === preset || !myDecks.length) return;
    if (!myDecks.some((deck) => deck.name === preset)) return;
    handledPreset.current = preset;
    setPublishForm({ deck: preset, title: preset, description: '' });
    setPublishOpen(true);
  }, [params, myDecks]);

  const publish = async () => {
    if (!publishForm.deck) { setPublishError('Escolha um deck seu.'); return; }
    setBusy('publish');
    setPublishError('');
    try {
      const data = await api.publishPublicDeck({
        deck: publishForm.deck,
        title: publishForm.title.trim() || publishForm.deck,
        description: publishForm.description.trim(),
      });
      setDecks((prev) => [data.deck, ...prev]);
      setPublishOpen(false);
      toast('Deck publicado para todos os alunos.');
    } catch (err) {
      setPublishError(err.message);
    } finally {
      setBusy('');
    }
  };

  const importDeck = async (deck) => {
    setBusy(`import-${deck.id}`);
    try {
      const data = await api.importPublicDeck(deck.id);
      const existing = new Set((user.flashcards || []).map((card) => card.id));
      const fresh = data.cards.filter((card) => !existing.has(card.id));
      if (!fresh.length) {
        toast('Este deck já está no seu acervo.');
      } else {
        updateUser((prev) => ({ ...prev, flashcards: [...fresh, ...prev.flashcards] }));
        toast(`${fresh.length} cartões importados do deck de ${deck.authorName}.`);
      }
      setDecks((prev) => prev.map((item) => (item.id === deck.id ? { ...item, imports: data.deck.imports } : item)));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const downloadDeck = async (deck) => {
    setBusy(`download-${deck.id}`);
    try {
      const res = await fetch(`/api/flashcards/public/${deck.id}/export`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Não foi possível exportar o deck.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pulso-${safeFileName(deck.title)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast('Deck exportado em JSON.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const preview = async (deck) => {
    setBusy(`preview-${deck.id}`);
    try {
      const data = await api.publicDeck(deck.id);
      setPreviewDeck(data.deck);
      setPreviewOpen(true);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const removeDeck = async (deck) => {
    if (!window.confirm(`Remover "${deck.title}" da biblioteca pública?`)) return;
    setBusy(`remove-${deck.id}`);
    try {
      await api.deletePublicDeck(deck.id);
      setDecks((prev) => prev.filter((item) => item.id !== deck.id));
      toast('Deck removido da biblioteca pública.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <PageHead
        eyebrow="Flashcards"
        title="Flashcards públicos"
        subtitle="Decks compartilhados pelos alunos. Importe para o seu acervo ou exporte em JSON."
        actions={(
          <div className="page-actions">
            <Link to="/flashcards" className="btn btn-ghost">Meus flashcards</Link>
            <Button onClick={() => openPublish()} icon={Upload} disabled={!myDecks.length}>Publicar deck</Button>
          </div>
        )}
      />

      <Card className="public-deck-intro">
        <span className="public-deck-intro-icon"><Users size={22} /></span>
        <div>
          <strong>Biblioteca compartilhada</strong>
          <p>Cada aluno pode publicar um deck. O deck fica armazenado no Pulso e outros alunos importam uma cópia para o próprio acervo.</p>
        </div>
        <span className="public-deck-total"><b>{decks.length}</b> {decks.length === 1 ? 'deck' : 'decks'} · <b>{totalCards}</b> cartões</span>
      </Card>

      <div className="public-deck-toolbar">
        <label className="public-deck-search">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, aluno ou assunto…" />
        </label>
        {myDecks.length > 0 && <span className="filter-count">{myDecks.length === 1 ? '1 deck seu disponível para publicar' : `${myDecks.length} decks seus disponíveis para publicar`}</span>}
      </div>

      {error && <InlineError>{error}</InlineError>}

      {loading ? (
        <Card className="public-deck-loading"><Spinner label="Carregando flashcards públicos" /> Carregando biblioteca…</Card>
      ) : !decks.length ? (
        <Card>
          <Empty
            icon={Users}
            title="A biblioteca ainda está vazia"
            text={myDecks.length ? 'Publique um dos seus decks para começar a compartilhar com outros alunos.' : 'Crie ou importe flashcards primeiro. Depois você pode publicar um deck para a turma.'}
            action={myDecks.length
              ? <Button onClick={() => openPublish()} icon={Upload}>Publicar meu primeiro deck</Button>
              : <Link to="/pulso/import" className="btn btn-solid">Importar flashcards</Link>}
          />
        </Card>
      ) : !filtered.length ? (
        <Card><Empty icon={Search} title="Nenhum deck encontrado" text={`Nada corresponde a “${query}”. Tente outro termo.`} action={<Button variant="ghost" onClick={() => setQuery('')}>Limpar busca</Button>} /></Card>
      ) : (
        <div className="public-deck-grid">
          {filtered.map((deck) => (
            <Card key={deck.id} className={`public-deck-card ${deck.isMine ? 'is-mine' : ''}`}>
              <div className="public-deck-head">
                <div className="public-deck-title">
                  <div className="public-deck-tags">
                    <Chip tone={deck.isMine ? 'accent' : 'soft'}>{deck.isMine ? 'Meu deck' : 'Compartilhado'}</Chip>
                    <span>por {deck.authorName} · #{deck.authorId}</span>
                  </div>
                  <h2>{deck.title}</h2>
                  {deck.description && <p>{deck.description}</p>}
                </div>
                <div className="public-deck-count"><strong>{deck.cardCount}</strong><span>cartões</span></div>
              </div>

              {deck.preview?.length > 0 && (
                <div className="public-deck-preview">
                  {deck.preview.map((card, index) => (
                    <div key={index} className="public-deck-preview-line">
                      <span>{index + 1}</span>
                      <p>
                        {card.clozeText
                          ? <ClozeText text={card.clozeText} index={card.clozeIndex || 1} />
                          : card.front}
                      </p>
                    </div>
                  ))}
                  {deck.cardCount > deck.preview.length && <small>+ {deck.cardCount - deck.preview.length} cartões</small>}
                </div>
              )}

              <div className="public-deck-meta">
                <span><Layers size={14} /> {deck.imports || 0} importaç{deck.imports === 1 ? 'ão' : 'ões'}</span>
                <span>{fmtDate(deck.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>

              <div className="public-deck-actions">
                {!deck.isMine && (
                  <Button size="sm" onClick={() => importDeck(deck)} disabled={busy === `import-${deck.id}`}>
                    {busy === `import-${deck.id}` ? <Spinner label="Importando" /> : 'Importar para meu acervo'}
                  </Button>
                )}
                <Button size="sm" variant="ghost" icon={Eye} onClick={() => preview(deck)} disabled={busy === `preview-${deck.id}`}>Ver cartões</Button>
                <Button size="sm" variant="ghost" icon={Download} onClick={() => downloadDeck(deck)} disabled={busy === `download-${deck.id}`}>Exportar</Button>
                {deck.isMine && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => removeDeck(deck)} disabled={busy === `remove-${deck.id}`}>Excluir</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={publishOpen} onClose={() => setPublishOpen(false)} title="Publicar deck">
        <div className="public-publish-note">
          <Upload size={18} />
          <p>O Pulso guarda uma cópia do deck no servidor. Quem importar recebe os cartões no próprio acervo, sem alterar o seu.</p>
        </div>
        <Field label="Deck do seu acervo">
          <select
            value={publishForm.deck}
            onChange={(event) => {
              const deck = event.target.value;
              setPublishForm((prev) => ({
                ...prev,
                deck,
                title: !prev.title || prev.title === prev.deck ? deck : prev.title,
              }));
            }}
          >
            {myDecks.map((deck) => <option key={deck.name} value={deck.name}>{deck.name} · {deck.count} cartões</option>)}
          </select>
        </Field>
        <Field label="Título público" hint="Aparece para os outros alunos na biblioteca.">
          <input value={publishForm.title} onChange={(event) => setPublishForm((prev) => ({ ...prev, title: event.target.value }))} maxLength={80} />
        </Field>
        <Field label="Descrição (opcional)" hint="Diga o foco do deck: tema, prova ou objetivo.">
          <textarea rows={3} value={publishForm.description} onChange={(event) => setPublishForm((prev) => ({ ...prev, description: event.target.value }))} maxLength={240} placeholder="Ex.: Revisão rápida de cardiologia para a ENARE." />
        </Field>
        <InlineError>{publishError}</InlineError>
        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setPublishOpen(false)}>Cancelar</Button>
          <Button onClick={publish} icon={Upload} disabled={busy === 'publish'}>{busy === 'publish' ? 'Publicando…' : 'Publicar'}</Button>
        </div>
      </Modal>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title={previewDeck?.title || 'Deck público'} size="lg">
        {previewDeck && (
          <>
            <div className="public-preview-meta">
              <span>por <strong>{previewDeck.authorName}</strong> · #{previewDeck.authorId}</span>
              <Chip tone="soft">{previewDeck.cardCount} cartões</Chip>
            </div>
            {previewDeck.description && <p className="public-preview-description">{previewDeck.description}</p>}
            <div className="public-preview-list">
              {previewDeck.cards.map((card, index) => (
                <div key={index} className="public-preview-card">
                  <small>Cartão {index + 1}</small>
                  {card.image && <img src={card.image} alt={card.imageAlt || card.front || 'Imagem do flashcard'} />}
                  {card.clozeText ? (
                    <>
                      <p><ClozeText text={card.clozeText} index={card.clozeIndex || 1} /></p>
                      <p className="public-preview-answer"><ClozeText text={card.clozeText} index={card.clozeIndex || 1} revealed /></p>
                    </>
                  ) : (
                    <>
                      <strong>{card.front}</strong>
                      <p>{card.back}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => downloadDeck(previewDeck)} icon={Download}>Exportar JSON</Button>
              {!previewDeck.isMine && <Button onClick={() => { setPreviewOpen(false); importDeck(previewDeck); }} disabled={busy === `import-${previewDeck.id}`}>Importar para meu acervo</Button>}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
