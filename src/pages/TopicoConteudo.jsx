import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpenCheck, Brain, Check, CheckCircle2, Clock, Layers, Repeat, Search,
  Shuffle, Sparkles, Target,
} from 'lucide-react';
import { Card, Chip, Field, Progress } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { STAGE_LABEL, STAGES, checklistStage } from '../metodo.js';

const STAGE_ICONS = { ativar: Brain, codificar: BookOpenCheck, recuperar: Target, revisar: Repeat, intercalar: Shuffle };

export default function TopicoConteudo({ data }) {
  const { t, progress, pct, stages } = data;
  const { toggleChecklist, setTopicField } = useStore();
  const [celebrate, setCelebrate] = useState(false);
  const done = new Set(progress.done || []);
  const guide = t.guide || {};

  const itemsByStage = (stageId) => t.checklist
    .map((text, index) => ({ text, index }))
    .filter(({ index }) => checklistStage(index, t.checklist.length) === stageId);

  const toggle = (index) => {
    const wasDone = done.has(index);
    toggleChecklist(t, index);
    if (!wasDone && done.size + 1 === t.checklist.length) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 6000);
    }
  };

  const search = (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  const sources = [
    { label: 'Diretriz / consenso', href: search(`${t.title} diretriz brasileira`) },
    { label: 'Revisão científica', href: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(t.title)}` },
    { label: 'Aula e mapa mental', href: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${t.title} aula medicina`)}` },
    { label: 'Questões ENAMED / ENARE', href: search(`${t.title} questão ENAMED ENARE`) },
    { label: 'Ministério da Saúde / BVS', href: 'https://bvsms.saude.gov.br/bvs/publicacoes/' },
  ];

  const renderCheckItem = ({ text, index }) => {
    const checked = done.has(index);
    return (
      <button key={index} className={`check-item ${checked ? 'checked' : ''}`} onClick={() => toggle(index)}>
        <span className="check-box">{checked ? <Check size={15} /> : null}</span>
        <span className="check-text">{text}</span>
        {index === t.checklist.length - 1 && <Chip tone="soft"><Repeat size={11} /> revisão</Chip>}
      </button>
    );
  };

  return (
    <div className="topic-content-single">
      <Card className="method-stepper">
        <div className="method-stepper-head">
          <div><span className="eyebrow">Ciclo de estudo</span><h2>Seu ciclo neste tema</h2></div>
          <Chip tone={stages.codificar === 'done' ? 'success' : 'accent'}>etapas do conteúdo</Chip>
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
      </Card>

      {celebrate && (
        <div className="celebrate">
          <Sparkles size={20} />
          <div><strong>Checklist concluído.</strong> Agora faça a revisão adaptativa na aba Revisão.</div>
        </div>
      )}

      <Card className="method-card">
        <div className="method-card-head">
          <span className="method-badge">01</span>
          <div><span className="eyebrow">Ativar</span><h2>Antes de estudar, tente responder</h2></div>
          <Chip tone={stages.ativar === 'done' ? 'success' : 'neutral'}>{stages.ativar === 'done' ? 'ativado' : '5 min'}</Chip>
        </div>
        <p className="muted-note">Não consulte o resumo. Responder errado agora prepara o cérebro para corrigir depois — é o conhecimento prévio ancorando o novo.</p>
        <ul className="activate-questions">
          {guide.questions?.map((question) => <li key={question}>{question}</li>)}
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
          <div><span className="eyebrow">Sequência</span><ol>{guide.sequence?.map((item) => <li key={item}>{item}</li>)}</ol></div>
          <div><span className="eyebrow">Perguntas-guia</span><ul>{guide.questions?.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
        <div className="guide-traps"><span className="eyebrow">Pegadinhas de prova</span><ul>{guide.traps?.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div className="guide-mastery"><span className="eyebrow">Só avance quando conseguir</span><ul>{guide.mastery?.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div className="method-keypoints">
          <span className="eyebrow">Pontos que você precisa dominar</span>
          <ul>{t.keyPoints.map((point) => <li key={point}><CheckCircle2 size={15} /> {point}</li>)}</ul>
        </div>
        <div className="guide-sources"><Search size={15} /><span>Onde buscar:</span>{sources.map((source) => <a key={source.label} href={source.href} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</div>
      </Card>

      <Card className="checklist-card">
        <div className="section-head small">
          <div><span className="eyebrow">Roteiro do subtópico</span><h2>Checklist de domínio</h2></div>
          <span className="muted-note">{done.size}/{t.checklist.length}</span>
        </div>
        <p className="muted-note">Marque somente depois de executar. As etapas de recuperação e revisão ficam nas abas próprias para você não misturar tudo.</p>
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

      <div className="topic-next-actions">
        <Link to={`/conteudos/${t.id}/flashcards`} className="btn btn-soft"><Layers size={15} /> Flashcards do tema</Link>
        <Link to={`/conteudos/${t.id}/questoes`} className="btn btn-ghost">Recuperar com questões <ArrowRight size={15} /></Link>
        <Link to={`/conteudos/${t.id}/revisao`} className="btn btn-ghost">Agendar revisão <ArrowRight size={15} /></Link>
      </div>
    </div>
  );
}
