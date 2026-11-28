import React, { useMemo } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Layers, ListChecks, NotebookPen, RefreshCw } from 'lucide-react';
import { Card, Chip, Ring } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { fmtDate, topicProgress, topicStatus } from '../utils.js';
import { topicLevel } from '../trilha.js';
import { stageStatus, topicCalibration, topicStage, TOPIC_STAGE_LABEL } from '../metodo.js';

export default function Topico() {
  const { topicId } = useParams();
  const { user, curriculum, questions } = useStore();

  const found = useMemo(() => {
    for (const area of curriculum.areas) {
      const topic = area.topics.find((item) => item.id === topicId);
      if (topic) return { area, topic };
    }
    return null;
  }, [curriculum, topicId]);

  if (!found) {
    return <Card><p>Tema não encontrado. <Link to="/trilha">Voltar à trilha.</Link></p></Card>;
  }

  const { area, topic: t } = found;
  const level = topicLevel(t.id);
  const progress = user.progress[t.id] || {};
  const pct = topicProgress(progress, t.checklist.length);
  const status = topicStatus(progress, t.checklist.length);
  const currentStage = topicStage(progress, t.checklist.length);
  const stages = stageStatus(progress, t.checklist.length);
  const cal = topicCalibration(user.progress, user.attempts, t.id);
  const related = questions.filter((q) => q.topicId === t.id);
  const topicCards = user.flashcards.filter((card) => (card.tags || []).includes(t.id));
  const guide = t.guide || {};

  const tabs = [
    { to: '', end: true, label: 'Conteúdo', icon: BookOpen },
    { to: 'flashcards', label: 'Flashcards', icon: Layers, badge: topicCards.length || null },
    { to: 'questoes', label: 'Questões', icon: ListChecks, badge: related.length || null },
    { to: 'notas', label: 'Anotações', icon: NotebookPen, badge: progress.note?.trim() ? '•' : null },
    { to: 'revisao', label: 'Revisão', icon: RefreshCw, badge: progress.nextReview ? fmtDate(progress.nextReview, { day: '2-digit', month: 'short' }) : null },
  ];

  return (
    <>
      <Link to="/trilha" className="back-link"><ArrowLeft size={15} /> Trilha · Nível {level.id} · {level.name}</Link>
      <header className="topic-head">
        <div>
          <div className="topic-head-chips">
            <Chip style={{ borderColor: area.color, color: area.color }}>{area.short}</Chip>
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

      <div className="topic-tabs-wrap">
        <nav className="topic-tabs" aria-label="Seções do tema">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to || 'conteudo'}
              to={`/conteudos/${t.id}${tab.to ? `/${tab.to}` : ''}`}
              end={tab.end}
              className={({ isActive }) => `topic-tab ${isActive ? 'active' : ''}`}
            >
              <tab.icon size={15} />
              <span>{tab.label}</span>
              {tab.badge != null && <span className="topic-tab-badge">{tab.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <Chip tone={currentStage === 'dominado' ? 'success' : 'accent'}>{TOPIC_STAGE_LABEL[currentStage]}</Chip>
      </div>

      <Outlet context={{ area, t, level, progress, pct, status, currentStage, stages, cal, related, topicCards, guide }} />
    </>
  );
}
