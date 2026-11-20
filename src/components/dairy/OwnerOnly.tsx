import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useDashboard } from './dashboard-context';

export function OwnerOnly({ children }: { children: ReactNode }) {
  const { isOwner } = useDashboard();
  if (isOwner) return <>{children}</>;
  return (
    <div className="bg-milk border border-line rounded-xl p-8 text-center max-w-lg mx-auto">
      <Lock className="w-6 h-6 text-earth mx-auto" />
      <h1 className="font-display text-lg font-bold text-deep mt-3">Centre owner access only</h1>
      <p className="text-sm text-muted-foreground mt-1">This section is available to the dairy centre owner. Operators can record and view milk collections.</p>
    </div>
  );
}
