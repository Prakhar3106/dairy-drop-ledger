import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthShell } from '@/components/dairy/AuthShell';
import { ErrorNote, Field, SuccessNote, inputClass, primaryBtn } from '@/components/dairy/ui';
import { isMobileLoginEmail, loginIdentifierToEmail } from '@/lib/dairy/identity';

export const Route = createFileRoute('/forgot-password')({
  head: () => ({
    meta: [
      { title: 'Reset your password — DairySetu' },
      { name: 'description', content: 'Get a password reset link for your DairySetu account.' },
      { property: 'og:title', content: 'Reset your password — DairySetu' },
      { property: 'og:description', content: 'Get a password reset link for your DairySetu account.' },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const email = loginIdentifierToEmail(identifier);
    if (!email) return setError('Enter a valid email');
    if (isMobileLoginEmail(email)) {
      return setError('Accounts that sign in with a mobile number cannot get reset emails. Ask your centre owner to set a new password for you.');
    }
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (err) return setError(err.message);
    setDone(true);
  };

  return (
    <AuthShell title="Forgot your password?" subtitle="We'll email you a link to set a new one.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" htmlFor="em">
          <input id="em" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} className={inputClass} />
        </Field>
        <ErrorNote message={error} />
        <SuccessNote message={done ? 'If an account exists for this email, a reset link is on its way. Check your inbox and spam folder.' : null} />
        <button type="submit" disabled={busy || done} className={`${primaryBtn} w-full`}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
        <Link to="/login" className="block text-center text-xs font-semibold text-forest hover:underline">
          Back to sign in
        </Link>
      </form>
    </AuthShell>
  );
}
