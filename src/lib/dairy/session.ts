import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Centre = Tables<'dairy_centres'>;
export type Farmer = Tables<'farmers'>;
export type AppRole = 'super_admin' | 'centre_owner' | 'operator' | 'farmer';

export interface StaffMembership extends Tables<'centre_staff'> {
  centre: Centre;
}

export interface Me {
  userId: string;
  email: string;
  profile: Tables<'profiles'> | null;
  roles: AppRole[];
  memberships: StaffMembership[];
  /** First active membership: the centre shown in the dashboard. */
  membership: StaffMembership | null;
  farmer: (Farmer & { centre: Centre | null }) | null;
  isSuperAdmin: boolean;
  isOwner: boolean;
  isOperator: boolean;
}

async function fetchMe(): Promise<Me | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const [profileRes, rolesRes, staffRes, farmerRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
    supabase.from('centre_staff').select('*, centre:dairy_centres(*)').eq('user_id', user.id),
    supabase.from('farmers').select('*, centre:dairy_centres(*)').eq('user_id', user.id).maybeSingle(),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (rolesRes.error) throw rolesRes.error;
  if (staffRes.error) throw staffRes.error;
  if (farmerRes.error) throw farmerRes.error;
  const roles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
  const memberships = ((staffRes.data ?? []) as unknown as StaffMembership[]).filter((m) => m.centre);
  const membership =
    memberships.find((m) => m.is_active && m.centre.status === 'active') ?? memberships.find((m) => m.is_active) ?? null;
  return {
    userId: user.id,
    email: user.email ?? '',
    profile: profileRes.data,
    roles,
    memberships,
    membership,
    farmer: (farmerRes.data as Me['farmer']) ?? null,
    isSuperAdmin: roles.includes('super_admin'),
    isOwner: membership?.staff_role === 'owner',
    isOperator: membership?.staff_role === 'operator',
  };
}

export const meQueryKey = ['me'] as const;

export function useMe() {
  return useQuery({ queryKey: meQueryKey, queryFn: fetchMe, staleTime: 60_000 });
}

/** Where a signed-in user should land, based on their role. */
export function homePathFor(me: Me | null): '/dashboard' | '/farmer-portal' | '/admin' | '/no-access' {
  if (!me) return '/no-access';
  if (me.membership) return '/dashboard';
  if (me.isSuperAdmin) return '/admin';
  if (me.farmer) return '/farmer-portal';
  return '/no-access';
}
