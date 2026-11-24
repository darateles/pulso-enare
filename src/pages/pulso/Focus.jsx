import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Coffee, Pause, Play, RotateCcw, Timer, Volume2, VolumeX } from 'lucide-react';
import { Button, Card, Chip, PageHead, Progress, Stat } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';
import { minutesLabel } from '../../utils.js';
import { todaySessions } from '../../planner.js';

const MODES = [
  { id: 'focus', label: 'Foco', minutes: 25, tone: 'accent' },
  { id: 'deep', label: 'Foco longo', minutes: 50, tone: 'green' },
  { id: 'break', label: 'Pausa', minutes: 5, tone: 'green' },
];

export default function Focus() {
  const { user, bumpActivity, updateUser, toast } = useStore();
  const [mode, setMode] = useState(MODES[0]);
  const [left, setLeft] = useState(MODES[0].minutes * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [task, setTask] = useState('');
  const [sound, setSound] = useState(true);
  const [completed, setCompleted] = useState(false);
  const today = useMemo(() => todaySessions(user.plan), [user.plan]);
  const audioRef = useRef(null);

  const total = mode.minutes * 60;
  const pct = ((total - left) / total) * 100;

  const beep = () => {
    if (!sound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } catch {}
  };

  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(t);
          setRunning(false);
          setCompleted(true);
          beep();
          if (mode.id !== 'break') {
            const session = {
              id: crypto.randomUUID?.() || String(Date.now()),
              minutes: mode.minutes, task, mode: mode.id, createdAt: new Date().toISOString(),
            };
            updateUser((prev) => ({ ...prev, focusSessions: [...prev.focusSessions, session].slice(-2000) }));
            bumpActivity({ minutes: mode.minutes });
            setCycles((c) => c + 1);
            toast(`${mode.minutes} minutos de foco registrados.`);
          } else {
            toast('Pausa concluída. Volte ao foco quando estiver pronto.');
          }
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, mode, task, sound]);

  useEffect(() => {
    document.title = running ? `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')} · ${mode.label} · Pulso` : 'Pulso · Seu estudo em ritmo';
    return () => { document.title = 'Pulso · Seu estudo em ritmo'; };
  }, [left, running, mode]);

  const changeMode = (m) => {
    setMode(m); setLeft(m.minutes * 60); setRunning(false); setCompleted(false);
  };

  const reset = () => { setLeft(total); setRunning(false); setCompleted(false); };
  const addFive = () => { setLeft((l) => l + 300); setRunning(true); setCompleted(false); };

  const todaySessionsLog = user.focusSessions.filter((s) => s.createdAt?.slice(0, 10) === new Date().toISOString().slice(0, 10));
  const todayMinutes = todaySessionsLog.reduce((s, x) => s + x.minutes, 0);
  const weekMinutes = user.focusSessions.filter((s) => Date.now() - new Date(s.createdAt).getTime() < 7 * 86400000).reduce((s, x) => s + x.minutes, 0);
  const taskDone = today.find((s) => s.id === task)?.done;

  const completeTask = () => {
    if (!task) return;
    updateUser((prev) => ({
      ...prev,
      plan: { ...prev.plan, weeks: prev.plan.weeks.map((w) => ({ ...w, days: w.days.map((d) => ({ ...d, sessions: d.sessions.map((s) => s.id === task ? { ...s, done: true } : s) })) })) },
    }));
    toast('Sessão do planner marcada como concluída.');
  };

  return (
    <>
      <PageHead
        eyebrow="Pulso Focus"
        title={<>Foco com <em>começo e fim.</em></>}
        subtitle="O timer se conecta ao planner, registra minutos e protege a pausa. Trabalhe em blocos curtos, sem vigiar o relógio."
        actions={<Link to="/planner" className="btn btn-ghost">Abrir planner</Link>}
      />

      <div className="focus-layout">
        <Card className={`focus-card ${running ? 'running' : ''}`}>
          <div className="focus-top">
            <Chip tone={mode.tone}>{mode.label}</Chip>
            <button className="icon-btn" onClick={() => setSound((s) => !s)} aria-label={sound ? 'Desligar som' : 'Ligar som'}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
          </div>
          <div className="timer-ring">
            <svg viewBox="0 0 240 240">
              <circle cx="120" cy="120" r="108" fill="none" stroke="var(--ring-track)" strokeWidth="8" />
              <circle cx="120" cy="120" r="108" fill="none" stroke={`var(--${mode.tone})`} strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 108} strokeDashoffset={2 * Math.PI * 108 * (1 - pct / 100)} transform="rotate(-90 120 120)" />
            </svg>
            <div className="timer-display">
              <strong>{String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}</strong>
              <span>{running ? 'em andamento' : completed ? 'bloco concluído' : 'pronto para começar'}</span>
            </div>
          </div>
          <div className="segmented center">
            {MODES.map((m) => <button key={m.id} className={mode.id === m.id ? 'active' : ''} onClick={() => changeMode(m)}>{m.label} · {m.minutes}min</button>)}
          </div>
          {completed ? (
            <div className="focus-complete">
              <Bell size={18} />
              <span>{mode.id === 'break' ? 'Pausa feita. Que tal um novo bloco?' : 'Bloco registrado. Faça a pausa antes do próximo.'}</span>
              {mode.id !== 'break' && <Button size="sm" onClick={() => changeMode(MODES[2])} icon={Coffee}>Pausar 5 min</Button>}
              {task && !taskDone && <Button size="sm" variant="soft" onClick={completeTask}>Concluir sessão do planner</Button>}
              <Button size="sm" variant="ghost" onClick={() => changeMode(mode)} icon={RotateCcw}>Novo bloco</Button>
            </div>
          ) : (
            <div className="focus-actions">
              <Button onClick={() => setRunning((r) => !r)} icon={running ? Pause : Play}>{running ? 'Pausar' : 'Iniciar foco'}</Button>
              <Button variant="ghost" onClick={reset} icon={RotateCcw}>Zerar</Button>
              {left < total && <Button variant="ghost" onClick={addFive}>+5 min</Button>}
            </div>
          )}
          <p className="focus-cycles">{cycles ? `${cycles} bloco(s) concluído(s) hoje.` : 'Sugestão: 2 blocos seguidos de pausa longa.'}</p>
        </Card>

        <div className="focus-side">
          <Card>
            <span className="eyebrow">Vincular ao seu dia</span>
            <h2>Qual sessão?</h2>
            {today.length ? (
              <div className="focus-tasks">
                {today.map((s) => (
                  <button key={s.id} className={task === s.id ? 'active' : ''} onClick={() => setTask(s.id)}>
                    <span>{s.title}</span><small>{s.minutes} min · {s.type}</small>
                  </button>
                ))}
              </div>
            ) : <p className="muted-note">Nenhuma sessão hoje. Gere o planner para vincular o timer a uma tarefa.</p>}
            {task && <Button size="sm" variant="soft" onClick={completeTask} disabled={taskDone}>{taskDone ? 'Sessão já concluída' : 'Marcar sessão concluída'}</Button>}
          </Card>

          <div className="stats-row two">
            <Stat label="Foco hoje" value={minutesLabel(todayMinutes)} note="Registrado no histórico" />
            <Stat label="Últimos 7 dias" value={minutesLabel(weekMinutes)} note="Somatório de foco" />
          </div>

          <Card>
            <div className="section-head small"><span className="eyebrow">Sessões de foco</span><Timer size={17} /></div>
            {user.focusSessions.slice(-6).reverse().map((s) => (
              <div key={s.id} className="focus-log"><strong>{s.minutes} min</strong><span>{s.task ? (today.find((t) => t.id === s.task)?.title || 'Sessão do planner') : 'Foco livre'}</span><small>{new Date(s.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></div>
            ))}
            {!user.focusSessions.length && <p className="muted-note">Nenhuma sessão registrada ainda.</p>}
          </Card>

          <Card className="warm small-tip">
            <p><strong>Regra do bloco:</strong> ao tocar o alarme, pare mesmo que esteja rendendo. A pausa é parte do método, não recompensa.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
