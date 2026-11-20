import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Building2, LogOut, ShieldCheck, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { BrandLogo } from '@/components/dairy/BrandLogo';
import { ErrorNote, Field, Spinner, StatCard, SuccessNote, chartColors, inputClass, primaryBtn, smallBtn, tooltipStyle } from '@/components/dairy/ui';
import { useAuditLogs, useInvalidateAll } from '@/lib/dairy/api';
import { errorMessage, formatDate, litres, timeAgo } from '@/lib/dairy/format';
import { useMe } from '@/lib/dairy/session';

export const Route = createFileRoute('/_authenticated/admin')({
  head: () => ({ meta: [{ title: 'Super Admin — DairySetu' }] }),
  component: AdminGate,
});

function AdminGate() {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <Spinner />;
  if (!me?.isSuperAdmin) return <Navigate to="/app" replace />;
  return <AdminPage />;
}

interface Stats {
  centres: number;
  active_centres: number;
  suspended_centres: number;
  farmers: number;
  active_farmers: number;
  users: number;
  operators: number;
  collections_30d: number;
  litres_30d: number;
  registrations: { month: string; count: number }[];
}

function AdminPage() {
  const navigate = useNavigate();
  const invalidate = useInvalidateAll();
  const { data: me } = useMe();
  const stats = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_platform_stats');
      if (error) throw error;
      return data as unknown as Stats;
    },
  });
  const centres = useQuery({
    queryKey: ['admin-centres'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_centres');
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: logs = [] } = useAuditLogs(undefined, 50);
  const [actionError, setActionError] = useState<string | null>(null);

  const setStatus = async (id: string, status: 'active' | 'suspended') => {
    setActionError(null);
    const { error } = await supabase.rpc('set_centre_status', { _centre: id, _status: status });
    if (error) return setActionError(errorMessage(error));
    invalidate();
  };

  const s = stats.data;
  return (
    <div className="min-h-screen bg-cream text-deep">
      <header className="h-16 bg-milk border-b border-line px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/">
            <BrandLogo />
          </Link>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-forest bg-cream border border-line rounded-md px-2 py-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Super Admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          {me?.membership && (
            <Link to="/dashboard" className={smallBtn}>
              My centre
            </Link>
          )}
          <button
            type="button"
            className={smallBtn}
            onClick={async () => {
              const { error: signOutError } = await supabase.auth.signOut();
    window.__lovableEvents?.track?.(signOutError ? 'project.logout_failed' : 'project.logout_succeeded', { source: 'admin' });
              navigate({ to: '/login' });
            }}
          >
            <LogOut className="w-3 h-3" /> Sign out
          </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
        <h1 className="font-display text-2xl font-bold">Platform overview</h1>
        <ErrorNote message={stats.error ? errorMessage(stats.error) : actionError} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Registered centres" value={s?.centres ?? '…'} sub={`${s?.active_centres ?? 0} active · ${s?.suspended_centres ?? 0} suspended`} icon={<Building2 className="w-4 h-4" />} />
          <StatCard label="Farmers" value={s?.farmers ?? '…'} sub={`${s?.active_farmers ?? 0} active`} icon={<Users className="w-4 h-4" />} />
          <StatCard label="User accounts" value={s?.users ?? '…'} sub={`${s?.operators ?? 0} operators`} />
          <StatCard label="Milk collected (30 days)" value={s ? litres(s.litres_30d) : '…'} sub={`${s?.collections_30d ?? 0} entries`} tone="forest" />
        </div>

        <div className="bg-milk border border-line rounded-xl p-5">
          <h2 className="font-display text-base font-bold mb-3">Centre registrations (12 months)</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s?.registrations ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="New centres" fill={chartColors.forest} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-milk border border-line rounded-xl overflow-hidden">
          <h2 className="font-display text-base font-bold p-5 pb-3">Dairy centres</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-cream/70 border-y border-beige text-xs text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Centre</th>
                  <th className="py-2.5 px-4 font-medium">Owner</th>
                  <th className="py-2.5 px-4 font-medium text-right">Farmers</th>
                  <th className="py-2.5 px-4 font-medium text-right">Staff</th>
                  <th className="py-2.5 px-4 font-medium text-right">Milk 30d</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-cream">
                {(centres.data ?? []).map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 px-4">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.code} · {[c.village, c.district, c.state].filter(Boolean).join(', ')} · since {formatDate(c.created_at)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div>{c.owner_name}</div>
                      <div className="text-muted-foreground">{c.owner_email}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{c.farmers}</td>
                    <td className="py-3 px-4 text-right font-mono">{c.staff}</td>
                    <td className="py-3 px-4 text-right font-mono">{litres(Number(c.litres_30d))}</td>
                    <td className="py-3 px-4 text-xs font-semibold">
                      <span className={c.status === 'active' ? 'text-forest' : 'text-destructive'}>{c.status}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.status === 'active' ? (
                        <button type="button" className={smallBtn} onClick={() => setStatus(c.id, 'suspended')}>
                          Suspend
                        </button>
                      ) : (
                        <button type="button" className={smallBtn} onClick={() => setStatus(c.id, 'active')}>
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {centres.isLoading && <Spinner />}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <PlatformSettings />
          <div className="bg-milk border border-line rounded-xl p-5">
            <h2 className="font-display text-base font-bold mb-3">Recent platform activity</h2>
            <div className="divide-y divide-cream max-h-96 overflow-y-auto text-xs">
              {logs.map((l) => (
                <div key={l.id} className="py-2 flex justify-between gap-3">
                  <span className="font-medium text-deep">{l.action}</span>
                  <span className="text-muted-foreground shrink-0">{timeAgo(l.created_at)}</span>
                </div>
              ))}
              {logs.length === 0 && <p className="py-2 text-muted-foreground">No activity yet.</p>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const SETTING_KEYS = [
  { key: 'support_email', label: 'Support email' },
  { key: 'support_phone', label: 'Support phone' },
  { key: 'platform_notice', label: 'Notice shown to all users' },
] as const;

function PlatformSettings() {
  const { data: me } = useMe();
  const settings = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_settings').select('*');
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.key, String((r.value as { text?: string })?.text ?? '')]));
    },
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (settings.data) setValues(settings.data);
  }, [settings.data]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const rows = SETTING_KEYS.map((s) => ({ key: s.key, value: { text: values[s.key] ?? '' }, updated_by: me?.userId ?? null, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from('platform_settings').upsert(rows);
    if (error) return setErr(errorMessage(error));
    setMsg('Platform settings saved.');
  };
  return (
    <form onSubmit={save} className="bg-milk border border-line rounded-xl p-5 space-y-3">
      <h2 className="font-display text-base font-bold">Platform settings</h2>
      {SETTING_KEYS.map((s) => (
        <Field key={s.key} label={s.label} htmlFor={`ps-${s.key}`}>
          <input id={`ps-${s.key}`} value={values[s.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))} className={inputClass} />
        </Field>
      ))}
      <ErrorNote message={err} />
      <SuccessNote message={msg} />
      <button type="submit" className={primaryBtn}>
        Save settings
      </button>
    </form>
  );
}
