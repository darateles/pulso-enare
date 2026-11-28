import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, Chip, Ring } from '../components/ui.jsx';
import { fmtDate } from '../utils.js';
import { useTopic } from '../useTopic.js';
import TopicoConteudo from './TopicoConteudo.jsx';

export default function Topico() {
  const data = useTopic();
  if (!data.found) {
    return <Card><p>Tema não encontrado. <Link to="/trilha">Voltar à trilha.</Link></p></Card>;
  }

  const { area, t, level, pct, status, progress, topicCards, related } = data;

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

      <div className="topic-page-shortcuts">
        <Link to={`/conteudos/${t.id}/flashcards`} className="topic-shortcut">Flashcards <span>{topicCards.length}</span></Link>
        <Link to={`/conteudos/${t.id}/questoes`} className="topic-shortcut">Questões <span>{related.length}</span></Link>
        <Link to={`/conteudos/${t.id}/notas`} className="topic-shortcut">Anotações <span>{progress.note?.trim() ? '•' : '—'}</span></Link>
        <Link to={`/conteudos/${t.id}/revisao`} className="topic-shortcut">Revisão <span>{progress.nextReview ? fmtDate(progress.nextReview, { day: '2-digit', month: 'short' }) : 'agendar'}</span></Link>
      </div>

      <TopicoConteudo data={data} />
    </>
  );
}
