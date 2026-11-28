import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Clock3, Compass, GraduationCap, Layers, Sparkles } from 'lucide-react';
import { Button, Field, Logo } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { WEEKDAYS, daysUntil, iso } from '../utils.js';
import {
  LEVELS, SEMESTERS, STUDY_PACES, levelById, levelStats, recommendLevel, semesterLabel,
} from '../trilha.js';
import { generatePlan } from '../planner.js';
import { STAGES } from '../metodo.js';

export default function Onboarding() {
  const { user, curriculum, updateUser, toast } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [levelOverride, setLevelOverride] = useState(null);
  const [form, setForm] = useState({
    name: user.name || '',
    semester: user.semester || 1,
    examDate: user.examDate || '2027-09-12',
    dailyHours: user.dailyHours || 3,
    studyDays: user.studyDays || [1, 2, 3, 4, 5, 6],
    studyPace: user.studyPace || 'equilibrado',
  });

  const recommendation = useMemo(
    () => recommendLevel(form),
    [form.dailyHours, form.studyDays, form.examDate, form.studyPace],
  );
  const levelId = levelOverride || recommendation.levelId;
  const level = levelById(levelId);
  const preview = useMemo(() => levelStats(curriculum, levelId, user.progress), [curriculum, levelId, user.progress]);

  const toggleDay = (d) => {
    setForm((f) => ({
      ...f,
      studyDays: f.studyDays.includes(d) ? f.studyDays.filter((x) => x !== d) : [...f.studyDays, d].sort(),
    }));
  };

  const finish = () => {
    const next = {
      ...user,
      ...form,
      name: form.name.trim() || 'Estudante',
      semester: Number(form.semester),
      level: levelId,
      startDate: iso(),
      onboardingDone: true,
      settings: { ...(user.settings || {}), plan: 'pro' },
    };
    const plan = generatePlan(next, curriculum, 8);
    updateUser({ ...next, plan });
    toast(`Plano personalizado criado. Nível de referência: N${levelId} · ${level.name}.`);
    navigate('/trilha');
  };

  return (
    <div className="onboard">
      <div className="onboard-art">
        <Logo />
        <div className="onboard-copy">
          <span className="eyebrow light">Pulso</span>
          <h1>Configurar<br /><em>estudo.</em></h1>
          <p>Informe sua rotina e sua data de prova. O nível é sugerido pelo seu ritmo — não pelo semestre.</p>
        </div>
        <div className="onboard-points">
          <div><Layers size={18} /> 5 níveis, 7 matérias e 90 temas</div>
          <div><GraduationCap size={18} /> Todo o conteúdo liberado desde o início</div>
          <div><Compass size={18} /> Planner personalizado pelas suas dificuldades</div>
        </div>
      </div>

      <div className="onboard-panel">
        {step === 0 && (
          <div className="onboard-welcome">
            <span className="onboard-step">Passo 1 de 3</span>
            <h2>Vamos montar seu curso.</h2>
            <p>Em menos de um minuto você define sua rotina, sua data de prova e o seu ritmo. O nível é só uma referência de profundidade; todo o conteúdo fica liberado.</p>
            <ul className="check-list-static">
              <li><Check size={16} /> Nível sugerido por horas de estudo, constância e proximidade da prova</li>
              <li><Check size={16} /> Semestre é apenas informação de perfil</li>
              <li><Check size={16} /> Planner Pro personalizado pelas especialidades mais difíceis</li>
            </ul>
            <div className="onboard-method">
              {STAGES.map((stage, index) => (
                <span key={stage.id}><b>{index + 1}</b>{stage.label}</span>
              ))}
            </div>
            <Button onClick={() => setStep(1)} icon={ArrowRight}>Começar meu onboarding</Button>
            <small>Seu progresso fica salvo na sua conta e pode ser exportado quando quiser.</small>
          </div>
        )}

        {step === 1 && (
          <div className="onboard-form">
            <span className="onboard-step">Passo 2 de 3 · seu perfil</span>
            <h2>Seu momento.</h2>
            <p>O semestre serve só para contextualizar seu perfil. Ele não define mais o seu nível nem bloqueia conteúdos.</p>
            <Field label="Como quer ser chamado(a)?">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Seu primeiro nome" autoFocus />
            </Field>
            <Field label="Semestre atual" hint={`${semesterLabel(form.semester)} · informação de perfil`}>
              <div className="semester-grid" role="group" aria-label="Semestre da faculdade">
                {SEMESTERS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className={form.semester === s.value ? 'active' : ''}
                    onClick={() => setForm({ ...form, semester: s.value })}
                    aria-pressed={form.semester === s.value}
                  >
                    <strong>{s.label}</strong>
                  </button>
                ))}
              </div>
            </Field>
            <div className="profile-note"><GraduationCap size={17} /><span>Seu nível será calculado pelo ritmo de estudo na próxima etapa. Você poderá mudar depois em Minha conta.</span></div>
            <div className="onboard-actions">
              <Button variant="ghost" onClick={() => setStep(0)}>Voltar</Button>
              <Button onClick={() => setStep(2)} icon={ArrowRight}>Continuar</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboard-form">
            <span className="onboard-step">Passo 3 de 3 · seu ritmo</span>
            <h2>Seu ritmo define o nível.</h2>
            <p>O Pulso combina horas por dia, frequência semanal, profundidade escolhida e proximidade da prova. O semestre não entra nessa conta.</p>
            <Field label="Data da prova" hint={form.examDate ? `${daysUntil(form.examDate)} dias a partir de hoje` : 'Defina uma data'}>
              <input type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} />
            </Field>
            <Field label="Horas disponíveis por dia de estudo" hint="Pode mudar depois no planner.">
              <div className="hours-picker">
                {[1, 2, 3, 4, 5, 6].map((h) => (
                  <button key={h} type="button" className={form.dailyHours === h ? 'active' : ''} onClick={() => setForm({ ...form, dailyHours: h })}>{h}h</button>
                ))}
              </div>
            </Field>
            <Field label="Dias da semana que consegue estudar">
              <div className="day-picker">
                {WEEKDAYS.map((d, i) => (
                  <button key={d} type="button" className={form.studyDays.includes(i) ? 'active' : ''} onClick={() => toggleDay(i)}>{d}</button>
                ))}
              </div>
            </Field>
            <Field label="Como você quer estudar?" hint="Você decide se quer algo mais avançado.">
              <div className="pace-picker">
                {STUDY_PACES.map((pace) => (
                  <button
                    key={pace.id}
                    type="button"
                    className={form.studyPace === pace.id ? 'active' : ''}
                    onClick={() => setForm({ ...form, studyPace: pace.id })}
                  >
                    <strong>{pace.label}</strong>
                    <span>{pace.description}</span>
                  </button>
                ))}
              </div>
            </Field>
            <div className="level-preview recommended" style={{ '--level-tone': level.tone }}>
              <span className="level-preview-code">{level.code}</span>
              <div>
                <strong>Nível sugerido: {level.id} · {level.name}</strong>
                <p>{recommendation.reason}</p>
                <small>{preview.subjects.length} matérias · {preview.total} temas liberados · {recommendation.phase.label}</small>
              </div>
            </div>
            <div className="level-select-row">
              <Field label="Nível de referência" hint="Organiza a ordem sugerida. O planner personalizado usa todos os conteúdos.">
                <select value={level.id} onChange={(e) => setLevelOverride(Number(e.target.value))}>
                  {LEVELS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.name}{item.id === recommendation.levelId ? ' (recomendado)' : ''}
                    </option>
                  ))}
                </select>
              </Field>
              {levelOverride && <Button variant="ghost" size="sm" onClick={() => setLevelOverride(null)} icon={Sparkles}>Usar recomendado</Button>}
            </div>
            <div className="onboard-actions">
              <Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={finish} disabled={!form.examDate || !form.studyDays.length} icon={Clock3}>Criar meu plano</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
