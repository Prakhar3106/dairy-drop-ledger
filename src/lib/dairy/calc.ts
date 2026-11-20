import { addDays, shortDay } from './format';

export type MilkType = 'Cow' | 'Buffalo';
export type Shift = 'Morning' | 'Evening';

export interface CollectionLike {
  collection_date: string;
  shift: Shift;
  milk_type: MilkType;
  quantity_litres: number;
  fat_percent: number;
  snf_percent: number;
  total_amount: number;
  status?: string | undefined;
}

export interface CollectionTotals {
  count: number;
  litres: number;
  amount: number;
  morning: number;
  evening: number;
  cow: number;
  buffalo: number;
  avgFat: number;
  avgSnf: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Totals for active (not cancelled) collections. Fat/SNF averages are weighted by litres. */
export function summarizeCollections(rows: CollectionLike[]): CollectionTotals {
  const active = rows.filter((r) => (r.status ?? 'active') === 'active');
  let litresSum = 0, amount = 0, morning = 0, evening = 0, cow = 0, buffalo = 0, fatW = 0, snfW = 0;
  for (const r of active) {
    const q = Number(r.quantity_litres);
    litresSum += q;
    amount += Number(r.total_amount);
    if (r.shift === 'Morning') morning += q; else evening += q;
    if (r.milk_type === 'Cow') cow += q; else buffalo += q;
    fatW += q * Number(r.fat_percent);
    snfW += q * Number(r.snf_percent);
  }
  return {
    count: active.length,
    litres: round2(litresSum),
    amount: round2(amount),
    morning: round2(morning),
    evening: round2(evening),
    cow: round2(cow),
    buffalo: round2(buffalo),
    avgFat: litresSum > 0 ? round2(fatW / litresSum) : 0,
    avgSnf: litresSum > 0 ? round2(snfW / litresSum) : 0,
  };
}

export interface DailySummaryRow {
  day: string;
  shift: Shift;
  milk_type: MilkType;
  litres: number;
  amount: number;
}

export interface DailySeriesPoint {
  date: string;
  day: string;
  morning: number;
  evening: number;
  cow: number;
  buffalo: number;
  total: number;
  amount: number;
}

/** One point per calendar day between from and to (inclusive), filling gaps with zero. */
export function buildDailySeries(rows: DailySummaryRow[], from: string, to: string): DailySeriesPoint[] {
  const points: DailySeriesPoint[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    points.push({ date: d, day: shortDay(d), morning: 0, evening: 0, cow: 0, buffalo: 0, total: 0, amount: 0 });
    if (points.length > 400) break;
  }
  const byDate = new Map(points.map((p) => [p.date, p]));
  for (const r of rows) {
    const p = byDate.get(r.day);
    if (!p) continue;
    const l = Number(r.litres);
    if (r.shift === 'Morning') p.morning += l; else p.evening += l;
    if (r.milk_type === 'Cow') p.cow += l; else p.buffalo += l;
    p.total += l;
    p.amount += Number(r.amount);
  }
  for (const p of points) {
    p.morning = round2(p.morning); p.evening = round2(p.evening); p.cow = round2(p.cow);
    p.buffalo = round2(p.buffalo); p.total = round2(p.total); p.amount = round2(p.amount);
  }
  return points;
}

/** Closing stock = Opening stock + Milk collected − Milk sold − Milk wasted (− used in production ± adjustments). */
export function closingStock(input: { opening: number; collected: number; sold: number; wasted: number; production?: number | undefined; adjustments?: number | undefined }): number {
  return round2(input.opening + input.collected - input.sold - input.wasted - (input.production ?? 0) + (input.adjustments ?? 0));
}

export interface MovementLike {
  movement_date: string;
  movement_type: 'opening' | 'collection' | 'collection_reversal' | 'sale' | 'wastage' | 'production' | 'adjustment' | string;
  milk_type: MilkType;
  quantity_litres: number;
}

export interface DayStock {
  opening: number;
  collected: number;
  sold: number;
  wasted: number;
  production: number;
  adjustments: number;
  closing: number;
}

/** Stock position for one milk type on one day, from signed inventory movements. */
export function dayStock(movements: MovementLike[], date: string, milk: MilkType): DayStock {
  let before = 0, collected = 0, sold = 0, wasted = 0, production = 0, adjustments = 0;
  for (const m of movements) {
    if (m.milk_type !== milk) continue;
    const q = Number(m.quantity_litres);
    if (m.movement_date < date) { before += q; continue; }
    if (m.movement_date > date) continue;
    switch (m.movement_type) {
      case 'opening': before += q; break;
      case 'collection':
      case 'collection_reversal': collected += q; break;
      case 'sale': sold += -q; break;
      case 'wastage': wasted += -q; break;
      case 'production': production += -q; break;
      default: adjustments += q;
    }
  }
  const opening = round2(before);
  return {
    opening,
    collected: round2(collected),
    sold: round2(sold),
    wasted: round2(wasted),
    production: round2(production),
    adjustments: round2(adjustments),
    closing: closingStock({ opening, collected, sold, wasted, production, adjustments }),
  };
}

export type SettlementCycle = 'daily' | 'weekly' | '10day' | 'monthly';

/** Settlement window containing `anchor`. 10-day cycles are 1–10, 11–20 and 21–month end. Weeks start Monday. */
export function settlementRange(cycle: SettlementCycle, anchor: string): { from: string; to: string } {
  const [yStr, mStr, dStr] = anchor.split('-');
  const y = Number(yStr), m = Number(mStr), d = Number(dStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  const monthEnd = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (cycle === 'daily') return { from: anchor, to: anchor };
  if (cycle === 'monthly') return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(monthEnd)}` };
  if (cycle === 'weekly') {
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const offset = (dow + 6) % 7;
    const from = addDays(anchor, -offset);
    return { from, to: addDays(from, 6) };
  }
  if (d <= 10) return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-10` };
  if (d <= 20) return { from: `${y}-${pad(m)}-11`, to: `${y}-${pad(m)}-20` };
  return { from: `${y}-${pad(m)}-21`, to: `${y}-${pad(m)}-${pad(monthEnd)}` };
}

/** Suggests the payment type for an amount against the pending balance. */
export function paymentTypeFor(amount: number, balance: number): 'full' | 'partial' | 'advance' {
  const a = round2(amount), b = round2(balance);
  if (b <= 0) return 'advance';
  if (a === b) return 'full';
  if (a < b) return 'partial';
  return 'advance';
}

/** Estimated net income: recorded milk income minus recorded expenses. It is an estimate, not an audited profit. */
export function estimatedNetIncome(income: number, expenses: number): number {
  return round2(income - expenses);
}

export interface MonthPoint { month: string; income: number; expense: number; litres: number }

export function monthlyIncomeExpense(
  collections: { collection_date: string; total_amount: number; quantity_litres: number; status?: string | undefined }[],
  expenses: { expense_date: string; amount: number }[],
): MonthPoint[] {
  const map = new Map<string, MonthPoint>();
  const get = (k: string) => {
    let p = map.get(k);
    if (!p) { p = { month: k, income: 0, expense: 0, litres: 0 }; map.set(k, p); }
    return p;
  };
  for (const c of collections) {
    if ((c.status ?? 'active') !== 'active') continue;
    const p = get(c.collection_date.slice(0, 7));
    p.income += Number(c.total_amount);
    p.litres += Number(c.quantity_litres);
  }
  for (const e of expenses) get(e.expense_date.slice(0, 7)).expense += Number(e.amount);
  return [...map.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((p) => ({ ...p, income: round2(p.income), expense: round2(p.expense), litres: round2(p.litres) }));
}
