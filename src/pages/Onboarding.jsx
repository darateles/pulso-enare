import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Clock3, Compass, GraduationCap, Layers } from 'lucide-react';
import { Button, Field, Logo } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { WEEKDAYS, iso, daysUntil } from '../utils.js';
import { SEMESTERS, levelById, levelStats, semesterLabel, semesterLevel } from '../trilha.js';
import { generatePlan } from '../planner.js';
import { STAGES } from '../metodo.js';

export default function Onboarding() {
  const { user, curriculum, updateUser, toast } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: user.name || '',
    semester: user.semester || 1,
    examDate: user.examDate || '2027-09-12',
    dailyHours: user.dailyHours || 3,
    studyDays: user.studyDays || [1, 2, 3, 4, 5, 6],
  });

  const levelId = semesterLevel(form.semester);
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
    toast(`Plano do Nível ${levelId} criado. Bem-vindo(a) à trilha.`);
    navigate('/trilha');
  };

  return (
    <div className="onboard">
      <div className="onboard-art">
        <Logo />
        <div className="onboard-copy">
          <span className="eyebrow light">Pulso · curso em níveis</span>
          <h1>Sua preparação,<br /><em>nível por nível.</em></h1>
          <p>Informe seu semestre. O Pulso monta uma trilha com os temas certos para o seu momento — e um plano que respeita sua rotina.</p>
        </div>
        <div className="onboard-points">
          <div><Layers size={18} /> 5 níveis, 7 matérias e 90 temas organizados</div>
          <div><GraduationCap size={18} /> Conteúdo priorizado pelo seu período da faculdade</div>
          <div><Compass size={18} /> Checklists, revisões e questões conectados ao plano</div>
        </div>
        <div className="onboard-quote">“Planeje com clareza. Evolua com consistência.”</div>
      </div>

      <div className="onboard-panel">
        {step === 0 && (
          <div className="onboard-welcome">
            <span className="onboard-step">Passo 1 de 3</span>
            <h2>Vamos montar seu curso.</h2>
            <p>Em menos de um minuto você define seu semestre, sua rotina e sua data de prova. O sistema transforma isso em uma trilha com níveis e um plano de 8 semanas.</p>
            <ul className="check-list-static">
              <li><Check size={16} /> Níveis do fundamental ao internato, como um curso</li>
              <li><Check size={16} /> Ciclo baseado em evidências: recuperação, espaçamento e intercalação</li>
              <li><Check size={16} /> Revisão adaptativa e plano personalizado por prioridade e erros</li>
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
            <span className="onboard-step">Passo 2 de 3 · seu momento</span>
            <h2>Em que semestre você está?</h2>
            <p>O nível da sua trilha é definido pelo período da faculdade. Você pode ajustar isso depois, em Ajustes ou na própria Trilha.</p>
            <Field label="Como quer ser chamado(a)?">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Seu primeiro nome" autoFocus />
            </Field>
            <Field label="Semestre atual" hint={`${semesterLabel(form.semester)} · ${level.semesterLabel}`}>
              <div className="semester-grid" role="group" aria-label="Semestre da faculdade">
                {SEMESTERS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className={form.semester === s.value ? 'active' : ''}
                    style={{ '--level-tone': levelById(s.level).tone }}
                    onClick={() => setForm({ ...form, semester: s.value })}
                    aria-pressed={form.semester === s.value}
                  >
                    <strong>{s.label}</strong>
                    <span>N{s.level}</span>
                  </button>
                ))}
              </div>
            </Field>
            <div className="level-preview" style={{ '--level-tone': level.tone }}>
              <span className="level-preview-code">{level.code}</span>
              <div>
                <strong>Nível {level.id} · {level.name}</strong>
                <p>{level.description}</p>
                <small>{preview.subjects.length} matérias · {preview.total} temas · {level.semesterLabel}</small>
              </div>
            </div>
            <div className="onboard-actions">
              <Button variant="ghost" onClick={() => setStep(0)}>Voltar</Button>
              <Button onClick={() => setStep(2)} icon={ArrowRight}>Continuar</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboard-form">
            <span className="onboard-step">Passo 3 de 3 · sua rotina</span>
            <h2>Seu ponto de partida.</h2>
            <p>Use dados realistas. O plano distribui a carga do seu nível por prioridade — não por perfeição.</p>
            <div className="onboard-level-line">
              <span className="level-preview-code small">{level.code}</span>
              <span><strong>Nível {level.id} · {level.name}</strong> · {level.semesterLabel}</span>
            </div>
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
            <div className="onboard-actions">
              <Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={finish} disabled={!form.examDate || !form.studyDays.length} icon={Clock3}>Criar minha trilha e plano</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
