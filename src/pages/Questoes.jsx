import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, Bookmark, Clock3, Filter, Flame, Import, Library, Play, Search, Sparkles, Target,
} from 'lucide-react';
import { Button, Card, Chip, Empty, Field, PageHead, Progress, Segmented, Stat } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import QuestionPlayer, { Results } from '../components/QuestionPlayer.jsx';
import { normalize, pct, shuffle, weightedPick, weakTopics } from '../utils.js';
import { accuracyByArea } from '../utils.js';

const MODES = [{ value: 'treino', label: 'Treinar' }, { value: 'rapido', label: 'Rápido' }];
const STATUS = [{ value: 'novas', label: 'Não respondidas' }, { value: 'todas', label: 'Todas' }, { value: 'erradas', label: 'Meus erros' }, { value: 'salvas', label: 'Salvas' }];

export default function Questoes() {
  const { user, curriculum, questions } = useStore();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const singleId = params.get('q');
  const [area, setArea] = useState('todas');
  const [topic, setTopic] = useState(params.get('topic') || 'todas');
  const [status, setStatus] = useState(params.get('status') || 'novas');
  const [count, setCount] = useState(10);
  const [mode, setMode] = useState(params.get('modo') || 'treino');
  const [pool, setPool] = useState(null);
  const [results, setResults] = useState(null);

  const answered = useMemo(() => new Map(user.attempts.map((a) => [a.questionId, a])), [user.attempts]);
  const wrongSet = useMemo(() => new Set(user.attempts.filter((a) => a.correct === false).map((a) => a.questionId)), [user.attempts]);
  const topics = area === 'todas' ? [] : curriculum.areas.find((a) => a.id === area)?.topics || [];
  const sample = useMemo(() => questions.filter((q) => q.status !== 'annulled' && !answered.has(q.id)).slice(-5).reverse(), [questions, answered]);

  const pick = () => {
    let arr = questions.filter((q) => {
      if (q.status === 'annulled') return false;
      if (area !== 'todas' && q.area !== area) return false;
      if (topic !== 'todas' && q.topicId !== topic) return false;
      if (status === 'novas' && answered.has(q.id)) return false;
      if (status === 'erradas' && !wrongSet.has(q.id)) return false;
      if (status === 'salvas' && !user.bookmarks.includes(q.id)) return false;
      return true;
    });
    if (!arr.length) return;
    const n = mode === 'rapido' ? Math.min(10, arr.length) : Math.min(count, arr.length);
    const picked = [];
    // Metade prioriza lacunas, metade prioriza incidência.
    const weak = weakTopics(curriculum, user.attempts, user.progress, 25);
    const weakIds = new Set(weak.map((x) => x.topic.id));
    for (let i = 0; i < n; i++) {
      const topicMeta = (q) => curriculum.areas.flatMap((a) => a.topics).find((t) => t.id === q.topicId);
      const chosen = weightedPick(arr, (q) => {
        const t = topicMeta(q);
        return (t?.weight || 2) * (weakIds.has(q.topicId) ? 3 : 1) * (answered.has(q.id) ? 0.4 : 1.5);
      });
      if (!chosen) break;
      picked.push(chosen);
      arr = arr.filter((q) => q.id !== chosen.id);
    }
    setPool(shuffle(picked));
    setResults(null);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (singleId) {
    const q = questions.find((x) => x.id === singleId);
    if (!q) return <Card><p>Questão não encontrada.</p></Card>;
    return (
      <QuestionPlayer
        pool={[q]} single onClose={() => { params.delete('q'); setParams(params, { replace: true }); }}
        onFinish={(r) => setResults(r)}
      />
    );
  }

  if (pool && !results) {
    return <QuestionPlayer pool={pool} mode={mode} onFinish={setResults} />;
  }
  if (results) {
    return <Results data={results} onRestart={() => { setPool(null); setResults(null); }} />;
  }

  const accAreas = accuracyByArea(curriculum, user.attempts).filter((a) => a.total);

  return (
    <>
      <PageHead
        eyebrow="Banco de questões"
        title={<>Treine o que <em>realmente cai.</em></>}
        subtitle="300+ questões oficiais do ENARE com comentário. Filtre por área, subtópico e incidência; o treino prioriza suas lacunas."
        actions={<><Button variant="soft" onClick={() => navigate('/questoes/simulado')} icon={Clock3}>Simulado</Button><Button onClick={() => navigate('/questoes/importar')} icon={Import}>Importar</Button></>}
      />

      <div className="stats-row">
        <Stat label="Questões no banco" value={questions.length} note={`${questions.filter((q) => q.source?.ai).length} geradas por IA`} />
        <Stat label="Resolvidas" value={user.attempts.length} note={`${pct(user.attempts.filter((a) => a.correct).length, user.attempts.length)}% de acerto`} />
        <Stat label="Salvas" value={user.bookmarks.length} note="Para revisar depois" />
        <Stat label="Erros pendentes" value={wrongSet.size} note="No caderno de erros" tone="alert" />
      </div>

      <div className="question-layout">
        <Card className="trainer-config">
          <div className="section-head small"><div><span className="eyebrow">Novo treino</span><h2>Monte o recorte</h2></div><Target size={19} /></div>
          <div className="config-grid">
            <Field label="Área">
              <select value={area} onChange={(e) => { setArea(e.target.value); setTopic('todas'); }}>
                <option value="todas">Todas as áreas</option>
                {curriculum.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Subtópico">
              <select value={topic} onChange={(e) => setTopic(e.target.value)} disabled={area === 'todas'}>
                <option value="todas">Todos do recorte</option>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Situação das questões"><Segmented options={STATUS} value={status} onChange={setStatus} label="Situação" /></Field>
          <div className="config-grid">
            <Field label="Modo"><Segmented options={MODES} value={mode} onChange={setMode} label="Modo" /></Field>
            <Field label="Quantidade">
              <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[5, 10, 20, 30, 50].map((n) => <option key={n} value={n}>{n} questões</option>)}
              </select>
            </Field>
          </div>
          <div className="trainer-summary">
            <Flame size={16} />
            <span>{mode === 'rapido' ? 'Treino rápido de 10 questões, priorizando lacunas e incidência.' : 'O sorteio equilibra alta incidência e temas com erro recente.'}</span>
          </div>
          <Button onClick={pick} icon={Play} className="wide">Começar treino</Button>
        </Card>

        <div className="question-side">
          <Card className="side-card">
            <div className="section-head small"><span className="eyebrow">Precisão</span><span>{accAreas.reduce((s, a) => s + a.total, 0)} respostas</span></div>
            {accAreas.length ? accAreas.map(({ area: a, pct: p, total }) => (
              <div key={a.id} className="acc-row"><span>{a.short}</span><Progress value={p} tone={p < 55 ? 'accent' : 'green'} /><strong>{p}%</strong><small>({total})</small></div>
            )) : <p className="muted-note">Comece um treino para gerar dados de precisão.</p>}
          </Card>

          <Card className="side-card">
            <div className="section-head small"><span className="eyebrow">Atalhos</span></div>
            <div className="shortcut-list">
              <Link to="/caderno-erros"><span><Filter size={15} /> Caderno de erros</span><ArrowRight size={14} /></Link>
              <Link to="/questoes?status=salvas" onClick={() => { setStatus('salvas'); setPool(null); }}><span><Bookmark size={15} /> Questões salvas</span><ArrowRight size={14} /></Link>
              <Link to="/conteudos?status=prioridade"><span><Sparkles size={15} /> Temas de alta prioridade</span><ArrowRight size={14} /></Link>
            </div>
          </Card>

          <Card className="side-card">
            <div className="section-head small"><span className="eyebrow">Adicionadas recentemente</span><Library size={17} /></div>
            {sample.length ? sample.map((q) => (
              <Link key={q.id} to={`/questoes?q=${q.id}`} className="mini-row"><span className="q-num">Q</span><span>{q.stem.slice(0, 82)}…</span><ArrowRight size={14} /></Link>
            )) : <p className="muted-note">Sem questões novas neste recorte.</p>}
            <Button variant="ghost" size="sm" onClick={() => navigate('/questoes/importar')}>Ver fontes e importar</Button>
          </Card>
        </div>
      </div>
    </>
  );
}
