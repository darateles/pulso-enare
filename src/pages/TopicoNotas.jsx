import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, NotebookPen } from 'lucide-react';
import { Card, Field } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { useTopic } from '../useTopic.js';
import TopicPageShell from '../components/TopicPageShell.jsx';

export default function TopicoNotas() {
  const data = useTopic();
  const { setTopicNote } = useStore();
  if (!data.found) return <Card><p>Tema não encontrado. <Link to="/trilha">Voltar à trilha.</Link></p></Card>;
  const { t, progress } = data;

  return (
    <TopicPageShell data={data} eyebrow="Elaboração" title="Anotações do tema" subtitle={t.title}>
      <Card>
        <div className="section-head small">
          <div><span className="eyebrow">Elaboração</span><h2>Anotações do tema</h2></div>
          <NotebookPen size={18} />
        </div>
        <p className="muted-note">Escreva com as próprias palavras: critérios, doses, pegadinhas e links. Resumir sem copiar força elaboração.</p>
        <Field hint="Salvo automaticamente na sua conta.">
          <textarea
            rows={14}
            value={progress.note || ''}
            onChange={(event) => setTopicNote(t.id, event.target.value)}
            placeholder="O que mudou o seu raciocínio neste tema? O que você não pode esquecer?"
          />
        </Field>
      </Card>

      <div className="topic-next-actions">
        <Link to={`/conteudos/${t.id}/revisao`} className="btn btn-soft">Ir para a revisão <ArrowRight size={15} /></Link>
        <Link to={`/conteudos/${t.id}`} className="btn btn-ghost">Voltar ao conteúdo</Link>
      </div>
    </TopicPageShell>
  );
}
