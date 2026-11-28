import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Edit3, FileText, Pin, Plus, Search, Trash2 } from 'lucide-react';
import { Button, Card, Chip, Empty, Field, Modal, PageHead } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';
import { normalize } from '../../utils.js';

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function md(src) {
  const lines = escapeHtml(src).split('\n');
  let html = '';
  let list = false;
  for (const raw of lines) {
    let l = raw;
    l = l.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>');
    if (/^###\s/.test(l)) { if (list) { html += '</ul>'; list = false; } html += `<h4>${l.slice(4)}</h4>`; }
    else if (/^##\s/.test(l)) { if (list) { html += '</ul>'; list = false; } html += `<h3>${l.slice(3)}</h3>`; }
    else if (/^#\s/.test(l)) { if (list) { html += '</ul>'; list = false; } html += `<h2>${l.slice(2)}</h2>`; }
    else if (/^[-*]\s/.test(l)) { if (!list) { html += '<ul>'; list = true; } html += `<li>${l.slice(2)}</li>`; }
    else if (l.trim()) { if (list) { html += '</ul>'; list = false; } html += `<p>${l}</p>`; }
    else if (list) { html += '</ul>'; list = false; }
  }
  if (list) html += '</ul>';
  return html;
}

export default function Notes() {
  const { user, updateUser, curriculum, toast } = useStore();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('todas');
  const [open, setOpen] = useState(null);
  const [read, setRead] = useState(null);
  const topics = curriculum.areas.flatMap((a) => a.topics);
  const initTopic = params.get('topic');

  const blank = { id: '', title: '', body: '', tags: [], topicId: initTopic || '', pinned: false, createdAt: '' };
  const [draft, setDraft] = useState(blank);
  const tags = [...new Set(user.notes.flatMap((n) => n.tags || []))];

  const filtered = useMemo(() => user.notes.filter((n) => {
    if (tag !== 'todas' && !(n.tags || []).includes(tag)) return false;
    if (q && !normalize(`${n.title} ${n.body} ${(n.tags || []).join(' ')}`).includes(normalize(q))) return false;
    return true;
  }).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)), [user.notes, q, tag]);

  const edit = (note = blank) => { setDraft({ ...blank, ...note }); setOpen(true); };
  const save = () => {
    if (!draft.title.trim()) { toast('Dê um título à nota.', 'error'); return; }
    if (draft.id) {
      updateUser((prev) => ({ ...prev, notes: prev.notes.map((n) => n.id === draft.id ? { ...n, ...draft, updatedAt: new Date().toISOString() } : n) }));
    } else {
      updateUser((prev) => ({ ...prev, notes: [{ ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...prev.notes] }));
    }
    setOpen(false); toast('Nota salva.');
  };
  const togglePin = (id) => updateUser((prev) => ({ ...prev, notes: prev.notes.map((n) => n.id === id ? { ...n, pinned: !n.pinned } : n) }));
  const remove = (id) => { if (!confirm('Apagar esta nota?')) return; updateUser((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== id) })); setRead(null); };

  const exportNotes = () => {
    const text = user.notes.map((n) => `# ${n.title}\n\n${n.tags?.map((t) => `#${t}`).join(' ') || ''}\n\n${n.body}\n\n---\n`).join('\n');
    const blob = new Blob([text], { type: 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pulso-notas.md'; a.click();
  };

  return (
    <>
      <PageHead eyebrow="Pulso Notes" title="Anotações" subtitle="Notas em Markdown, com tags e vínculo a subtópicos. O que você escreve fica ao lado do que precisa revisar." actions={<><Button variant="soft" onClick={exportNotes} icon={Download}>Exportar</Button><Button onClick={() => edit()} icon={Plus}>Nova nota</Button></>} />
      <div className="radar-toolbar">
        <div className="filter-search"><Search size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nas notas" /></div>
        <div className="filter-scroll">{tags.map((t) => <button key={t} className={`chip ${tag === t ? 'chip-accent' : 'chip-neutral'}`} onClick={() => setTag(tag === t ? 'todas' : t)}>#{t}</button>)}</div>
      </div>
      {!filtered.length ? <Card><Empty icon={FileText} title="Caderno em branco" text="Crie uma nota a partir de um subtópico ou do zero." action={<Button onClick={() => edit()} icon={Plus}>Criar primeira nota</Button>} /></Card> : (
        <div className="notes-grid">
          {filtered.map((n) => {
            const topic = topics.find((t) => t.id === n.topicId);
            return (
              <Card key={n.id} className={`note-card ${n.pinned ? 'pinned' : ''}`}>
                <div className="note-head"><span className="eyebrow">{new Date(n.updatedAt).toLocaleDateString('pt-BR')}</span><div><button className="icon-btn" onClick={() => togglePin(n.id)} aria-label="Fixar"><Pin size={16} /></button><button className="icon-btn" onClick={() => edit(n)} aria-label="Editar"><Edit3 size={16} /></button></div></div>
                <h3 onClick={() => setRead(n)}>{n.title}</h3>
                <div className="note-preview" dangerouslySetInnerHTML={{ __html: md(n.body.slice(0, 420)) }} />
                <div className="note-tags">{topic && <Chip tone="accent">{topic.title}</Chip>}{n.tags.map((t) => <Chip key={t} tone="neutral">#{t}</Chip>)}</div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={draft.id ? 'Editar nota' : 'Nova nota'} size="lg">
        <Field label="Título"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus /></Field>
        <div className="form-2"><Field label="Subtópico (opcional)"><select value={draft.topicId} onChange={(e) => setDraft({ ...draft, topicId: e.target.value })}><option value="">Sem vínculo</option>{curriculum.areas.map((a) => <optgroup key={a.id} label={a.name}>{a.topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</optgroup>)}</select></Field><Field label="Tags (vírgula)"><input value={draft.tags.join(', ')} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></Field></div>
        <Field label="Conteúdo (Markdown)" hint="# título, **negrito**, listas com -"><textarea rows={14} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></Field>
        <div className="modal-actions"><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar nota</Button></div>
      </Modal>

      {read && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setRead(null); }}>
          <Card className="note-reader"><div className="note-head"><span className="eyebrow">Nota</span><div><button className="icon-btn" onClick={() => edit(read)}><Edit3 size={17} /></button><button className="icon-btn" onClick={() => remove(read.id)}><Trash2 size={17} /></button></div></div><h2>{read.title}</h2><div className="markdown" dangerouslySetInnerHTML={{ __html: md(read.body) }} /><Button variant="ghost" onClick={() => setRead(null)} icon={ArrowLeft}>Fechar</Button></Card>
        </div>
      )}
    </>
  );
}
