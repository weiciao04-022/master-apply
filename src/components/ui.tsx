import { useEffect, useId, type ReactNode } from 'react';
import {
  CalendarCheck,
  CalendarClock,
  CircleDashed,
  Check,
  Heart,
  Clock,
  Hourglass,
  Search,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { DateKind, TaskType } from '../types';
import { DATE_KIND, TASK_TYPE } from '../labels';

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="關閉">
            <X size={20} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function TextInput(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      className="input"
      type={props.type ?? 'text'}
      value={props.value}
      placeholder={props.placeholder}
      required={props.required}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

export function TextArea(props: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      className="input"
      rows={props.rows ?? 3}
      value={props.value}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

export function Select<T extends string>(props: {
  value: T;
  onChange: (v: T) => void;
  options: Record<T, string> | [T, string][];
  ariaLabel?: string;
}) {
  const entries = Array.isArray(props.options) ? props.options : (Object.entries(props.options) as [T, string][]);
  return (
    <select className="input" value={props.value} aria-label={props.ariaLabel} onChange={(e) => props.onChange(e.target.value as T)}>
      {entries.map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </select>
  );
}

export function Progress({ done, total, label }: { done: number; total: number; label?: string }) {
  const p = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="progress-wrap">
      {label && (
        <div className="progress-label">
          <span>{label}</span>
          <span className="num">
            {done}/{total}
            {total === 0 ? '（尚無項目）' : `・${p}%`}
          </span>
        </div>
      )}
      <div className="progress" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="progress-fill" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

export function Badge({ icon: Icon, children, tone = 'plain' }: { icon?: LucideIcon; children: ReactNode; tone?: string }) {
  return (
    <span className={`badge tone-${tone}`}>
      {Icon && <Icon size={14} aria-hidden />}
      {children}
    </span>
  );
}

const DATE_KIND_ICON: Record<DateKind, LucideIcon> = {
  official: CalendarCheck,
  self: CalendarClock,
  estimate: CircleDashed,
};
export function DateKindBadge({ kind }: { kind: DateKind }) {
  return (
    <Badge icon={DATE_KIND_ICON[kind]} tone={`kind-${kind}`}>
      {DATE_KIND[kind]}
    </Badge>
  );
}

const TASK_TYPE_ICON: Record<TaskType, LucideIcon> = { mine: User, waiting: Hourglass, verify: Search };
export function TaskTypeBadge({ type }: { type: TaskType }) {
  return (
    <Badge icon={TASK_TYPE_ICON[type]} tone={`type-${type}`}>
      {TASK_TYPE[type]}
    </Badge>
  );
}

export function MinutesBadge({ minutes }: { minutes: number }) {
  return <Badge icon={Clock}>{minutes} 分鐘</Badge>;
}

export function CheckButton({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      className={`check ${checked ? 'checked' : ''}`}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
    >
      <Heart className="check-heart" size={30} strokeWidth={2.4} aria-hidden />
      {checked && <Check className="check-mark" size={14} strokeWidth={4} aria-hidden />}
    </button>
  );
}

export function Empty({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Icon size={28} aria-hidden />
      <p className="empty-title">{title}</p>
      {children && <div className="empty-body">{children}</div>}
    </div>
  );
}

export function Section({ title, icon: Icon, action, children }: { title: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section className="card" aria-labelledby={id}>
      <div className="card-head">
        <h2 id={id}>
          {Icon && <Icon size={18} aria-hidden />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** 多選勾選清單 */
export function MultiPick({
  options,
  value,
  onChange,
  empty = '尚無可選項目',
}: {
  options: { id: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  empty?: string;
}) {
  if (options.length === 0) return <p className="muted small">{empty}</p>;
  return (
    <div className="multipick">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            type="button"
            key={o.id}
            className={`chip ${on ? 'on' : ''}`}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])}
          >
            {on && <Check size={14} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ExtLink({ href, children }: { href: string; children?: ReactNode }) {
  if (!href) return <span className="muted">—</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="ext">
      {children ?? href}
    </a>
  );
}
