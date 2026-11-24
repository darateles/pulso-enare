import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  House, CalendarDays, ListChecks, Library, ChartNoAxesColumnIncreasing, NotebookPen,
  Settings, Search, Moon, Sun, Flame, Menu, X, MoreHorizontal, ArrowRight, Layers, HeartPulse,
} from 'lucide-react';
import { Logo, Ring, Progress } from './ui.jsx';
import { useStore } from '../store.jsx';
import { daysUntil, fmtDate, globalStats, normalize, streak, greeting, initials } from '../utils.js';

const NAV = [
  { to: '/', label: 'Hoje', icon: House, end: true },
  { to: '/planner', label: 'Planner', icon: CalendarDays },
  { to: '/conteudos', label: 'Conteúdos', icon: ListChecks },
  { to: '/questoes', label: 'Questões', icon: Library },
  { to: '/pulso', label: 'Pulso Pro', icon: Layers },
  { to: '/desempenho', label: 'Desempenho', icon: ChartNoAxesColumnIncreasing },
  { to: '/caderno-erros', label: 'Caderno de erros', icon: NotebookPen },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
];

export default function Layout() {
  const { user, curriculum, questions, saveState, setTheme } = useStore();
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState('');
  const [more, setMore] = useState(false);
  const navigate = useNavigate();
  const stats = useMemo(() => globalStats(curriculum, user.progress), [curriculum, user.progress]);
  const count = daysUntil(user.examDate);
  const streakDays = streak(user);
  const bpm = 58 + Math.min(34, streakDays * 2 + Math.min(8, Math.round((user.activity?.[new Date().toISOString().slice(0, 10)]?.minutes || 0) / 15)));

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const term = normalize(query);
    if (term.length < 2) return [];
    const topics = curriculum.areas.flatMap((a) => a.topics.map((t) => ({ type: 't', a, t })));
    return [
      ...topics.filter(({ t, a }) => normalize(`${t.title} ${a.name} ${t.summary}`).includes(term)).slice(0, 6),
      ...questions.filter((q) => normalize(`${q.stem} ${q.tags.join(' ')}`).includes(term)).slice(0, 4).map((q) => ({ type: 'q', q })),
    ].slice(0, 9);
  }, [query, curriculum, questions]);

  const go = (item) => {
    setPalette(false);
    setQuery('');
    if (item.type === 't') navigate(`/conteudos/${item.t.id}`);
    else navigate(`/questoes?q=${item.q.id}`);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="side-logo"><Logo /></NavLink>
        <p className="side-tagline">Seu estudo em ritmo.<br />Não em caos.</p>
        <div className="side-rhythm" aria-hidden="true">
          <svg viewBox="0 0 190 24" preserveAspectRatio="none"><path d="M0 13h48l7-8 8 15 8-11 6 4h105" /></svg>
          <span>RITMO</span>
        </div>

        <Cardish count={count} examDate={user.examDate} />

        <nav className="side-nav" aria-label="Navegação principal">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="side-progress">
          <div className="side-progress-head">
            <span>Cobertura do edital</span>
            <strong>{stats.pct}%</strong>
          </div>
          <Progress value={stats.pct} tone="accent" label="Cobertura do edital" />
          <small>{stats.mastered} de {stats.totalTopics} dominados</small>
        </div>

        <NavLink to="/ajustes" className="side-user">
          <span className="avatar">{initials(user.name)}</span>
          <span className="side-user-name">{user.name || 'Seu perfil'}</span>
        </NavLink>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <NavLink to="/" className="mobile-logo"><Logo compact /></NavLink>
          <button className="search-trigger" onClick={() => setPalette(true)}>
            <Search size={17} />
            <span>Buscar tema, subtópico ou questão</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="top-actions">
            <span className={`save-dot save-${saveState}`} title={saveState === 'saving' ? 'Salvando' : 'Dados salvos automaticamente'}>
              {saveState === 'saving' ? 'Salvando…' : saveState === 'offline' ? 'Modo local' : 'Salvo'}
            </span>
            <span className="vital" title="Ritmo simbólico de estudo — aumenta com constância e foco de hoje"><HeartPulse size={14} /><b>{bpm}</b> bpm</span>
            <span className="streak" title="Dias seguidos de estudo"><Flame size={16} /> {streakDays}</span>
            <button className="icon-btn" onClick={() => setTheme(user.settings?.theme === 'dark' ? 'light' : 'dark')} aria-label="Alternar tema">
              {user.settings?.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Navegação móvel">
        {[NAV[0], NAV[2], NAV[3], NAV[4]].map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `bottom-item ${isActive ? 'active' : ''}`}>
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button className="bottom-item" onClick={() => setMore(true)}><MoreHorizontal size={21} /><span>Mais</span></button>
      </nav>

      {more && (
        <div className="sheet-overlay" onClick={() => setMore(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><span>Mais</span><button className="icon-btn" onClick={() => setMore(false)} aria-label="Fechar"><X size={18} /></button></div>
            {[NAV[1], ...NAV.slice(5)].map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className="sheet-link" onClick={() => setMore(false)}><Icon size={19} /> {label} <ArrowRight size={16} /></NavLink>
            ))}
          </div>
        </div>
      )}

      {palette && (
        <div className="overlay palette-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setPalette(false); }}>
          <div className="palette" role="dialog" aria-label="Busca">
            <div className="palette-input">
              <Search size={19} />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tema, subtópico ou questão…" />
              <button className="icon-btn" onClick={() => setPalette(false)} aria-label="Fechar"><X size={18} /></button>
            </div>
            <div className="palette-results">
              {!query && <p className="palette-hint">Digite ao menos 2 letras. Use <kbd>↑</kbd> <kbd>↓</kbd> e <kbd>Enter</kbd>.</p>}
              {query.length >= 2 && !results.length && <p className="palette-hint">Nada encontrado para “{query}”.</p>}
              {results.map((r, i) => (
                <button key={i} className="palette-item" onClick={() => go(r)}>
                  {r.type === 't' ? (
                    <><span className="palette-kind">{r.a.short}</span><span>{r.t.title}</span><small>{r.a.name}</small></>
                  ) : (
                    <><span className="palette-kind">Q</span><span>{r.q.stem.slice(0, 110)}…</span><small>Questão</small></>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Cardish({ count, examDate }) {
  return (
    <div className="side-countdown">
      <div className="countdown-top">
        <span>{count >= 0 ? 'Até a prova' : 'Prova realizada'}</span>
        <strong>{Math.abs(count)}</strong>
        <small>dias</small>
      </div>
      <div className="countdown-meta">ENARE · {fmtDate(examDate, { month: 'short', year: 'numeric' })}</div>
      <Ring value={Math.max(4, Math.min(100, 100 - (count / 300) * 100))} size={30} stroke={3} tone="accent" />
    </div>
  );
}
