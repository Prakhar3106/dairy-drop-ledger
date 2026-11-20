import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthShell } from '@/components/dairy/AuthShell';
import { ErrorNote, Field, inputClass, primaryBtn } from '@/components/dairy/ui';
import { useLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/register')({
  head: () => ({
    meta: [
      { title: 'Register your dairy centre — DairySetu' },
      { name: 'description', content: 'Create a DairySetu account for your village milk collection centre.' },
      { property: 'og:title', content: 'Register your dairy centre — DairySetu' },
      { property: 'og:description', content: 'Start managing milk collection, farmers and payments digitally.' },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const fail = (reason: 'validation' | 'duplicate_email' | 'other', message: string) => {
      window.__lovableEvents?.track?.('project.registration_failed', { reason });
      setError(message);
    };
    const name = form.fullName.trim();
    if (name.length < 2) return fail('validation', 'Enter your full name');
    if (form.password.length < 8) return fail('validation', 'Password must be at least 8 characters');
    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: { full_name: name, registration: 'centre', centre_name: `${name} Dairy` },
      },
    });
    if (!err && data.user && (data.user.identities?.length ?? 0) === 0) {
      setBusy(false);
      return fail('duplicate_email', 'An account with this email already exists. Try signing in.');
    }
    setBusy(false);
    if (err) {
      return /registered|exists/i.test(err.message)
        ? fail('duplicate_email', 'An account with this email already exists. Try signing in.')
        : fail('other', err.message);
    }
    window.__lovableEvents?.track?.('project.registration_succeeded', { signed_in: Boolean(data.session) });
    if (data.session) navigate({ to: '/app' });
    else navigate({ to: '/login' });
  };

  return (
    <AuthShell
      title={lang === 'hi' ? 'डेयरी केंद्र पंजीकरण' : 'Register your dairy centre'}
      subtitle={lang === 'hi' ? 'आप केंद्र स्वामी के रूप में पंजीकृत होंगे।' : 'You will be the centre owner. You can add operators and farmers later.'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name" htmlFor="fn">
          <input id="fn" required autoComplete="name" value={form.fullName} onChange={set('fullName')} className={inputClass} />
        </Field>
        <Field label="Email" htmlFor="em">
          <input id="em" type="email" autoComplete="email" required value={form.email} onChange={set('email')} className={inputClass} />
        </Field>
        <Field label="Password" htmlFor="pw">
          <input id="pw" type="password" autoComplete="new-password" required value={form.password} onChange={set('password')} className={inputClass} />
        </Field>
        <ErrorNote message={error} />
        <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>
          {busy ? 'Creating account…' : 'Create centre account'}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-forest hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
