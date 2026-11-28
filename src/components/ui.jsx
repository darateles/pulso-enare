import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function Logo({ compact = false }) {
  return (
    <span className={`logo ${compact ? 'logo-compact' : ''}`} aria-label="Pulso">
      <svg className="logo-pulse" viewBox="0 0 36 20" aria-hidden="true">
        <path d="M1 11h7l3-8 4 14 4-10 3 4h13" />
      </svg>
      <span>pulso<span className="logo-dot">.</span></span>
    </span>
  );
}

export function Button({ variant = 'solid', size = 'md', className = '', icon: Icon, children, type = 'button', ...props }) {
  return (
    <button type={type} className={`btn btn-${variant} btn-${size} ${className}`} {...props}>
      {Icon && <Icon size={size === 'sm' ? 15 : 17} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Card({ className = '', children, ...props }) {
  return <div className={`card ${className}`} {...props}>{children}</div>;
}

export function Chip({ children, tone = 'neutral', className = '', ...props }) {
  return <span className={`chip chip-${tone} ${className}`} {...props}>{children}</span>;
}

export function Progress({ value = 0, tone = 'green', label, className = '' }) {
  return (
    <div className={`progress ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span className={`progress-fill progress-${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Ring({ value = 0, size = 120, stroke = 9, tone = 'accent', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`var(--${tone})`} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} className="ring-value"
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export function PageHead({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="empty">
      {Icon && <div className="empty-icon"><Icon size={26} /></div>}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={19} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value} role="tab" aria-selected={value === o.value}
          className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, note, tone = '' }) {
  return (
    <Card className={`stat ${tone}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {note && <span className="stat-note">{note}</span>}
    </Card>
  );
}

export function InlineError({ children }) {
  if (!children) return null;
  return <div className="inline-error">{children}</div>;
}

export function Spinner({ label = 'Carregando' }) {
  return <span className="spinner" role="status" aria-label={label} />;
}
