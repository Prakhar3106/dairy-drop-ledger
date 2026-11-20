import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { History, KeyRound, LogOut, Plus, Settings as SettingsIcon, Trash2, UserCheck, UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDashboard } from '@/components/dairy/dashboard-context';
import { ErrorNote, Field, Modal, Segmented, SuccessNote, inputClass, primaryBtn, secondaryBtn, smallBtn } from '@/components/dairy/ui';
import { type RateChartRow, currentChart, useAuditLogs, useInvalidateAll, useRateCharts, useStaff } from '@/lib/dairy/api';
import { errorMessage, formatDate, timeAgo, todayIST } from '@/lib/dairy/format';
import { displayLoginId, isMobileLoginEmail } from '@/lib/dairy/identity';
import { useLanguage } from '@/lib/i18n';
import { createOperatorAccount, resetMemberPassword, setMemberAccess } from '@/lib/accounts.functions';

type Tab = 'centre' | 'rates' | 'staff' | 'account' | 'audit';

export const Route = createFileRoute('/_authenticated/dashboard/settings')({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => {
    const t = s['tab'];
    return t === 'centre' || t === 'rates' || t === 'staff' || t === 'account' || t === 'audit' ? { tab: t } : {};
  },
  head: () => ({ meta: [{ title: 'Settings — DairySetu' }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { lang, t } = useLanguage();
  const { isOwner } = useDashboard();
  const { tab: tabParam } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const tab: Tab = tabParam ?? (isOwner ? 'centre' : 'account');
  const tabs = (isOwner ? ['centre', 'rates', 'staff', 'account', 'audit'] : ['account']) as readonly Tab[];
  const labels: Record<Tab, string> = { centre: 'Centre', rates: 'Milk rates', staff: 'Staff', account: 'My account', audit: 'Activity log' };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-deep tracking-tight">{t('menuSettings')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{lang === 'hi' ? 'दुग्ध केंद्र विवरण, भाषा व फैट दर नियम' : 'Dairy centre profile, milk rates, staff and your account'}</p>
      </div>
      {tabs.length > 1 && <Segmented value={tab} options={tabs} onChange={(v) => navigate({ search: { tab: v } })} labels={labels} />}
      {tab === 'centre' && isOwner && <CentreTab />}
      {tab === 'rates' && isOwner && <RatesTab />}
      {tab === 'staff' && isOwner && <StaffTab />}
      {tab === 'audit' && isOwner && <AuditTab />}
      {tab === 'account' && <AccountTab />}
    </div>
  );
}

function CentreTab() {
  const { centre } = useDashboard();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: centre.name,
    village: centre.village,
    district: centre.district,
    state: centre.state,
    address: centre.address,
    mobile: centre.mobile,
    email: centre.email,
    opening_hours: centre.opening_hours,
    low_stock_threshold_litres: String(centre.low_stock_threshold_litres),
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const { error: err } = await supabase
      .from('dairy_centres')
      .update({ ...form, name: form.name.trim(), low_stock_threshold_litres: parseFloat(form.low_stock_threshold_litres) || 0 })
      .eq('id', centre.id);
    setBusy(false);
    if (err) return setError(errorMessage(err));
    setSaved(true);
    qc.invalidateQueries();
  };
  return (
    <form onSubmit={submit} className="bg-milk border border-line rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-2 pb-3 border-b border-beige">
        <SettingsIcon className="w-4 h-4 text-forest" />
        <h2 className="font-display text-base font-bold text-deep">Centre profile · {centre.code}</h2>
      </div>
      <Field label="Dairy centre name" htmlFor="c-name">
        <input id="c-name" required value={form.name} onChange={set('name')} className={inputClass} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Village" htmlFor="c-vil">
          <input id="c-vil" value={form.village} onChange={set('village')} className={inputClass} />
        </Field>
        <Field label="District" htmlFor="c-dis">
          <input id="c-dis" value={form.district} onChange={set('district')} className={inputClass} />
        </Field>
        <Field label="State" htmlFor="c-st">
          <input id="c-st" value={form.state} onChange={set('state')} className={inputClass} />
        </Field>
      </div>
      <Field label="Address" htmlFor="c-addr">
        <input id="c-addr" value={form.address} onChange={set('address')} className={inputClass} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Contact mobile" htmlFor="c-mob">
          <input id="c-mob" value={form.mobile} onChange={set('mobile')} className={inputClass} />
        </Field>
        <Field label="Contact email" htmlFor="c-em">
          <input id="c-em" type="email" value={form.email} onChange={set('email')} className={inputClass} />
        </Field>
        <Field label="Opening hours" htmlFor="c-hours">
          <input id="c-hours" value={form.opening_hours} onChange={set('opening_hours')} className={inputClass} />
        </Field>
        <Field label="Low stock alert (litres per milk type)" htmlFor="c-low" hint="0 turns the alert off">
          <input id="c-low" type="number" min="0" step="1" value={form.low_stock_threshold_litres} onChange={set('low_stock_threshold_litres')} className={inputClass} />
        </Field>
      </div>
      <ErrorNote message={error} />
      <SuccessNote message={saved ? 'Centre details saved.' : null} />
      <button type="submit" disabled={busy} className={primaryBtn}>
        {busy ? 'Saving…' : 'Save centre details'}
      </button>
    </form>
  );
}

const METHOD_LABEL: Record<string, string> = { fixed: 'Fixed rate per litre', fat: 'Fat-based (₹ per Fat %)', fat_snf: 'Fat + SNF formula', chart: 'Fat/SNF slab chart' };

function describeChart(c: RateChartRow): string {
  if (c.method === 'fixed') return `₹${c.fixed_rate}/L`;
  if (c.method === 'fat') return `${Number(c.base_rate) ? `₹${c.base_rate} + ` : ''}Fat × ₹${c.fat_rate}`;
  if (c.method === 'fat_snf') return `${Number(c.base_rate) ? `₹${c.base_rate} + ` : ''}Fat × ₹${c.fat_rate} + SNF × ₹${c.snf_rate}`;
  return `${c.rate_slabs.length} slabs`;
}

function RatesTab() {
  const { centre } = useDashboard();
  const { data: charts = [], isLoading } = useRateCharts(centre.id);
  const [editing, setEditing] = useState<'Cow' | 'Buffalo' | null>(null);
  const today = todayIST();
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['Cow', 'Buffalo'] as const).map((m) => {
          const c = currentChart(charts, m, today);
          return (
            <div key={m} className="bg-milk border border-line rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-deep">{m} milk rate</h2>
                <button type="button" className={smallBtn} onClick={() => setEditing(m)}>
                  <Plus className="w-3 h-3" /> New rate
                </button>
              </div>
              {isLoading ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : c ? (
                <div className="text-sm space-y-1">
                  <div className="font-semibold text-deep">{METHOD_LABEL[c.method]}</div>
                  <div className="font-mono text-forest">{describeChart(c)}</div>
                  {(c.min_fat != null || c.min_snf != null) && (
                    <div className="text-xs text-muted-foreground">
                      Quality standard: Fat ≥ {c.min_fat ?? '—'}% · SNF ≥ {c.min_snf ?? '—'}%
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Version {c.version} · effective {formatDate(c.effective_from)}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-earth">No rate set — collections for {m.toLowerCase()} milk can't be saved yet.</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="bg-milk border border-line rounded-xl p-5">
        <h2 className="font-display text-base font-bold text-deep flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-forest" /> Rate history
        </h2>
        <p className="text-xs text-muted-foreground mb-3">Every change creates a new version. Saved collections always keep the rate that was used when they were recorded.</p>
        <div className="divide-y divide-cream text-sm">
          {charts.length === 0 && <p className="py-3 text-xs text-muted-foreground">No rates yet.</p>}
          {charts.map((c) => (
            <div key={c.id} className="py-2.5 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-deep">
                  {c.milk_type} · v{c.version} · {METHOD_LABEL[c.method]}
                </div>
                <div className="text-xs text-muted-foreground">
                  From {formatDate(c.effective_from)} {c.notes ? `· ${c.notes}` : ''}
                </div>
              </div>
              <div className="font-mono text-xs text-forest text-right">{describeChart(c)}</div>
            </div>
          ))}
        </div>
      </div>
      {editing && <RateModal milk={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

type Slab = { min_fat: string; max_fat: string; min_snf: string; max_snf: string; rate: string };

function RateModal({ milk, onClose }: { milk: 'Cow' | 'Buffalo'; onClose: () => void }) {
  const { centre } = useDashboard();
  const invalidate = useInvalidateAll();
  const [method, setMethod] = useState<'fixed' | 'fat' | 'fat_snf' | 'chart'>('fat_snf');
  const [fixed, setFixed] = useState('');
  const [fatRate, setFatRate] = useState(milk === 'Cow' ? '6.40' : '7.20');
  const [snfRate, setSnfRate] = useState(milk === 'Cow' ? '1.55' : '1.40');
  const [base, setBase] = useState('0');
  const [minFat, setMinFat] = useState('');
  const [minSnf, setMinSnf] = useState('');
  const [from, setFrom] = useState(todayIST());
  const [notes, setNotes] = useState('');
  const [slabs, setSlabs] = useState<Slab[]>([{ min_fat: '3.0', max_fat: '3.9', min_snf: '8.0', max_snf: '9.5', rate: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const n = (v: string) => (v.trim() === '' ? null : Number(v));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc('create_rate_chart', {
      _centre: centre.id,
      _milk: milk,
      _method: method,
      _fixed_rate: n(fixed) as number,
      _fat_rate: n(fatRate) as number,
      _snf_rate: n(snfRate) as number,
      _base_rate: n(base) ?? 0,
      _min_fat: n(minFat) as number,
      _min_snf: n(minSnf) as number,
      _effective_from: from,
      _notes: notes,
      _slabs: method === 'chart' ? slabs.map((s) => ({ min_fat: Number(s.min_fat), max_fat: Number(s.max_fat), min_snf: Number(s.min_snf), max_snf: Number(s.max_snf), rate: Number(s.rate) })) : [],
    });
    setBusy(false);
    if (err) return setError(errorMessage(err));
    await invalidate();
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`New ${milk.toLowerCase()} milk rate`} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Calculation method" htmlFor="r-method">
          <select id="r-method" value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className={inputClass}>
            {Object.entries(METHOD_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        {method === 'fixed' && (
          <Field label="Rate per litre (₹)" htmlFor="r-fixed">
            <input id="r-fixed" type="number" step="0.01" min="0.01" required value={fixed} onChange={(e) => setFixed(e.target.value)} className={inputClass} />
          </Field>
        )}
        {(method === 'fat' || method === 'fat_snf') && (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Base rate (₹)" htmlFor="r-base">
              <input id="r-base" type="number" step="0.01" value={base} onChange={(e) => setBase(e.target.value)} className={inputClass} />
            </Field>
            <Field label="₹ per Fat %" htmlFor="r-fat">
              <input id="r-fat" type="number" step="0.0001" min="0" required value={fatRate} onChange={(e) => setFatRate(e.target.value)} className={inputClass} />
            </Field>
            {method === 'fat_snf' && (
              <Field label="₹ per SNF %" htmlFor="r-snf">
                <input id="r-snf" type="number" step="0.0001" min="0" required value={snfRate} onChange={(e) => setSnfRate(e.target.value)} className={inputClass} />
              </Field>
            )}
          </div>
        )}
        {method !== 'fixed' && method !== 'chart' && (
          <p className="text-xs text-muted-foreground">
            Example: Fat 6.8%, SNF 9.1% →{' '}
            <strong className="font-mono text-deep">
              ₹{((Number(base) || 0) + 6.8 * (Number(fatRate) || 0) + (method === 'fat_snf' ? 9.1 * (Number(snfRate) || 0) : 0)).toFixed(2)}/L
            </strong>
          </p>
        )}
        {method === 'chart' && (
          <div className="space-y-2">
            <div className="grid grid-cols-6 gap-2 text-[11px] font-semibold text-muted-foreground">
              <span>Fat from</span>
              <span>Fat to</span>
              <span>SNF from</span>
              <span>SNF to</span>
              <span>₹ / L</span>
              <span />
            </div>
            {slabs.map((s, i) => (
              <div key={i} className="grid grid-cols-6 gap-2">
                {(['min_fat', 'max_fat', 'min_snf', 'max_snf', 'rate'] as const).map((k) => (
                  <input
                    key={k}
                    type="number"
                    step="0.01"
                    required
                    aria-label={`Slab ${i + 1} ${k}`}
                    value={s[k]}
                    onChange={(e) => setSlabs((all) => all.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
                    className={inputClass}
                  />
                ))}
                <button type="button" className={smallBtn} onClick={() => setSlabs((all) => all.filter((_, j) => j !== i))} disabled={slabs.length === 1} aria-label="Remove slab">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className={smallBtn}
              onClick={() => setSlabs((all) => [...all, { min_fat: all.at(-1)?.max_fat ?? '', max_fat: '', min_snf: '8.0', max_snf: '9.5', rate: '' }])}
            >
              <Plus className="w-3 h-3" /> Add slab
            </button>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Min Fat % (quality)" htmlFor="r-minfat" hint="Optional">
            <input id="r-minfat" type="number" step="0.1" value={minFat} onChange={(e) => setMinFat(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Min SNF % (quality)" htmlFor="r-minsnf" hint="Optional">
            <input id="r-minsnf" type="number" step="0.1" value={minSnf} onChange={(e) => setMinSnf(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Effective from" htmlFor="r-from">
            <input id="r-from" type="date" required value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Note" htmlFor="r-notes">
          <input id="r-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Winter rate revision" className={inputClass} />
        </Field>
        <ErrorNote message={error} />
        <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>
          {busy ? 'Saving…' : 'Save new rate version'}
        </button>
      </form>
    </Modal>
  );
}

function StaffTab() {
  const { centre } = useDashboard();
  const invalidate = useInvalidateAll();
  const { data: staff = [], isLoading } = useStaff(centre.id);
  const [adding, setAdding] = useState(false);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const setAccess = useServerFn(setMemberAccess);
  const [error, setError] = useState<string | null>(null);

  const toggleEdit = async (id: string, value: boolean) => {
    const { error: err } = await supabase.from('centre_staff').update({ can_edit_collections: value }).eq('id', id);
    if (err) setError(errorMessage(err));
    invalidate();
  };
  const toggleActive = async (userId: string, active: boolean) => {
    setError(null);
    try {
      await setAccess({ data: { centreId: centre.id, userId, active } });
      invalidate();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Collection operators can record and view milk collections only.</p>
        <button type="button" className={primaryBtn} onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4" /> Add operator
        </button>
      </div>
      <ErrorNote message={error} />
      <div className="bg-milk border border-line rounded-xl divide-y divide-cream">
        {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
        {staff.map((s) => (
          <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-deep">
                {s.profile?.full_name || 'Unnamed'} <span className="text-xs font-normal text-muted-foreground">· {s.staff_role === 'owner' ? 'Owner' : 'Operator'}</span>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                Login: {displayLoginId(s.profile?.email)} {s.profile?.mobile ? `· ${s.profile.mobile}` : ''}
              </div>
              {!s.is_active && <div className="text-xs font-semibold text-destructive">Disabled</div>}
            </div>
            {s.staff_role === 'operator' && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-deep">
                  <input type="checkbox" checked={s.can_edit_collections} onChange={(e) => toggleEdit(s.id, e.target.checked)} />
                  Can cancel/correct own entries
                </label>
                <button type="button" className={smallBtn} onClick={() => setResetFor(s.user_id)}>
                  <KeyRound className="w-3 h-3" /> Password
                </button>
                <button type="button" className={smallBtn} onClick={() => toggleActive(s.user_id, !s.is_active)}>
                  {s.is_active ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                  {s.is_active ? 'Disable' : 'Enable'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {adding && <AddOperatorModal onClose={() => setAdding(false)} />}
      {resetFor && <ResetPasswordModal userId={resetFor} onClose={() => setResetFor(null)} />}
    </div>
  );
}

function AddOperatorModal({ onClose }: { onClose: () => void }) {
  const { centre } = useDashboard();
  const invalidate = useInvalidateAll();
  const create = useServerFn(createOperatorAccount);
  const [form, setForm] = useState({ fullName: '', mobile: '', email: '', password: '' });
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await create({ data: { centreId: centre.id, ...form, canEditCollections: canEdit } });
      setDone(`Operator account created. They sign in with ${r.loginId} and the password you set.`);
      invalidate();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="Add collection operator">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name" htmlFor="o-name">
          <input id="o-name" required value={form.fullName} onChange={set('fullName')} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mobile (used to sign in)" htmlFor="o-mob">
            <input id="o-mob" type="tel" required value={form.mobile} onChange={set('mobile')} className={inputClass} />
          </Field>
          <Field label="Email (optional)" htmlFor="o-em" hint="If given, they sign in with email instead">
            <input id="o-em" type="email" value={form.email} onChange={set('email')} className={inputClass} />
          </Field>
        </div>
        <Field label="Password (min 8 characters)" htmlFor="o-pw">
          <input id="o-pw" type="text" required minLength={8} value={form.password} onChange={set('password')} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 text-xs text-deep">
          <input type="checkbox" checked={canEdit} onChange={(e) => setCanEdit(e.target.checked)} /> Allow cancelling/correcting their own entries (today and yesterday)
        </label>
        <ErrorNote message={error} />
        <SuccessNote message={done} />
        <button type="submit" disabled={busy || !!done} className={`${primaryBtn} w-full`}>
          {busy ? 'Creating…' : 'Create operator'}
        </button>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { centre } = useDashboard();
  const reset = useServerFn(resetMemberPassword);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await reset({ data: { centreId: centre.id, userId, password } });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="Set a new password">
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password (min 8 characters)" htmlFor="rp-pw">
          <input id="rp-pw" type="text" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </Field>
        <ErrorNote message={error} />
        <SuccessNote message={done ? 'Password updated.' : null} />
        <button type="submit" disabled={busy || done} className={`${primaryBtn} w-full`}>
          {busy ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </Modal>
  );
}

function AuditTab() {
  const { centre } = useDashboard();
  const { data: logs = [], isLoading } = useAuditLogs(centre.id, 200);
  return (
    <div className="bg-milk border border-line rounded-xl divide-y divide-cream">
      {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && logs.length === 0 && <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>}
      {logs.map((l) => (
        <div key={l.id} className="px-4 py-2.5 flex items-start justify-between gap-3 text-xs">
          <div className="min-w-0">
            <div className="font-semibold text-deep">{l.action}</div>
            <div className="text-muted-foreground font-mono truncate max-w-[520px]">{JSON.stringify(l.details)}</div>
          </div>
          <div className="text-muted-foreground shrink-0">{timeAgo(l.created_at)}</div>
        </div>
      ))}
    </div>
  );
}

export function AccountTab() {
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { me } = useDashboardSafe();
  const [fullName, setFullName] = useState(me?.profile?.full_name ?? '');
  const [mobile, setMobile] = useState(me?.profile?.mobile ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [current, setCurrent] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (!me) return;
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim(), mobile: mobile.trim() }).eq('id', me.userId);
    if (error) return setErr(errorMessage(error));
    setMsg('Profile saved.');
    qc.invalidateQueries();
  };
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    setPwErr(null);
    if (pw.length < 8) return setPwErr('New password must be at least 8 characters');
    if (pw !== pw2) return setPwErr('New passwords do not match');
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: current } as never);
    if (error) return setPwErr(/current/i.test(error.message) ? 'Your current password is incorrect.' : error.message);
    setPwMsg('Password changed.');
    setCurrent('');
    setPw('');
    setPw2('');
  };

  return (
    <div className="space-y-5">
      <form onSubmit={saveProfile} className="bg-milk border border-line rounded-xl p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-deep">My profile</h2>
        <p className="text-xs text-muted-foreground">
          Sign-in ID: <span className="font-mono text-deep">{displayLoginId(me?.email)}</span>
          {isMobileLoginEmail(me?.email) && ' (mobile login)'}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name" htmlFor="pr-name">
            <input id="pr-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Mobile" htmlFor="pr-mob">
            <input id="pr-mob" value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div>
          <label className="block text-xs font-semibold text-deep mb-1.5">Language / भाषा</label>
          <div className="inline-flex p-1 bg-cream border border-line rounded-lg">
            {(['en', 'hi'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${lang === l ? 'bg-milk text-deep shadow-xs' : 'text-muted-foreground'}`}
              >
                {l === 'en' ? 'English' : 'हिंदी'}
              </button>
            ))}
          </div>
        </div>
        <ErrorNote message={err} />
        <SuccessNote message={msg} />
        <button type="submit" className={primaryBtn}>
          Save profile
        </button>
      </form>
      <form onSubmit={changePassword} className="bg-milk border border-line rounded-xl p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-deep">Change password</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Current password" htmlFor="pw-cur">
            <input id="pw-cur" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
          </Field>
          <Field label="New password" htmlFor="pw-new">
            <input id="pw-new" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Confirm new" htmlFor="pw-new2">
            <input id="pw-new2" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <ErrorNote message={pwErr} />
        <SuccessNote message={pwMsg} />
        <button type="submit" className={primaryBtn}>
          Change password
        </button>
      </form>
      <button
        type="button"
        className={secondaryBtn}
        onClick={async () => {
          const { error: signOutError } = await supabase.auth.signOut();
    window.__lovableEvents?.track?.(signOutError ? 'project.logout_failed' : 'project.logout_succeeded', { source: 'settings' });
          navigate({ to: '/login' });
        }}
      >
        <LogOut className="w-4 h-4" /> Sign out
      </button>
    </div>
  );
}

function useDashboardSafe() {
  try {
    return useDashboard();
  } catch {
    return { me: null } as unknown as ReturnType<typeof useDashboard>;
  }
}
