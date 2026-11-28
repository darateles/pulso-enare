import React, { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useStore } from './store.jsx';
import Layout from './components/Layout.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Login from './pages/Login.jsx';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { Logo, Spinner } from './components/ui.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const Trilha = lazy(() => import('./pages/Trilha.jsx'));
const Ranking = lazy(() => import('./pages/Ranking.jsx'));
const Planner = lazy(() => import('./pages/Planner.jsx'));
const ConteudosHub = lazy(() => import('./pages/ConteudosHub.jsx'));
const Conteudos = lazy(() => import('./pages/Conteudos.jsx'));
const Topico = lazy(() => import('./pages/Topico.jsx'));
const TopicoFlashcards = lazy(() => import('./pages/TopicoFlashcards.jsx'));
const TopicoQuestoes = lazy(() => import('./pages/TopicoQuestoes.jsx'));
const TopicoNotas = lazy(() => import('./pages/TopicoNotas.jsx'));
const TopicoRevisao = lazy(() => import('./pages/TopicoRevisao.jsx'));
const Questoes = lazy(() => import('./pages/Questoes.jsx'));
const Simulado = lazy(() => import('./pages/Simulado.jsx'));
const Importar = lazy(() => import('./pages/Importar.jsx'));
const Desempenho = lazy(() => import('./pages/Desempenho.jsx'));
const CadernoErros = lazy(() => import('./pages/CadernoErros.jsx'));
const Ajustes = lazy(() => import('./pages/Ajustes.jsx'));
const Pulso = lazy(() => import('./pages/Pulso.jsx'));
const Focus = lazy(() => import('./pages/pulso/Focus.jsx'));
const Battle = lazy(() => import('./pages/pulso/Battle.jsx'));
const Arena = lazy(() => import('./pages/pulso/Arena.jsx'));
const Radar = lazy(() => import('./pages/pulso/Radar.jsx'));
const Guidelines = lazy(() => import('./pages/pulso/Guidelines.jsx'));
const Atlas = lazy(() => import('./pages/pulso/Atlas.jsx'));
const ECG = lazy(() => import('./pages/pulso/ECG.jsx'));
const Farma = lazy(() => import('./pages/pulso/Farma.jsx'));
const Research = lazy(() => import('./pages/pulso/Research.jsx'));
const Notes = lazy(() => import('./pages/pulso/Notes.jsx'));
const Blocks = lazy(() => import('./pages/pulso/Blocks.jsx'));
const Podcast = lazy(() => import('./pages/pulso/Podcast.jsx'));
const Recall = lazy(() => import('./pages/pulso/Recall.jsx'));
const Mentoria = lazy(() => import('./pages/pulso/Mentoria.jsx'));
const Wrapped = lazy(() => import('./pages/pulso/Wrapped.jsx'));
const ImportarPulso = lazy(() => import('./pages/pulso/Importar.jsx'));
const Flashcards = lazy(() => import('./pages/pulso/Flashcards.jsx'));
const Connect = lazy(() => import('./pages/pulso/Connect.jsx'));
const Offline = lazy(() => import('./pages/pulso/Offline.jsx'));

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Missing() {
  return (
    <div className="notfound">
      <span className="eyebrow">404</span>
      <h1>Fora do mapa.</h1>
      <p>Essa página não existe. Volte para o painel e siga o plano.</p>
      <a href="/" className="btn btn-solid">Voltar ao início</a>
    </div>
  );
}

function LoadingPage() {
  return <div className="page-loading"><Spinner /><span>Carregando módulo…</span></div>;
}

export default function App() {
  const { user, loading, needLogin } = useStore();

  if (loading) {
    return (
      <div className="splash">
        <Logo />
        <Spinner />
        <span>Sintonizando o Pulso…</span>
      </div>
    );
  }

  if (needLogin) return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Login />} />
    </Routes>
  );

  if (!user.onboardingDone) return <Onboarding />;

  return (
    <>
      <ScrollTop />
      <ErrorBoundary>
      <Suspense fallback={<LoadingPage />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="trilha" element={<Trilha />} />
            <Route path="ranking" element={<Ranking />} />
            <Route path="planner" element={<Planner />} />
            <Route path="conteudos" element={<ConteudosHub />} />
            <Route path="conteudos/mapa" element={<Conteudos />} />
            <Route path="conteudos/:topicId" element={<Topico />} />
            <Route path="conteudos/:topicId/flashcards" element={<TopicoFlashcards />} />
            <Route path="conteudos/:topicId/questoes" element={<TopicoQuestoes />} />
            <Route path="conteudos/:topicId/notas" element={<TopicoNotas />} />
            <Route path="conteudos/:topicId/revisao" element={<TopicoRevisao />} />
            <Route path="questoes" element={<Questoes />} />
            <Route path="questoes/treino" element={<Questoes />} />
            <Route path="questoes/simulado" element={<Simulado />} />
            <Route path="questoes/importar" element={<Importar />} />
            <Route path="flashcards" element={<Flashcards />} />
            <Route path="mapas" element={<Blocks />} />
            <Route path="desempenho" element={<Desempenho />} />
            <Route path="caderno-erros" element={<CadernoErros />} />
            <Route path="perfil" element={<Ajustes />} />
            <Route path="ajustes" element={<Navigate to="/perfil" replace />} />
            <Route path="pulso" element={<Pulso />} />
            <Route path="pulso/focus" element={<Focus />} />
            <Route path="pulso/battle" element={<Battle />} />
            <Route path="pulso/arena" element={<Arena />} />
            <Route path="pulso/radar" element={<Radar />} />
            <Route path="pulso/guidelines" element={<Guidelines />} />
            <Route path="pulso/atlas" element={<Atlas />} />
            <Route path="pulso/ecg" element={<ECG />} />
            <Route path="pulso/farma" element={<Farma />} />
            <Route path="pulso/research" element={<Research />} />
            <Route path="pulso/notes" element={<Notes />} />
            <Route path="pulso/blocks" element={<Blocks />} />
            <Route path="pulso/podcast" element={<Podcast />} />
            <Route path="pulso/recall" element={<Recall />} />
            <Route path="pulso/mentoria" element={<Mentoria />} />
            <Route path="pulso/wrapped" element={<Wrapped />} />
            <Route path="pulso/import" element={<ImportarPulso />} />
            <Route path="pulso/flashcards" element={<Flashcards />} />
            <Route path="pulso/connect" element={<Connect />} />
            <Route path="pulso/offline" element={<Offline />} />
            <Route path="login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Missing />} />
          </Route>
          <Route path="/onboarding" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </>
  );
}
