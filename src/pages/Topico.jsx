import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BookOpen, Brain, Check, CheckCircle2, Clock, ExternalLink,
  Layers, ListChecks, Network, NotebookPen, Plus, RefreshCw, Repeat, Search,
  Shuffle, Sparkles, Target, Timer, BookOpenCheck,
} from 'lucide-react';
import { Button, Card, Chip, Field, Progress, Ring } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { fmtDate, iso, topicProgress, topicStatus } from '../utils.js';
import { topicLevel } from '../trilha.js';
import {
  STAGE_LABEL, STAGES, adaptiveReview, calibrationLabel, checklistStage, stageStatus,
  topicCalibration, topicStage, TOPIC_STAGE_LABEL,
} from '../metodo.js';

const STAGE_ICONS = { ativar: Brain, codificar: BookOpenCheck, recuperar: Target, revisar: Repeat, intercalar: Shuffle };

const RATINGS = [
  { n: 1, label: 'Esqueci' },
  { n: 2, label: 'Difícil' },
  { n: 3, label: 'Ok' },
  { n: 4, label: 'Bem' },
  { n: 5, label: 'Dominei' },
];

export default function Topico() {
  const { topicId } = useParams();
  const { user, curriculum, questions, updateUser, toggleChecklist, setConfidence, setTopicNote, reviewTopic, setTopicField, toast } = useStore();
  const navigate = useNavigate();
  const [celebrate, setCelebrate] = useState(false);

  const found = useMemo(() => {
    for (const a of curriculum.areas) {
      const t = a.topics.find((x) => x.id === topicId);
      if (t) return { a, t };
    }
    return null;
  }, [curriculum, topicId]);

  if (!found) return <Card><p>Tema não encontrado. <Link to="/trilha">Voltar à trilha.</Link></p></Card>;
  const { a, t } = found;
  const level = topicLevel(t.id);
  const progress = user.progress[t.id] || {};
  const done = new Set(progress.done || []);
  const pct = topicProgress(progress, t.checklist.length);
  const status = topicStatus(progress, t.checklist.length);
  const currentStage = topicStage(progress, t.checklist.length);
  const stages = stageStatus(progress, t.checklist.length);
  const cal = topicCalibration(user.progress, user.attempts, t.id);
  const related = questions.filter((q) => q.topicId === t.id).slice(0, 6);
  const topicCards = user.flashcards.filter((c) => (c.tags || []).includes(t.id));
  const guide = t.guide || {};

  const itemsByStage = (stageId) => t.checklist
    .map((text, index) => ({ text, index }))
    .filter(({ index }) => checklistStage(index, t.checklist.length) === stageId);

  const toggle = (i) => {
    const wasDone = done.has(i);
    toggleChecklist(t, i);
    if (!wasDone && done.size + 1 === t.checklist.length) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 6000);
    }
  };

  const rateReview = (rating) => {
    const next = adaptiveReview(progress, rating);
    reviewTopic(t, rating);
    setConfidence(t, rating);
    toast(`Revisão registrada: ${next.interval} dia${next.interval > 1 ? 's' : ''}. Próxima em ${fmtDate(next.nextReview)}.`);
  };

  const confidence = progress.confidence || 0;
  const search = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  const sources = [
    { label: 'Diretriz / consenso', href: search(`${t.title} diretriz brasileira`) },
    { label: 'Revisão científica', href: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(t.title)}` },
    { label: 'Aula e mapa mental', href: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${t.title} aula medicina`)}` },
    { label: 'Questões ENAMED / ENARE', href: search(`${t.title} questão ENAMED ENARE`) },
    { label: 'Ministério da Saúde / BVS', href: 'https://bvsms.saude.gov.br/bvs/publicacoes/' },
  ];

  const createDeck = () => {
    const existing = new Set(topicCards.map((c) => c.id));
    const cards = [
      { id: `tc-${t.id}-0`, front: `Quais são os pontos críticos e a conduta em ${t.title}?`, back: `${t.summary}\n\n${t.keyPoints.map((k) => `• ${k}`).join('\n')}`, deck: t.title, tags: [t.id, 'guia'], createdAt: new Date().toISOString() },
      ...t.keyPoints.map((k, i) => ({ id: `tc-${t.id}-${i + 1}`, front: `Explique e aplique: ${k}`, back: `${t.title} — ${t.summary}\n\nFoco: ${t.focus}.\n\nPegadinha: ${guide.traps?.[i % (guide.traps?.length || 1)] || 'compare critérios antes de decidir.'}`, deck: t.title, tags: [t.id, 'guia'], createdAt: new Date().toISOString() })),
    ].filter((c) => !existing.has(c.id));
    if (!cards.length) { toast('Este baralho já está completo.'); return; }
    updateUser((prev) => ({ ...prev, flashcards: [...cards, ...prev.flashcards] }));
    toast(`Baralho criado com ${cards.length} flashcards.`);
  };

  const renderCheckItem = ({ text, index }) => {
    const checked = done.has(index);
    return (
      <button key={index} className={`check-item ${checked ? 'checked' : ''}`} onClick={() => toggle(index)}>
        <span className="check-box">{checked ? <Check size={15} /> : null}</span>
        <span className="check-text">{text}</span>
        {index === t.checklist.length - 1 && <Chip tone="soft"><RefreshCw size={11} /> revisão</Chip>}
      </button>
    );
  };

  const nextReviewDate = progress.nextReview ? fmtDate(progress.nextReview, { day: '2-digit', month: 'long' }) : null;
  const reviewDue = progress.nextReview && progress.nextReview <= iso();

  return (
    <>
      <Link to="/trilha" className="back-link"><ArrowLeft size={15} /> Trilha · Nível {level.id} · {level.name}</Link>
      <header className="topic-head">
        <div>
          <div className="topic-head-chips">
            <Chip style={{ borderColor: a.color, color: a.color }}>{a.short}</Chip>
            <Chip tone="soft">{t.group}</Chip>
            <Chip tone="neutral">Nível {level.id} · {level.semesterLabel}</Chip>
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

      <Card className="method-stepper">
        <div className="method-stepper-head">
          <div><span className="eyebrow">Ciclo de estudo</span><h2>Seu ciclo neste tema</h2></div>
          <Chip tone={currentStage === 'dominado' ? 'success' : 'accent'}>{TOPIC_STAGE_LABEL[currentStage]}</Chip>
        </div>
        <div className="method-steps">
          {STAGES.map((stage) => {
            const state = stages[stage.id] || 'next';
            const Icon = STAGE_ICONS[stage.id] || Target;
            return (
              <div key={stage.id} className={`method-step ${state}`}>
                <span className="method-step-icon"><Icon size={16} /></span>
                <div><strong>{stage.label}</strong><small>{state === 'done' ? 'concluído' : state === 'current' ? 'agora' : 'depois'}</small></div>
              </div>
            );
          })}
        </div>
        <p className="muted-note">A ordem importa: tentar lembrar antes de reler é o que fortalece a memória. “Intercalar” acontece nos treinos mistos.</p>
      </Card>

      {celebrate && (
        <div className="celebrate">
          <Sparkles size={20} />
          <div><strong>Checklist concluído.</strong> Registre sua confiança e faça a revisão adaptativa para fechar o ciclo.</div>
        </div>
      )}

      <div className="topic-layout">
        <section>
          <Card className="method-card">
            <div className="method-card-head">
              <span className="method-badge">01</span>
              <div><span className="eyebrow">Ativar</span><h2>Antes de estudar, tente responder</h2></div>
              <Chip tone={stages.ativar === 'done' ? 'success' : 'neutral'}>{stages.ativar === 'done' ? 'ativado' : '5 min'}</Chip>
            </div>
            <p className="muted-note">Não consulte o resumo. Responder errado agora prepara o cérebro para corrigir depois — é o conhecimento prévio ancorando o novo.</p>
            <ul className="activate-questions">
              {guide.questions?.map((q) => <li key={q}>{q}</li>)}
            </ul>
            <Field label="Sua hipótese (opcional, mas ajuda)">
              <textarea rows={3} value={progress.activation || ''} onChange={(e) => setTopicField(t.id, 'activation', e.target.value)} placeholder="O que você já sabe? Onde trava? Qual conduta parece mais provável?" />
            </Field>
          </Card>

          <Card className="method-card">
            <div className="method-card-head">
              <span className="method-badge">02</span>
              <div><span className="eyebrow">Codificar</span><h2>Entenda, elabore e conecte</h2></div>
              <span className="guide-time"><Clock size={14} /> ~{guide.minutes || 45} min</span>
            </div>
            <p className="guide-objective"><strong>Objetivo:</strong> {guide.objective || `Dominar ${t.focus}.`}</p>
            <div className="guide-cols">
              <div><span className="eyebrow">Sequência</span><ol>{guide.sequence?.map((x) => <li key={x}>{x}</li>)}</ol></div>
              <div><span className="eyebrow">Perguntas-guia</span><ul>{guide.questions?.map((x) => <li key={x}>{x}</li>)}</ul></div>
            </div>
            <div className="guide-traps"><span className="eyebrow">Pegadinhas de prova</span><ul>{guide.traps?.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div className="guide-mastery"><span className="eyebrow">Só avance quando conseguir</span><ul>{guide.mastery?.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div className="method-keypoints">
              <span className="eyebrow">Pontos que você precisa dominar</span>
              <ul>{t.keyPoints.map((kp) => <li key={kp}><CheckCircle2 size={15} /> {kp}</li>)}</ul>
            </div>
            <div className="guide-sources"><Search size={15} /><span>Onde buscar:</span>{sources.map((s) => <a key={s.label} href={s.href} target="_blank" rel="noreferrer">{s.label} ↗</a>)}</div>
          </Card>

          <Card className="checklist-card">
            <div className="section-head small">
              <div><span className="eyebrow">Roteiro do subtópico</span><h2>Checklist de domínio</h2></div>
              <span className="muted-note">{done.size}/{t.checklist.length}</span>
            </div>
            <p className="muted-note">Marque somente depois de executar. A ordem foi desenhada para sair da teoria passiva e chegar à recuperação ativa.</p>
            <div className="checklist">
              {['codificar', 'recuperar', 'revisar'].map((stageId) => {
                const items = itemsByStage(stageId);
                return (
                  <div key={stageId} className="checklist-stage">
                    <div className="checklist-stage-head">
                      <span className={`stage-dot ${stages[stageId]}`} />
                      <span className="eyebrow">{STAGE_LABEL[stageId]}</span>
                      <small>{items.filter(({ index }) => done.has(index)).length}/{items.length}</small>
                    </div>
                    {items.map(renderCheckItem)}
                  </div>
                );
              })}
            </div>
            <div className="checklist-footer">
              <Progress value={pct} tone={pct === 100 ? 'green' : 'accent'} />
              <span>{pct === 100 ? 'Roteiro completo. Agora é revisar.' : `Faltam ${t.checklist.length - done.size} etapas.`}</span>
            </div>
          </Card>

          <Card className="method-card" id="recuperar">
            <div className="method-card-head">
              <span className="method-badge">03</span>
              <div><span className="eyebrow">Recuperar</span><h2>Feche o material e tente lembrar</h2></div>
              <Chip tone={stages.recuperar === 'done' ? 'success' : 'neutral'}>{related.length} questões</Chip>
            </div>
            <div className="recall-box">
              <strong>Brain dump de 2 minutos</strong>
              <p>Sem consultar: qual é o problema clínico, o que muda o desfecho e qual é a pegadinha de prova? Escreva tudo que lembrar.</p>
              <textarea rows={4} value={progress.brainDump || ''} onChange={(e) => setTopicField(t.id, 'brainDump', e.target.value)} placeholder="Escreva sem olhar o resumo. Depois compare com os pontos-chave." />
            </div>
            <div className="related-list">
              {related.length ? related.map((q) => (
                <Link key={q.id} to={`/questoes?q=${q.id}`} className="mini-row"><span className="q-num">Q</span><span>{q.stem.slice(0, 110)}…</span><ArrowRight size={14} /></Link>
              )) : <p className="muted-note">Ainda não há questões deste subtópico. Importe provas ou gere uma com IA no banco de questões.</p>}
            </div>
            <div className="related-actions">
              <Button variant="soft" onClick={() => navigate(`/questoes/treino?topic=${t.id}`)} icon={ListChecks}>Treinar este tema</Button>
              <Button variant="ghost" onClick={() => navigate('/questoes/importar')} icon={ExternalLink}>Buscar mais questões</Button>
              <Button variant="ghost" onClick={() => navigate(`/pulso/notes?topic=${t.id}`)} icon={NotebookPen}>Nova nota</Button>
              <Button variant="ghost" onClick={() => navigate('/pulso/blocks')} icon={Network}>Mapa mental</Button>
            </div>
          </Card>

          <Card className="method-card" id="revisar">
            <div className="method-card-head">
              <span className="method-badge">04</span>
              <div><span className="eyebrow">Revisar</span><h2>Volte no intervalo certo</h2></div>
              {reviewDue ? <Chip tone="danger">vencida</Chip> : <Chip tone={stages.revisar === 'done' ? 'success' : 'neutral'}>{nextReviewDate || 'não agendada'}</Chip>}
            </div>
            <div className="review-status">
              <div><span>Próxima revisão</span><strong>{nextReviewDate || '—'}</strong></div>
              <div><span>Intervalo atual</span><strong>{progress.interval ? `${progress.interval} dia${progress.interval > 1 ? 's' : ''}` : '—'}</strong></div>
              <div><span>Repetições</span><strong>{progress.reps || 0}</strong></div>
            </div>
            <p className="muted-note">A nota abaixo ajusta o próximo intervalo. 1 = esqueci; 5 = dominei. Notas baixas encurtam; notas altas espaçam.</p>
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
          </Card>

          <Card className="method-card interleave-card">
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
        </section>

        <aside>
          <Card className="side-card">
            <span className="eyebrow">Metacognição</span>
            <h3>Quanta confiança você tem?</h3>
            <div className="confidence">
              {[1,2,3,4,5].map((n) => (
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

          <Card className="side-card">
            <span className="eyebrow">Flashcards do tema</span>
            <h3>{topicCards.length ? `${topicCards.length} cartões criados` : 'Memória ativa'}</h3>
            <p className="muted-note">Baralho específico deste subtópico, com critérios e pegadinhas.</p>
            <Button variant="soft" size="sm" onClick={createDeck} icon={topicCards.length ? RefreshCw : Plus}>{topicCards.length ? 'Completar baralho' : 'Criar baralho do tema'}</Button>
            {topicCards.length > 0 && <Link to={`/pulso/flashcards?deck=${encodeURIComponent(t.title)}`} className="btn btn-ghost btn-sm"><Layers size={14} /> Revisar cartões</Link>}
          </Card>

          <Card className="side-card">
            <span className="eyebrow">Anotações do tema</span>
            <Field hint="Salvo automaticamente na sua conta.">
              <textarea rows={8} value={progress.note || ''} onChange={(e) => setTopicNote(t.id, e.target.value)} placeholder="Pegadinhas, doses, critérios, links de aula…" />
            </Field>
          </Card>

          <Card className="side-card warm">
            <BookOpen size={18} />
            <h3>Recuperação &gt; releitura</h3>
            <p>Se você só releu, ainda não testou a memória. Feche o resumo, escreva o que lembra e só depois confira. O esforço de lembrar é o que consolida.</p>
          </Card>
        </aside>
      </div>
    </>
  );
}
