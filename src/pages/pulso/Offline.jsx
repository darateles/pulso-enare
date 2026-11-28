import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, CloudOff, Download, HardDrive, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button, Card, Chip, PageHead, Progress } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';

export default function Offline() {
  const { outbox, syncOutbox, offline, user } = useStore();
  const [online, setOnline] = useState(navigator.onLine);
  const [sw, setSw] = useState(false);
  const [storage, setStorage] = useState(null);
  const [install, setInstall] = useState(null);

  useEffect(() => {
    const up = () => setOnline(true); const down = () => setOnline(false);
    window.addEventListener('online', up); window.addEventListener('offline', down);
    navigator.serviceWorker?.getRegistration().then((r) => setSw(Boolean(r))).catch(() => {});
    navigator.storage?.estimate().then((e) => setStorage(e)).catch(() => {});
    const p = (e) => { e.preventDefault(); setInstall(e); };
    window.addEventListener('beforeinstallprompt', p);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); window.removeEventListener('beforeinstallprompt', p); };
  }, []);

  const pctUsed = storage ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;

  return (
    <>
      <PageHead eyebrow="Pulso Offline" title="Offline" subtitle="O Pulso instala como app e mantém a interface em cache. Sem internet, alterações ficam em fila e sincronizam ao reconectar." actions={<Link to="/pulso" className="btn btn-ghost">Suíte</Link>} />
      <div className="offline-grid">
        <Card className={`offline-status ${online ? 'online' : 'off'}`}>
          {online ? <Wifi size={30} /> : <WifiOff size={30} />}
          <h2>{online ? 'Você está online.' : 'Sem conexão.'}</h2>
          <p>{offline ? 'O servidor local está fora ou a rede caiu. Continue estudando: o estado fica no navegador.' : 'Interface, banco e anotações disponíveis. O salvamento é automático.'}</p>
          <Chip tone={outbox ? 'warning' : 'success'}>{outbox ? `${outbox} alterações pendentes` : 'Tudo sincronizado'}</Chip>
          {outbox > 0 && <Button onClick={syncOutbox} icon={RefreshCw}>Sincronizar agora</Button>}
        </Card>
        <Card>
          <Download size={26} /><h2>Instalar o app</h2>
          <p>Adicione o Pulso à tela inicial para abrir em tela cheia e manter os arquivos em cache.</p>
          {install ? <Button onClick={async () => { install.prompt(); await install.userChoice; setInstall(null); }}>Instalar Pulso</Button> : <p className="muted-note">No Chrome/Edge: menu → “Instalar aplicativo”. No Safari: Compartilhar → “Adicionar à Tela de Início”.</p>}
          <div className="offline-check"><CheckCircle2 size={16} /> Service worker {sw ? 'ativo' : 'inativo'} (produção)</div>
          <div className="offline-check"><CheckCircle2 size={16} /> Dados em {user.notes.length} notas e {user.flashcards.length} flashcards locais</div>
        </Card>
      </div>
      <Card>
        <div className="section-head small"><div><span className="eyebrow">Armazenamento local</span><h2>Uso do navegador</h2></div><HardDrive size={19} /></div>
        {storage ? <><Progress value={pctUsed} tone={pctUsed > 80 ? 'accent' : 'green'} /><p className="muted-note">{(storage.usage / 1024 / 1024).toFixed(1)} MB usados de {(storage.quota / 1024 / 1024 / 1024).toFixed(1)} GB disponíveis.</p></> : <p className="muted-note">O navegador não expôs estimativa de armazenamento.</p>}
        <div className="offline-features">
          <div><CloudOff size={18} /><strong>Fila segura</strong><span>O último estado é guardado localmente e reenviado uma vez.</span></div>
          <div><Wifi size={18} /><strong>Reconexão automática</strong><span>Ao voltar a rede, a sincronização é tentada sem ação manual.</span></div>
          <div><HardDrive size={18} /><strong>Backup</strong><span>Ainda assim, exporte JSON em Ajustes. Cache não é backup.</span></div>
        </div>
      </Card>
      <Card className="battle-rules info"><CloudOff size={18} /><div><strong>Limitação</strong><p>Batalhas, Arena e importação de provas dependem do servidor. Planner, checklists, questões já carregadas, notas e flashcards funcionam offline.</p></div></Card>
    </>
  );
}
