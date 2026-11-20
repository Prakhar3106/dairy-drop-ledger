import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { mobileToLoginEmail } from '@/lib/dairy/identity';

const password = z.string().min(8, 'Password must be at least 8 characters').max(72);
const optionalEmail = z.string().trim().toLowerCase().email('Enter a valid email').or(z.literal('')).optional();

function friendlyAuthError(message: string): string {
  if (/already (been )?registered|already exists/i.test(message)) return 'An account with this mobile number or email already exists';
  if (/password/i.test(message)) return message;
  return 'Could not create the login account. Please try again.';
}

async function assertOwner(supabase: { rpc: (fn: 'is_centre_owner', args: { _centre: string }) => PromiseLike<{ data: boolean | null; error: unknown }> }, centreId: string) {
  const { data, error } = await supabase.rpc('is_centre_owner', { _centre: centreId });
  if (error || !data) throw new Error('Only the centre owner can manage accounts for this centre');
}

/** Creates a collection operator login for the caller's centre. */
export const createOperatorAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        centreId: z.string().uuid(),
        fullName: z.string().trim().min(2, 'Enter the operator name').max(100),
        mobile: z.string().trim().min(10, 'Enter a 10-digit mobile number').max(16),
        email: optionalEmail,
        password,
        canEditCollections: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, data.centreId);
    const loginEmail = data.email || mobileToLoginEmail(data.mobile);
    if (!loginEmail) throw new Error('Enter a valid 10-digit Indian mobile number');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: loginEmail,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, mobile: data.mobile },
    });
    if (error || !created.user) throw new Error(friendlyAuthError(error?.message ?? ''));
    const uid = created.user.id;
    try {
      const r1 = await supabaseAdmin.from('user_roles').insert({ user_id: uid, role: 'operator' });
      if (r1.error) throw r1.error;
      const r2 = await supabaseAdmin
        .from('centre_staff')
        .insert({ centre_id: data.centreId, user_id: uid, staff_role: 'operator', can_edit_collections: data.canEditCollections });
      if (r2.error) throw r2.error;
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: context.userId,
        centre_id: data.centreId,
        action: 'staff.created',
        entity_type: 'centre_staff',
        entity_id: uid,
        details: { name: data.fullName, mobile: data.mobile },
      });
    } catch (e) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error('Could not set up the operator account. Please try again.');
    }
    return { userId: uid, loginId: data.email || data.mobile };
  });

/** Creates a farmer-portal login linked to an existing farmer of the caller's centre. */
export const createFarmerLogin = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ farmerId: z.string().uuid(), email: optionalEmail, password }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: farmer, error: fErr } = await context.supabase
      .from('farmers')
      .select('id, centre_id, name, mobile, user_id, farmer_code')
      .eq('id', data.farmerId)
      .maybeSingle();
    if (fErr || !farmer) throw new Error('Farmer not found');
    await assertOwner(context.supabase, farmer.centre_id);
    if (farmer.user_id) throw new Error('This farmer already has a login');
    const loginEmail = data.email || mobileToLoginEmail(farmer.mobile);
    if (!loginEmail) throw new Error("Add a valid 10-digit mobile number to the farmer's profile, or enter an email");
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: loginEmail,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: farmer.name, mobile: farmer.mobile },
    });
    if (error || !created.user) throw new Error(friendlyAuthError(error?.message ?? ''));
    const uid = created.user.id;
    try {
      const r1 = await supabaseAdmin.from('farmers').update({ user_id: uid }).eq('id', farmer.id);
      if (r1.error) throw r1.error;
      const r2 = await supabaseAdmin.from('user_roles').insert({ user_id: uid, role: 'farmer' });
      if (r2.error) throw r2.error;
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: context.userId,
        centre_id: farmer.centre_id,
        action: 'farmer.login_created',
        entity_type: 'farmer',
        entity_id: farmer.id,
        details: { farmer_code: farmer.farmer_code },
      });
    } catch (e) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error('Could not set up the farmer login. Please try again.');
    }
    return { userId: uid, loginId: data.email || farmer.mobile };
  });

async function assertMemberOfCentre(
  admin: Awaited<typeof import('@/integrations/supabase/client.server')>['supabaseAdmin'],
  centreId: string,
  userId: string,
): Promise<'operator' | 'farmer'> {
  const staff = await admin.from('centre_staff').select('staff_role').eq('centre_id', centreId).eq('user_id', userId).maybeSingle();
  if (staff.data?.staff_role === 'operator') return 'operator';
  if (staff.data?.staff_role === 'owner') throw new Error('The owner account cannot be changed here');
  const farmer = await admin.from('farmers').select('id').eq('centre_id', centreId).eq('user_id', userId).maybeSingle();
  if (farmer.data) return 'farmer';
  throw new Error('This account does not belong to your centre');
}

/** Sets a new password for an operator or farmer of the caller's centre (for mobile-only logins without email). */
export const resetMemberPassword = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ centreId: z.string().uuid(), userId: z.string().uuid(), password }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, data.centreId);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const kind = await assertMemberOfCentre(supabaseAdmin, data.centreId, data.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: context.userId,
      centre_id: data.centreId,
      action: `${kind}.password_reset`,
      entity_type: kind,
      entity_id: data.userId,
      details: {},
    });
    return { ok: true };
  });

/** Enables or disables sign-in for an operator or farmer of the caller's centre. */
export const setMemberAccess = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ centreId: z.string().uuid(), userId: z.string().uuid(), active: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, data.centreId);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const kind = await assertMemberOfCentre(supabaseAdmin, data.centreId, data.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: data.active ? 'none' : '876000h' });
    if (error) throw new Error(error.message);
    if (kind === 'operator') {
      await supabaseAdmin.from('centre_staff').update({ is_active: data.active }).eq('centre_id', data.centreId).eq('user_id', data.userId);
    }
    await supabaseAdmin.from('profiles').update({ is_active: data.active }).eq('id', data.userId);
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: context.userId,
      centre_id: data.centreId,
      action: data.active ? `${kind}.login_enabled` : `${kind}.login_disabled`,
      entity_type: kind,
      entity_id: data.userId,
      details: {},
    });
    return { ok: true };
  });
