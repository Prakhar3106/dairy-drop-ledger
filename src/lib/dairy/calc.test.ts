import { describe, expect, it } from 'vitest';
import { buildDailySeries, closingStock, dayStock, estimatedNetIncome, monthlyIncomeExpense, paymentTypeFor, settlementRange, summarizeCollections } from './calc';
import { buildStatement } from './statements';
import type { LedgerRow } from './api';

describe('inventory', () => {
  it('closing stock = opening + collected − sold − wasted', () => {
    expect(closingStock({ opening: 100, collected: 850, sold: 600, wasted: 7.5 })).toBe(342.5);
  });

  it('day stock uses earlier movements as opening and splits the day by movement type', () => {
    const mv = [
      { movement_date: '2026-11-19', movement_type: 'collection', milk_type: 'Buffalo' as const, quantity_litres: 50 },
      { movement_date: '2026-11-19', movement_type: 'sale', milk_type: 'Buffalo' as const, quantity_litres: -20 },
      { movement_date: '2026-11-20', movement_type: 'collection', milk_type: 'Buffalo' as const, quantity_litres: 40 },
      { movement_date: '2026-11-20', movement_type: 'sale', milk_type: 'Buffalo' as const, quantity_litres: -45 },
      { movement_date: '2026-11-20', movement_type: 'wastage', milk_type: 'Buffalo' as const, quantity_litres: -2 },
      { movement_date: '2026-11-20', movement_type: 'collection', milk_type: 'Cow' as const, quantity_litres: 99 },
    ];
    expect(dayStock(mv, '2026-11-20', 'Buffalo')).toEqual({ opening: 30, collected: 40, sold: 45, wasted: 2, production: 0, adjustments: 0, closing: 23 });
  });
});

describe('settlement cycles', () => {
  it('10-day cycles are 1–10, 11–20 and 21–month end', () => {
    expect(settlementRange('10day', '2026-11-05')).toEqual({ from: '2026-11-01', to: '2026-11-10' });
    expect(settlementRange('10day', '2026-11-20')).toEqual({ from: '2026-11-11', to: '2026-11-20' });
    expect(settlementRange('10day', '2026-02-25')).toEqual({ from: '2026-02-21', to: '2026-02-28' });
  });
  it('weekly cycles start on Monday and monthly covers the whole month', () => {
    expect(settlementRange('weekly', '2026-11-20')).toEqual({ from: '2026-11-16', to: '2026-11-22' });
    expect(settlementRange('monthly', '2026-11-20')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
  });
});

describe('payments', () => {
  it('classifies a payment against the pending balance', () => {
    expect(paymentTypeFor(1500, 1500)).toBe('full');
    expect(paymentTypeFor(500, 1500)).toBe('partial');
    expect(paymentTypeFor(200, 0)).toBe('advance');
  });

  it('statement carries forward earlier entries and keeps a running balance', () => {
    const l = (entry_date: string, amount: number): LedgerRow =>
      ({ id: `${entry_date}-${amount}`, entry_date, amount, entry_type: 'collection', description: '', centre_id: 'c', farmer_id: 'f', created_at: '', created_by: null, reference_id: null, reference_type: null }) as LedgerRow;
    const s = buildStatement([l('2026-11-05', 1000), l('2026-11-12', 617), l('2026-11-15', -1000), l('2026-11-25', 300)], '2026-11-11', '2026-11-20');
    expect(s.opening).toBe(1000);
    expect(s.credits).toBe(617);
    expect(s.debits).toBe(1000);
    expect(s.closing).toBe(617);
    expect(s.lines.map((x) => x.running)).toEqual([1617, 617]);
  });
});

describe('collections', () => {
  const rows = [
    { collection_date: '2026-11-20', shift: 'Morning' as const, milk_type: 'Buffalo' as const, quantity_litres: 10, fat_percent: 7, snf_percent: 9, total_amount: 600 },
    { collection_date: '2026-11-20', shift: 'Evening' as const, milk_type: 'Cow' as const, quantity_litres: 30, fat_percent: 4, snf_percent: 8.5, total_amount: 1200 },
    { collection_date: '2026-11-20', shift: 'Evening' as const, milk_type: 'Cow' as const, quantity_litres: 99, fat_percent: 4, snf_percent: 8.5, total_amount: 4000, status: 'cancelled' },
  ];
  it('ignores cancelled entries and weights Fat/SNF by litres', () => {
    expect(summarizeCollections(rows)).toEqual({ count: 2, litres: 40, amount: 1800, morning: 10, evening: 30, cow: 30, buffalo: 10, avgFat: 4.75, avgSnf: 8.63 });
  });
  it('daily series has a point for every day, including days without milk', () => {
    const s = buildDailySeries([{ day: '2026-11-20', shift: 'Morning', milk_type: 'Cow', litres: 12, amount: 500 }], '2026-11-18', '2026-11-20');
    expect(s.map((p) => p.total)).toEqual([0, 0, 12]);
  });
});

describe('farmer analytics', () => {
  it('estimated net income is recorded income minus recorded expenses, per month', () => {
    const months = monthlyIncomeExpense(
      [{ collection_date: '2026-11-03', total_amount: 48620, quantity_litres: 800 }],
      [{ expense_date: '2026-11-10', amount: 10450 }],
    );
    expect(months).toEqual([{ month: '2026-11', income: 48620, expense: 10450, litres: 800 }]);
    expect(estimatedNetIncome(48620, 10450)).toBe(38170);
  });
});
