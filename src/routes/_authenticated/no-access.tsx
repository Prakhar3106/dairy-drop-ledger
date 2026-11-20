import { createFileRoute, Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { BrandLogo } from '@/components/dairy/BrandLogo';
import { secondaryBtn } from '@/components/dairy/ui';
import { useMe } from '@/lib/dairy/session';

export const Route = createFileRoute('/_authenticated/no-access')({
  head: () => ({ meta: [{ title: 'No dairy centre linked — DairySetu' }] }),
  component: NoAccess,
});

function NoAccess() {
  const { data: me } = useMe();
  const suspended = me?.memberships.some((m) => m.centre.status === 'suspended');
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-6">
      <div className="bg-milk border border-line rounded-xl max-w-md w-full p-6 space-y-4">
        <BrandLogo />
        <h1 className="font-display text-xl font-bold text-deep">{suspended ? 'Your centre is suspended' : 'No dairy centre linked yet'}</h1>
        <p className="text-sm text-muted-foreground">
          {suspended
            ? 'This dairy centre has been suspended by the DairySetu administrator. Contact support to reactivate it.'
            : 'Your account is signed in but is not linked to a dairy centre or farmer profile. Ask your centre owner to create your login, or register a new centre.'}
        </p>
        <div className="flex gap-2">
          <Link to="/register" className={secondaryBtn}>Register a centre</Link>
          <button type="button" className={secondaryBtn} onClick={() => supabase.auth.signOut().then(({ error }) => { window.__lovableEvents?.track?.(error ? 'project.logout_failed' : 'project.logout_succeeded', { source: 'no_access' }); window.location.href = '/'; })}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
