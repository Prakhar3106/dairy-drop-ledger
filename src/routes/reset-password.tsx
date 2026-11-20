import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthShell } from '@/components/dairy/AuthShell';
import { ErrorNote, Field, inputClass, primaryBtn } from '@/components/dairy/ui';

export const Route = createFileRoute('/reset-password')({
  head: () => ({
    meta: [
      { title: 'Set a new password — DairySetu' },
      { name: 'description', content: 'Choose a new password for your DairySetu account.' },
      { property: 'og:title', content: 'Set a new password — DairySetu' },
      { property: 'og:description', content: 'Choose a new password for your DairySetu account.' },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes('type=recovery');
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session && (isRecovery || s.session)) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    navigate({ to: '/app' });
  };

  return (
    <AuthShell title="Set a new password">
      {!ready ? (
        <p className="text-sm text-muted-foreground">Open this page from the reset link in your email. If the link expired, request a new one.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="New password" htmlFor="pw">
            <input id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Confirm new password" htmlFor="pw2">
            <input id="pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
          </Field>
          <ErrorNote message={error} />
          <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
