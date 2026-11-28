import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, LogIn, UserRound } from 'lucide-react';
import { Button, Field, InlineError, Logo } from '../components/ui.jsx';
import { useStore } from '../store.jsx';

export default function Login() {
  const { login } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(username.trim(), password); navigate(location.pathname === '/login' ? '/' : location.pathname, { replace: true }); }
    catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <div className="login-screen">
      <div className="login-art">
        <Logo />
        <div className="login-copy">
          <span className="eyebrow light">Pulso</span>
          <h1>Entrar.</h1>
          <p>Acesse sua conta para continuar o estudo.</p>
        </div>
      </div>
      <div className="login-panel">
        <form className="login-box" onSubmit={submit}>
          <Link to="/" className="login-back">← Voltar ao início</Link>
          <span className="onboard-step">Acesso individual</span>
          <h2>Entrar no Pulso.</h2>
          <p>Use a conta fornecida pelo administrador. Seu progresso, trilha e histórico ficam salvos por usuário.</p>
          <Field label="Usuário">
            <div className="input-icon"><UserRound size={16} /><input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" placeholder="seu usuário" /></div>
          </Field>
          <Field label="Senha">
            <div className="input-icon"><LockKeyhole size={16} /><input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="sua senha" /><button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          </Field>
          <InlineError>{error}</InlineError>
          <Button type="submit" disabled={busy || !username || !password} icon={LogIn}>{busy ? 'Entrando…' : 'Entrar'}</Button>
          <div className="login-hint"><strong>Primeiro acesso?</strong> Entre com o usuário e a senha combinados com o administrador. Na primeira vez, o Pulso pede seu semestre e monta a trilha.</div>
        </form>
      </div>
    </div>
  );
}
