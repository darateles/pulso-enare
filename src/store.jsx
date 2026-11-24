import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import fallbackCurriculum from '../seed/curriculum.json';
import fallbackSources from '../seed/sources.json';
import { iso, uid } from './utils.js';

const StoreCtx = createContext(null);
const ToastCtx = createContext(null);
const CACHE = 'prumo.cache.v1';

function blankUser() {
  return {
    onboardingDone: false,
    name: '',
    examDate: '2027-09-12',
    startDate: iso(),
    dailyHours: 3,
    studyDays: [1, 2, 3, 4, 5, 6],
    goalQuestions: 40,
    progress: {},
    attempts: [],
    bookmarks: [],
    questionNotes: {},
    errorDismissed: {},
    notes: [],
    maps: [],
    flashcards: [],
    flashReviews: {},
    recall: {},
    recallDone: {},
    focusSessions: [],
    battleName: '',
    mentorNotes: [],
    guidelineSaved: [],
    radarSaved: [],
    atlasSeen: {},
    podcastProgress: {},
    ecgProgress: {},
    plan: { generatedAt: null, weeks: [] },
    activity: {},
    settings: { theme: 'light', plan: 'pro' },
  };
}

export function useStore() {
  return useContext(StoreCtx);
}

export function useToast() {
  return useContext(ToastCtx);
}

export function StoreProvider({ children }) {
  const [user, setUser] = useState(blankUser);
  const [questions, setQuestions] = useState([]);
  const questionsRef = useRef([]);
  questionsRef.current = questions;
  const [sources, setSources] = useState(fallbackSources.sources);
  const [curriculum] = useState(fallbackCurriculum);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [outbox, setOutbox] = useState(0);
  const [toasts, setToasts] = useState([]);
  const userRef = useRef(user);
  const loadedRef = useRef(false);
  const timerRef = useRef(null);
  const lastActivity = useRef(Date.now());

  userRef.current = user;

  const toast = useCallback((message, kind = 'success') => {
    const id = uid();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cached = localStorage.getItem(CACHE);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.user) setUser((u) => ({ ...u, ...parsed.user }));
        }
        const data = await api.bootstrap();
        if (!alive) return;
        setUser({ ...blankUser(), ...data.user });
        setSources(data.sources?.length ? data.sources : fallbackSources.sources);
        setOffline(false);
        localStorage.setItem(CACHE, JSON.stringify({ user: data.user, questions: [] }));
        api.questions().then((qd) => {
          if (!alive) return;
          setQuestions(qd.questions || []);
          localStorage.setItem(CACHE, JSON.stringify({ user: data.user, questions: qd.questions || [] }));
        }).catch(() => {});
      } catch {
        if (!alive) return;
        setOffline(true);
        try {
          const cached = localStorage.getItem(CACHE);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.user) setUser({ ...blankUser(), ...parsed.user });
            if (parsed.questions?.length) setQuestions(parsed.questions);
          }
        } catch {}
      } finally {
        if (alive) {
          loadedRef.current = true;
          setLoading(false);
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  const persist = useCallback(async (nextUser) => {
    localStorage.setItem(CACHE, JSON.stringify({ user: nextUser, questions: questionsRef.current }));
    try {
      setSaveState('saving');
      await api.saveState(nextUser);
      setSaveState('saved');
      setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 1300);
    } catch {
      setSaveState('offline');
      setOffline(true);
      try {
        const prev = JSON.parse(localStorage.getItem('prumo.outbox') || '{}');
        const next = { state: nextUser, count: (prev.count || 0) + 1, at: new Date().toISOString() };
        localStorage.setItem('prumo.outbox', JSON.stringify(next));
        setOutbox(next.count);
      } catch {}
    }
  }, []);

  const syncOutbox = useCallback(async () => {
    try {
      const raw = localStorage.getItem('prumo.outbox');
      if (!raw) return;
      const o = JSON.parse(raw);
      if (o.state) await api.saveState(o.state);
      localStorage.removeItem('prumo.outbox');
      setOutbox(0);
      setOffline(false);
      setSaveState('saved');
      toast('Alterações pendentes sincronizadas.');
    } catch {
      setOffline(true);
    }
  }, [toast]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('prumo.outbox') || '{}');
    if (saved.count) setOutbox(saved.count);
    const online = () => syncOutbox();
    const off = () => setOffline(true);
    window.addEventListener('online', online);
    window.addEventListener('offline', off);
    if (navigator.onLine && saved.state) syncOutbox();
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', off); };
  }, [syncOutbox]);

  const updateUser = useCallback((updater) => {
    if (!loadedRef.current) return;
    setUser((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => persist(next), 550);
      return next;
    });
    lastActivity.current = Date.now();
  }, [persist]);

  const refreshData = useCallback(async (fresh = false) => {
    const [data, qd] = await Promise.all([api.bootstrap(), api.questions()]);
    setQuestions(qd.questions || []);
    setSources(data.sources || []);
    setUser((prev) => (fresh
      ? { ...blankUser(), ...data.user }
      : { ...prev, ...data.user, plan: prev.plan, progress: prev.progress, attempts: prev.attempts }));
  }, []);

  const cancelPending = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  const bumpActivity = useCallback((patch = {}) => {
    updateUser((prev) => {
      const day = iso();
      const current = prev.activity?.[day] || { minutes: 0, questions: 0, checklist: 0 };
      return {
        ...prev,
        activity: {
          ...prev.activity,
          [day]: {
            minutes: (current.minutes || 0) + (patch.minutes || 0),
            questions: (current.questions || 0) + (patch.questions || 0),
            checklist: (current.checklist || 0) + (patch.checklist || 0),
          },
        },
      };
    });
  }, [updateUser]);

  const addAttempt = useCallback((question, chosen, seconds, confidence = null) => {
    const attempt = {
      id: uid(),
      questionId: question.id,
      topicId: question.topicId,
      area: question.area,
      chosen,
      correct: question.answer ? chosen === question.answer : null,
      seconds,
      createdAt: new Date().toISOString(),
    };
    updateUser((prev) => ({
      ...prev,
      attempts: [...prev.attempts, attempt].slice(-8000),
      ...(question.topicId && confidence ? {
        progress: {
          ...prev.progress,
          [question.topicId]: { ...(prev.progress[question.topicId] || {}), confidence },
        },
      } : {}),
    }));
    bumpActivity({ questions: 1 });
    return attempt;
  }, [updateUser, bumpActivity]);

  const toggleChecklist = useCallback((topic, index) => {
    updateUser((prev) => {
      const p = prev.progress[topic.id] || {};
      const done = new Set(Array.isArray(p.done) ? p.done : []);
      const had = done.has(index);
      if (had) done.delete(index);
      else done.add(index);
      const nextP = { ...p, done: [...done].sort((a, b) => a - b) };
      if (nextP.done.length === topic.checklist.length && !nextP.nextReview) {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        nextP.nextReview = iso(d);
      }
      return { ...prev, progress: { ...prev.progress, [topic.id]: nextP } };
    });
    bumpActivity({ checklist: 1, minutes: 4 });
  }, [updateUser, bumpActivity]);

  const setConfidence = useCallback((topic, value) => {
    updateUser((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        [topic.id]: { ...(prev.progress[topic.id] || {}), confidence: value },
      },
    }));
  }, [updateUser]);

  const setTopicNote = useCallback((topicId, note) => {
    updateUser((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        [topicId]: { ...(prev.progress[topicId] || {}), note },
      },
    }));
  }, [updateUser]);

  const scheduleReview = useCallback((topic, days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    updateUser((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        [topic.id]: { ...(prev.progress[topic.id] || {}), lastReview: new Date().toISOString(), nextReview: iso(d) },
      },
    }));
  }, [updateUser]);

  const toggleBookmark = useCallback((qid) => {
    updateUser((prev) => {
      const has = prev.bookmarks.includes(qid);
      return { ...prev, bookmarks: has ? prev.bookmarks.filter((x) => x !== qid) : [...prev.bookmarks, qid] };
    });
  }, [updateUser]);

  const setQuestionNote = useCallback((qid, note) => {
    updateUser((prev) => ({ ...prev, questionNotes: { ...prev.questionNotes, [qid]: note } }));
  }, [updateUser]);

  const dismissError = useCallback((qid) => {
    updateUser((prev) => ({ ...prev, errorDismissed: { ...(prev.errorDismissed || {}), [qid]: new Date().toISOString() } }));
  }, [updateUser]);

  const setTheme = useCallback((theme) => {
    updateUser((prev) => ({ ...prev, settings: { ...prev.settings, theme } }));
  }, [updateUser]);

  // Tempo de estudo: conta minutos enquanto a aba está visível e ativa.
  useEffect(() => {
    if (!user.onboardingDone) return undefined;
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - lastActivity.current < 6 * 60 * 1000) {
        bumpActivity({ minutes: 1 });
      }
    }, 60_000);
    const bump = () => { lastActivity.current = Date.now(); };
    window.addEventListener('pointerdown', bump);
    window.addEventListener('keydown', bump);
    return () => {
      clearInterval(tick);
      window.removeEventListener('pointerdown', bump);
      window.removeEventListener('keydown', bump);
    };
  }, [user.onboardingDone, bumpActivity]);

  useEffect(() => {
    document.documentElement.dataset.theme = user.settings?.theme === 'dark' ? 'dark' : 'light';
  }, [user.settings?.theme]);

  const value = {
    user, questions, setQuestions, sources, setSources, curriculum,
    loading, offline, saveState, updateUser, bumpActivity, addAttempt,
    toggleChecklist, setConfidence, setTopicNote, scheduleReview,
    toggleBookmark, setQuestionNote, dismissError, setTheme, toast, refreshData, cancelPending, outbox, syncOutbox,
  };

  return (
    <StoreCtx.Provider value={value}>
      <ToastCtx.Provider value={toast}>
        {children}
        <div className="toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.kind}`}>{t.message}</div>
          ))}
        </div>
      </ToastCtx.Provider>
    </StoreCtx.Provider>
  );
}
