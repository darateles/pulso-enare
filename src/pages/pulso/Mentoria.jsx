import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, ClipboardCopy, Download, Send, UserRound, Users } from 'lucide-react';
import { Button, Card, Chip, Field, PageHead, Stat } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';
import { globalStats, weakTopics, minutesLabel, iso } from '../../utils.js';

export default function Mentoria() {
  const { user, curriculum, updateUser, toast } = useStore();
  const [note, setNote] = useState('');
  const [author, setAuthor] = useState('Mentor(a)');
  const stats = useMemo(() => globalStats(curriculum, user.progress), [curriculum, user.progress]);
  const weak = useMemo(() => weakTopics(curriculum, user.attempts, user.progress, 5), [curriculum, user.attempts]);
  const weekMinutes = Object.entries(user.activity || {}).filter(([d]) => Date.now() - new Date(d).getTime() < 7 * 86400000).reduce((s, [, a]) => s + (a.minutes || 0), 0);

  const report = `RELATÓRIO PARA MENTORIA — PRUMO\nAluno: ${user.name}\nData: ${new Date().toLocaleDateString('pt-BR')}\n\nCobertura do edital: ${stats.pct}%\nSubtópicos dominados: ${stats.mastered}/${stats.totalTopics}\nQuestões respondidas: ${user.attempts.length}\nPrecisão: ${user.attempts.length ? Math.round(user.attempts.filter((a) => a.correct).length / user.attempts.length * 100) : 0}%\nTempo de foco na semana: ${minutesLabel(weekMinutes)}\n\nLacunas prioritárias:\n${weak.map((w, i) => `${i + 1}. ${w.topic.title} — ${w.wrong} erros em ${w.total}`).join('\n') || 'Nenhuma registrada'}\n\nObservações do aluno:\n${user.mentorNotes.filter((n) => n.fromStudent).map((n) => n.text).join('\n') || '—'}`;

  const copy = async () => { await navigator.clipboard.writeText(report); toast('Relatório copiado.'); };
  const download = () => { const b = new Blob([report], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'pulso-relatorio-mentoria.txt'; a.click(); };
  const addNote = () => {
    if (!note.trim()) return;
    updateUser((prev) => ({ ...prev, mentorNotes: [{ id: crypto.randomUUID(), author, text: note.trim(), fromStudent: false, at: new Date().toISOString() }, ...prev.mentorNotes] }));
    setNote(''); toast('Devolutiva registrada.');
  };

  return (
    <>
      <PageHead eyebrow="Pulso Mentoria" title={<>Acompanhamento com <em>contexto.</em></>} subtitle="Gere um relatório claro para seu mentor, registre devolutivas e acompanhe check-ins. Integração com agenda será conectada ao plano Mentoria." actions={<Link to="/pulso" className="btn btn-ghost">Voltar à suíte</Link>} />
      <div className="mentor-grid">
        <Card className="mentor-card">
          <div className="avatar big"><UserRound size={28} /></div>
          <Chip tone="accent">Demonstração</Chip>
          <h2>Seu mentor</h2>
          <p>O Pulso gera o resumo; o mentor lê os dados e devolve prioridades. A sessão acontece fora da plataforma.</p>
          <Button variant="soft" onClick={copy} icon={ClipboardCopy}>Copiar relatório</Button>
          <Button variant="ghost" onClick={download} icon={Download}>Baixar .txt</Button>
          <a className="btn btn-ghost" href="mailto:mentor@exemplo.com?subject=Solicitar%20mentoria%20Pulso">Solicitar mentoria</a>
          <small className="muted-note">Contato fictício — ajuste depois.</small>
        </Card>
        <Card>
          <div className="section-head small"><div><span className="eyebrow">Check-in</span><h2>Próxima sessão</h2></div><CalendarCheck size={19} /></div>
          <div className="checkin-date"><strong>Segunda-feira</strong><span>20h · 45 min</span></div>
          <div className="stats-row two"><Stat label="Cobertura" value={`${stats.pct}%`} note="Edital" /><Stat label="Tempo semanal" value={minutesLabel(weekMinutes)} note="Foco" /></div>
          <p className="muted-note">Faltam {((8 - new Date().getDay()) % 7) || 7} dias. O mentor recebe o relatório com lacunas, adesão e volume.</p>
        </Card>
      </div>

      <div className="mentor-grid two">
        <Card>
          <span className="eyebrow">Devolutivas</span>
          <h2>Registrar orientação</h2>
          <Field label="Autor"><input value={author} onChange={(e) => setAuthor(e.target.value)} /></Field>
          <Field label="Orientação"><textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Prioridade combinada, ajuste de rotina, tema para a semana…" /></Field>
          <Button onClick={addNote} icon={Send}>Registrar</Button>
        </Card>
        <Card>
          <div className="section-head small"><span className="eyebrow">Histórico</span><Users size={17} /></div>
          {user.mentorNotes.length ? user.mentorNotes.map((n) => <div key={n.id} className="mentor-note"><strong>{n.author}</strong><p>{n.text}</p><small>{new Date(n.at).toLocaleDateString('pt-BR')}</small></div>) : <p className="muted-note">Nenhuma devolutiva registrada.</p>}
        </Card>
      </div>
      <Card className="battle-rules"><Users size={18} /><div><strong>Privacidade</strong><p>O relatório só é enviado quando você copia ou baixa. Nada sai da máquina automaticamente.</p></div></Card>
    </>
  );
}
