import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Brain, CheckCircle2, Clock3, RefreshCw, Shuffle, Timer } from 'lucide-react';
import { Button, Card, Chip } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { fmtDate, iso } from '../utils.js';
import { adaptiveReview, calibrationLabel } from '../metodo.js';
import { useTopic } from '../useTopic.js';
import TopicPageShell from '../components/TopicPageShell.jsx';

const RATINGS = [
  { n: 1, label: 'Esqueci' },
  { n: 2, label: 'Difícil' },
  { n: 3, label: 'Ok' },
  { n: 4, label: 'Bem' },
  { n: 5, label: 'Dominei' },
];

export default function TopicoRevisao() {
  const data = useTopic();
  const { setConfidence, reviewTopic, setTopicField, toast } = useStore();
  const navigate = useNavigate();
  if (!data.found) return <Card><p>Tema não encontrado. <Link to="/trilha">Voltar à trilha.</Link></p></Card>;
  const { t, progress, cal, stages } = data;

  const confidence = progress.confidence || 0;
  const nextReviewDate = progress.nextReview ? fmtDate(progress.nextReview, { day: '2-digit', month: 'long' }) : null;
  const reviewDue = progress.nextReview && progress.nextReview <= iso();

  const rateReview = (rating) => {
    const next = adaptiveReview(progress, rating);
    reviewTopic(t, rating);
    setConfidence(t, rating);
    toast(`Revisão registrada: ${next.interval} dia${next.interval > 1 ? 's' : ''}. Próxima em ${fmtDate(next.nextReview)}.`);
  };

  return (
    <TopicPageShell data={data} eyebrow="Metacognição" title="Revisão e calibração" subtitle={t.title}>
      <div className="topic-review-grid">
        <Card>
          <div className="section-head small">
            <div><span className="eyebrow">Metacognição</span><h2>Quanta confiança você tem?</h2></div>
            <Brain size={18} />
          </div>
          <p className="muted-note">Compare sua sensação de domínio com o acerto real. Confiança alta sem acerto é o sinal clássico de que a releitura enganou.</p>
          <div className="confidence">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={confidence >= n ? 'on' : ''} onClick={() => { setConfidence(t, n); toast('Confiança registrada.'); }} aria-label={`Confiança ${n} de 5`}>{n}</button>
            ))}
          </div>
          <div className="calibration-grid">
            <div><span>Confiança</span><strong>{cal.confidence != null ? `${cal.confidence}%` : '—'}</strong></div>
            <div><span>Acerto real</span><strong>{cal.accuracy != null ? `${cal.accuracy}%` : '—'}</strong></div>
          </div>
          <small>{calibrationLabel(cal.gap)}</small>
          {cal.total > 0 && <p className="muted-note">{cal.total} questão{cal.total > 1 ? 'ões' : ''} respondida{cal.total > 1 ? 's' : ''} neste tema.</p>}
        </Card>

        <Card>
          <div className="section-head small">
            <div><span className="eyebrow">Próxima volta</span><h2>Revisão espaçada</h2></div>
            {reviewDue ? <Chip tone="danger">vencida</Chip> : <Chip tone={stages.revisar === 'done' ? 'success' : 'neutral'}>{nextReviewDate || 'não agendada'}</Chip>}
          </div>
          <div className="review-status">
            <div><span>Próxima revisão</span><strong>{nextReviewDate || '—'}</strong></div>
            <div><span>Intervalo atual</span><strong>{progress.interval ? `${progress.interval} dia${progress.interval > 1 ? 's' : ''}` : '—'}</strong></div>
            <div><span>Repetições</span><strong>{progress.reps || 0}</strong></div>
          </div>
          <p className="muted-note">A nota abaixo ajusta o próximo intervalo. Notas baixas encurtam; notas altas espaçam.</p>
          <div className="review-rating">
            {RATINGS.map(({ n, label }) => {
              const next = adaptiveReview(progress, n);
              return (
                <button key={n} className={progress.lastRating === n ? 'active' : ''} onClick={() => rateReview(n)}>
                  <strong>{n}</strong><span>{label}</span><small>{next.interval} dia{next.interval > 1 ? 's' : ''}</small>
                </button>
              );
            })}
          </div>
          {progress.lastRating && <p className="muted-note">Última nota: {progress.lastRating}/5 · {progress.lastReview ? fmtDate(progress.lastReview) : ''}</p>}
          <Link to={`/conteudos/${t.id}`} className="text-link"><RefreshCw size={14} /> Ver checklist e conteúdo</Link>
        </Card>
      </div>

      <Card className="interleave-card">
        <div className="method-card-head">
          <span className="method-badge">05</span>
          <div><span className="eyebrow">Intercalar</span><h2>Misture com outros temas</h2></div>
          <Shuffle size={18} />
        </div>
        <p className="muted-note">Estudar só um bloco pode criar a ilusão de domínio. Misturar diagnósticos e condutas treina a discriminação que a prova exige.</p>
        <div className="related-actions">
          <Button variant="soft" onClick={() => { setTopicField(t.id, 'interleavedAt', new Date().toISOString()); navigate('/questoes/treino?modo=intercalado'); }} icon={Shuffle}>Treino intercalado</Button>
          <Button variant="ghost" onClick={() => navigate('/questoes/simulado')} icon={Timer}>Simulado misto</Button>
        </div>
      </Card>

      <Card className="side-card warm">
        <CheckCircle2 size={18} />
        <h3>Revisar não é reler</h3>
        <p>Feche o resumo, tente lembrar e só depois confira. Se a recuperação foi fácil demais, o intervalo pode aumentar; se foi difícil, ele deve encurtar.</p>
      </Card>

      <div className="topic-next-actions">
        <Link to={`/conteudos/${t.id}/questoes`} className="btn btn-soft">Recuperar com questões <ArrowRight size={15} /></Link>
        <Link to={`/conteudos/${t.id}`} className="btn btn-ghost"><Clock3 size={15} /> Voltar ao conteúdo</Link>
      </div>
    </TopicPageShell>
  );
}
