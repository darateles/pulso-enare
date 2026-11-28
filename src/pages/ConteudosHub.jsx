import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, GraduationCap, Layers, Library, ListChecks, Network, RefreshCw } from 'lucide-react';
import { Card, Chip, PageHead, Progress } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { dueReviews, groupBy, topicProgress } from '../utils.js';
import { currentLevel, levelStats } from '../trilha.js';
import { TOPIC_STAGE_LABEL, topicStage } from '../metodo.js';

export default function ConteudosHub() {
  const { user, curriculum } = useStore();
  const level = currentLevel(user);
  const levelData = useMemo(() => levelStats(curriculum, level.id, user.progress), [curriculum, level.id, user.progress]);
  const due = useMemo(() => dueReviews(curriculum, user.progress), [curriculum, user.progress]);

  const links = [
    { to: '/trilha', icon: GraduationCap, label: 'Trilha' },
    { to: '/planner', icon: CalendarDays, label: 'Planner' },
    { to: '/questoes', icon: Library, label: 'Questões' },
    { to: '/flashcards', icon: Layers, label: 'Flashcards' },
    { to: '/mapas', icon: Network, label: 'Mapas mentais' },
    { to: '/conteudos/mapa?status=revisao', icon: RefreshCw, label: `Revisões${due.length ? ` (${due.length})` : ''}` },
    { to: '/conteudos/mapa', icon: ListChecks, label: 'Mapa completo' },
  ];

  return (
    <>
      <PageHead
        eyebrow="Conteúdos"
        title="Conteúdos"
        subtitle={`Nível ${level.id} · ${level.name} · ${levelData.total} temas`}
      />

      <div className="content-links">
        {links.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="content-link"><Icon size={14} /> {label}</Link>
        ))}
      </div>

      {levelData.subjects.map(({ area, topics }) => {
        const groups = groupBy(topics, (topic) => topic.group || 'Geral');
        const mastered = topics.filter((topic) => topicStage(user.progress[topic.id], topic.checklist.length) === 'dominado').length;
        return (
          <section key={area.id} className="level-subject">
            <div className="level-subject-head">
              <span className="subject-dot" style={{ background: area.color }} />
              <div><h2>{area.name}</h2><span>{topics.length} temas · {mastered} dominados</span></div>
              <Chip tone="neutral">{area.short}</Chip>
            </div>
            {Object.entries(groups).map(([specialty, specialtyTopics]) => (
              <div key={specialty} className="specialty-block">
                <h3>{specialty}</h3>
                <div className="specialty-topics">
                  {specialtyTopics.map((topic) => {
                    const progress = user.progress[topic.id] || {};
                    const stage = topicStage(progress, topic.checklist.length);
                    const pct = topicProgress(progress, topic.checklist.length);
                    return (
                      <Link key={topic.id} to={`/conteudos/${topic.id}`} className="specialty-topic">
                        <span className="specialty-topic-main">
                          <strong>{topic.title}</strong>
                          <Progress value={pct} tone={stage === 'dominado' ? 'green' : 'accent'} />
                        </span>
                        <span className={`stage-label stage-${stage}`}>{TOPIC_STAGE_LABEL[stage]}</span>
                        <ArrowRight size={14} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {!levelData.subjects.length && (
        <Card><p className="muted-note">Nenhum tema cadastrado para este nível.</p></Card>
      )}
    </>
  );
}
