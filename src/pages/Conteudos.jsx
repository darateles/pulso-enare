import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BookMarked, CircleCheck, Filter, ListChecks, Search, Sparkles, Target,
} from 'lucide-react';
import { Button, Card, Chip, Empty, PageHead, Progress, Segmented } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { areaStats, dueReviews, normalize, topicProgress, topicStatus } from '../utils.js';
import { LEVELS, topicLevelId } from '../trilha.js';
import { TOPIC_STAGE_LABEL, topicStage } from '../metodo.js';

const STATUS = [
  { value: 'todos', label: 'Todos' },
  { value: 'prioridade', label: 'Prioridade' },
  { value: 'novo', label: 'Não iniciados' },
  { value: 'estudando', label: 'Em estudo' },
  { value: 'dominado', label: 'Dominados' },
  { value: 'revisao', label: 'Para revisar' },
];

export default function Conteudos() {
  const { user, curriculum } = useStore();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(params.get('status') || 'todos');
  const [areaFilter, setAreaFilter] = useState('todas');
  const [groupFilter, setGroupFilter] = useState('todos');
  const [levelFilter, setLevelFilter] = useState('todos');
  const due = useMemo(() => new Set(dueReviews(curriculum, user.progress).map((d) => d.topic.id)), [curriculum, user.progress]);

  const setStatusAndParams = (v) => {
    setStatus(v);
    if (v === 'todos') params.delete('status');
    else params.set('status', v);
    setParams(params, { replace: true });
  };

  const allTopics = curriculum.areas.flatMap((a) => a.topics.map((t) => ({ t, a })));
  const groups = useMemo(() => [...new Set(allTopics.filter(({ a }) => areaFilter === 'todas' || a.id === areaFilter).map(({ t }) => t.group).filter(Boolean))].sort(), [allTopics, areaFilter]);
  const filtered = useMemo(() => {
    const q = normalize(query);
    return allTopics
      .filter(({ t, a }) => {
        if (areaFilter !== 'todas' && a.id !== areaFilter) return false;
        if (groupFilter !== 'todos' && t.group !== groupFilter) return false;
        if (levelFilter !== 'todos' && topicLevelId(t.id) !== Number(levelFilter)) return false;
        const st = topicStatus(user.progress[t.id], t.checklist.length);
        if (status === 'revisao' && !due.has(t.id)) return false;
        if (['novo', 'estudando', 'dominado'].includes(status) && st !== status) return false;
        if (status === 'prioridade' && t.weight < 4) return false;
        if (q && !normalize(`${t.title} ${t.summary} ${a.name} ${t.keyPoints.join(' ')}`).includes(q)) return false;
        return true;
      })
      .sort((x, y) => (status === 'prioridade' ? y.t.weight - x.t.weight : 0) || x.t.title.localeCompare(y.t.title));
  }, [allTopics, areaFilter, groupFilter, levelFilter, status, query, user.progress, due]);

  return (
    <>
      <Link to="/conteudos" className="back-link"><ArrowLeft size={15} /> Conteúdos</Link>
      <PageHead
        eyebrow="Mapa do edital"
        title="Mapa do edital"
        subtitle="90 temas por área e especialidade. Marque apenas o que executou."
        actions={<Button variant="soft" onClick={() => setStatusAndParams('prioridade')} icon={Target}>Alta prioridade</Button>}
      />

      <div className="area-overview">
        {curriculum.areas.map((a) => {
          const s = areaStats(a, user.progress);
          return (
            <button key={a.id} className={`area-mini ${areaFilter === a.id ? 'active' : ''}`} onClick={() => { setAreaFilter(areaFilter === a.id ? 'todas' : a.id); setGroupFilter('todos'); }}>
              <span className="area-mini-top"><i style={{ background: a.color }} /> {a.short} <b>{a.weight}% da prova</b></span>
              <strong>{a.name}</strong>
              <span className="area-mini-numbers">{s.mastered} dominados · {s.started} iniciados</span>
              <Progress value={s.pct} tone="green" />
            </button>
          );
        })}
      </div>

      <Card className="filter-bar">
        <div className="filter-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar subtópico, palavra-chave…" /></div>
        <div className="filter-scroll"><Segmented options={STATUS} value={status} onChange={setStatusAndParams} label="Filtrar por status" /></div>
        {areaFilter !== 'todas' && <Chip tone="accent"><Filter size={12} /> {curriculum.areas.find((a) => a.id === areaFilter)?.short}</Chip>}
        {groups.length > 1 && <select className="group-select" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}><option value="todos">Todas as especialidades</option>{groups.map((g) => <option key={g} value={g}>{g}</option>)}</select>}
        <select className="group-select" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
          <option value="todos">Todos os níveis</option>
          {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
        </select>
        <span className="filter-count">{filtered.length} temas</span>
      </Card>

      {!filtered.length ? (
        <Card><Empty icon={ListChecks} title="Nenhum subtópico com esses filtros" text="Limpe a busca ou troque o status para ver mais temas." action={<Button variant="ghost" onClick={() => { setQuery(''); setStatusAndParams('todos'); setAreaFilter('todas'); setGroupFilter('todos'); setLevelFilter('todos'); }}>Limpar filtros</Button>} /></Card>
      ) : (
        <div className="topic-table">
          {filtered.map(({ t, a }) => {
            const st = topicStatus(user.progress[t.id], t.checklist.length);
            const stage = topicStage(user.progress[t.id], t.checklist.length);
            const p = topicProgress(user.progress[t.id], t.checklist.length);
            return (
              <Link to={`/conteudos/${t.id}`} key={t.id} className="topic-row">
                <span className="topic-area-bar" style={{ background: a.color }} />
                <div className="topic-main">
                  <div className="topic-line">
                    <strong>{t.title}</strong>
                    {due.has(t.id) && <Chip tone="danger">revisar</Chip>}
                    <Chip tone={stage === 'dominado' ? 'success' : stage === 'revisado' ? 'accent' : stage === 'recuperado' ? 'warning' : 'neutral'}>
                      {stage === 'dominado' && <CircleCheck size={12} />} {TOPIC_STAGE_LABEL[stage]}
                    </Chip>
                  </div>
                  <p>{t.summary}</p>
                  <div className="topic-meta"><span>{a.name}</span><span className="topic-group">{t.group}</span><span>Nível {topicLevelId(t.id)}</span><span>incidência {t.incidence}%</span><span>{t.checklist.length} etapas</span></div>
                </div>
                <div className="topic-weight">
                  <span>peso</span>
                  <div className="weight-dots">{[1,2,3,4,5].map((i) => <i key={i} className={i <= t.weight ? 'on' : ''} />)}</div>
                </div>
                <div className="topic-progress">
                  <Progress value={p} tone={st === 'dominado' ? 'green' : 'accent'} />
                  <span>{p}%</span>
                </div>
                <ArrowRight size={17} />
              </Link>
            );
          })}
        </div>
      )}

      <div className="content-note">
        <BookMarked size={18} />
        <p><strong>Como usar:</strong> estude a teoria, crie o resumo e os flashcards, resolva questões e refaça os erros. Ao concluir as 7 etapas, registre sua confiança. O tema entra na fila de revisão espaçada.</p>
      </div>
    </>
  );
}
