import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, CalendarPlus, Check, CloudOff, Crown, FileUp, FlaskConical,
  Headphones, MessageSquareQuote, Network, NotebookPen, Pill, Radar, ScanEye, ScrollText,
  Sparkles, Swords, Timer, Trophy, Users,
} from 'lucide-react';
import { Button, Card, Chip, PageHead } from '../components/ui.jsx';
import { CATEGORIES, MODULES } from '../pulso/modules.js';
import { useStore } from '../store.jsx';

const ICONS = { Timer, Swords, Trophy, Radar, ScrollText, ScanEye, Activity, Pill, FlaskConical, NotebookPen, Network, Headphones, MessageSquareQuote, Users, Sparkles, FileUp, CalendarPlus, CloudOff };

export default function Pulso() {
  const { user, updateUser, toast } = useStore();
  const isPro = user.settings?.plan !== 'essencial';
  return (
    <>
      <PageHead
        eyebrow="Pulso Pro · suíte integrada"
        title={<>Suas ferramentas, <em>em um só lugar.</em></>}
        subtitle="18 ferramentas conectadas ao seu progresso, ao banco de questões e ao planner. Esta é uma demonstração completa do plano Pro."
        actions={<Chip tone={isPro ? 'accent' : 'neutral'}><Crown size={13} /> {isPro ? 'Pro liberado' : 'Plano Essencial'}</Chip>}
      />

      <Card className="pro-hero">
        <div>
          <span className="eyebrow light">Pulso Pro</span>
          <h2>Ferramentas conectadas para sua evolução.</h2>
          <p>Foco, simulados coletivos, biblioteca clínica, atlas, ECG, importação Anki, offline e retrospectiva. Tudo sem sair do seu plano de estudos.</p>
          <div className="pro-points">
            <span><Check size={14} /> Sem anúncios</span>
            <span><Check size={14} /> Dados exportáveis</span>
            <span><Check size={14} /> Feito para o ENARE</span>
          </div>
        </div>
        <div className="pro-price">
          <span>Demonstração</span>
          <strong>R$ 0</strong>
          <small>por 7 dias</small>
          <Button
            variant="light" size="sm"
            onClick={() => { updateUser((prev) => ({ ...prev, settings: { ...prev.settings, plan: isPro ? 'essencial' : 'pro' } })); toast(isPro ? 'Plano alterado para Essencial (demo).' : 'Pro liberado na demonstração.'); }}
          >
            {isPro ? 'Simular plano Essencial' : 'Ativar Pro demonstração'}
          </Button>
        </div>
      </Card>

      {CATEGORIES.map((cat) => {
        const items = MODULES.filter((m) => m.tag === cat.id);
        if (!items.length) return null;
        return (
          <section key={cat.id} className="pulse-section">
            <div className="section-head small">
              <div><span className="eyebrow">{cat.desc}</span><h2>{cat.label}</h2></div>
              <Chip tone="soft">{items.length} módulos</Chip>
            </div>
            <div className="pulse-grid">
              {items.map((m) => {
                const Icon = ICONS[m.icon] || Sparkles;
                return (
                  <Link key={m.id} to={m.path} className="pulse-card">
                    <span className="pulse-icon" style={{ background: `${m.color}18`, color: m.color }}><Icon size={21} /></span>
                    <div>
                      <div className="pulse-title"><strong>{m.name}</strong><Chip tone="soft">Pro</Chip></div>
                      <p>{m.desc}</p>
                    </div>
                    <ArrowRight size={16} className="pulse-arrow" />
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <Card className="pulse-principle">
        <div><Sparkles size={20} /><h3>Por que isso é diferente de um kit de apps</h3><p>Battle usa o mesmo banco que você errou. Focus marca a sessão do planner. Wrapped lê seu histórico. Atlas e Recall apontam para o subtópico. Tudo compartilha o mesmo grafo de aprendizado.</p></div>
        <div className="pulse-price-table">
          <div><strong>Essencial</strong><span>Planner + banco + checklists</span><b>Grátis</b></div>
          <div className="featured"><strong>Pulso Pro</strong><span>18 módulos + exportações + offline</span><b>R$ 29,90/mês</b></div>
          <div><strong>Mentoria</strong><span>Pro + acompanhamento humano</span><b>R$ 149/mês</b></div>
        </div>
      </Card>
      <p className="muted-note center">Plano atual: <strong>{isPro ? 'Pulso Pro (demonstração)' : 'Essencial'}</strong> · cobrança ainda simulada.</p>
    </>
  );
}
