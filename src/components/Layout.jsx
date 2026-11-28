import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen, ChartNoAxesColumnIncreasing, House, Layers, Library, Menu, Moon, Network,
  NotebookPen, Search, Settings, Sparkles, Sun, X,
} from 'lucide-react';
import { Logo } from './ui.jsx';
import { useStore } from '../store.jsx';
import { normalize, initials } from '../utils.js';

const NAV = [
  { to: '/', label: 'Início', end: true },
  { to: '/conteudos', label: 'Conteúdos' },
  { to: '/questoes', label: 'Treino' },
  { to: '/flashcards', label: 'Flashcards' },
  { to: '/mapas', label: 'Mapas mentais' },
  { to: '/pulso', label: 'Ferramentas de IA' },
  { to: '/perfil', label: 'Minha conta' },
];

const MENU = [
  {
    group: 'Estudo',
    items: [
      { to: '/', label: 'Início', icon: House, end: true },
      { to: '/conteudos', label: 'Conteúdos', icon: BookOpen },
      { to: '/questoes', label: 'Treino', icon: Library },
      { to: '/flashcards', label: 'Flashcards', icon: Layers },
      { to: '/mapas', label: 'Mapas mentais', icon: Network },
    ],
  },
  {
    group: 'Progresso',
    items: [
      { to: '/desempenho', label: 'Desempenho', icon: ChartNoAxesColumnIncreasing },
      { to: '/caderno-erros', label: 'Caderno de erros', icon: NotebookPen },
    ],
  },
  {
    group: 'Ferramentas',
    items: [{ to: '/pulso', label: 'Ferramentas de IA', icon: Sparkles }],
  },
  {
    group: 'Conta',
    items: [{ to: '/perfil', label: 'Minha conta', icon: Settings }],
  },
];

export default function Layout() {
  const { user, curriculum, questions, setTheme } = useStore();
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState('');
  const [drawer, setDrawer] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { setDrawer(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawer]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPalette((open) => !open);
      }
      if (event.key === 'Escape') { setPalette(false); setDrawer(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const term = normalize(query);
    if (term.length < 2) return [];
    const topics = curriculum.areas.flatMap((area) => area.topics.map((topic) => ({ type: 't', area, topic })));
    return [
      ...topics.filter(({ topic, area }) => normalize(`${topic.title} ${area.name} ${topic.summary}`).includes(term)).slice(0, 6),
      ...questions.filter((question) => normalize(`${question.stem} ${question.tags.join(' ')}`).includes(term)).slice(0, 4).map((question) => ({ type: 'q', question })),
    ].slice(0, 9);
  }, [query, curriculum, questions]);

  const go = (item) => {
    setPalette(false);
    setQuery('');
    if (item.type === 't') navigate(`/conteudos/${item.topic.id}`);
    else navigate(`/questoes?q=${item.question.id}`);
  };

  return (
    <div className="app-shell">
      <header className="topbar app-topbar">
        <button className="mobile-menu-btn icon-btn" onClick={() => setDrawer(true)} aria-label="Abrir menu" aria-expanded={drawer}><Menu size={21} /></button>
        <NavLink to="/" className="top-brand" aria-label="Pulso, início"><Logo compact /></NavLink>
        <nav className="top-nav" aria-label="Navegação principal">
          {NAV.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="search-trigger" onClick={() => setPalette(true)} aria-label="Buscar tema, subtópico ou questão">
          <Search size={17} />
          <span>Buscar tema ou questão</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => setTheme(user.settings?.theme === 'dark' ? 'light' : 'dark')} aria-label="Alternar tema">
            {user.settings?.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <NavLink to="/perfil" className="top-avatar" title="Minha conta"><span className="avatar">{initials(user.name)}</span></NavLink>
        </div>
      </header>

      <main className="page">
        <Outlet />
      </main>

      {drawer && <div className="mobile-drawer-overlay" onClick={() => setDrawer(false)} />}
      <aside className={`mobile-drawer ${drawer ? 'open' : ''}`} aria-hidden={!drawer}>
        <div className="mobile-drawer-head">
          <Logo />
          <button className="icon-btn" onClick={() => setDrawer(false)} aria-label="Fechar menu"><X size={19} /></button>
        </div>
        <nav className="mobile-drawer-nav" aria-label="Menu">
          {MENU.map((group) => (
            <section key={group.group}>
              <span className="mobile-drawer-group">{group.group}</span>
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => { if (location.pathname === to) setDrawer(false); }}
                  className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </section>
          ))}
        </nav>
        <NavLink to="/perfil" className="mobile-drawer-user" onClick={() => { if (location.pathname === '/perfil') setDrawer(false); }}>
          <span className="avatar">{initials(user.name)}</span>
          <span><strong>{user.name || 'Minha conta'}</strong><small>Perfil e ajustes</small></span>
        </NavLink>
      </aside>

      {palette && (
        <div className="overlay palette-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setPalette(false); }}>
          <div className="palette" role="dialog" aria-label="Busca">
            <div className="palette-input">
              <Search size={19} />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tema, subtópico ou questão…" />
              <button className="icon-btn" onClick={() => setPalette(false)} aria-label="Fechar"><X size={18} /></button>
            </div>
            <div className="palette-results">
              {!query && <p className="palette-hint">Digite ao menos 2 letras. Use <kbd>↑</kbd> <kbd>↓</kbd> e <kbd>Enter</kbd>.</p>}
              {query.length >= 2 && !results.length && <p className="palette-hint">Nada encontrado para “{query}”.</p>}
              {results.map((result, index) => (
                <button key={index} className="palette-item" onClick={() => go(result)}>
                  {result.type === 't' ? (
                    <><span className="palette-kind">{result.area.short}</span><span>{result.topic.title}</span><small>{result.area.name}</small></>
                  ) : (
                    <><span className="palette-kind">Q</span><span>{result.question.stem.slice(0, 110)}…</span><small>Questão</small></>
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
