import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CalendarDays, Check, GraduationCap, HeartPulse, Layers, RefreshCw, ShieldCheck, Sparkles,
} from 'lucide-react';
import { Logo } from '../components/ui.jsx';
import { fmtDate, iso } from '../utils.js';
import { LEVELS } from '../trilha.js';

export default function Landing() {
  const [tab, setTab] = useState('planner');
  const [date, setDate] = useState('2026-12-10');

  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/" className="landing-brand"><Logo /></Link>
        <nav>
          <a href="#metodo">Método</a>
          <a href="#niveis">Níveis</a>
          <a href="#planos">Planos</a>
          <a href="#faq">FAQ</a>
          <Link to="/login" className="btn btn-solid btn-sm">Entrar</Link>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <span className="eyebrow light">Pulso · Medical Learning System</span>
            <h1>Seu estudo de hoje.<br /><em>Sua residência amanhã.</em></h1>
            <p>Organize a preparação, pratique com questões e volte ao conteúdo quando for hora de revisar. Um sistema cardíaco de estudos para o ENARE.</p>
            <div className="landing-actions">
              <Link to="/login" className="btn btn-warm">Começar a estudar <ArrowRight size={16} /></Link>
              <Link to="/login" className="landing-link">Experimentar o planner</Link>
            </div>
            <div className="landing-vitals"><HeartPulse size={15} /> 60 bpm <span>PA 90/60</span><span>perfusão estável</span></div>
          </div>
          <div className="landing-heart">
            <div className="orbit" />
            <img src="/art/heart.webp" alt="Ilustração anatômica do coração" />
          </div>
        </section>

        <section className="landing-section" id="metodo">
          <div className="landing-section-copy">
            <span className="eyebrow">Conheça o método</span>
            <h2>Planeje. Aprenda. Revise. Evolua.</h2>
            <ul className="landing-steps">
              <li><CalendarDays size={18} /><div><strong>Escolha quando começar</strong><span>O planner distribui carga por peso e incidência.</span></div></li>
              <li><RefreshCw size={18} /><div><strong>Relembre antes de consultar</strong><span>Recall e revisão espaçada em vez de releitura passiva.</span></div></li>
              <li><ShieldCheck size={18} /><div><strong>Retome seus erros</strong><span>O caderno transforma erro em próxima prioridade.</span></div></li>
            </ul>
            <p className="muted-note">A demonstração usa um exemplo. Seu histórico pessoal começa quando entra na conta.</p>
          </div>
          <div className="landing-demo">
            <div className="segmented">
              <button className={tab === 'planner' ? 'active' : ''} onClick={() => setTab('planner')}><CalendarDays size={14} /> Planner</button>
              <button className={tab === 'flash' ? 'active' : ''} onClick={() => setTab('flash')}><Layers size={14} /> Flashcard</button>
            </div>
            {tab === 'planner' ? (
              <>
                <label className="demo-label">Experimente uma data de início</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <div className="demo-session"><div><strong>Síndrome coronariana aguda</strong><span>{fmtDate(date, { day: '2-digit', month: 'long', year: 'numeric' })} · Teoria</span></div><span>45 min</span></div>
              </>
            ) : (
              <div className="demo-flash">
                <span className="eyebrow">Frente</span>
                <strong>Quais são os critérios de gravidade da SCA?</strong>
                <span className="eyebrow">Verso</span>
                <p>Dor persistente, instabilidade, supra de ST, Killip &gt; II, arritmia e marcadores elevados.</p>
              </div>
            )}
          </div>
        </section>

        <section className="landing-section levels" id="niveis">
          <div className="landing-section-head">
            <div><span className="eyebrow">Curso em níveis</span><h2>Do fundamento ao internato.</h2></div>
            <p>Informe seu semestre e o Pulso monta a trilha do seu período, matéria por matéria.</p>
          </div>
          <div className="landing-levels">
            {LEVELS.map((level) => (
              <article key={level.id} className="landing-level" style={{ '--level-tone': level.tone }}>
                <span className="landing-level-code"><GraduationCap size={13} /> {level.code}</span>
                <h3>{level.name}</h3>
                <small>{level.semesterLabel}</small>
                <p>{level.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section plans" id="planos">
          <div className="landing-section-head">
            <div><span className="eyebrow">Assinaturas</span><h2>Escolha seu plano de estudos</h2></div>
            <p>Os planos pagos estão em demonstração. Agora, o Pro está liberado.</p>
          </div>
          <div className="plan-grid">
            <article className="plan-card"><h3>Pulso Free</h3><div className="price">R$ 0<small>/mês</small></div><ul><li><Check size={14} /> Planner básico</li><li><Check size={14} /> Check-in diário</li><li><Check size={14} /> Questões e revisões limitadas</li></ul><Link to="/login" className="btn btn-ghost">Acessar demonstração</Link></article>
            <article className="plan-card featured"><span className="plan-badge">Pro liberado</span><h3>Pulso Pro</h3><div className="price">R$ 29,90<small>/mês</small></div><ul><li><Check size={14} /> Planner adaptativo</li><li><Check size={14} /> Banco completo e caderno de erros</li><li><Check size={14} /> Pulso Focus, Atlas, ECG, Anki e offline</li></ul><Link to="/login" className="btn btn-solid">Entrar no Pro</Link></article>
            <article className="plan-card"><h3>Pulso Premium</h3><div className="price">R$ 49,90<small>/mês</small></div><ul><li><Check size={14} /> Tudo do Pro</li><li><Check size={14} /> Casos clínicos e estações</li><li><Check size={14} /> Acompanhamento com mentor</li></ul><Link to="/login" className="btn btn-ghost">Em breve</Link></article>
          </div>
        </section>

        <section className="landing-section faq" id="faq">
          <div className="landing-section-head"><div><span className="eyebrow">Dúvidas</span><h2>Perguntas frequentes</h2></div></div>
          <details><summary>Posso escolher a data inicial do planner?</summary><p>Sim. A data fica nas configurações e o plano é refeito a partir dela.</p></details>
          <details><summary>Como são agendadas as revisões?</summary><p>Após concluir o checklist, você registra confiança e o sistema agenda D+1, D+7 ou D+30.</p></details>
          <details><summary>Preciso de cartão para começar?</summary><p>Não. Entre com a conta liberada para você e comece pelo onboarding do semestre. Nenhuma cobrança é feita.</p></details>
          <details><summary>Os dados ficam no navegador?</summary><p>O Pulso publicado salva em banco de nuvem, mas nunca saiu da sua conta. Você pode exportar backup em Ajustes.</p></details>
        </section>

        <section className="landing-cta">
          <Sparkles size={22} />
          <div><h2>Menos ruído. Mais direção.</h2><p>Entre com uma conta de demonstração e veja o sistema completo.</p></div>
          <Link to="/login" className="btn btn-warm">Começar agora</Link>
        </section>
      </main>

      <footer className="landing-footer">
        <Logo />
        <span>Termos e privacidade · Central de ajuda</span>
        <span>{fmtDate(iso(), { day: '2-digit', month: 'long', year: 'numeric' })}</span>
      </footer>
    </div>
  );
}
