import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Bell, BellOff, CalendarDays, Download, ExternalLink, Plus, Radar as RadarIcon,
  RefreshCw, Search, Trash2,
} from 'lucide-react';
import { api } from '../../api.js';
import { Button, Card, Chip, Empty, Field, InlineError, Modal, PageHead, Segmented, Spinner } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';
import { fmtDate, normalize } from '../../utils.js';

export default function Radar() {
  const { user, updateUser, toast } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('todos');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ exam: '', institution: '', uf: '', date: '', url: '', note: '' });

  const load = () => api.radarList().then((d) => setItems(d.items)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const toggleSave = (id) => {
    updateUser((prev) => ({ ...prev, radarSaved: prev.radarSaved.includes(id) ? prev.radarSaved.filter((x) => x !== id) : [...prev.radarSaved, id] }));
  };

  const check = async () => {
    setChecking(true); setError('');
    try {
      const d = await api.radarCheck();
      await load();
      toast(`${d.checked} fontes verificadas · ${d.changed} mudanças detectadas.`);
    } catch (e) { setError(e.message); } finally { setChecking(false); }
  };

  const add = async () => {
    if (!form.exam || !form.url) { setError('Informe nome e URL.'); return; }
    try {
      await api.radarAdd(form);
      setModal(false); setForm({ exam: '', institution: '', uf: '', date: '', url: '', note: '' }); await load(); toast('Fonte adicionada ao monitor.');
    } catch (e) { setError(e.message); }
  };

  const remove = async (id) => { await api.radarDelete(id); await load(); toast('Fonte removida.'); };

  const filtered = useMemo(() => items.filter((i) => {
    if (filter === 'salvos' && !user.radarSaved.includes(i.id)) return false;
    if (filter === 'mudou' && !i.changedAt) return false;
    if (q && !normalize(`${i.exam} ${i.institution} ${i.uf}`).includes(normalize(q))) return false;
    return true;
  }).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')), [items, filter, q, user.radarSaved]);

  const exportIcs = () => {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pulso//Radar//PT-BR'];
    for (const i of filtered.filter((x) => x.date)) {
      lines.push('BEGIN:VEVENT', `UID:${i.id}@pulso.radar`, `DTSTART;VALUE=DATE:${i.date.replaceAll('-', '')}`, `SUMMARY:${i.exam} (${i.institution})`, `DESCRIPTION:${i.note || ''}`, 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pulso-radar.ics'; a.click();
  };

  return (
    <>
      <PageHead
        eyebrow="Pulso Radar"
        title="Radar de editais"
        subtitle="Fontes oficiais e datas acompanhadas em um só painel. O monitor compara o conteúdo das páginas e marca mudanças desde a última verificação."
        actions={<><Button variant="soft" onClick={exportIcs} icon={Download}>ICS</Button><Button onClick={() => setModal(true)} icon={Plus}>Adicionar fonte</Button></>}
      />
      <div className="radar-toolbar">
        <div className="filter-search"><Search size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar instituição, exame, UF…" /></div>
        <Segmented options={[{ value: 'todos', label: 'Tudo' }, { value: 'salvos', label: 'Salvos' }, { value: 'mudou', label: 'Mudou' }]} value={filter} onChange={setFilter} label="Filtro" />
        <Button variant="ghost" size="sm" onClick={check} disabled={checking} icon={RefreshCw}>{checking ? <><Spinner /> Verificando…</> : 'Verificar agora'}</Button>
      </div>
      <InlineError>{error}</InlineError>
      {loading ? <Card><Spinner /> Carregando radar…</Card> : !filtered.length ? <Card><Empty icon={RadarIcon} title="Nada nesse filtro" text="Adicione uma fonte ou limpe a busca." /></Card> : (
        <div className="radar-list">
          {filtered.map((i) => (
            <Card key={i.id} className={`radar-card ${i.changedAt ? 'changed' : ''}`}>
              <div className="radar-date"><strong>{i.date ? fmtDate(i.date, { day: '2-digit' }) : '—'}</strong><span>{i.date ? fmtDate(i.date, { month: 'short' }) : 'sem data'}</span></div>
              <div className="radar-main">
                <div className="radar-title"><Chip tone={i.changedAt ? 'accent' : i.custom ? 'soft' : 'neutral'}>{i.uf}</Chip><strong>{i.exam}</strong>{i.changedAt && <Chip tone="danger">mudança detectada</Chip>}</div>
                <p>{i.institution} · {i.note}</p>
                <small>{i.checkedAt ? `Verificado em ${fmtDate(i.checkedAt, { day: '2-digit', month: 'short' })}` : 'Ainda não verificado'} {i.changedAt ? `· Mudou em ${fmtDate(i.changedAt)}` : ''}</small>
              </div>
              <div className="radar-actions">
                <button className="icon-btn" onClick={() => toggleSave(i.id)} aria-label="Salvar alerta">{user.radarSaved.includes(i.id) ? <Bell size={18} /> : <BellOff size={18} />}</button>
                <a className="icon-btn" href={i.url} target="_blank" rel="noreferrer" aria-label="Abrir fonte"><ExternalLink size={18} /></a>
                {i.custom && <button className="icon-btn" onClick={() => remove(i.id)} aria-label="Remover"><Trash2 size={18} /></button>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <Card className="battle-rules info"><CalendarDays size={18} /><div><strong>Sobre as datas</strong><p>Datas marcadas como “previsão” usam edições anteriores e podem mudar. Sempre confirme no edital oficial. O Radar não substitui o acompanhamento da banca.</p></div></Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Adicionar fonte ao radar">
        <Field label="Nome do exame/processo"><input value={form.exam} onChange={(e) => setForm({ ...form, exam: e.target.value })} placeholder="Ex.: Residência X 2027" /></Field>
        <div className="form-2"><Field label="Instituição"><input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></Field><Field label="UF"><input value={form.uf} maxLength={2} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></Field></div>
        <Field label="Data prevista (opcional)"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <Field label="URL oficial"><input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" /></Field>
        <Field label="Observação"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        <InlineError>{error}</InlineError>
        <div className="modal-actions"><Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button><Button onClick={add}>Adicionar</Button></div>
      </Modal>
    </>
  );
}
