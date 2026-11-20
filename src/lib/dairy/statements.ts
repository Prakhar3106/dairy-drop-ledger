import type { LedgerRow } from './api';
import { exportPdf } from './exports';
import { formatDate, inr } from './format';

export interface StatementLine extends LedgerRow {
  running: number;
}

/** Ledger lines within [from, to] with running balance, plus the balance brought forward. */
export function buildStatement(ledger: LedgerRow[], from?: string | undefined, to?: string) {
  let opening = 0;
  let running = 0;
  const lines: StatementLine[] = [];
  for (const l of ledger) {
    const amt = Number(l.amount);
    if (from && l.entry_date < from) {
      opening += amt;
      running += amt;
      continue;
    }
    if (to && l.entry_date > to) continue;
    running += amt;
    lines.push({ ...l, running: Math.round(running * 100) / 100 });
  }
  const credits = lines.filter((l) => Number(l.amount) > 0).reduce((s, l) => s + Number(l.amount), 0);
  const debits = lines.filter((l) => Number(l.amount) < 0).reduce((s, l) => s - Number(l.amount), 0);
  return {
    opening: Math.round(opening * 100) / 100,
    credits: Math.round(credits * 100) / 100,
    debits: Math.round(debits * 100) / 100,
    closing: Math.round(running * 100) / 100,
    lines,
  };
}

export async function downloadFarmerStatement(opts: {
  centreName: string;
  farmer: { farmer_code: string; name: string; village: string; mobile: string };
  ledger: LedgerRow[];
  from?: string | undefined;
  to?: string | undefined;
}) {
  const s = buildStatement(opts.ledger, opts.from, opts.to);
  const period = opts.from || opts.to ? `${formatDate(opts.from ?? s.lines[0]?.entry_date)} – ${formatDate(opts.to ?? s.lines.at(-1)?.entry_date)}` : 'All time';
  await exportPdf({
    filename: `statement-${opts.farmer.farmer_code}-${opts.to ?? 'all'}`,
    title: `${opts.centreName} — Farmer Statement`,
    subtitle: `${opts.farmer.farmer_code} · ${opts.farmer.name} · ${opts.farmer.village} · ${opts.farmer.mobile} · ${period}`,
    summary: [
      ['Balance brought forward', inr(s.opening, 2)],
      ['Milk value & credits', inr(s.credits, 2)],
      ['Payments & deductions', inr(s.debits, 2)],
      [s.closing >= 0 ? 'Pending payable to farmer' : 'Advance owed by farmer', inr(Math.abs(s.closing), 2)],
    ],
    columns: [
      { header: 'Date', value: (l: StatementLine) => formatDate(l.entry_date) },
      { header: 'Type', value: (l) => l.entry_type.replace('_', ' ') },
      { header: 'Details', value: (l) => l.description },
      { header: 'Credit', value: (l) => (Number(l.amount) > 0 ? inr(l.amount, 2) : ''), numeric: true },
      { header: 'Debit', value: (l) => (Number(l.amount) < 0 ? inr(-Number(l.amount), 2) : ''), numeric: true },
      { header: 'Balance', value: (l) => inr(l.running, 2), numeric: true },
    ],
    rows: s.lines,
  });
}
