import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useDashboard } from '@/components/dairy/dashboard-context';
import { OwnerOnly } from '@/components/dairy/OwnerOnly';
import { ErrorNote, Field, Spinner, chartColors, inputClass, primaryBtn, secondaryBtn, smallBtn, tooltipStyle } from '@/components/dairy/ui';
import { type CollectionRow, type ExpenseRow, type MovementRow, type PaymentRow, type SaleRow, fetchAll, useFarmers } from '@/lib/dairy/api';
import { buildDailySeries, dayStock, summarizeCollections } from '@/lib/dairy/calc';
import { type ExportColumn, exportExcel, exportPdf } from '@/lib/dairy/exports';
import { addDays, errorMessage, formatDate, inr, todayIST } from '@/lib/dairy/format';
import { useLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/_authenticated/dashboard/reports')({
  head: () => ({ meta: [{ title: 'Reports — DairySetu' }] }),
  component: () => (
    <OwnerOnly>
      <ReportsPage />
    </OwnerOnly>
  ),
});

const REPORTS = {
  daily: 'Daily milk collection',
  monthly: 'Monthly milk collection',
  farmer: 'Farmer-wise collection',
  detail: 'Collection entries (cow/buffalo, morning/evening)',
  payments: 'Farmer payments',
  pending: 'Pending payments',
  sales: 'Milk sales',
  inventory: 'Inventory (daily stock)',
  expenses: 'Centre expenses',
  performance: 'Centre performance (monthly)',
} as const;
type ReportKey = keyof typeof REPORTS;
type Row = Record<string, string | number>;
interface ReportResult {
  columns: ExportColumn<Row>[];
  rows: Row[];
  summary: [string, string][];
  chart?: { key: string; label: string; data: Row[] };
}

const col = (header: string, key: string, numeric = false): ExportColumn<Row> => ({ header, value: (r) => r[key], numeric });

function ReportsPage() {
  const { t } = useLanguage();
  const { centre, selectedDate } = useDashboard();
  const { data: farmers = [] } = useFarmers(centre.id, false);
  const [report, setReport] = useState<ReportKey>('daily');
  const [from, setFrom] = useState(addDays(selectedDate, -29));
  const [to, setTo] = useState(selectedDate);
  const [farmerId, setFarmerId] = useState('');
  const [milk, setMilk] = useState<'' | 'Cow' | 'Buffalo'>('');
  const [shift, setShift] = useState<'' | 'Morning' | 'Evening'>('');
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const pageSize = 25;

  const result = useQuery({
    queryKey: ['report', centre.id, report, from, to, farmerId, milk, shift],
    queryFn: () => loadReport(report, { centreId: centre.id, from, to, farmerId, milk, shift }),
  });
  const rows = result.data?.rows ?? [];
  const pageRows = rows.slice(page * pageSize, page * pageSize + pageSize);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const usesFarmer = ['farmer', 'detail', 'payments'].includes(report);
  const usesMilk = ['detail', 'sales', 'farmer', 'daily'].includes(report);
  const usesShift = ['detail', 'farmer'].includes(report);
  const subtitle = `${centre.name} (${centre.code}) · ${formatDate(from)} – ${formatDate(to)}${milk ? ` · ${milk}` : ''}${shift ? ` · ${shift}` : ''}${
    farmerId ? ` · ${farmers.find((f) => f.id === farmerId)?.name ?? ''}` : ''
  }`;

  const doExport = async (kind: 'xlsx' | 'pdf') => {
    if (!result.data) return;
    setExporting(kind);
    setExportError(null);
    try {
      const filename = `dairysetu-${report}-${from}-to-${to}`;
      if (kind === 'xlsx') {
        await exportExcel({ filename, sheet: REPORTS[report], title: REPORTS[report], subtitle, columns: result.data.columns, rows });
      } else {
        await exportPdf({ filename, title: REPORTS[report], subtitle, columns: result.data.columns, rows, summary: result.data.summary, landscape: result.data.columns.length > 6 });
      }
    } catch (e) {
      setExportError(errorMessage(e));
    } finally {
      setExporting(null);
    }
  };

  const chart = result.data?.chart;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-deep tracking-tight">{t('menuReports')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Collection, payment, sales, stock and expense reports from your centre’s records</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => doExport('xlsx')} disabled={!rows.length || !!exporting} className={secondaryBtn}>
            <FileSpreadsheet className="w-4 h-4" /> {exporting === 'xlsx' ? 'Preparing…' : 'Excel'}
          </button>
          <button type="button" onClick={() => doExport('pdf')} disabled={!rows.length || !!exporting} className={primaryBtn}>
            <Download className="w-4 h-4" /> {exporting === 'pdf' ? 'Preparing…' : 'PDF'}
          </button>
        </div>
      </div>

      <div className="bg-milk border border-line rounded-xl p-4 grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
        <div className="col-span-2">
          <Field label="Report" htmlFor="rp-type">
            <select
              id="rp-type"
              value={report}
              onChange={(e) => {
                setReport(e.target.value as ReportKey);
                setPage(0);
              }}
              className={inputClass}
            >
              {Object.entries(REPORTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="From" htmlFor="rp-from">
          <input id="rp-from" type="date" max={to} value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className={inputClass} />
        </Field>
        <Field label="To" htmlFor="rp-to">
          <input id="rp-to" type="date" max={todayIST()} value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} className={inputClass} />
        </Field>
        {usesFarmer && (
          <Field label="Farmer" htmlFor="rp-farmer">
            <select id="rp-farmer" value={farmerId} onChange={(e) => { setFarmerId(e.target.value); setPage(0); }} className={inputClass}>
              <option value="">All farmers</option>
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.farmer_code} — {f.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {usesMilk && (
          <Field label="Milk" htmlFor="rp-milk">
            <select id="rp-milk" value={milk} onChange={(e) => { setMilk(e.target.value as typeof milk); setPage(0); }} className={inputClass}>
              <option value="">Cow + Buffalo</option>
              <option value="Cow">Cow</option>
              <option value="Buffalo">Buffalo</option>
            </select>
          </Field>
        )}
        {usesShift && (
          <Field label="Shift" htmlFor="rp-shift">
            <select id="rp-shift" value={shift} onChange={(e) => { setShift(e.target.value as typeof shift); setPage(0); }} className={inputClass}>
              <option value="">Both shifts</option>
              <option value="Morning">Morning</option>
              <option value="Evening">Evening</option>
            </select>
          </Field>
        )}
      </div>

      <ErrorNote message={result.error ? errorMessage(result.error) : exportError} />
      {result.isLoading && <Spinner label="Building report…" />}

      {result.data && (
        <>
          {result.data.summary.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {result.data.summary.map(([k, v]) => (
                <div key={k} className="bg-milk border border-line rounded-xl p-4">
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="font-display text-xl font-bold text-deep mt-1 font-mono tabular-nums">{v}</div>
                </div>
              ))}
            </div>
          )}

          {chart && chart.data.length > 0 && (
            <div className="bg-milk border border-line rounded-xl p-6">
              <h2 className="font-display text-base font-bold text-deep mb-4">{chart.label}</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} minTickGap={8} />
                    <YAxis tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey={chart.key} name={chart.label} fill={chartColors.forest} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-milk border border-line rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-cream/70 border-b border-beige text-xs text-muted-foreground">
                  <tr>
                    {result.data.columns.map((c) => (
                      <th key={c.header} className={`py-3 px-4 font-medium whitespace-nowrap ${c.numeric ? 'text-right' : ''}`}>
                        {c.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream">
                  {pageRows.map((r, i) => (
                    <tr key={i} className="hover:bg-cream/50">
                      {result.data.columns.map((c) => (
                        <td key={c.header} className={`py-2.5 px-4 whitespace-nowrap ${c.numeric ? 'text-right font-mono tabular-nums' : 'text-deep'}`}>
                          {c.value(r)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No records for these filters.</div>}
            {rows.length > pageSize && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-beige text-xs text-muted-foreground">
                <span>
                  {page * pageSize + 1}–{Math.min(rows.length, (page + 1) * pageSize)} of {rows.length}
                </span>
                <span className="flex gap-2">
                  <button type="button" className={smallBtn} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </button>
                  <button type="button" className={smallBtn} disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </button>
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface Filters {
  centreId: string;
  from: string;
  to: string;
  farmerId: string;
  milk: '' | 'Cow' | 'Buffalo';
  shift: '' | 'Morning' | 'Evening';
}

async function loadCollections(f: Filters): Promise<CollectionRow[]> {
  return fetchAll<CollectionRow>((a, b) => {
    let q = supabase
      .from('milk_collections')
      .select('*, farmer:farmers(farmer_code, name, name_hi, village)')
      .eq('centre_id', f.centreId)
      .eq('status', 'active')
      .gte('collection_date', f.from)
      .lte('collection_date', f.to);
    if (f.farmerId) q = q.eq('farmer_id', f.farmerId);
    if (f.milk) q = q.eq('milk_type', f.milk);
    if (f.shift) q = q.eq('shift', f.shift);
    return q.order('collection_date').order('collected_at').range(a, b) as never;
  });
}

const l2 = (n: number) => Number(n).toFixed(2);

async function loadReport(report: ReportKey, f: Filters): Promise<ReportResult> {
  if (report === 'daily' || report === 'monthly' || report === 'farmer' || report === 'detail') {
    const rows = await loadCollections(f);
    const tot = summarizeCollections(rows);
    const summary: [string, string][] = [
      ['Total litres', `${l2(tot.litres)} L`],
      ['Milk value', inr(tot.amount, 2)],
      ['Entries', String(tot.count)],
      ['Avg Fat / SNF', `${tot.avgFat}% / ${tot.avgSnf}%`],
    ];
    if (report === 'detail') {
      return {
        summary,
        rows: rows.map((r) => ({
          date: formatDate(r.collection_date),
          receipt: r.receipt_no,
          code: r.farmer?.farmer_code ?? '',
          farmer: r.farmer?.name ?? '',
          shift: r.shift,
          milk: r.milk_type,
          litres: l2(r.quantity_litres),
          fat: r.fat_percent,
          snf: r.snf_percent,
          rate: l2(r.rate_per_litre),
          amount: l2(r.total_amount),
        })),
        columns: [
          col('Date', 'date'),
          col('Receipt', 'receipt'),
          col('Farmer ID', 'code'),
          col('Farmer', 'farmer'),
          col('Shift', 'shift'),
          col('Milk', 'milk'),
          col('Litres', 'litres', true),
          col('Fat %', 'fat', true),
          col('SNF %', 'snf', true),
          col('Rate ₹', 'rate', true),
          col('Amount ₹', 'amount', true),
        ],
      };
    }
    if (report === 'farmer') {
      const by = new Map<string, CollectionRow[]>();
      for (const r of rows) by.set(r.farmer_id, [...(by.get(r.farmer_id) ?? []), r]);
      const out = [...by.values()]
        .map((list) => {
          const s = summarizeCollections(list);
          return { code: list[0]?.farmer?.farmer_code ?? '', farmer: list[0]?.farmer?.name ?? '', village: list[0]?.farmer?.village ?? '', entries: s.count, litres: l2(s.litres), fat: s.avgFat, snf: s.avgSnf, amount: l2(s.amount) };
        })
        .sort((a, b) => String(a.code).localeCompare(String(b.code)));
      return {
        summary,
        rows: out,
        columns: [col('Farmer ID', 'code'), col('Farmer', 'farmer'), col('Village', 'village'), col('Entries', 'entries', true), col('Litres', 'litres', true), col('Avg Fat %', 'fat', true), col('Avg SNF %', 'snf', true), col('Amount ₹', 'amount', true)],
      };
    }
    const daily = buildDailySeries(
      rows.map((r) => ({ day: r.collection_date, shift: r.shift, milk_type: r.milk_type, litres: Number(r.quantity_litres), amount: Number(r.total_amount) })),
      f.from,
      f.to,
    );
    if (report === 'daily') {
      const out = daily.map((d) => ({ label: d.day, date: formatDate(d.date), morning: l2(d.morning), evening: l2(d.evening), cow: l2(d.cow), buffalo: l2(d.buffalo), total: l2(d.total), totalNum: d.total, amount: l2(d.amount) }));
      return {
        summary,
        rows: out,
        chart: { key: 'totalNum', label: 'Daily total collection (litres)', data: out },
        columns: [col('Date', 'date'), col('Morning L', 'morning', true), col('Evening L', 'evening', true), col('Cow L', 'cow', true), col('Buffalo L', 'buffalo', true), col('Total L', 'total', true), col('Amount ₹', 'amount', true)],
      };
    }
    const months = new Map<string, Row>();
    for (const d of daily) {
      const k = d.date.slice(0, 7);
      const m = months.get(k) ?? { label: formatDate(`${k}-01`).slice(3), month: formatDate(`${k}-01`).slice(3), morning: 0, evening: 0, cow: 0, buffalo: 0, total: 0, amount: 0 };
      for (const key of ['morning', 'evening', 'cow', 'buffalo', 'total', 'amount'] as const) m[key] = Number(m[key]) + d[key];
      months.set(k, m);
    }
    const out = [...months.values()].map((m) => ({ ...m, totalNum: Number(m['total']), ...Object.fromEntries(['morning', 'evening', 'cow', 'buffalo', 'total', 'amount'].map((k) => [k, l2(Number(m[k]))])) }));
    return {
      summary,
      rows: out,
      chart: { key: 'totalNum', label: 'Monthly total collection (litres)', data: out },
      columns: [col('Month', 'month'), col('Morning L', 'morning', true), col('Evening L', 'evening', true), col('Cow L', 'cow', true), col('Buffalo L', 'buffalo', true), col('Total L', 'total', true), col('Amount ₹', 'amount', true)],
    };
  }

  if (report === 'payments') {
    const rows = await fetchAll<PaymentRow>((a, b) => {
      let q = supabase.from('farmer_payments').select('*, farmer:farmers(farmer_code, name, name_hi, village)').eq('centre_id', f.centreId).gte('payment_date', f.from).lte('payment_date', f.to);
      if (f.farmerId) q = q.eq('farmer_id', f.farmerId);
      return q.order('payment_date').range(a, b) as never;
    });
    const done = rows.filter((r) => r.status === 'completed');
    return {
      summary: [
        ['Payments', String(done.length)],
        ['Total paid', inr(done.filter((r) => r.payment_type !== 'advance').reduce((s, r) => s + Number(r.amount), 0), 2)],
        ['Advances given', inr(done.filter((r) => r.payment_type === 'advance').reduce((s, r) => s + Number(r.amount), 0), 2)],
        ['Reversed', String(rows.length - done.length)],
      ],
      rows: rows.map((r) => ({ date: formatDate(r.payment_date), txn: r.txn_id, code: r.farmer?.farmer_code ?? '', farmer: r.farmer?.name ?? '', type: r.payment_type, method: r.method, ref: r.reference_no, status: r.status, amount: l2(r.amount) })),
      columns: [col('Date', 'date'), col('Transaction', 'txn'), col('Farmer ID', 'code'), col('Farmer', 'farmer'), col('Type', 'type'), col('Method', 'method'), col('Reference', 'ref'), col('Status', 'status'), col('Amount ₹', 'amount', true)],
    };
  }

  if (report === 'pending') {
    const { data, error } = await supabase.rpc('settlement_summary', { _centre: f.centreId, _from: f.from, _to: f.to });
    if (error) throw error;
    const due = (data ?? []).filter((r) => Number(r.balance) > 0).sort((a, b) => Number(b.balance) - Number(a.balance));
    return {
      summary: [
        ['Farmers with dues', String(due.length)],
        ['Total pending', inr(due.reduce((s, r) => s + Number(r.balance), 0), 2)],
      ],
      rows: due.map((r) => ({ code: r.farmer_code, farmer: r.name, village: r.village, litres: l2(r.litres), gross: l2(r.gross), balance: l2(r.balance) })),
      columns: [col('Farmer ID', 'code'), col('Farmer', 'farmer'), col('Village', 'village'), col('Litres (period)', 'litres', true), col('Gross ₹ (period)', 'gross', true), col('Pending ₹ (today)', 'balance', true)],
    };
  }

  if (report === 'sales') {
    const rows = await fetchAll<SaleRow>((a, b) => {
      let q = supabase.from('milk_sales').select('*').eq('centre_id', f.centreId).gte('sale_date', f.from).lte('sale_date', f.to);
      if (f.milk) q = q.eq('milk_type', f.milk);
      return q.order('sale_date').range(a, b) as never;
    });
    return {
      summary: [
        ['Sales', String(rows.length)],
        ['Litres sold', `${l2(rows.reduce((s, r) => s + Number(r.quantity_litres), 0))} L`],
        ['Revenue', inr(rows.reduce((s, r) => s + Number(r.total_amount), 0), 2)],
        ['On credit', inr(rows.filter((r) => r.payment_status === 'Credit').reduce((s, r) => s + Number(r.total_amount), 0), 2)],
      ],
      rows: rows.map((r) => ({ date: formatDate(r.sale_date), no: r.sale_no, customer: r.customer_name, type: r.customer_type, milk: r.milk_type, litres: l2(r.quantity_litres), rate: l2(r.rate_per_litre), amount: l2(r.total_amount), status: r.payment_status })),
      columns: [col('Date', 'date'), col('Sale', 'no'), col('Customer', 'customer'), col('Type', 'type'), col('Milk', 'milk'), col('Litres', 'litres', true), col('Rate ₹', 'rate', true), col('Amount ₹', 'amount', true), col('Payment', 'status')],
    };
  }

  if (report === 'inventory') {
    const movements = await fetchAll<MovementRow>((a, b) => supabase.from('inventory_movements').select('*').eq('centre_id', f.centreId).lte('movement_date', f.to).order('movement_date').range(a, b) as never);
    const out: Row[] = [];
    for (let d = f.from; d <= f.to; d = addDays(d, 1)) {
      for (const m of ['Cow', 'Buffalo'] as const) {
        const s = dayStock(movements, d, m);
        if (s.opening || s.collected || s.sold || s.wasted || s.production || s.adjustments) {
          out.push({ date: formatDate(d), milk: m, opening: l2(s.opening), collected: l2(s.collected), sold: l2(s.sold), wasted: l2(s.wasted), production: l2(s.production), adjustments: l2(s.adjustments), closing: l2(s.closing) });
        }
      }
      if (out.length > 2000) break;
    }
    return {
      summary: [],
      rows: out,
      columns: [col('Date', 'date'), col('Milk', 'milk'), col('Opening L', 'opening', true), col('Collected L', 'collected', true), col('Sold L', 'sold', true), col('Wasted L', 'wasted', true), col('Production L', 'production', true), col('Adjust L', 'adjustments', true), col('Closing L', 'closing', true)],
    };
  }

  if (report === 'expenses') {
    const rows = await fetchAll<ExpenseRow>((a, b) => supabase.from('farm_expenses').select('*').eq('centre_id', f.centreId).gte('expense_date', f.from).lte('expense_date', f.to).order('expense_date').range(a, b) as never);
    const byCat = new Map<string, number>();
    for (const r of rows) byCat.set(r.category, (byCat.get(r.category) ?? 0) + Number(r.amount));
    return {
      summary: [['Total expenses', inr(rows.reduce((s, r) => s + Number(r.amount), 0), 2)], ...[...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => [k, inr(v)] as [string, string])],
      rows: rows.map((r) => ({ date: formatDate(r.expense_date), category: r.category, description: r.description, paid: r.paid_by, amount: l2(r.amount) })),
      columns: [col('Date', 'date'), col('Category', 'category'), col('Description', 'description'), col('Paid by', 'paid'), col('Amount ₹', 'amount', true)],
    };
  }

  // performance
  const [cols, sales, exps] = await Promise.all([
    loadCollections({ ...f, farmerId: '', milk: '', shift: '' }),
    fetchAll<SaleRow>((a, b) => supabase.from('milk_sales').select('*').eq('centre_id', f.centreId).gte('sale_date', f.from).lte('sale_date', f.to).range(a, b) as never),
    fetchAll<ExpenseRow>((a, b) => supabase.from('farm_expenses').select('*').eq('centre_id', f.centreId).gte('expense_date', f.from).lte('expense_date', f.to).range(a, b) as never),
  ]);
  const months = new Map<string, { litres: number; payable: number; farmers: Set<string>; sold: number; revenue: number; expense: number }>();
  const get = (k: string) => {
    let m = months.get(k);
    if (!m) months.set(k, (m = { litres: 0, payable: 0, farmers: new Set(), sold: 0, revenue: 0, expense: 0 }));
    return m;
  };
  for (const c of cols) {
    const m = get(c.collection_date.slice(0, 7));
    m.litres += Number(c.quantity_litres);
    m.payable += Number(c.total_amount);
    m.farmers.add(c.farmer_id);
  }
  for (const s of sales) {
    const m = get(s.sale_date.slice(0, 7));
    m.sold += Number(s.quantity_litres);
    m.revenue += Number(s.total_amount);
  }
  for (const e of exps) get(e.expense_date.slice(0, 7)).expense += Number(e.amount);
  const out = [...months.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, m]) => ({
      label: formatDate(`${k}-01`).slice(3),
      month: formatDate(`${k}-01`).slice(3),
      farmers: m.farmers.size,
      litres: l2(m.litres),
      payable: l2(m.payable),
      sold: l2(m.sold),
      revenue: l2(m.revenue),
      expense: l2(m.expense),
      margin: l2(m.revenue - m.payable - m.expense),
      marginNum: Math.round((m.revenue - m.payable - m.expense) * 100) / 100,
    }));
  return {
    summary: [
      ['Milk collected', `${l2(out.reduce((s, r) => s + Number(r.litres), 0))} L`],
      ['Paid to farmers (value)', inr(out.reduce((s, r) => s + Number(r.payable), 0), 2)],
      ['Sales revenue', inr(out.reduce((s, r) => s + Number(r.revenue), 0), 2)],
      ['Estimated margin', inr(out.reduce((s, r) => s + Number(r.marginNum), 0), 2)],
    ],
    rows: out,
    chart: { key: 'marginNum', label: 'Estimated monthly margin (₹) = sales − milk value − expenses', data: out },
    columns: [col('Month', 'month'), col('Farmers', 'farmers', true), col('Collected L', 'litres', true), col('Milk value ₹', 'payable', true), col('Sold L', 'sold', true), col('Sales ₹', 'revenue', true), col('Expenses ₹', 'expense', true), col('Est. margin ₹', 'margin', true)],
  };
}
