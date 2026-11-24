import React, { useState } from 'react';
import { Eye, EyeOff, HeartPulse, LockKeyhole, LogIn, UserRound } from 'lucide-react';
import { Button, Field, InlineError, Logo } from '../components/ui.jsx';
import { useStore } from '../store.jsx';

export default function Login() {
  const { login } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(username.trim(), password); }
    catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <div className="login-screen">
      <div className="login-art">
        <Logo />
        <div className="login-copy">
          <span className="eyebrow light">Preparação para a residência</span>
          <h1>Sua preparação, <em>com foco no que importa.</em></h1>
          <p>Planner, banco de questões, suíte clínica e monitor de constância. Entre para retomar de onde parou.</p>
          <div className="login-monitor">
            <HeartPulse size={17} />
            <span>60 bpm</span>
            <span>PA 90/60</span>
            <span>perfusão estável</span>
          </div>
        </div>
        <div className="login-quote">“Planeje com clareza. Evolua com consistência.”</div>
      </div>
      <div className="login-panel">
        <form className="login-box" onSubmit={submit}>
          <span className="onboard-step">Acesso restrito</span>
          <h2>Entrar no Pulso.</h2>
          <p>Use sua conta individual. Progresso e histórico ficam separados por usuário.</p>
          <Field label="Usuário">
            <div className="input-icon"><UserRound size={16} /><input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" placeholder="seu usuário" /></div>
          </Field>
          <Field label="Senha">
            <div className="input-icon"><LockKeyhole size={16} /><input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="sua senha" /><button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          </Field>
          <InlineError>{error}</InlineError>
          <Button type="submit" disabled={busy || !username || !password} icon={LogIn}>{busy ? 'Entrando…' : 'Entrar'}</Button>
          <div className="login-hint"><strong>Contas de teste:</strong> davi · teste. Use janela anônima para entrar na segunda conta ao mesmo tempo.</div>
        </form>
      </div>
    </div>
  );
}
