import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database, Download, HardDrive, LogOut, Moon, RotateCcw, Save, Shield, Sun, Upload, UserRound,
} from 'lucide-react';
import { api, downloadBackup } from '../api.js';
import { Button, Card, Field, InlineError, PageHead, Segmented } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { WEEKDAYS } from '../utils.js';

export default function Ajustes() {
  const { user, account, updateUser, setTheme, toast, refreshData, cancelPending, logout } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user.name, examDate: user.examDate, dailyHours: user.dailyHours, studyDays: user.studyDays, goalQuestions: user.goalQuestions });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const fileRef = useRef(null);

  const save = () => {
    updateUser({ ...form, name: form.name.trim() || 'Estudante', studyDays: form.studyDays.length ? form.studyDays : [1, 2, 3, 4, 5] });
    toast('Ajustes salvos.');
  };

  const toggleDay = (d) => setForm((f) => ({ ...f, studyDays: f.studyDays.includes(d) ? f.studyDays.filter((x) => x !== d) : [...f.studyDays, d].sort() }));

  const backup = async () => {
    setBusy('backup');
    setError('');
    try { await downloadBackup(); toast('Backup baixado.'); } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  const restore = async (file) => {
    if (!file) return;
    setBusy('restore');
    setError('');
    cancelPending();
    try {
      const payload = JSON.parse(await file.text());
      if (!payload.user) throw new Error('Arquivo não parece ser um backup do Pulso.');
      await api.importBackup(payload);
      await refreshData(true);
      toast('Backup restaurado.');
    } catch (e) { setError(e.message); } finally { setBusy(''); if (fileRef.current) fileRef.current.value = ''; }
  };

  const reset = async () => {
    if (!window.confirm('Apagar todo o progresso, tentativas e plano? O banco de questões será mantido.')) return;
    setBusy('reset');
    cancelPending();
    try { await api.reset(); await refreshData(true); window.location.assign('/'); } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  return (
    <>
      <PageHead eyebrow="Preferências" title={<>Seu Pulso, do seu <em>jeito.</em></>} subtitle="Dados ficam salvos localmente no computador. Exporte um backup antes de trocar de máquina ou fazer mudanças grandes." />

      <InlineError>{error}</InlineError>

      <div className="settings-grid">
        <Card>
          <div className="section-head small"><div><span className="eyebrow">Perfil e rotina</span><h2>Configurações</h2></div><UserRound size={19} /></div>
          <Field label="Nome"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="form-2">
            <Field label="Data da prova"><input type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} /></Field>
            <Field label="Meta de questões/dia"><input type="number" min={5} max={400} value={form.goalQuestions} onChange={(e) => setForm({ ...form, goalQuestions: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Horas por dia"><select value={form.dailyHours} onChange={(e) => setForm({ ...form, dailyHours: Number(e.target.value) })}>{[1,2,3,4,5,6].map((h) => <option key={h} value={h}>{h}h</option>)}</select></Field>
          <Field label="Dias de estudo"><div className="day-picker compact">{WEEKDAYS.map((d, i) => <button key={d} type="button" className={form.studyDays.includes(i) ? 'active' : ''} onClick={() => toggleDay(i)}>{d}</button>)}</div></Field>
          <Button onClick={save} icon={Save}>Salvar ajustes</Button>
          <div className="account-row"><span>Conta: <strong>{account}</strong></span><Button variant="ghost" size="sm" onClick={logout} icon={LogOut}>Sair</Button></div>
        </Card>

        <div>
          <Card>
            <span className="eyebrow">Aparência</span>
            <h2>Tema</h2>
            <Segmented options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }]} value={user.settings?.theme || 'light'} onChange={setTheme} label="Tema" />
            <div className="theme-preview">{user.settings?.theme === 'dark' ? <Moon size={22} /> : <Sun size={22} />}<span>Contraste alto, leitura longa.</span></div>
            <span className="eyebrow plan-label">Plano (demonstração)</span>
            <Segmented options={[{ value: 'essencial', label: 'Essencial' }, { value: 'pro', label: 'Pulso Pro' }]} value={user.settings?.plan === 'essencial' ? 'essencial' : 'pro'} onChange={(v) => { updateUser((prev) => ({ ...prev, settings: { ...prev.settings, plan: v } })); toast(v === 'pro' ? 'Pro liberado (demo).' : 'Plano Essencial.'); }} label="Plano" />
          </Card>

          <Card>
            <span className="eyebrow">Backup</span>
            <h2>Seus dados</h2>
            <p className="muted-note">O arquivo inclui perfil, checklists, tentativas, anotações e plano. Guarde em local seguro.</p>
            <div className="stack-actions">
              <Button onClick={backup} disabled={Boolean(busy)} icon={Download}>{busy === 'backup' ? 'Preparando…' : 'Exportar backup'}</Button>
              <Button variant="soft" onClick={() => fileRef.current?.click()} icon={Upload}>Restaurar backup</Button>
              <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => restore(e.target.files?.[0])} />
              <Button variant="ghost" onClick={async () => { try { await api.backup(); toast('Cópia local criada no servidor.'); } catch (e) { setError(e.message); } }} icon={HardDrive}>Criar cópia local</Button>
            </div>
          </Card>

          <Card className="danger-card">
            <span className="eyebrow">Zona de risco</span>
            <h2>Recomeçar</h2>
            <p>Apaga progresso pessoal e plano. O banco de questões importado e as fontes permanecem.</p>
            <Button variant="danger" onClick={reset} disabled={Boolean(busy)} icon={RotateCcw}>Zerar meu progresso</Button>
          </Card>
        </div>
      </div>

      <Card className="about-card">
        <div className="about-mark"><Shield size={20} /></div>
        <div>
          <h3>Pulso · sistema local de estudo para o ENARE</h3>
          <p>Sem login e sem telemetria. O servidor escuta apenas em 127.0.0.1, na sua máquina. Provas oficiais pertencem às bancas; comentários são material de estudo e podem conter imprecisões — confira sempre a fonte e as diretrizes atuais.</p>
          <p>Banco inicial: 300 questões oficiais ENARE 2022, 2023 (AOCP) e 2024 (FGV), com gabaritos oficiais. Fontes e links ficam em cada questão.</p>
          <div className="about-meta"><Database size={14} /> Dados em <code>data/user.json</code> · exporte com frequência</div>
        </div>
      </Card>
    </>
  );
}
