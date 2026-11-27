import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpenCheck, Brain, CheckCircle2, CircleSlash, FlaskConical,
  GraduationCap, Repeat, Shuffle, Target,
} from 'lucide-react';
import { Card, Chip, PageHead } from '../components/ui.jsx';
import { LOW_UTILITY, PRINCIPLES, STAGES } from '../metodo.js';
import { useStore } from '../store.jsx';
import { globalStats } from '../utils.js';

const STAGE_ICONS = { ativar: Brain, codificar: BookOpenCheck, recuperar: Target, revisar: Repeat, intercalar: Shuffle };

export default function Metodo() {
  const { user, curriculum } = useStore();
  const stats = globalStats(curriculum, user.progress);
  const totalTopics = stats.totalTopics;
  const mastered = stats.mastered;

  return (
    <>
      <PageHead
        eyebrow="Método Pulso · aprendizagem baseada em evidências"
        title={<>Estudar melhor, <em>não só mais.</em></>}
        subtitle="Não existe um único método ideal para todo mundo. A literatura converge em alguns princípios com forte suporte. O Pulso transforma esses princípios em um ciclo curto e repetível."
        actions={<Link to="/trilha" className="btn btn-solid"><GraduationCap size={16} /> Ver minha trilha</Link>}
      />

      <Card className="method-hero">
        <div className="method-hero-copy">
          <Chip tone="accent"><FlaskConical size={13} /> O ciclo do Pulso</Chip>
          <h2>Ativar → Codificar → Recuperar → Revisar → Intercalar.</h2>
          <p>Cada etapa tem uma função cognitiva diferente. O objetivo não é passar mais tempo lendo: é criar recuperação difícil, feedback e retorno espaçado — as condições que mais sustentam retenção de longo prazo.</p>
          <div className="method-hero-meta">
            <span><CheckCircle2 size={14} /> {mastered} temas dominados</span>
            <span><BookOpenCheck size={14} /> {totalTopics} temas na trilha</span>
          </div>
        </div>
        <div className="method-hero-badge">
          <span>5</span>
          <small>etapas</small>
        </div>
      </Card>

      <section className="method-cycle">
        {STAGES.map((stage, index) => {
          const Icon = STAGE_ICONS[stage.id] || Target;
          return (
            <Card key={stage.id} className="method-stage" style={{ '--stage-index': index }}>
              <div className="method-stage-top">
                <span className="method-stage-num">0{index + 1}</span>
                <span className="method-stage-icon"><Icon size={18} /></span>
              </div>
              <h3>{stage.label}</h3>
              <p>{stage.description}</p>
              <span className="method-stage-why">{stage.why}</span>
              <small>{stage.minutes} min</small>
            </Card>
          );
        })}
      </section>

      <div className="section-head method-section-head">
        <div><span className="eyebrow">O que a evidência sustenta</span><h2>Princípios que usamos — e por quê</h2></div>
        <Chip tone="neutral">revisão narrativa, não promessa de resultado</Chip>
      </div>

      <div className="method-principles">
        {PRINCIPLES.map((principle, index) => (
          <Card key={principle.id} className="method-principle">
            <div className="method-principle-head">
              <span className="method-principle-num">{String(index + 1).padStart(2, '0')}</span>
              <h3>{principle.name}</h3>
            </div>
            <p>{principle.summary}</p>
            <div className="method-application"><strong>No Pulso:</strong> {principle.application}</div>
            <div className="method-evidence">{principle.evidence}</div>
            <div className="method-refs">
              {principle.refs.map((ref) => (
                <a key={ref.label} href={ref.href} target="_blank" rel="noreferrer">{ref.label} ↗</a>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="method-two-col">
        <Card className="method-avoid">
          <div className="section-head small"><div><span className="eyebrow">Baixo retorno</span><h2>O que evitar</h2></div><CircleSlash size={19} /></div>
          <ul>
            {LOW_UTILITY.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p className="muted-note">Essas estratégias podem dar sensação de progresso sem produzir retenção proporcional. Elas não são proibidas — só não devem ser o centro do método.</p>
        </Card>

        <Card className="method-apply">
          <div className="section-head small"><div><span className="eyebrow">Aplicação</span><h2>Como o Pulso implementa</h2></div></div>
          <div className="method-apply-list">
            <div><strong>1. Trilha em níveis</strong><span>Complexidade progressiva e carga cognitiva controlada.</span></div>
            <div><strong>2. Ciclo do tema</strong><span>Ativação, codificação, recuperação e revisão no mesmo lugar.</span></div>
            <div><strong>3. Revisão adaptativa</strong><span>Intervalos que crescem com o desempenho e encurtam no lapso.</span></div>
            <div><strong>4. Treino intercalado</strong><span>Questões misturadas e simulados para treinar discriminação.</span></div>
            <div><strong>5. Calibração</strong><span>Confiança registrada é comparada ao acerto real.</span></div>
          </div>
          <Link to="/planner" className="btn btn-soft">Aplicar no meu plano <ArrowRight size={15} /></Link>
        </Card>
      </div>

      <Card className="method-note">
        <FlaskConical size={19} />
        <div>
          <h3>Uma ressalva importante</h3>
          <p>“Baseado em evidências” não significa que existe um método perfeito ou garantia de aprovação. Significa que as escolhas do app são informadas por pesquisas sobre memória, aprendizagem e feedback — e continuam abertas a ajuste com seus dados. O melhor método é o que você consegue sustentar com recuperação, espaçamento e correção de erros.</p>
          <div className="method-refs">
            <a href="https://doi.org/10.1177/1529100612453266" target="_blank" rel="noreferrer">Dunlosky et al., 2013 ↗</a>
            <a href="https://doi.org/10.1111/j.1467-9280.2006.01693.x" target="_blank" rel="noreferrer">Roediger &amp; Karpicke, 2006 ↗</a>
            <a href="https://doi.org/10.1037/0033-2909.132.3.354" target="_blank" rel="noreferrer">Cepeda et al., 2006 ↗</a>
            <a href="https://doi.org/10.1111/j.1365-2923.2008.03124.x" target="_blank" rel="noreferrer">Larsen et al., 2008 ↗</a>
          </div>
        </div>
      </Card>

      <div className="method-cta">
        <div><span className="eyebrow light">Próximo passo</span><h2>Transforme o método em rotina.</h2><p>O planner distribui codificação, recuperação, revisão e intercalação na sua semana.</p></div>
        <Link to="/planner" className="btn btn-light">Abrir planner <ArrowRight size={16} /></Link>
      </div>
    </>
  );
}
