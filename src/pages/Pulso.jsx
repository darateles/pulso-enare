import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, CalendarPlus, CloudOff, FileUp, FlaskConical, Headphones,
  MessageSquareQuote, Network, NotebookPen, Pill, Radar, ScanEye, ScrollText,
  Sparkles, Swords, Timer, Trophy, Users,
} from 'lucide-react';
import { PageHead } from '../components/ui.jsx';
import { CATEGORIES, MODULES } from '../pulso/modules.js';

const ICONS = {
  Timer, Swords, Trophy, Radar, ScrollText, ScanEye, Activity, Pill, FlaskConical,
  NotebookPen, Network, Headphones, MessageSquareQuote, Users, Sparkles, FileUp,
  CalendarPlus, CloudOff,
};

export default function Pulso() {
  return (
    <>
      <PageHead
        eyebrow="Ferramentas"
        title="Ferramentas de IA"
        subtitle="Atalhos clínicos e de estudo conectados ao seu progresso."
      />

      {CATEGORIES.map((category) => {
        const items = MODULES.filter((module) => module.tag === category.id);
        if (!items.length) return null;
        return (
          <section key={category.id} className="pulse-section">
            <div className="section-head small">
              <div><span className="eyebrow">{category.desc}</span><h2>{category.label}</h2></div>
              <span className="muted-note">{items.length} ferramentas</span>
            </div>
            <div className="pulse-grid">
              {items.map((module) => {
                const Icon = ICONS[module.icon] || Sparkles;
                return (
                  <Link key={module.id} to={module.path} className="pulse-card">
                    <span className="pulse-icon" style={{ background: `${module.color}18`, color: module.color }}><Icon size={21} /></span>
                    <div>
                      <div className="pulse-title"><strong>{module.name}</strong></div>
                      <p>{module.desc}</p>
                    </div>
                    <ArrowRight size={16} className="pulse-arrow" />
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
