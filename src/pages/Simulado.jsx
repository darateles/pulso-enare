import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock3, ShieldAlert, Timer } from 'lucide-react';
import { Button, Card, Chip, Field, PageHead, Progress, Stat } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import QuestionPlayer, { Results } from '../components/QuestionPlayer.jsx';
import { shuffle } from '../utils.js';

export default function Simulado() {
  const { curriculum, questions } = useStore();
  const navigate = useNavigate();
  const [area, setArea] = useState('todas');
  const [count, setCount] = useState(20);
  const [pool, setPool] = useState(null);
  const [results, setResults] = useState(null);
  const duration = useMemo(() => Math.round(count * 1.5), [count]);

  const available = questions.filter((q) => q.answer && (area === 'todas' || q.area === area)).length;

  const start = () => {
    const arr = shuffle(questions.filter((q) => q.answer && (area === 'todas' || q.area === area))).slice(0, count);
    if (!arr.length) return;
    setPool(arr);
    setResults(null);
  };

  if (results) return <Results data={results} onRestart={() => { setPool(null); setResults(null); }} exitTo="/questoes/simulado" />;
  if (pool) return <QuestionPlayer pool={pool} mode="simulado" duration={duration} onFinish={setResults} />;

  return (
    <>
      <button className="back-link" onClick={() => navigate('/questoes')}><ArrowLeft size={15} /> Banco de questões</button>
      <PageHead eyebrow="Simulado" title="Simulado" subtitle="Questões cronometradas, sem comentário até o fim." />
      <div className="simulado-grid">
        <Card>
          <span className="eyebrow">Configuração</span>
          <h2>Escolha o recorte</h2>
          <Field label="Área">
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="todas">Todas as áreas (misto)</option>
              {curriculum.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Número de questões">
            <div className="count-options">
              {[10, 20, 50, 100].map((n) => <button key={n} className={count === n ? 'active' : ''} onClick={() => setCount(n)} disabled={n > available}>{n}</button>)}
            </div>
          </Field>
          <div className="simulado-box">
            <div><Timer size={18} /><span>Tempo de prova</span><strong>{duration} min</strong></div>
            <div><ShieldAlert size={18} /><span>Disponíveis no recorte</span><strong>{available}</strong></div>
            <div><Clock3 size={18} /><span>Ritmo</span><strong>1,5 min/questão</strong></div>
          </div>
          <Button className="wide" onClick={start} disabled={!available}>Iniciar simulado</Button>
          <p className="muted-note">Ao esgotar o tempo, o simulado é encerrado automaticamente.</p>
        </Card>
        <Card className="simulado-info">
          <span className="eyebrow">Como encarar</span>
          <h2>Treino ≠ simulado</h2>
          <p>No simulado, você não recebe feedback por questão. Marque as dúvidas, siga em frente e só revise no resultado. Isso treina decisão e controle de tempo.</p>
          <ul>
            <li>Leia o enunciado até o fim antes de olhar alternativas.</li>
            <li>Não fique mais de 2 minutos em uma questão.</li>
            <li>Chute consciente: elimine ao menos duas alternativas.</li>
            <li>Reserve os últimos 5 minutos para conferir marcações.</li>
          </ul>
          <Chip tone="accent">Questões oficiais ENARE 2022 e 2024</Chip>
        </Card>
      </div>
    </>
  );
}
