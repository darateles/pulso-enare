import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from './store.jsx';
import { topicLevel } from './trilha.js';
import { stageStatus, topicCalibration, topicStage } from './metodo.js';
import { topicProgress, topicStatus } from './utils.js';

/** Dados compartilhados pelas páginas separadas de um tema. */
export function useTopic() {
  const { topicId } = useParams();
  const { user, curriculum, questions } = useStore();

  const found = useMemo(() => {
    for (const area of curriculum.areas) {
      const topic = area.topics.find((item) => item.id === topicId);
      if (topic) return { area, topic };
    }
    return null;
  }, [curriculum, topicId]);

  if (!found) return { found: false };

  const { area, topic: t } = found;
  const level = topicLevel(t.id);
  const progress = user.progress[t.id] || {};
  const pct = topicProgress(progress, t.checklist.length);
  const status = topicStatus(progress, t.checklist.length);

  return {
    found: true,
    area,
    t,
    level,
    progress,
    pct,
    status,
    currentStage: topicStage(progress, t.checklist.length),
    stages: stageStatus(progress, t.checklist.length),
    cal: topicCalibration(user.progress, user.attempts, t.id),
    related: questions.filter((question) => question.topicId === t.id),
    topicCards: user.flashcards.filter((card) => (card.tags || []).includes(t.id)),
    guide: t.guide || {},
  };
}
