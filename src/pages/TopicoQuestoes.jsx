import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ExternalLink, ListChecks, NotebookPen, Shuffle, Target, Trophy } from 'lucide-react';
import { Button, Card, Chip, Empty } from '../components/ui.jsx';
import { useTopic } from '../useTopic.js';
import TopicPageShell from '../components/TopicPageShell.jsx';

export default function TopicoQuestoes() {
  const data = useTopic();
  const navigate = useNavigate();
  if (!data.found) return <Card><p>Tema não encontrado. <Link to="/trilha">Voltar à trilha.</Link></p></Card>;
  const { t, related, cal } = data;

  return (
    <TopicPageShell data={data} eyebrow="Recuperação" title="Questões do tema" subtitle={t.title}>
      <Card>
        <div className="section-head small">
          <div><span className="eyebrow">Recuperação</span><h2>Questões do tema</h2></div>
          <Chip>{related.length} disponíveis</Chip>
        </div>
        <p className="muted-note">Responda sem consultar. O feedback e o caderno de erros transformam cada erro em próxima prioridade.</p>
        <div className="topic-question-stats">
          <div><span>Respondidas</span><strong>{cal.total}</strong></div>
          <div><span>Acerto</span><strong>{cal.accuracy != null ? `${cal.accuracy}%` : '—'}</strong></div>
          <div><span>Confiança</span><strong>{cal.confidence != null ? `${cal.confidence}%` : '—'}</strong></div>
        </div>
        <div className="related-actions">
          <Button variant="soft" onClick={() => navigate(`/questoes/treino?topic=${t.id}`)} icon={ListChecks}>Treinar este tema</Button>
          <Button variant="ghost" onClick={() => navigate('/questoes/treino?modo=intercalado')} icon={Shuffle}>Treino intercalado</Button>
          <Button variant="ghost" onClick={() => navigate('/questoes/importar')} icon={ExternalLink}>Importar questões</Button>
        </div>
      </Card>

      <Card>
        <div className="section-head small">
          <div><span className="eyebrow">Banco</span><h2>Questões ligadas a este tema</h2></div>
          <Trophy size={18} />
        </div>
        {related.length ? (
          <div className="related-list">
            {related.map((question) => (
              <Link key={question.id} to={`/questoes?q=${question.id}`} className="mini-row">
                <span className="q-num">Q</span>
                <span>{question.stem.slice(0, 120)}…</span>
                <ArrowRight size={14} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            icon={Target}
            title="Sem questões deste tema"
            text="Importe uma prova ou gere uma questão no banco. O tema continua no seu checklist."
            action={<Button onClick={() => navigate('/questoes/importar')} icon={ExternalLink}>Importar questões</Button>}
          />
        )}
      </Card>

      <div className="topic-next-actions">
        <Link to={`/conteudos/${t.id}/revisao`} className="btn btn-soft">Revisar e calibrar <ArrowRight size={15} /></Link>
        <Link to="/caderno-erros" className="btn btn-ghost"><NotebookPen size={15} /> Caderno de erros</Link>
        <Link to={`/conteudos/${t.id}`} className="btn btn-ghost">Voltar ao conteúdo</Link>
      </div>
    </TopicPageShell>
  );
}
