import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Check, Copy, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { Button, Card, Chip, Empty, PageHead } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';
import { fmtDate, fmtLong } from '../../utils.js';

export default function Connect() {
  const { user, toast } = useStore();
  const sessions = (user.plan.weeks || []).flatMap((w) => w.days.flatMap((d) => d.sessions.filter((s) => !s.done).map((s) => ({ ...s, date: d.date })))).slice(0, 10);
  const feed = `${location.origin}/api/calendar.ics`;

  const copy = async () => { await navigator.clipboard.writeText(feed); toast('URL local copiada. Para assinar no Google, o Pulso precisa estar acessível publicamente.'); };
  const download = () => { const a = document.createElement('a'); a.href = '/api/calendar.ics'; a.download = 'pulso.ics'; a.click(); };

  return (
    <>
      <PageHead eyebrow="Pulso Connect" title="Calendário" subtitle="Exporte as sessões como arquivo ICS, com alarme de 15 minutos. Importe no Google Calendar, Apple Calendar ou Outlook." actions={<Link to="/pulso" className="btn btn-ghost">Suíte</Link>} />
      <div className="connect-grid">
        <Card>
          <CalendarPlus size={28} /><h2>Planner para o calendário</h2>
          <p>O arquivo inclui apenas sessões futuras, com título, duração e lembrete. Sessões concluídas ficam de fora.</p>
          <Button onClick={download} icon={Download}>Baixar arquivo .ics</Button>
          <Button variant="soft" onClick={copy} icon={Copy}>Copiar URL do feed</Button>
          <div className="connect-steps">
            <div><span>1</span><p>Baixe o arquivo .ics.</p></div>
            <div><span>2</span><p>No Google Calendar, abra <strong>Configurações → Importar e exportar</strong>.</p></div>
            <div><span>3</span><p>Selecione o arquivo e escolha o calendário <strong>Pulso</strong>.</p></div>
            <div><span>4</span><p>Refaça o download após regerar o planner.</p></div>
          </div>
          <a className="btn btn-ghost" href="https://calendar.google.com/calendar/u/0/r/settings/export" target="_blank" rel="noreferrer">Abrir Google Calendar <ExternalLink size={14} /></a>
        </Card>
        <Card>
          <div className="section-head small"><div><span className="eyebrow">Prévia</span><h2>Próximas sessões</h2></div><Chip tone="soft">{sessions.length}</Chip></div>
          {sessions.length ? sessions.map((s) => <div key={s.id} className="calendar-row"><strong>{fmtDate(s.date)}</strong><div><span>{s.title}</span><small>{s.minutes} min · {s.type}</small></div></div>) : <Empty icon={CalendarPlus} title="Nada agendado" text="Gere o planner primeiro." action={<Link to="/planner" className="btn btn-soft">Abrir planner</Link>} />}
        </Card>
      </div>
      <Card className="battle-rules info"><RefreshCw size={18} /><div><strong>URL de assinatura</strong><p>O link <code>{feed}</code> funciona enquanto o servidor local estiver ligado. Em produção, pode ser usado como feed ao vivo no Google Calendar.</p></div></Card>
    </>
  );
}
