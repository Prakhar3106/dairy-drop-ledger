import { useEffect, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';

export const inputClass =
  'w-full px-3 py-2 text-sm bg-milk border border-line rounded-lg text-deep placeholder:text-muted-foreground focus:outline-none focus:border-forest disabled:opacity-60';
export const primaryBtn =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-milk bg-forest hover:bg-deep disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed';
export const secondaryBtn =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-deep bg-cream hover:bg-beige border border-line rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50';
export const smallBtn =
  'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-line rounded-md text-deep hover:bg-cream cursor-pointer disabled:opacity-50';
export const smallPrimaryBtn =
  'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-forest text-milk hover:bg-deep rounded-md cursor-pointer disabled:opacity-50';
export const cardClass = 'bg-milk border border-line rounded-xl';

export function Label({ htmlFor, children }: { htmlFor?: string | undefined; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-deep mb-1">
      {children}
    </label>
  );
}

export function Field({ label, htmlFor, children, hint }: { label: ReactNode; htmlFor?: string | undefined; children: ReactNode; hint?: ReactNode | undefined }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2.5">
      <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
      <span>{message}</span>
    </div>
  );
}

export function SuccessNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="status" className="flex items-start gap-2 text-xs font-medium text-forest bg-leaf/15 border border-leaf/35 rounded-lg px-3 py-2.5">
      <CheckCircle2 className="w-4 h-4 shrink-0 mt-px" />
      <span>{message}</span>
    </div>
  );
}

export function Spinner({ label }: { label?: string | undefined }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{label ?? 'Loading…'}</span>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode | undefined; actions?: ReactNode | undefined }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-deep tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, labels }: { value: T; options: readonly T[]; onChange: (v: T) => void; labels?: Partial<Record<T, string>> | undefined }) {
  return (
    <div className="flex p-0.5 bg-cream border border-line rounded-lg text-xs">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-md font-medium cursor-pointer ${value === o ? 'bg-milk text-deep shadow-xs' : 'text-muted-foreground'}`}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; size?: 'md' | 'lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-deep/45 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className={`bg-milk border border-line rounded-xl w-full ${size === 'lg' ? 'max-w-2xl' : 'max-w-md'} max-h-[92vh] overflow-y-auto p-6 space-y-4`}>
        <div className="flex items-center justify-between pb-3 border-b border-beige">
          <h2 className="font-display text-lg font-bold text-deep">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-muted-foreground hover:bg-cream cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-deep/45 flex justify-end" role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" className="flex-1 cursor-default" aria-label="Close panel" onClick={onClose} />
      <div className="bg-milk w-full max-w-xl h-full overflow-y-auto border-l border-line p-6 space-y-6">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, sub, tone = 'deep', icon }: { label: ReactNode; value: ReactNode; sub?: ReactNode | undefined; tone?: 'deep' | 'forest' | 'earth' | 'muted'; icon?: ReactNode | undefined }) {
  const toneClass = tone === 'forest' ? 'text-forest' : tone === 'earth' ? 'text-earth' : tone === 'muted' ? 'text-muted-foreground' : 'text-deep';
  return (
    <div className={`${cardClass} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon && <div className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center text-forest shrink-0">{icon}</div>}
      </div>
      <div className={`font-display text-2xl font-bold mt-2 font-mono tabular-nums ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export const chartColors = {
  forest: 'var(--forest)',
  leaf: 'var(--leaf)',
  earth: 'var(--earth)',
  grid: 'var(--beige)',
  axis: 'var(--muted-foreground)',
};

export const tooltipStyle = {
  backgroundColor: 'var(--milk)',
  borderColor: 'var(--line)',
  borderRadius: '8px',
  fontSize: '12px',
};
