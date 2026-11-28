import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CalendarDays, GraduationCap, Layers, Library, ListChecks, Network, RefreshCw, Target,
} from 'lucide-react';
import { Card, Chip, PageHead, Progress } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { dueReviews, groupBy, topicProgress } from '../utils.js';
import { LEVELS, currentLevel, topicLevelId } from '../trilha.js';
import { TOPIC_STAGE_LABEL, topicStage } from '../metodo.js';

export default function ConteudosHub() {
  const { user, curriculum } = useStore();
  const [levelFilter, setLevelFilter] = useState('todos');
  const level = currentLevel(user);
  const due = useMemo(() => dueReviews(curriculum, user.progress), [curriculum, user.progress]);
  const difficultyGroups = useMemo(() => new Set(user.difficultyGroups || []), [user.difficultyGroups]);
  const allTopics = useMemo(
    () => curriculum.areas.flatMap((area) => area.topics.map((topic) => ({ area, topic }))),
    [curriculum],
  );
  const effectiveLevel = levelFilter === 'meu' ? level.id : levelFilter === 'todos' ? null : Number(levelFilter);
  const visibleAreas = useMemo(() => curriculum.areas
    .map((area) => ({
      area,
      topics: area.topics.filter((topic) => !effectiveLevel || topicLevelId(topic.id) === effectiveLevel),
    }))
    .filter((item) => item.topics.length), [curriculum, effectiveLevel]);
  const visibleCount = visibleAreas.reduce((sum, item) => sum + item.topics.length, 0);

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
        subtitle={`Todos os ${allTopics.length} temas liberados · Nível de referência ${level.code} · ${level.name}`}
      />

      <div className="content-links">
        {links.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="content-link"><Icon size={14} /> {label}</Link>
        ))}
      </div>

      <Card className="content-hub-filter">
        <div>
          <span className="eyebrow">Biblioteca completa</span>
          <p className="muted-note">Todos os temas estão disponíveis. Use o nível apenas como filtro de organização.</p>
        </div>
        <div className="content-hub-filter-actions">
          <span className="filter-count">{visibleCount} temas</span>
          <select className="group-select" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="todos">Todos os níveis</option>
            <option value="meu">Meu nível · {level.code}</option>
            {LEVELS.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
          </select>
        </div>
      </Card>

      {visibleAreas.map(({ area, topics }) => {
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
                        {difficultyGroups.has(topic.group) && <Chip tone="accent"><Target size={11} /> foco</Chip>}
                        <Chip tone="soft">{`N${topicLevelId(topic.id)}`}</Chip>
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

      {!visibleAreas.length && (
        <Card><p className="muted-note">Nenhum tema neste nível.</p></Card>
      )}
    </>
  );
}
