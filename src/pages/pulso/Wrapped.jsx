import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Download, Flame, Sparkles } from 'lucide-react';
import { Button, Card, Chip, Empty, PageHead, Ring, Segmented } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';
import { pct } from '../../utils.js';

export default function Wrapped() {
  const { user, curriculum, toast } = useStore();
  const [period, setPeriod] = useState('mes');
  const [slide, setSlide] = useState(0);

  const data = useMemo(() => {
    const now = new Date();
    const start = period === 'ano' ? new Date(now.getFullYear(), 0, 1) : new Date(now.getFullYear(), now.getMonth(), 1);
    const key = (s) => new Date(s).getTime() >= start.getTime();
    const acts = Object.entries(user.activity || {}).filter(([d]) => new Date(d) >= start);
    const attempts = user.attempts.filter((a) => key(a.createdAt));
    const right = attempts.filter((a) => a.correct).length;
    const minutes = acts.reduce((s, [, a]) => s + (a.minutes || 0), 0);
    const activeDays = acts.filter(([, a]) => (a.minutes || 0) + (a.questions || 0) + (a.checklist || 0) > 0).length;
    const byArea = curriculum.areas.map((a) => ({ a, n: attempts.filter((x) => x.area === a.id).length })).sort((x, y) => y.n - x.n);
    const topicCount = new Map();
    for (const t of attempts) topicCount.set(t.topicId, (topicCount.get(t.topicId) || 0) + 1);
    const topTopicId = [...topicCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const topic = curriculum.areas.flatMap((a) => a.topics).find((t) => t.id === topTopicId);
    return { attempts, right, minutes, activeDays, byArea, topic, start };
  }, [user.activity, user.attempts, period, curriculum]);

  const label = period === 'ano' ? new Date().getFullYear() : new Date().toLocaleDateString('pt-BR', { month: 'long' });
  const acc = pct(data.right, data.attempts.length);
  const area = data.byArea[0];

  const slides = [
    { kicker: 'Seu período', title: `${data.minutes} minutos de estudo.`, text: `Em ${label}, você esteve presente em ${data.activeDays} dias. Não é sobre perfeição: é sobre voltar.` },
    { kicker: 'Volume', title: `${data.attempts.length} questões respondidas.`, text: data.attempts.length ? `Precisão de ${acc}%. ${acc >= 70 ? 'Acima da meta — mantenha o nível.' : 'Abaixo da meta de 70%; revise os erros antes de aumentar volume.'}` : 'Ainda sem questões no período. Um treino curto já inicia a série.' },
    { kicker: 'Área mais treinada', title: area?.a.name || 'Sem dados', text: area?.n ? `${area.n} questões nesta área. Veja se a distribuição acompanha o peso do edital.` : 'Escolha uma área e faça o primeiro bloco.' },
    { kicker: 'Tema do período', title: data.topic?.title || 'Nenhum tema', text: data.topic ? 'Foi o subtópico mais recorrente nas suas questões. Ele está dominado ou só sendo evitado?' : 'Os temas aparecem conforme você treina.' },
    { kicker: 'Próximo ciclo', title: 'O que vem agora?', text: 'Escolha um tema frágil, agende uma revisão e proteja um bloco de foco. O próximo período começa na próxima ação.' },
  ];
  const s = slides[slide];

  const exportPng = () => {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#102e28'; ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = '#c94a21'; ctx.font = '700 24px sans-serif'; ctx.fillText('PRUMO · WRAPPED', 70, 110);
    ctx.fillStyle = '#f2eee4'; ctx.font = '700 68px Georgia'; ctx.fillText(s.title.slice(0, 22), 70, 700);
    if (s.title.length > 22) ctx.fillText(s.title.slice(22), 70, 780);
    ctx.fillStyle = 'rgba(242,238,228,.65)'; ctx.font = '400 30px sans-serif';
    const words = s.text.split(' '); let line = ''; let y = 900;
    for (const w of words) { if ((line + w).length > 38) { ctx.fillText(line, 70, y); line = ''; y += 44; } line += `${w} `; }
    ctx.fillText(line, 70, y);
    ctx.fillStyle = '#f2eee4'; ctx.font = '600 24px sans-serif'; ctx.fillText(`${label} · ${user.name || 'Estudante'}`, 70, 1240);
    const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'pulso-wrapped.png'; a.click();
    toast('Card exportado.');
  };

  return (
    <>
      <PageHead eyebrow="Pulso Wrapped" title={<>Seu período em <em>perspectiva.</em></>} subtitle="Uma retrospectiva honesta, sem gamificação vazia. Use para escolher o próximo ciclo — e compartilhar se quiser." actions={<><Button variant="soft" onClick={exportPng} icon={Download}>Exportar card</Button><Link to="/pulso" className="btn btn-ghost">Suíte</Link></>} />
      <div className="wrapped-toolbar"><Segmented options={[{ value: 'mes', label: 'Este mês' }, { value: 'ano', label: 'Este ano' }]} value={period} onChange={(v) => { setPeriod(v); setSlide(0); }} label="Período" /><Chip tone="soft">{label}</Chip></div>
      {!data.attempts.length && !data.minutes ? <Card><Empty icon={Sparkles} title="Período sem dados" text="Estude um pouco e volte: a retrospectiva é construída com atividade real." /></Card> : (
        <Card className="wrapped-card">
          <div className="wrapped-slide">
            <span className="eyebrow light">{s.kicker}</span>
            <h2>{s.title}</h2>
            <p>{s.text}</p>
            <div className="wrapped-stats"><span><Flame size={15} /> {data.activeDays} dias ativos</span><span>{data.attempts.length} questões</span><span>{data.minutes} min</span></div>
          </div>
          <div className="wrapped-nav"><Button variant="ghost-light" size="sm" onClick={() => setSlide((x) => Math.max(0, x - 1))} disabled={slide === 0} icon={ArrowLeft}>Anterior</Button><span>{slide + 1} / {slides.length}</span><Button variant="light" size="sm" onClick={() => setSlide((x) => Math.min(slides.length - 1, x + 1))} disabled={slide === slides.length - 1}>Próximo <ArrowRight size={14} /></Button></div>
        </Card>
      )}
      <div className="wrapped-grid">
        <Card><span className="eyebrow">Constância</span><Ring value={Math.min(100, data.activeDays * 8)} size={110} tone="accent"><strong>{data.activeDays}</strong><span>dias</span></Ring><p className="muted-note">Meta ilustrativa: 12 dias ativos por mês.</p></Card>
        <Card><span className="eyebrow">Precisão</span><Ring value={acc} size={110} tone={acc >= 70 ? 'green' : 'accent'}><strong>{data.attempts.length ? `${acc}%` : '—'}</strong><span>acertos</span></Ring><p className="muted-note">70% em questões inéditas é a meta de segurança.</p></Card>
        <Card><span className="eyebrow">Distribuição</span>{data.byArea.map(({ a, n }) => <div key={a.id} className="acc-row"><span>{a.short}</span><div className="progress"><span className="progress-fill progress-green" style={{ width: `${pct(n, Math.max(1, data.attempts.length))}%` }} /></div><strong>{n}</strong></div>)}</Card>
      </div>
    </>
  );
}
