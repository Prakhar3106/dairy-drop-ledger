import { createFileRoute, Navigate } from '@tanstack/react-router';
import { homePathFor, useMe } from '@/lib/dairy/session';
import { ErrorNote, Spinner } from '@/components/dairy/ui';
import { errorMessage } from '@/lib/dairy/format';

export const Route = createFileRoute('/_authenticated/app')({
  head: () => ({ meta: [{ title: 'Opening DairySetu…' }] }),
  component: AppRedirect,
});

function AppRedirect() {
  const { data: me, isLoading, error } = useMe();
  if (isLoading) return <Spinner label="Opening your dashboard…" />;
  if (error) return <div className="max-w-md mx-auto p-6"><ErrorNote message={errorMessage(error)} /></div>;
  return <Navigate to={homePathFor(me ?? null)} replace />;
}
