import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarDays, ChartNoAxesColumnIncreasing, Download, HelpCircle, LogOut, RefreshCw,
  RotateCcw, Save, Settings, Sparkles, Target, Upload, UserRound,
} from 'lucide-react';
import { api, downloadBackup } from '../api.js';
import { Button, Card, Chip, Field, InlineError, PageHead, Progress, Segmented, Stat } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { WEEKDAYS, accuracyByArea, dueReviews, fmtDate, globalStats, minutesLabel, pct } from '../utils.js';
import { currentLevel, LEVELS, STUDY_PACES, levelById, levelStats, recommendLevel, semesterLabel } from '../trilha.js';
import { generatePlan } from '../planner.js';
import { dailyScore, rankingDate, rankingId } from '../ranking.js';
import { SUPPORT_EMAIL, SUPPORT_URL } from '../config.js';

const SECTIONS = [
  { id: 'perfil', label: 'Perfil', icon: UserRound },
  { id: 'progresso', label: 'Progresso', icon: ChartNoAxesColumnIncreasing },
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'planner', label: 'Planner', icon: CalendarDays },
  { id: 'ajustes', label: 'Ajustes', icon: Settings },
  { id: 'suporte', label: 'Suporte', icon: HelpCircle },
];

export default function Ajustes() {
  const { user, curriculum, account, updateUser, setTheme, toast, refreshData, cancelPending, logout } = useStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const section = SECTIONS.some((item) => item.id === params.get('secao')) ? params.get('secao') : 'perfil';
  const [form, setForm] = useState({
    name: user.name,
    semester: user.semester || 1,
    level: user.level || 1,
    studyPace: user.studyPace || 'equilibrado',
    examDate: user.examDate,
    startDate: user.startDate,
    dailyHours: user.dailyHours,
    studyDays: user.studyDays,
    goalQuestions: user.goalQuestions,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const fileRef = useRef(null);

  const recommendation = useMemo(() => recommendLevel(form), [form.dailyHours, form.studyDays, form.examDate, form.studyPace]);
  const formLevel = levelById(form.level);

  const stats = globalStats(curriculum, user.progress);
  const due = dueReviews(curriculum, user.progress);
  const areas = accuracyByArea(curriculum, user.attempts);
  const level = currentLevel(user);
  const levelData = levelStats(curriculum, level.id, user.progress);
  const rank = dailyScore(user, rankingDate());
  const answered = user.attempts.filter((attempt) => attempt.correct !== null);
  const accuracy = answered.length ? pct(answered.filter((attempt) => attempt.correct).length, answered.length) : null;

  const setSection = (id) => {
    const next = new URLSearchParams(params);
    next.set('secao', id);
    setParams(next, { replace: true });
  };

  const normalized = () => {
    const semester = Number(form.semester) || 1;
    return {
      ...form,
      semester,
      level: Math.min(5, Math.max(1, Number(form.level) || 1)),
      levelModel: 2,
      studyPace: STUDY_PACES.some((pace) => pace.id === form.studyPace) ? form.studyPace : 'equilibrado',
      name: form.name.trim() || 'Estudante',
      startDate: form.startDate || user.startDate,
      studyDays: form.studyDays.length ? form.studyDays : [1, 2, 3, 4, 5],
    };
  };

  const save = () => {
    updateUser(normalized());
    toast('Dados salvos.');
  };

  const saveAndPlan = () => {
    const next = normalized();
    const plan = generatePlan({ ...user, ...next }, curriculum, 8);
    updateUser({ ...next, plan });
    toast('Rotina salva e plano regerado.');
  };

  const toggleDay = (day) => setForm((current) => ({
    ...current,
    studyDays: current.studyDays.includes(day) ? current.studyDays.filter((item) => item !== day) : [...current.studyDays, day].sort(),
  }));

  const backup = async () => {
    setBusy('backup');
    setError('');
    try { await downloadBackup(); toast('Backup baixado.'); } catch (err) { setError(err.message); } finally { setBusy(''); }
  };

  const restore = async (file) => {
    if (!file) return;
    setBusy('restore');
    setError('');
    cancelPending();
    try {
      const payload = JSON.parse(await file.text());
      if (!payload.user) throw new Error('Arquivo não parece ser um backup do Pulso.');
      await api.importBackup(payload);
      await refreshData(true);
      toast('Backup restaurado.');
    } catch (err) { setError(err.message); } finally { setBusy(''); if (fileRef.current) fileRef.current.value = ''; }
  };

  const reset = async () => {
    if (!window.confirm('Apagar todo o progresso, tentativas e plano? O banco de questões será mantido.')) return;
    setBusy('reset');
    cancelPending();
    try { await api.reset(); await refreshData(true); window.location.assign('/'); } catch (err) { setError(err.message); } finally { setBusy(''); }
  };

  return (
    <>
      <PageHead
        eyebrow="Minha conta"
        title="Minha conta"
        subtitle="Perfil, progresso, metas, planner, ajustes e suporte."
      />

      <nav className="account-tabs" aria-label="Seções da conta">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={section === id ? 'active' : ''} onClick={() => setSection(id)}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </nav>

      <InlineError>{error}</InlineError>

      {section === 'perfil' && (
        <div className="account-grid">
          <Card>
            <div className="section-head small"><div><span className="eyebrow">Perfil</span><h2>Dados pessoais</h2></div><UserRound size={19} /></div>
            <Field label="Nome"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Semestre da faculdade" hint="Apenas informação de perfil. Não define seu nível.">
              <select value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((s) => <option key={s} value={s}>{semesterLabel(s)}</option>)}
              </select>
            </Field>
            <Button onClick={save} icon={Save}>Salvar perfil</Button>
          </Card>

          <Card>
            <div className="section-head small"><div><span className="eyebrow">Conta</span><h2>Acesso</h2></div></div>
            <div className="profile-meta">
              <div><span>Usuário</span><strong>{account || 'local'}</strong></div>
              <div><span>ID do ranking</span><strong>#{rankingId(account || 'davi')}</strong></div>
            </div>
            <Link to="/ranking" className="text-link">Ver ranking diário</Link>
            <div className="account-row"><span>Encerrar sessão neste dispositivo</span><Button variant="ghost" size="sm" onClick={async () => { await logout(); navigate('/login'); }} icon={LogOut}>Sair</Button></div>
          </Card>
        </div>
      )}

      {section === 'progresso' && (
        <>
          <div className="stats-row">
            <Stat label="Temas dominados" value={stats.mastered} note={`de ${stats.totalTopics}`} tone="dark" />
            <Stat label="Cobertura" value={`${stats.pct}%`} note={`${stats.started} temas iniciados`} />
            <Stat label="Questões" value={answered.length} note={accuracy != null ? `${accuracy}% de acerto` : 'Sem respostas'} />
            <Stat label="Revisões vencidas" value={due.length} note={due.length ? 'Prioridade' : 'Em dia'} tone={due.length ? 'alert' : ''} />
          </div>
          <div className="account-grid">
            <Card>
              <div className="section-head small"><div><span className="eyebrow">Trilha</span><h2>Nível {level.id} · {level.name}</h2></div><Chip tone="neutral">{levelData.pct}%</Chip></div>
              <Progress value={levelData.pct} tone="accent" />
              <p className="muted-note">{levelData.mastered} de {levelData.total} temas dominados · {levelData.subjects.length} matérias.</p>
              <Link to="/trilha" className="text-link">Abrir trilha</Link>
            </Card>
            <Card>
              <div className="section-head small"><div><span className="eyebrow">Precisão</span><h2>Por área</h2></div></div>
              {areas.filter((item) => item.total > 0).length ? areas.filter((item) => item.total > 0).map(({ area, pct: value, total }) => (
                <div key={area.id} className="acc-row">
                  <span>{area.short}</span>
                  <Progress value={value} tone={value < 55 ? 'accent' : 'green'} />
                  <strong>{value}%</strong>
                  <small>({total})</small>
                </div>
              )) : <p className="muted-note">Sem respostas suficientes.</p>}
            </Card>
          </div>
        </>
      )}

      {section === 'metas' && (
        <div className="account-grid">
          <Card>
            <div className="section-head small"><div><span className="eyebrow">Hoje</span><h2>Metas diárias</h2></div><Target size={18} /></div>
            <div className="home-goal-list">
              {Object.entries(rank.goals).map(([key, goal]) => {
                const labels = { questions: 'Questões', minutes: 'Tempo', checklist: 'Checklist' };
                const value = key === 'minutes' ? minutesLabel(goal.value) : goal.value;
                const target = key === 'minutes' ? minutesLabel(goal.target) : goal.target;
                const percent = goal.target ? Math.min(100, Math.round((goal.value / goal.target) * 100)) : 0;
                return (
                  <div key={key} className={`home-goal ${goal.done ? 'done' : ''}`}>
                    <div className="home-goal-head"><span>{labels[key]}</span><strong>{value}/{target}</strong></div>
                    <Progress value={percent} tone={goal.done ? 'green' : 'accent'} />
                  </div>
                );
              })}
            </div>
            <p className="muted-note">Metas definidas na rotina do planner.</p>
          </Card>

          <Card>
            <div className="section-head small"><div><span className="eyebrow">Rotina</span><h2>Metas do planner</h2></div><CalendarDays size={18} /></div>
            <div className="account-metrics">
              <div><span>Questões/dia</span><strong>{user.goalQuestions}</strong></div>
              <div><span>Horas/dia</span><strong>{user.dailyHours}h</strong></div>
              <div><span>Dias/semana</span><strong>{user.studyDays.length}</strong></div>
              <div><span>Prova</span><strong>{fmtDate(user.examDate)}</strong></div>
            </div>
            <Button variant="soft" size="sm" onClick={() => setSection('planner')} icon={CalendarDays}>Editar rotina</Button>
          </Card>

          <Card>
            <div className="section-head small"><div><span className="eyebrow">Ranking</span><h2>ID #{rankingId(account || 'davi')}</h2></div></div>
            <div className="account-metrics">
              <div><span>Pontos hoje</span><strong>{rank.points}</strong></div>
              <div><span>Metas</span><strong>{rank.goalsDone}/3</strong></div>
            </div>
            <Link to="/ranking" className="btn btn-soft btn-sm">Abrir ranking</Link>
          </Card>
        </div>
      )}

      {section === 'planner' && (
        <div className="account-grid">
          <Card>
            <div className="section-head small"><div><span className="eyebrow">Plano Pro</span><h2>Ritmo e nível</h2></div><Chip tone="accent">conteúdo liberado</Chip></div>
            <p className="muted-note">O semestre é só perfil. O nível de referência nasce das suas horas, constância, profundidade escolhida e proximidade da prova.</p>
            <Field label="Como você quer estudar?">
              <select value={form.studyPace} onChange={(e) => setForm({ ...form, studyPace: e.target.value })}>
                {STUDY_PACES.map((pace) => <option key={pace.id} value={pace.id}>{pace.label}</option>)}
              </select>
            </Field>
            <Field label="Nível de referência" hint="Não limita o planner: todos os temas ficam disponíveis.">
              <select value={formLevel.id} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}>
                {LEVELS.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}{item.id === recommendation.levelId ? ' (recomendado)' : ''}</option>)}
              </select>
            </Field>
            <div className="level-preview recommended" style={{ '--level-tone': recommendation.level.tone }}>
              <span className="level-preview-code small">{recommendation.level.code}</span>
              <div>
                <strong>Recomendado: nível {recommendation.level.id} · {recommendation.level.name}</strong>
                <p>{recommendation.reason}</p>
              </div>
            </div>
            <Button variant="soft" size="sm" onClick={() => setForm({ ...form, level: recommendation.levelId })} icon={Sparkles}>Usar nível recomendado</Button>
          </Card>

          <Card>
            <div className="section-head small"><div><span className="eyebrow">Planner</span><h2>Rotina de estudo</h2></div><CalendarDays size={19} /></div>
            <div className="form-2">
              <Field label="Data da prova"><input type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} /></Field>
              <Field label="Início do plano"><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            </div>
            <div className="form-2">
              <Field label="Meta de questões/dia"><input type="number" min={5} max={400} value={form.goalQuestions} onChange={(e) => setForm({ ...form, goalQuestions: Number(e.target.value) })} /></Field>
              <Field label="Horas por dia"><select value={form.dailyHours} onChange={(e) => setForm({ ...form, dailyHours: Number(e.target.value) })}>{[1,2,3,4,5,6].map((h) => <option key={h} value={h}>{h}h</option>)}</select></Field>
            </div>
            <Field label="Dias de estudo"><div className="day-picker compact">{WEEKDAYS.map((day, index) => <button key={day} type="button" className={form.studyDays.includes(index) ? 'active' : ''} onClick={() => toggleDay(index)}>{day}</button>)}</div></Field>
            <div className="plan-actions">
              <Button onClick={save} icon={Save}>Salvar rotina</Button>
              <Button variant="soft" onClick={saveAndPlan} icon={RefreshCw}>Salvar e regerar plano</Button>
            </div>
            <p className="muted-note">O plano personalizado usa todos os temas, prioriza suas especialidades difíceis, seus erros e a incidência das provas. Ao regerar, as sessões futuras são recalculadas.</p>
          </Card>
        </div>
      )}

      {section === 'ajustes' && (
        <div className="account-grid">
          <Card>
            <span className="eyebrow">Tema</span>
            <Segmented options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }]} value={user.settings?.theme || 'light'} onChange={setTheme} label="Tema" />
          </Card>
          <Card>
            <span className="eyebrow">Dados</span>
            <h2>Backup</h2>
            <p className="muted-note">Inclui perfil, checklists, tentativas, anotações e plano.</p>
            <div className="stack-actions">
              <Button onClick={backup} disabled={Boolean(busy)} icon={Download}>{busy === 'backup' ? 'Preparando…' : 'Exportar backup'}</Button>
              <Button variant="soft" onClick={() => fileRef.current?.click()} icon={Upload}>Restaurar backup</Button>
              <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => restore(e.target.files?.[0])} />
            </div>
          </Card>
          <Card className="danger-card">
            <span className="eyebrow">Apagar progresso</span>
            <h2>Recomeçar</h2>
            <p>Apaga progresso pessoal e plano. O banco de questões e as fontes permanecem.</p>
            <Button variant="danger" onClick={reset} disabled={Boolean(busy)} icon={RotateCcw}>Zerar meu progresso</Button>
          </Card>
        </div>
      )}

      {section === 'suporte' && (
        <div className="account-grid">
          <Card>
            <div className="section-head small"><div><span className="eyebrow">Suporte</span><h2>Falar com o suporte</h2></div><HelpCircle size={19} /></div>
            <p className="muted-note">Problemas de acesso, dados ou sugestões. Responda com o ID da conta para agilizar.</p>
            <div className="stack-actions">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-solid"><HelpCircle size={16} /> Enviar email</a>
              <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className="btn btn-ghost">Abrir chamado</a>
            </div>
            <div className="profile-meta">
              <div><span>Email</span><strong>{SUPPORT_EMAIL}</strong></div>
              <div><span>ID da conta</span><strong>#{rankingId(account || 'davi')}</strong></div>
            </div>
          </Card>
          <Card>
            <div className="section-head small"><div><span className="eyebrow">Antes de abrir</span><h2>Verifique</h2></div></div>
            <ul className="support-list">
              <li>Se o login falhar, confirme usuário e senha com o administrador.</li>
              <li>Se os dados não aparecerem, atualize a página e verifique a conexão.</li>
              <li>Para trocar de aparelho, exporte um backup em Ajustes.</li>
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
