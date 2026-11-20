import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type FarmerRow = Tables<'farmers'>;
export type BalanceRow = Tables<'farmer_balances'>;
export type CollectionRow = Tables<'milk_collections'> & {
  farmer: Pick<FarmerRow, 'farmer_code' | 'name' | 'name_hi' | 'village'> | null;
};
export type PaymentRow = Tables<'farmer_payments'> & {
  farmer: Pick<FarmerRow, 'farmer_code' | 'name' | 'name_hi' | 'village'> | null;
};
export type LedgerRow = Tables<'farmer_ledger'>;
export type SaleRow = Tables<'milk_sales'>;
export type MovementRow = Tables<'inventory_movements'>;
export type AnimalRow = Tables<'animals'> & { farmer: Pick<FarmerRow, 'farmer_code' | 'name' | 'name_hi' | 'user_id'> | null };
export type HealthRow = Tables<'animal_health_records'>;
export type VaccinationRow = Tables<'vaccination_records'>;
export type BreedingRow = Tables<'breeding_records'>;
export type ExpenseRow = Tables<'farm_expenses'>;
export type NotificationRow = Tables<'notifications'>;
export type RateChartRow = Tables<'rate_charts'> & { rate_slabs: Tables<'rate_slabs'>[] };
export type StaffRow = Tables<'centre_staff'> & { profile: Pick<Tables<'profiles'>, 'full_name' | 'mobile' | 'email'> | null };
export type BatchRow = Tables<'production_batches'>;
export type AuditRow = Tables<'audit_logs'>;

export type FarmerWithBalance = FarmerRow & {
  balance: number;
  total_litres: number;
  total_earned: number;
  total_paid: number;
};

const FARMER_MINI = 'farmer:farmers(farmer_code, name, name_hi, village)';

function unwrap<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw res.error;
  return (res.data ?? ([] as unknown)) as NonNullable<T>;
}

/** Fetches every row of a query in pages of 1000 (the Data API's per-request cap). */
export async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, max = 20000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += 1000) {
    const res = await build(from, from + 999);
    if (res.error) throw res.error;
    const rows = res.data ?? [];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function useFarmers(centreId: string | undefined, withBalances = true) {
  return useQuery({
    queryKey: ['farmers', centreId, withBalances],
    enabled: !!centreId,
    queryFn: async (): Promise<FarmerWithBalance[]> => {
      const farmers = await fetchAll<FarmerRow>((a, b) =>
        supabase.from('farmers').select('*').eq('centre_id', centreId as string).order('farmer_code').range(a, b),
      );
      const balances = withBalances
        ? await fetchAll<BalanceRow>((a, b) => supabase.from('farmer_balances').select('*').eq('centre_id', centreId as string).range(a, b))
        : [];
      const byId = new Map(balances.map((r) => [r.farmer_id, r]));
      return farmers.map((f) => {
        const b = byId.get(f.id);
        return {
          ...f,
          balance: Number(b?.balance ?? 0),
          total_litres: Number(b?.total_litres ?? 0),
          total_earned: Number(b?.total_earned ?? 0),
          total_paid: Number(b?.total_paid ?? 0),
        };
      });
    },
  });
}

export function useFarmerBalance(farmerId: string | undefined) {
  return useQuery({
    queryKey: ['farmer-balance', farmerId],
    enabled: !!farmerId,
    queryFn: async (): Promise<BalanceRow | null> => {
      const { data, error } = await supabase.from('farmer_balances').select('*').eq('farmer_id', farmerId as string).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCollections(opts: { centreId?: string | undefined; farmerId?: string | undefined; from?: string | undefined; to?: string | undefined; limit?: number | undefined; includeCancelled?: boolean | undefined }) {
  const { centreId, farmerId, from, to, limit = 500, includeCancelled = true } = opts;
  return useQuery({
    queryKey: ['collections', centreId, farmerId, from, to, limit, includeCancelled],
    enabled: !!(centreId || farmerId),
    queryFn: async (): Promise<CollectionRow[]> => {
      let q = supabase.from('milk_collections').select(`*, ${FARMER_MINI}`);
      if (centreId) q = q.eq('centre_id', centreId);
      if (farmerId) q = q.eq('farmer_id', farmerId);
      if (from) q = q.gte('collection_date', from);
      if (to) q = q.lte('collection_date', to);
      if (!includeCancelled) q = q.eq('status', 'active');
      return unwrap(await q.order('collected_at', { ascending: false }).limit(limit)) as unknown as CollectionRow[];
    },
  });
}

export function useDailySummary(centreId: string | undefined, from: string, to: string, farmerId?: string) {
  return useQuery({
    queryKey: ['daily-summary', centreId, from, to, farmerId],
    enabled: !!centreId,
    queryFn: async () =>
      unwrap(
        await supabase.rpc('collection_daily_summary', {
          _centre: centreId as string,
          _from: from,
          _to: to,
          ...(farmerId ? { _farmer: farmerId } : {}),
        }),
      ),
  });
}

export function useSettlement(centreId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: ['settlement', centreId, from, to],
    enabled: !!centreId,
    queryFn: async () => unwrap(await supabase.rpc('settlement_summary', { _centre: centreId as string, _from: from, _to: to })),
  });
}

export function usePayments(opts: { centreId?: string | undefined; farmerId?: string | undefined; from?: string | undefined; to?: string | undefined; limit?: number | undefined }) {
  const { centreId, farmerId, from, to, limit = 500 } = opts;
  return useQuery({
    queryKey: ['payments', centreId, farmerId, from, to, limit],
    enabled: !!(centreId || farmerId),
    queryFn: async (): Promise<PaymentRow[]> => {
      let q = supabase.from('farmer_payments').select(`*, ${FARMER_MINI}`);
      if (centreId) q = q.eq('centre_id', centreId);
      if (farmerId) q = q.eq('farmer_id', farmerId);
      if (from) q = q.gte('payment_date', from);
      if (to) q = q.lte('payment_date', to);
      return unwrap(await q.order('created_at', { ascending: false }).limit(limit)) as unknown as PaymentRow[];
    },
  });
}

export function useLedger(farmerId: string | undefined) {
  return useQuery({
    queryKey: ['ledger', farmerId],
    enabled: !!farmerId,
    queryFn: async () =>
      fetchAll<LedgerRow>((a, b) =>
        supabase.from('farmer_ledger').select('*').eq('farmer_id', farmerId as string).order('entry_date').order('created_at').range(a, b),
      ),
  });
}

export function useSales(centreId: string | undefined, from?: string | undefined, to?: string) {
  return useQuery({
    queryKey: ['sales', centreId, from, to],
    enabled: !!centreId,
    queryFn: async () => {
      let q = supabase.from('milk_sales').select('*').eq('centre_id', centreId as string);
      if (from) q = q.gte('sale_date', from);
      if (to) q = q.lte('sale_date', to);
      return unwrap(await q.order('created_at', { ascending: false }).limit(1000)) as SaleRow[];
    },
  });
}

export function useInventory(centreId: string | undefined) {
  return useQuery({
    queryKey: ['inventory', centreId],
    enabled: !!centreId,
    queryFn: async () => {
      const [movements, stock] = await Promise.all([
        fetchAll<MovementRow>((a, b) =>
          supabase.from('inventory_movements').select('*').eq('centre_id', centreId as string).order('movement_date').order('created_at').range(a, b),
        ),
        supabase.from('inventory_stock').select('*').eq('centre_id', centreId as string),
      ]);
      if (stock.error) throw stock.error;
      const cow = Number(stock.data?.find((s) => s.milk_type === 'Cow')?.stock_litres ?? 0);
      const buffalo = Number(stock.data?.find((s) => s.milk_type === 'Buffalo')?.stock_litres ?? 0);
      return { movements, stock: { cow, buffalo, total: Math.round((cow + buffalo) * 100) / 100 } };
    },
  });
}

export function useAnimals(opts: { centreId?: string | undefined; farmerId?: string | undefined }) {
  return useQuery({
    queryKey: ['animals', opts.centreId, opts.farmerId],
    enabled: !!(opts.centreId || opts.farmerId),
    queryFn: async (): Promise<AnimalRow[]> => {
      let q = supabase.from('animals').select('*, farmer:farmers(farmer_code, name, name_hi, user_id)');
      if (opts.centreId) q = q.eq('centre_id', opts.centreId);
      if (opts.farmerId) q = q.eq('farmer_id', opts.farmerId);
      return unwrap(await q.order('created_at', { ascending: false })) as unknown as AnimalRow[];
    },
  });
}

export function useAnimalRecords(animalId: string | undefined) {
  return useQuery({
    queryKey: ['animal-records', animalId],
    enabled: !!animalId,
    queryFn: async () => {
      const id = animalId as string;
      const [health, vacc, breeding] = await Promise.all([
        supabase.from('animal_health_records').select('*').eq('animal_id', id).order('record_date', { ascending: false }),
        supabase.from('vaccination_records').select('*').eq('animal_id', id).order('scheduled_date', { ascending: false }),
        supabase.from('breeding_records').select('*').eq('animal_id', id).order('event_date', { ascending: false }),
      ]);
      return {
        health: unwrap(health) as HealthRow[],
        vaccinations: unwrap(vacc) as VaccinationRow[],
        breeding: unwrap(breeding) as BreedingRow[],
      };
    },
  });
}

/** Upcoming scheduled vaccinations for the animals the user can see. */
export function useUpcomingVaccinations(animalIds: string[], from: string, to: string) {
  return useQuery({
    queryKey: ['upcoming-vaccinations', animalIds.join(','), from, to],
    enabled: animalIds.length > 0,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('vaccination_records')
          .select('*')
          .in('animal_id', animalIds.slice(0, 300))
          .eq('status', 'Scheduled')
          .gte('scheduled_date', from)
          .lte('scheduled_date', to)
          .order('scheduled_date'),
      ) as VaccinationRow[],
  });
}

export function useExpenses(opts: { centreId?: string | undefined; farmerId?: string | undefined; from?: string | undefined; to?: string | undefined }) {
  return useQuery({
    queryKey: ['expenses', opts.centreId, opts.farmerId, opts.from, opts.to],
    enabled: !!(opts.centreId || opts.farmerId),
    queryFn: async () => {
      let q = supabase.from('farm_expenses').select('*');
      if (opts.centreId) q = q.eq('centre_id', opts.centreId);
      if (opts.farmerId) q = q.eq('farmer_id', opts.farmerId);
      if (opts.from) q = q.gte('expense_date', opts.from);
      if (opts.to) q = q.lte('expense_date', opts.to);
      return unwrap(await q.order('expense_date', { ascending: false }).order('created_at', { ascending: false }).limit(2000)) as ExpenseRow[];
    },
  });
}

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', userId],
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async () =>
      unwrap(await supabase.from('notifications').select('*').eq('user_id', userId as string).order('created_at', { ascending: false }).limit(200)) as NotificationRow[],
  });
}

export function useRateCharts(centreId: string | undefined) {
  return useQuery({
    queryKey: ['rate-charts', centreId],
    enabled: !!centreId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('rate_charts')
          .select('*, rate_slabs(*)')
          .eq('centre_id', centreId as string)
          .order('effective_from', { ascending: false })
          .order('version', { ascending: false }),
      ) as unknown as RateChartRow[],
  });
}

export function useStaff(centreId: string | undefined) {
  return useQuery({
    queryKey: ['staff', centreId],
    enabled: !!centreId,
    queryFn: async () =>
      unwrap(
        await supabase.from('centre_staff').select('*, profile:profiles(full_name, mobile, email)').eq('centre_id', centreId as string).order('created_at'),
      ) as unknown as StaffRow[],
  });
}

export function useBatches(centreId: string | undefined) {
  return useQuery({
    queryKey: ['batches', centreId],
    enabled: !!centreId,
    queryFn: async () =>
      unwrap(await supabase.from('production_batches').select('*').eq('centre_id', centreId as string).order('created_at', { ascending: false })) as BatchRow[],
  });
}

export function useAuditLogs(centreId: string | undefined, limit = 100) {
  return useQuery({
    queryKey: ['audit', centreId, limit],
    queryFn: async () => {
      let q = supabase.from('audit_logs').select('*');
      if (centreId) q = q.eq('centre_id', centreId);
      return unwrap(await q.order('created_at', { ascending: false }).limit(limit)) as AuditRow[];
    },
  });
}

/** The rate chart in force for a milk type on a date (latest effective_from, then latest version). */
export function currentChart(charts: RateChartRow[] | undefined, milk: 'Cow' | 'Buffalo', date: string): RateChartRow | undefined {
  return (charts ?? [])
    .filter((c) => c.milk_type === milk && c.effective_from <= date)
    .sort((a, b) => (a.effective_from === b.effective_from ? b.version - a.version : b.effective_from.localeCompare(a.effective_from)))[0];
}
