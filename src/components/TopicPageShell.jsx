import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Chip, Ring } from './ui.jsx';

/** Cabeçalho próprio das páginas de Flashcards, Questões, Notas e Revisão. */
export default function TopicPageShell({ data, eyebrow, title, subtitle, children }) {
  const { t, area, level, pct, status } = data;
  return (
    <div className="topic-section-page">
      <Link to={`/conteudos/${t.id}`} className="back-link"><ArrowLeft size={15} /> Conteúdo do tema</Link>
      <header className="topic-section-head">
        <div>
          <div className="topic-head-chips">
            <Chip style={{ borderColor: area.color, color: area.color }}>{area.short}</Chip>
            <Chip tone="soft">{t.group}</Chip>
            <Chip tone="neutral">Nível {level.id}</Chip>
          </div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{subtitle || t.title}</p>
        </div>
        <Ring value={pct} size={92} stroke={7} tone={status === 'dominado' ? 'green' : 'accent'}>
          <strong>{pct}%</strong><span>etapas</span>
        </Ring>
      </header>
      {children}
    </div>
  );
}
