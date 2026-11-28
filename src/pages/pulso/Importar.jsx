import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, FileUp, Image as ImageIcon, Layers, Plus, Table2, X } from 'lucide-react';
import { api } from '../../api.js';
import { Button, Card, Chip, Field, InlineError, PageHead, Segmented, Spinner } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';

function parseDelimited(text) {
  const rows = text.split(/\r?\n/).filter(Boolean);
  const cards = [];
  for (const row of rows) {
    let parts = row.split('\t');
    if (parts.length < 2) parts = row.split(';');
    if (parts.length < 2) parts = row.split(',');
    if (parts.length < 2) continue;
    const [front, back, tags] = parts;
    if (/^front$/i.test(front.trim())) continue;
    if (front.trim() && back.trim()) cards.push({ front: front.trim(), back: back.trim(), tags: (tags || '').split(/[ ,]+/).filter(Boolean) });
  }
  return cards;
}

export default function Importar() {
  const { user, updateUser, toast } = useStore();
  const [tab, setTab] = useState('anki');
  const [preview, setPreview] = useState([]);
  const [deck, setDeck] = useState('Anki');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [paste, setPaste] = useState('');
  const [manual, setManual] = useState({ front: '', back: '', deck: 'Meu deck' });
  const [manualImage, setManualImage] = useState(null);
  const fileRef = useRef(null);
  const textFileRef = useRef(null);
  const imageRef = useRef(null);

  const readAnki = async (file) => {
    if (!file) return;
    setBusy('anki'); setError(''); setPreview([]);
    try {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
      const d = await api.importAnki(b64);
      setPreview(d.cards.map((c) => ({ ...c, deck: deck || 'Anki' })));
      toast(`${d.total} cartões lidos. Revise antes de importar.`);
    } catch (e) { setError(e.message); } finally { setBusy(''); if (fileRef.current) fileRef.current.value = ''; }
  };

  const readText = () => {
    const cards = parseDelimited(paste);
    if (!cards.length) { setError('Formato não reconhecido. Use front + TAB + verso por linha.'); return; }
    setPreview(cards.map((c) => ({ ...c, deck: deck || 'Importado' })));
    setError('');
  };

  const readTextFile = async (selected) => {
    if (!selected) return;
    setError('');
    setPreview([]);
    try {
      const content = await selected.text();
      if (/\.json$/i.test(selected.name)) {
        const parsed = JSON.parse(content);
        const list = Array.isArray(parsed) ? parsed : (parsed.cards || parsed.flashcards || []);
        const cards = list
          .map((card) => ({
            front: card.front || card.frente || '',
            back: card.back || card.verso || '',
            image: card.image || card.imagem || undefined,
            imageAlt: card.imageAlt || undefined,
            tags: card.tags || [],
            deck: card.deck || deck || 'Importado',
          }))
          .filter((card) => card.front && card.back);
        if (!cards.length) throw new Error('O JSON não contém cartões com frente e verso.');
        setPreview(cards);
        toast(`${cards.length} cartões lidos. Revise antes de importar.`);
      } else {
        setPaste(content);
        const cards = parseDelimited(content);
        if (!cards.length) throw new Error('Formato não reconhecido. Use frente + TAB + verso por linha.');
        setPreview(cards.map((card) => ({ ...card, deck: deck || 'Importado' })));
        toast(`${cards.length} cartões lidos. Revise antes de importar.`);
      }
    } catch (err) { setError(err.message); } finally {
      if (textFileRef.current) textFileRef.current.value = '';
    }
  };

  const importAll = () => {
    if (!preview.length) return;
    const cards = preview.map((c) => ({ ...c, id: crypto.randomUUID(), createdAt: new Date().toISOString(), tags: c.tags || [] }));
    updateUser((prev) => ({ ...prev, flashcards: [...cards, ...prev.flashcards] }));
    toast(`${cards.length} cartões adicionados.`);
    setPreview([]);
  };

  const readImageFile = async (selected) => {
    if (!selected) return;
    setError('');
    try {
      if (!selected.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem.');
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(selected);
      });
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = reject;
        element.src = dataUrl;
      });
      const max = 1200;
      const scale = Math.min(1, max / image.width, max / image.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      setManualImage(canvas.toDataURL('image/jpeg', 0.82));
    } catch (err) { setError(err.message || 'Não foi possível ler a imagem.'); } finally {
      if (imageRef.current) imageRef.current.value = '';
    }
  };

  const addManual = () => {
    const front = manual.front.trim();
    const back = manual.back.trim();
    if ((!front && !manualImage) || !back) { setError('Preencha a frente (ou envie uma imagem) e o verso.'); return; }
    updateUser((prev) => ({
      ...prev,
      flashcards: [{
        id: crypto.randomUUID(),
        front: front || 'Identifique a imagem',
        back,
        image: manualImage || undefined,
        deck: manual.deck || 'Meu deck',
        tags: [],
        createdAt: new Date().toISOString(),
      }, ...prev.flashcards],
    }));
    setManual({ front: '', back: '', deck: manual.deck });
    setManualImage(null);
    setError('');
    toast('Cartão criado.');
  };

  return (
    <>
      <PageHead eyebrow="Pulso Import" title="Importar flashcards" subtitle="Importe flashcards do Anki, CSV ou texto e mantenha a revisão espaçada no Pulso. Cartões ficam no seu deck local." actions={<Link to="/pulso/flashcards" className="btn btn-ghost">Revisar flashcards</Link>} />
      <Card className="import-tabs"><Segmented options={[{ value: 'anki', label: 'Anki (.apkg)' }, { value: 'texto', label: 'CSV / TXT' }, { value: 'manual', label: 'Criar cartão' }]} value={tab} onChange={(v) => { setTab(v); setPreview([]); setError(''); }} label="Modo" /></Card>
      {tab === 'anki' && (
        <Card className="import-form">
          <div className="import-form-note"><FileUp size={18} /><p>Exporte o deck no Anki como <strong>.apkg</strong> e envie abaixo. O primeiro campo vira frente e o segundo, verso. O arquivo é processado localmente no servidor e não é armazenado.</p></div>
          <Field label="Nome do deck"><input value={deck} onChange={(e) => setDeck(e.target.value)} /></Field>
          <input ref={fileRef} type="file" accept=".apkg,application/octet-stream" hidden onChange={(e) => readAnki(e.target.files?.[0])} />
          <Button onClick={() => fileRef.current?.click()} disabled={busy === 'anki'} icon={FileUp}>{busy === 'anki' ? <><Spinner /> Lendo coleção…</> : 'Selecionar .apkg'}</Button>
          <p className="muted-note">Limite de 5.000 cartões por importação. Mídias não são copiadas.</p>
        </Card>
      )}
      {tab === 'texto' && (
        <Card className="import-form">
          <div className="import-form-note"><Table2 size={18} /><p>Envie CSV, TXT ou JSON, ou cole uma linha por cartão separando frente e verso por TAB, ponto e vírgula ou vírgula. Opcional: terceira coluna de tags.</p></div>
          <Field label="Deck"><input value={deck} onChange={(e) => setDeck(e.target.value)} /></Field>
          <input ref={textFileRef} type="file" accept=".csv,.txt,.json,text/csv,text/plain,application/json" hidden onChange={(e) => readTextFile(e.target.files?.[0])} />
          <div className="file-picker">
            <Button variant="soft" onClick={() => textFileRef.current?.click()} icon={FileUp}>Selecionar CSV/TXT/JSON</Button>
            <span>ou cole o conteúdo abaixo</span>
          </div>
          <Field label="Conteúdo"><textarea rows={12} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={`Pergunta\tResposta\nOutra pergunta;Outra resposta`} /></Field>
          <Button onClick={readText} icon={Layers}>Pré-visualizar</Button>
        </Card>
      )}
      {tab === 'manual' && (
        <Card className="import-form">
          <Field label="Deck"><input value={manual.deck} onChange={(e) => setManual({ ...manual, deck: e.target.value })} /></Field>
          <input ref={imageRef} type="file" accept="image/*" hidden onChange={(e) => readImageFile(e.target.files?.[0])} />
          <div className="file-picker">
            <Button variant="soft" onClick={() => imageRef.current?.click()} icon={ImageIcon}>Selecionar imagem</Button>
            <span>JPG/PNG; redimensionada para até 1200 px.</span>
          </div>
          {manualImage && (
            <div className="manual-image-preview">
              <img src={manualImage} alt="Prévia do flashcard" />
              <button type="button" className="icon-btn" onClick={() => setManualImage(null)} aria-label="Remover imagem"><X size={17} /></button>
            </div>
          )}
          <Field label="Frente" hint="Opcional quando houver imagem."><textarea rows={3} value={manual.front} onChange={(e) => setManual({ ...manual, front: e.target.value })} placeholder="Pergunta ou instrução" /></Field>
          <Field label="Verso"><textarea rows={3} value={manual.back} onChange={(e) => setManual({ ...manual, back: e.target.value })} placeholder="Resposta ou estruturas" /></Field>
          <Button onClick={addManual} icon={Plus}>Criar cartão</Button>
        </Card>
      )}
      <InlineError>{error}</InlineError>
      {preview.length > 0 && (
        <>
          <div className="preview-bar"><strong>{preview.length} cartões para importar</strong><Button size="sm" onClick={importAll} icon={CheckCircle2}>Importar todos</Button></div>
          <div className="flash-preview">{preview.slice(0, 30).map((c, i) => <Card key={i} className="flash-preview-card">{c.image && <img className="flashcard-topic-image" src={c.image} alt={c.front || 'Imagem do flashcard'} />}<small>{c.deck}</small><strong>{c.front}</strong><p>{c.back}</p></Card>)}</div>
          {preview.length > 30 && <p className="muted-note">Mostrando os 30 primeiros.</p>}
        </>
      )}
      <Card className="battle-rules"><Layers size={18} /><div><strong>{user.flashcards.length} cartões no seu acervo</strong><p>O Pulso usa repetição espaçada e mantém os cartões offline. Você pode exportar tudo no backup em Ajustes.</p></div></Card>
    </>
  );
}
