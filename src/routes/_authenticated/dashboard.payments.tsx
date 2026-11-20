import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileText, IndianRupee, Printer, Undo2, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useDashboard } from '@/components/dairy/dashboard-context';
import { OwnerOnly } from '@/components/dairy/OwnerOnly';
import { ErrorNote, Field, Modal, Segmented, chartColors, inputClass, primaryBtn, smallBtn, smallPrimaryBtn, tooltipStyle } from '@/components/dairy/ui';
import { type PaymentRow, useInvalidateAll, useLedger, usePayments, useSettlement } from '@/lib/dairy/api';
import { paymentTypeFor, settlementRange, type SettlementCycle } from '@/lib/dairy/calc';
import { errorMessage, formatDate, inr, newIdempotencyKey, todayIST } from '@/lib/dairy/format';
import { buildStatement, downloadFarmerStatement } from '@/lib/dairy/statements';
import { useLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/_authenticated/dashboard/payments')({
  head: () => ({ meta: [{ title: 'Farmer Payments — DairySetu' }] }),
  component: () => (
    <OwnerOnly>
      <PaymentsPage />
    </OwnerOnly>
  ),
});

type SettlementRow = {
  farmer_id: string;
  farmer_code: string;
  name: string;
  name_hi: string;
  village: string;
  litres: number;
  gross: number;
  paid_in_period: number;
  advances_in_period: number;
  balance: number;
};

const CYCLE_LABEL: Record<SettlementCycle, string> = { daily: 'Daily', weekly: 'Weekly', '10day': '10-Day', monthly: 'Monthly' };

function PaymentsPage() {
  const { lang, t } = useLanguage();
  const { centre, selectedDate } = useDashboard();
  const [cycle, setCycle] = useState<SettlementCycle>('10day');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Paid' | 'Advance'>('All');
  const { from, to } = settlementRange(cycle, selectedDate);
  const { data: rawRows = [], isLoading, error } = useSettlement(centre.id, from, to);
  const rows = rawRows as SettlementRow[];
  const { data: history = [] } = usePayments({ centreId: centre.id, limit: 200 });
  const [payTarget, setPayTarget] = useState<SettlementRow | null>(null);
  const [statementTarget, setStatementTarget] = useState<SettlementRow | null>(null);
  const [reverseTarget, setReverseTarget] = useState<PaymentRow | null>(null);

  const statusOf = (r: SettlementRow) => (Number(r.balance) > 0 ? 'Pending' : Number(r.balance) < 0 ? 'Advance' : 'Paid');
  const visible = rows.filter((r) => Number(r.gross) > 0 || Number(r.balance) !== 0 || Number(r.paid_in_period) > 0);
  const filtered = visible.filter((r) => statusFilter === 'All' || statusOf(r) === statusFilter);
  const totalGross = rows.reduce((s, r) => s + Number(r.gross), 0);
  const totalPaid = rows.reduce((s, r) => s + Number(r.paid_in_period), 0);
  const pendingAmount = rows.filter((r) => Number(r.balance) > 0).reduce((s, r) => s + Number(r.balance), 0);
  const advanceOutstanding = rows.filter((r) => Number(r.balance) < 0).reduce((s, r) => s - Number(r.balance), 0);

  const chartData = useMemo(
    () =>
      [...visible]
        .sort((a, b) => Number(b.gross) - Number(a.gross))
        .slice(0, 8)
        .map((r) => ({ name: r.name.split(' ')[0], paid: Number(r.paid_in_period), pending: Math.max(0, Number(r.balance)) })),
    [visible],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-deep tracking-tight">{t('menuPayments')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lang === 'hi' ? 'किसान भुगतान बहीखाता, अग्रिम समायोजन और भुगतान पर्ची' : 'Farmer settlement ledger, advance payments and printable statements'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented value={cycle} options={['daily', 'weekly', '10day', 'monthly'] as const} onChange={setCycle} labels={CYCLE_LABEL} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-3">
        {CYCLE_LABEL[cycle]} cycle: <strong className="text-deep">{formatDate(from)} – {formatDate(to)}</strong>. Pending balance is calculated from every recorded collection, payment and reversal.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label={lang === 'hi' ? 'इस चक्र का दूध मूल्य' : 'Milk Value This Cycle'} value={inr(totalGross)} tone="text-deep" />
        <Kpi label={lang === 'hi' ? 'इस चक्र में भुगतान' : 'Paid This Cycle'} value={inr(totalPaid)} tone="text-forest" />
        <Kpi label={lang === 'hi' ? 'कुल बकाया राशि' : 'Total Pending Amount'} value={inr(pendingAmount)} tone="text-earth" />
        <Kpi label={lang === 'hi' ? 'बकाया अग्रिम' : 'Advances Outstanding'} value={inr(advanceOutstanding)} tone="text-deep" />
      </div>

      <div className="bg-milk border border-line rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-base font-bold text-deep">{lang === 'hi' ? 'किसान-वार भुगतान तुलना' : 'Farmer-wise Paid vs Pending Overview'}</h2>
            <p className="text-xs text-muted-foreground">{formatDate(from)} – {formatDate(to)} (INR)</p>
          </div>
        </div>
        <div className="h-56 w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No milk or payments in this cycle yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="paid" name="Paid" fill={chartColors.forest} radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill={chartColors.earth} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-milk border border-line rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold text-deep">{lang === 'hi' ? 'किसान-वार भुगतान बहीखाता' : 'Farmer-wise Ledger'}</h2>
          <Segmented value={statusFilter} options={['All', 'Pending', 'Paid', 'Advance'] as const} onChange={setStatusFilter} />
        </div>
        <ErrorNote message={error ? errorMessage(error) : null} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-beige text-xs text-muted-foreground">
                <th className="pb-2.5 font-medium">Farmer</th>
                <th className="pb-2.5 font-medium text-right">{t('litres')}</th>
                <th className="pb-2.5 font-medium text-right">Gross (cycle)</th>
                <th className="pb-2.5 font-medium text-right">Paid (cycle)</th>
                <th className="pb-2.5 font-medium text-right">Net Payable</th>
                <th className="pb-2.5 font-medium pl-3">Status</th>
                <th className="pb-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream">
              {filtered.map((r) => {
                const status = statusOf(r);
                return (
                  <tr key={r.farmer_id} className="hover:bg-cream/50 transition-colors">
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-deep">{lang === 'hi' ? r.name_hi || r.name : r.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.farmer_code} · {r.village}
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums">{Number(r.litres).toFixed(1)}</td>
                    <td className="py-3 text-right font-mono tabular-nums text-muted-foreground">{inr(r.gross)}</td>
                    <td className="py-3 text-right font-mono tabular-nums text-muted-foreground">
                      {inr(r.paid_in_period)}
                      {Number(r.advances_in_period) > 0 && <div className="text-[10px] text-earth">+ adv {inr(r.advances_in_period)}</div>}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums font-bold text-deep">
                      {Number(r.balance) < 0 ? <span className="text-earth">−{inr(-Number(r.balance))}</span> : inr(r.balance)}
                    </td>
                    <td className="py-3 pl-3 text-xs font-semibold">
                      <span className={status === 'Paid' ? 'text-forest' : 'text-earth'}>{status}</span>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap space-x-2">
                      <button type="button" onClick={() => setStatementTarget(r)} className={smallBtn}>
                        <FileText className="w-3.5 h-3.5" />
                        <span>{lang === 'hi' ? 'पर्ची' : 'Statement'}</span>
                      </button>
                      <button type="button" onClick={() => setPayTarget(r)} className={smallPrimaryBtn}>
                        <Wallet className="w-3.5 h-3.5" />
                        <span>{Number(r.balance) > 0 ? (lang === 'hi' ? 'भुगतान करें' : 'Pay') : 'Advance'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {isLoading && <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>}
          {!isLoading && filtered.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No farmers to show for this cycle.</div>}
        </div>
      </div>

      <div className="bg-milk border border-line rounded-xl p-5 space-y-4">
        <h2 className="font-display text-base font-bold text-deep">{t('paymentHistory')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-beige text-xs text-muted-foreground">
                <th className="pb-2.5 font-medium">Date / Txn</th>
                <th className="pb-2.5 font-medium">Farmer</th>
                <th className="pb-2.5 font-medium">Type / Method</th>
                <th className="pb-2.5 font-medium">Reference</th>
                <th className="pb-2.5 font-medium text-right">Amount</th>
                <th className="pb-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cream">
              {history.map((p) => (
                <tr key={p.id} className={p.status === 'reversed' ? 'opacity-55' : ''}>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <div className="text-xs font-medium text-deep">{formatDate(p.payment_date)}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{p.txn_id}</div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="text-deep font-medium">{p.farmer?.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.farmer?.farmer_code}</div>
                  </td>
                  <td className="py-2.5 pr-3 text-xs capitalize">
                    {p.payment_type} · {p.method}
                    {p.status === 'reversed' && <div className="text-destructive font-semibold normal-case">Reversed: {p.reversed_reason}</div>}
                  </td>
                  <td className="py-2.5 pr-3 text-xs font-mono text-muted-foreground">{p.reference_no || '—'}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-forest tabular-nums">{inr(p.amount, 2)}</td>
                  <td className="py-2.5 pl-2 text-right">
                    {p.status === 'completed' && (
                      <button type="button" className={smallBtn} onClick={() => setReverseTarget(p)}>
                        <Undo2 className="w-3 h-3" /> Reverse
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No payments recorded yet.</div>}
        </div>
      </div>

      {payTarget && <RecordPaymentModal row={payTarget} onClose={() => setPayTarget(null)} />}
      {statementTarget && <StatementModal row={statementTarget} from={from} to={to} onClose={() => setStatementTarget(null)} />}
      {reverseTarget && <ReverseModal payment={reverseTarget} onClose={() => setReverseTarget(null)} />}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-milk border border-line rounded-xl p-5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl font-bold mt-2 font-mono tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

function RecordPaymentModal({ row, onClose }: { row: SettlementRow; onClose: () => void }) {
  const invalidate = useInvalidateAll();
  const balance = Number(row.balance);
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : '');
  const [method, setMethod] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'>('UPI');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(todayIST());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(newIdempotencyKey());
  const amt = parseFloat(amount) || 0;
  const type = paymentTypeFor(amt, balance);
  const [forceAdvance, setForceAdvance] = useState(balance <= 0);
  useEffect(() => {
    if (balance <= 0) setForceAdvance(true);
  }, [balance]);
  const effectiveType = forceAdvance ? 'advance' : type;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!forceAdvance && amt > balance) return setError(`Amount is more than the pending ₹${balance}. Tick “Pay as advance” to give an advance.`);
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc('record_payment', {
      _farmer: row.farmer_id,
      _amount: amt,
      _method: method,
      _payment_type: effectiveType,
      _reference_no: reference,
      _notes: notes,
      _payment_date: date,
      _idempotency_key: key.current,
    });
    setBusy(false);
    if (err) return setError(errorMessage(err));
    await invalidate();
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Record payment · ${row.name}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="bg-cream rounded-lg p-3 text-xs grid grid-cols-2 gap-y-1">
          <span className="text-muted-foreground">Farmer</span>
          <span className="text-right font-mono">{row.farmer_code} · {row.village}</span>
          <span className="text-muted-foreground">{balance >= 0 ? 'Pending balance' : 'Advance outstanding'}</span>
          <span className="text-right font-mono font-bold text-deep">{inr(Math.abs(balance), 2)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)" htmlFor="p-amt">
            <input id="p-amt" type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} font-mono`} />
          </Field>
          <Field label="Payment date" htmlFor="p-date">
            <input id="p-date" type="date" max={todayIST()} required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Method" htmlFor="p-method">
            <select id="p-method" value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className={inputClass}>
              <option>UPI</option>
              <option>Bank Transfer</option>
              <option>Cash</option>
              <option>Cheque</option>
            </select>
          </Field>
          <Field label={method === 'Cash' ? 'Reference (optional)' : 'UTR / reference no.'} htmlFor="p-ref">
            <input id="p-ref" required={method !== 'Cash'} value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Notes" htmlFor="p-notes">
          <input id="p-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 text-xs text-deep">
          <input type="checkbox" checked={forceAdvance} disabled={balance <= 0} onChange={(e) => setForceAdvance(e.target.checked)} />
          Pay as advance (deducted from future milk payments)
        </label>
        <div className="text-xs text-muted-foreground">
          Recorded as: <strong className="text-deep capitalize">{effectiveType}</strong> payment
        </div>
        <ErrorNote message={error} />
        <button type="submit" disabled={busy || amt <= 0} className={`${primaryBtn} w-full`}>
          <IndianRupee className="w-4 h-4" />
          {busy ? 'Saving…' : `Record ${inr(amt, 2)}`}
        </button>
      </form>
    </Modal>
  );
}

function StatementModal({ row, from, to, onClose }: { row: SettlementRow; from: string; to: string; onClose: () => void }) {
  const { centre } = useDashboard();
  const { data: ledger = [], isLoading } = useLedger(row.farmer_id);
  const s = buildStatement(ledger, from, to);
  return (
    <Modal open onClose={onClose} title="Farmer Payment Statement" size="lg">
      <div className="space-y-4 text-sm">
        <div className="text-xs font-semibold text-forest">{centre.name}</div>
        <div className="bg-cream rounded-lg p-4 grid grid-cols-2 gap-y-2 text-xs">
          <div className="text-muted-foreground">Farmer</div>
          <div className="font-semibold text-deep text-right">{row.name}</div>
          <div className="text-muted-foreground">Farmer ID / Village</div>
          <div className="font-mono text-deep text-right">{row.farmer_code} · {row.village}</div>
          <div className="text-muted-foreground">Period</div>
          <div className="text-deep text-right">{formatDate(from)} – {formatDate(to)}</div>
          <div className="text-muted-foreground">Milk supplied</div>
          <div className="font-mono text-deep text-right">{Number(row.litres).toFixed(1)} Litres</div>
        </div>
        {isLoading ? (
          <p className="text-muted-foreground">Loading ledger…</p>
        ) : (
          <>
            <div className="space-y-2 border-t border-b border-beige py-4">
              <Line label="Balance brought forward" value={inr(s.opening, 2)} />
              <Line label="Milk value & credits" value={inr(s.credits, 2)} />
              <Line label="Payments & advances" value={`−${inr(s.debits, 2)}`} tone="text-earth" />
              <div className="flex justify-between pt-2 border-t border-cream font-bold text-deep">
                <span>{s.closing >= 0 ? 'Net payable' : 'Advance owed by farmer'}</span>
                <span className="font-mono tabular-nums text-forest">{inr(Math.abs(s.closing), 2)}</span>
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-cream text-xs">
              {s.lines.map((l) => (
                <div key={l.id} className="flex justify-between gap-3 py-1.5">
                  <span className="text-deep">{formatDate(l.entry_date)} · {l.description}</span>
                  <span className="font-mono shrink-0">{Number(l.amount) >= 0 ? '+' : '−'}{inr(Math.abs(Number(l.amount)), 2)}</span>
                </div>
              ))}
              {s.lines.length === 0 && <p className="py-2 text-muted-foreground">No ledger entries in this period.</p>}
            </div>
          </>
        )}
        <div className="flex justify-end gap-2 no-print">
          <button type="button" onClick={() => window.print()} className={smallBtn}>
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => downloadFarmerStatement({ centreName: centre.name, farmer: { ...row, mobile: '' }, ledger, from, to })}
            className={smallPrimaryBtn}
          >
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono tabular-nums ${tone ?? ''}`}>{value}</span>
    </div>
  );
}

function ReverseModal({ payment, onClose }: { payment: PaymentRow; onClose: () => void }) {
  const invalidate = useInvalidateAll();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error: err } = await supabase.rpc('reverse_payment', { _payment: payment.id, _reason: reason });
    setBusy(false);
    if (err) return setError(errorMessage(err));
    await invalidate();
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Reverse ${payment.txn_id}`}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {payment.farmer?.name} · {inr(payment.amount, 2)} via {payment.method}. The payment stays in history as reversed and the amount is added back to the farmer’s balance.
        </p>
        <Field label="Reason" htmlFor="rv-reason">
          <input id="rv-reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. UPI transfer failed" className={inputClass} />
        </Field>
        <ErrorNote message={error} />
        <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>
          {busy ? 'Reversing…' : 'Reverse payment'}
        </button>
      </form>
    </Modal>
  );
}
