import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Headphones, Pause, Play, SkipBack, SkipForward, Square, Volume2 } from 'lucide-react';
import podcast from '../../../seed/podcast.json';
import { Button, Card, Chip, Field, PageHead, Progress } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';

export default function Podcast() {
  const { user, updateUser, toast } = useStore();
  const [ep, setEp] = useState(null);
  const [section, setSection] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [voiceName, setVoiceName] = useState('');
  const utter = useRef(null);
  const progress = user.podcastProgress || {};
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis?.getVoices().filter((v) => v.lang.startsWith('pt')) || []);
    load();
    window.speechSynthesis?.addEventListener?.('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', load);
  }, []);
  useEffect(() => { if (voices.length && !voiceName) setVoiceName(voices[0].name); }, [voices]);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  const speak = (episode, idx) => {
    if (!window.speechSynthesis) { toast('Seu navegador não suporta narração.', 'error'); return; }
    window.speechSynthesis.cancel();
    const s = episode.sections[idx];
    if (!s) { setPlaying(false); return; }
    const u = new SpeechSynthesisUtterance(`${s.h}. ${s.t}`);
    u.lang = 'pt-BR';
    u.rate = rate;
    const v = voices.find((x) => x.name === voiceName);
    if (v) u.voice = v;
    u.onend = () => {
      updateUser((prev) => ({ ...prev, podcastProgress: { ...prev.podcastProgress, [episode.id]: Math.max(prev.podcastProgress?.[episode.id] || 0, idx + 1) } }));
      if (idx + 1 < episode.sections.length) { setSection(idx + 1); speak(episode, idx + 1); }
      else { setPlaying(false); toast('Episódio concluído.'); }
    };
    u.onerror = () => setPlaying(false);
    utter.current = u;
    window.speechSynthesis.speak(u);
    setPlaying(true);
  };

  const play = (episode) => { setEp(episode); setSection(0); speak(episode, 0); };
  const pause = () => { if (playing) { window.speechSynthesis.pause(); setPlaying(false); } else { window.speechSynthesis.resume(); setPlaying(true); } };
  const stop = () => { window.speechSynthesis.cancel(); setPlaying(false); };
  const jump = (dir) => { if (!ep) return; const n = Math.max(0, Math.min(ep.sections.length - 1, section + dir)); setSection(n); speak(ep, n); };

  return (
    <>
      <PageHead eyebrow="Pulso Podcast" title="Podcast" subtitle="Episódios curtos narrados pelo navegador, com transcrição sincronizada. Use no deslocamento e depois recupere os pontos por escrito." actions={<Link to="/pulso" className="btn btn-ghost">Voltar à suíte</Link>} />
      <Card className="podcast-banner"><Headphones size={20} /><div><strong>Áudio gerado no seu dispositivo</strong><p>Nenhum áudio é enviado para servidor. Escolha uma voz em português e ajuste a velocidade. A narração depende das vozes instaladas no sistema.</p></div></Card>
      <div className="podcast-layout">
        <div className="podcast-list">
          {podcast.episodes.map((e) => {
            const p = progress[e.id] || 0;
            return (
              <Card key={e.id} className={`podcast-card ${ep?.id === e.id ? 'active' : ''}`}>
                <button className="podcast-play" onClick={() => play(e)}>{ep?.id === e.id && playing ? <Pause size={19} /> : <Play size={19} />}</button>
                <div className="podcast-main"><Chip tone="soft">{e.area}</Chip><h3>{e.title}</h3><p>{e.description}</p><small>{e.minutes} min · {e.sections.length} blocos · {p ? `${p}/${e.sections.length} ouvidos` : 'não iniciado'}</small></div>
              </Card>
            );
          })}
        </div>
        <aside>
          {ep ? (
            <Card className="podcast-player">
              <span className="eyebrow">Tocando agora</span><h2>{ep.title}</h2>
              <Progress value={((section + (playing ? 0.5 : 0)) / ep.sections.length) * 100} tone="accent" />
              <div className="podcast-controls"><Button variant="ghost" size="sm" onClick={() => jump(-1)} icon={SkipBack} aria-label="Anterior" /><Button onClick={pause} icon={playing ? Pause : Play}>{playing ? 'Pausar' : 'Retomar'}</Button><Button variant="ghost" size="sm" onClick={() => jump(1)} icon={SkipForward} aria-label="Próximo" /><Button variant="ghost" size="sm" onClick={stop} icon={Square} aria-label="Parar" /></div>
              <Field label="Velocidade"><select value={rate} onChange={(e) => { const r = Number(e.target.value); setRate(r); if (playing) { window.speechSynthesis.cancel(); speak(ep, section); } }}>{[0.8, 1, 1.2, 1.5].map((r) => <option key={r} value={r}>{r}x</option>)}</select></Field>
              <Field label="Voz"><select value={voiceName} onChange={(e) => setVoiceName(e.target.value)}>{voices.length ? voices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>) : <option>Voz padrão</option>}</select></Field>
              <div className="podcast-transcript">{ep.sections.map((s, i) => <button key={i} className={i === section ? 'active' : ''} onClick={() => { setSection(i); speak(ep, i); }}><strong>{s.h}</strong><p>{s.t}</p></button>)}</div>
            </Card>
          ) : <Card className="podcast-empty"><Volume2 size={28} /><h3>Escolha um episódio</h3><p>A transcrição aparece aqui e acompanha a narração.</p></Card>}
        </aside>
      </div>
    </>
  );
}
