import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AuthShell, safeRedirect } from '@/components/dairy/AuthShell';
import { ErrorNote, Field, inputClass, primaryBtn } from '@/components/dairy/ui';
import { loginIdentifierToEmail } from '@/lib/dairy/identity';
import { useLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = safeRedirect(search['redirect']);
    return r ? { redirect: r } : {};
  },
  head: () => ({
    meta: [
      { title: 'Sign in — DairySetu' },
      { name: 'description', content: 'Sign in to DairySetu with your email or mobile number.' },
      { property: 'og:title', content: 'Sign in — DairySetu' },
      { property: 'og:description', content: 'Centre owners, operators and farmers sign in here.' },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { redirect } = Route.useSearch();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const email = loginIdentifierToEmail(identifier);
    const method = identifier.includes('@') ? 'email' : 'mobile';
    if (!email) {
      window.__lovableEvents?.track?.('project.login_failed', { method, reason: 'validation' });
      setError(lang === 'hi' ? 'सही ईमेल या 10 अंकों का मोबाइल नंबर लिखें' : 'Enter a valid email or 10-digit mobile number');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) {
      const reason = /banned/i.test(err.message) ? 'disabled' : /invalid|confirm/i.test(err.message) ? 'invalid_credentials' : 'other';
      window.__lovableEvents?.track?.('project.login_failed', { method, reason });
      if (/confirm/i.test(err.message)) setError('Incorrect email or password.');
      else if (/invalid/i.test(err.message)) setError('Wrong email/mobile or password.');
      else if (/banned/i.test(err.message)) setError('This account has been disabled. Contact your dairy centre.');
      else setError(err.message);
      return;
    }
    window.__lovableEvents?.track?.('project.login_succeeded', { method });
    await queryClient.invalidateQueries();
    navigate({ to: redirect ?? '/app' });
  };

  return (
    <AuthShell
      title={lang === 'hi' ? 'डेयरीसेतु में लॉगिन करें' : 'Sign in to DairySetu'}
      subtitle={
        lang === 'hi'
          ? 'केंद्र स्वामी ईमेल से, संचालक और किसान मोबाइल नंबर से लॉगिन करें।'
          : 'Centre owners use their email. Operators and farmers can use their mobile number.'
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={lang === 'hi' ? 'ईमेल या मोबाइल नंबर' : 'Email or mobile number'} htmlFor="identifier">
          <input
            id="identifier"
            autoComplete="username"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@example.com / 98250 00000"
            className={inputClass}
          />
        </Field>
        <Field label={lang === 'hi' ? 'पासवर्ड' : 'Password'} htmlFor="password">
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        <ErrorNote message={error} />
        <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>
          <LogIn className="w-4 h-4" />
          <span>{busy ? (lang === 'hi' ? 'लॉगिन हो रहा है…' : 'Signing in…') : lang === 'hi' ? 'लॉगिन' : 'Sign in'}</span>
        </button>
        <div className="flex items-center justify-between text-xs">
          <Link to="/forgot-password" className="font-medium text-forest hover:underline">
            {lang === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot password?'}
          </Link>
          <Link to="/register" className="font-semibold text-forest hover:underline">
            {lang === 'hi' ? 'नया डेयरी केंद्र पंजीकृत करें' : 'Register a dairy centre'}
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
