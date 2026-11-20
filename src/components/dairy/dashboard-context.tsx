import { createContext, useContext } from 'react';
import type { Centre, Me } from '@/lib/dairy/session';

export interface DashboardCtx {
  me: Me;
  centre: Centre;
  isOwner: boolean;
  canEditCollections: boolean;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
}

export const DashboardContext = createContext<DashboardCtx | null>(null);

export function useDashboard(): DashboardCtx {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used inside the dashboard');
  return ctx;
}
