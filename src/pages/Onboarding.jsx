import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Clock3, Compass, Target, ShieldCheck } from 'lucide-react';
import { Button, Field, Logo } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { WEEKDAYS, iso, daysUntil } from '../utils.js';

export default function Onboarding() {
  const { user, updateUser } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: user.name || '',
    examDate: user.examDate || '2027-09-12',
    dailyHours: user.dailyHours || 3,
    studyDays: user.studyDays || [1, 2, 3, 4, 5, 6],
  });

  const toggleDay = (d) => {
    setForm((f) => ({
      ...f,
      studyDays: f.studyDays.includes(d) ? f.studyDays.filter((x) => x !== d) : [...f.studyDays, d].sort(),
    }));
  };

  const finish = () => {
    updateUser({
      ...form,
      name: form.name.trim() || 'Estudante',
      startDate: iso(),
      onboardingDone: true,
      settings: { ...(user.settings || {}), plan: 'pro' },
    });
    navigate('/');
  };

  return (
    <div className="onboard">
      <div className="onboard-art">
        <Logo />
        <div className="onboard-copy">
          <span className="eyebrow light">Sistema cardíaco · ENARE</span>
          <h1>Seu estudo no<br /><em>ritmo certo.</em></h1>
          <p>Um plano que monitora o que mais cai, o que você domina e o que precisa voltar à circulação.</p>
        </div>
        <div className="onboard-points">
          <div><Target size={18} /> 82 subtópicos priorizados por incidência real</div>
          <div><ShieldCheck size={18} /> 300 questões oficiais com comentários</div>
          <div><Compass size={18} /> Checklists, revisões e monitor de ritmo</div>
        </div>
        <div className="onboard-quote">“Constância não é correr. É manter o pulso.”</div>
      </div>

      <div className="onboard-panel">
        {step === 0 ? (
          <div className="onboard-welcome">
            <span className="onboard-step">Passo 1 de 2</span>
            <h2>Vamos calibrar seu ritmo.</h2>
            <p>Em 30 segundos você define data, rotina e objetivo. O sistema monta o plano a partir do seu pulso de estudo — e você ajusta quando precisar.</p>
            <ul className="check-list-static">
              <li><Check size={16} /> Progresso salvo localmente, como um prontuário</li>
              <li><Check size={16} /> Checklists por subtópico com monitor de constância</li>
              <li><Check size={16} /> Banco com provas oficiais e importação de novas fontes</li>
            </ul>
            <Button onClick={() => setStep(1)} icon={ArrowRight}>Sintonizar meu plano</Button>
            <small>Sem cadastro. Sem cobrança. Seus dados ficam com você.</small>
          </div>
        ) : (
          <div className="onboard-form">
            <span className="onboard-step">Passo 2 de 2</span>
            <h2>Seu pulso basal.</h2>
            <p>Use dados realistas. O plano distribui carga por área e prioridade — não por perfeição.</p>
            <Field label="Como quer ser chamado(a)?">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Seu primeiro nome" autoFocus />
            </Field>
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
              <Button variant="ghost" onClick={() => setStep(0)}>Voltar</Button>
              <Button onClick={finish} disabled={!form.examDate || !form.studyDays.length} icon={Clock3}>Criar meu plano</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
