import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Circle, Clock3, ExternalLink,
  FileText, Lightbulb, ListChecks, NotebookPen, RefreshCw, Sparkles, Target, Network,
} from 'lucide-react';
import { Button, Card, Chip, Field, Modal, PageHead, Progress, Ring } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { fmtDate, topicProgress, topicStatus } from '../utils.js';

export default function Topico() {
  const { topicId } = useParams();
  const { user, curriculum, questions, toggleChecklist, setConfidence, setTopicNote, scheduleReview, toast } = useStore();
  const navigate = useNavigate();
  const [review, setReview] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const found = useMemo(() => {
    for (const a of curriculum.areas) {
      const t = a.topics.find((x) => x.id === topicId);
      if (t) return { a, t };
    }
    return null;
  }, [curriculum, topicId]);

  if (!found) return <Card><p>Tema não encontrado. <Link to="/conteudos">Voltar aos conteúdos.</Link></p></Card>;
  const { a, t } = found;
  const progress = user.progress[t.id] || {};
  const done = new Set(progress.done || []);
  const pct = topicProgress(progress, t.checklist.length);
  const status = topicStatus(progress, t.checklist.length);
  const related = questions.filter((q) => q.topicId === t.id).slice(0, 6);

  const toggle = (i) => {
    const wasDone = done.has(i);
    toggleChecklist(t, i);
    if (!wasDone && done.size + 1 === t.checklist.length) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 5000);
    }
  };

  const confidence = progress.confidence || 0;
  const searchBase = encodeURIComponent(`${t.title} diretriz brasileira`);
  const sources = [
    { label: 'Diretriz / consenso', href: `https://www.google.com/search?q=${searchBase}` },
    { label: 'Ministério da Saúde / BVS', href: `https://bvsms.saude.gov.br/bvs/publicacoes/` },
    { label: 'Prova anterior ENARE', href: `https://www.google.com/search?q=${encodeURIComponent(`ENARE questão ${t.title}`)}` },
  ];

  return (
    <>
      <Link to="/conteudos" className="back-link"><ArrowLeft size={15} /> Todos os conteúdos</Link>
      <header className="topic-head">
        <div>
          <div className="topic-head-chips">
            <Chip style={{ borderColor: a.color, color: a.color }}>{a.short}</Chip>
            <Chip tone="accent">incidência {t.incidence}%</Chip>
            <div className="weight-dots">{[1,2,3,4,5].map((i) => <i key={i} className={i <= t.weight ? 'on' : ''} />)}</div>
          </div>
          <h1>{t.title}</h1>
          <p>{t.summary}</p>
        </div>
        <Ring value={pct} size={104} stroke={8} tone={status === 'dominado' ? 'green' : 'accent'}>
          <strong>{pct}%</strong><span>etapas</span>
        </Ring>
      </header>

      {celebrate && <div className="celebrate"><Sparkles size={20} /><div><strong>Checklist concluído.</strong> Registre sua confiança e programe a próxima revisão.</div><Button size="sm" variant="light" onClick={() => setReview(true)}>Agendar</Button></div>}

      <div className="topic-layout">
        <section>
          <Card className="checklist-card">
            <div className="section-head small">
              <div><span className="eyebrow">Roteiro do subtópico</span><h2>Checklist de domínio</h2></div>
              <span className="muted-note">{done.size}/{t.checklist.length}</span>
            </div>
            <p className="muted-note">Marque somente depois de executar. A ordem foi desenhada para sair da teoria passiva e chegar a recuperação ativa.</p>
            <div className="checklist">
              {t.checklist.map((item, i) => {
                const checked = done.has(i);
                return (
                  <button key={i} className={`check-item ${checked ? 'checked' : ''}`} onClick={() => toggle(i)}>
                    <span className="check-box">{checked ? <Check size={15} /> : null}</span>
                    <span className="check-text">{item}</span>
                    {i === t.checklist.length - 1 && <Chip tone="soft"><RefreshCw size={11} /> revisão</Chip>}
                  </button>
                );
              })}
            </div>
            <div className="checklist-footer">
              <Progress value={pct} tone={pct === 100 ? 'green' : 'accent'} />
              <span>{pct === 100 ? 'Roteiro completo. Agora é revisar.' : `Faltam ${t.checklist.length - done.size} etapas.`}</span>
            </div>
          </Card>

          <Card className="keypoints-card">
            <div className="section-head small"><div><span className="eyebrow">Recorte de prova</span><h2>Pontos que você precisa dominar</h2></div><Lightbulb size={19} /></div>
            <ul>
              {t.keyPoints.map((kp) => <li key={kp}><CheckCircle2 size={15} /> {kp}</li>)}
            </ul>
            <p className="muted-note">Foque no foco central: {t.focus}.</p>
          </Card>

          <Card>
            <div className="section-head small"><div><span className="eyebrow">Recuperação ativa</span><h2>Questões do tema</h2></div><Chip>{related.length}</Chip></div>
            {related.length ? (
              <div className="related-list">
                {related.map((q) => (
                  <Link key={q.id} to={`/questoes?q=${q.id}`} className="mini-row"><span className="q-num">Q</span><span>{q.stem.slice(0, 110)}…</span><ArrowRight size={14} /></Link>
                ))}
              </div>
            ) : <p className="muted-note">Ainda não há questões deste subtópico. Importe provas ou gere uma com IA no banco de questões.</p>}
            <div className="related-actions">
              <Button variant="soft" onClick={() => navigate(`/questoes/treino?topic=${t.id}`)} icon={ListChecks}>Treinar este tema</Button>
              <Button variant="ghost" onClick={() => navigate('/questoes/importar')} icon={ExternalLink}>Buscar mais questões</Button>
              <Button variant="ghost" onClick={() => navigate(`/pulso/notes?topic=${t.id}`)} icon={NotebookPen}>Nova nota</Button>
              <Button variant="ghost" onClick={() => navigate('/pulso/blocks')} icon={Network}>Mapa mental</Button>
            </div>
          </Card>
        </section>

        <aside>
          <Card className="side-card">
            <span className="eyebrow">Autoavaliação</span>
            <h3>Quanta confiança você tem?</h3>
            <div className="confidence">
              {[1,2,3,4,5].map((n) => (
                <button key={n} className={confidence >= n ? 'on' : ''} onClick={() => { setConfidence(t, n); toast('Confiança registrada.'); }} aria-label={`Confiança ${n} de 5`}>{n}</button>
              ))}
            </div>
            <small>{confidence ? `Registrado: ${confidence}/5` : 'Seja honesto(a). Isso calibra o planner.'}</small>
            <Button variant="soft" size="sm" onClick={() => setReview(true)} icon={Clock3}>Agendar revisão</Button>
            {progress.nextReview && <p className="next-review">Próxima revisão: <strong>{fmtDate(progress.nextReview, { day: '2-digit', month: 'long' })}</strong></p>}
          </Card>

          <Card className="side-card">
            <span className="eyebrow">Fontes e apoio</span>
            <div className="resource-list">
              {sources.map((s) => <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="resource-row"><FileText size={15} /> {s.label} <ExternalLink size={13} /></a>)}
            </div>
            <p className="muted-note">Use diretrizes atualizadas e o manual do Ministério da Saúde como base.</p>
          </Card>

          <Card className="side-card">
            <span className="eyebrow">Anotações do tema</span>
            <Field hint="Salvo automaticamente neste navegador.">
              <textarea rows={8} value={progress.note || ''} onChange={(e) => setTopicNote(t.id, e.target.value)} placeholder="Pegadinhas, doses, critérios, links de aula…" />
            </Field>
          </Card>

          <Card className="side-card warm">
            <BookOpen size={18} />
            <h3>Regra das 3 passadas</h3>
            <p>Teoria no dia 1, questões no dia 2, erro corrigido no dia 7. A revisão não é reler: é tentar lembrar sem olhar.</p>
          </Card>
        </aside>
      </div>

      <Modal open={review} onClose={() => setReview(false)} title="Como foi sua recuperação?">
        <p>A nota define o intervalo da próxima revisão. Use a memória sem consultar o resumo.</p>
        <div className="recall-grid">
          {[
            [1, 'Esqueci', 'amanhã'], [2, 'Difícil', '3 dias'], [3, 'Ok', '7 dias'], [4, 'Bem', '15 dias'], [5, 'Dominei', '30 dias'],
          ].map(([n, label, interval]) => (
            <button key={n} onClick={() => { scheduleReview(t, [1,3,7,15,30][n - 1]); setConfidence(t, n); setReview(false); toast(`Revisão agendada para ${interval}.`); }}>
              <strong>{n}</strong><span>{label}</span><small>{interval}</small>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
