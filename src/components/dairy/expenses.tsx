import { useMemo, useState } from 'react';
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ErrorNote, Field, Modal, inputClass, primaryBtn, smallBtn } from './ui';
import { type ExpenseRow, useExpenses, useInvalidateAll } from '@/lib/dairy/api';
import { errorMessage, formatDate, inr, todayIST } from '@/lib/dairy/format';

export const CENTRE_CATEGORIES = ['Green Fodder', 'Cattle Feed', 'Veterinary', 'Electricity & Chilling', 'Transport', 'Staff', 'Equipment', 'Other'] as const;
export const FARMER_CATEGORIES = ['Animal Feed', 'Medicine', 'Labour', 'Transportation', 'Equipment', 'Other'] as const;

export function ExpensesPanel({ scope, title, subtitle }: { scope: { centreId: string } | { farmerId: string }; title: string; subtitle: string }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [category, setCategory] = useState('All');
  const [editing, setEditing] = useState<ExpenseRow | 'new' | null>(null);
  const invalidate = useInvalidateAll();
  const { data: expenses = [], isLoading, error } = useExpenses({ ...scope, ...(from ? { from } : {}), ...(to ? { to } : {}) });
  const categories = 'centreId' in scope ? CENTRE_CATEGORIES : FARMER_CATEGORIES;
  const filtered = expenses.filter((e) => category === 'All' || e.category === category);
  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const monthly = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of filtered) m.set(e.expense_date.slice(0, 7), (m.get(e.expense_date.slice(0, 7)) ?? 0) + Number(e.amount));
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
  }, [filtered]);

  const remove = async (id: string) => {
    if (!window.confirm('Delete this expense?')) return;
    const { error: err } = await supabase.from('farm_expenses').delete().eq('id', id);
    if (!err) invalidate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-deep tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <button type="button" onClick={() => setEditing('new')} className={primaryBtn}>
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-milk border border-line rounded-xl p-5 flex items-center justify-between md:col-span-1">
          <div>
            <div className="text-xs text-muted-foreground">Total in view</div>
            <div className="font-display text-3xl font-bold text-deep mt-1 font-mono tabular-nums">{inr(total)}</div>
          </div>
          <Receipt className="w-8 h-8 text-earth" />
        </div>
        <div className="bg-milk border border-line rounded-xl p-5 md:col-span-2">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Monthly summary</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {monthly.length === 0 && <span className="text-xs text-muted-foreground col-span-6">No expenses yet.</span>}
            {monthly.map(([m, v]) => (
              <div key={m} className="bg-cream rounded-lg p-2">
                <div className="text-[11px] text-muted-foreground">{formatDate(`${m}-01`).slice(3)}</div>
                <div className="font-mono text-xs font-bold text-earth">{inr(v)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-milk border border-line rounded-xl p-4 flex flex-wrap items-end gap-3">
        <Field label="From" htmlFor="ex-from">
          <input id="ex-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        </Field>
        <Field label="To" htmlFor="ex-to">
          <input id="ex-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Category" htmlFor="ex-cat">
          <select id="ex-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>

      <ErrorNote message={error ? errorMessage(error) : null} />
      <div className="bg-milk border border-line rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-cream/70 border-b border-beige text-xs text-muted-foreground">
              <tr>
                <th className="py-3 px-4 font-medium">Date</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium">Description</th>
                <th className="py-3 px-4 font-medium">Method</th>
                <th className="py-3 px-4 font-medium text-right">Amount</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cream">
              {filtered.map((exp) => (
                <tr key={exp.id} className="hover:bg-cream/50">
                  <td className="py-3 px-4 whitespace-nowrap text-xs font-medium text-deep">{formatDate(exp.expense_date)}</td>
                  <td className="py-3 px-4 font-medium text-deep">{exp.category}</td>
                  <td className="py-3 px-4 text-muted-foreground">{exp.description}</td>
                  <td className="py-3 px-4 text-xs text-deep">{exp.paid_by}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-earth tabular-nums">{inr(exp.amount)}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button type="button" className={smallBtn} onClick={() => setEditing(exp)} aria-label="Edit expense">
                      <Pencil className="w-3 h-3" />
                    </button>{' '}
                    <button type="button" className={smallBtn} onClick={() => remove(exp.id)} aria-label="Delete expense">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isLoading && <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && filtered.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No expenses recorded.</div>}
      </div>
      {editing && <ExpenseModal scope={scope} categories={categories} expense={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

export function ExpenseModal({
  scope,
  categories,
  expense,
  onClose,
}: {
  scope: { centreId: string } | { farmerId: string };
  categories: readonly string[];
  expense: ExpenseRow | null;
  onClose: () => void;
}) {
  const invalidate = useInvalidateAll();
  const [category, setCategory] = useState(expense?.category ?? categories[0] ?? 'Other');
  const [desc, setDesc] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [date, setDate] = useState(expense?.expense_date ?? todayIST());
  const [paidBy, setPaidBy] = useState<'Cash' | 'UPI' | 'Bank'>((expense?.paid_by as 'Cash') ?? 'Cash');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!(amt > 0)) return setError('Enter an amount greater than zero');
    setBusy(true);
    setError(null);
    const payload = { category: category as 'Other', description: desc.trim(), amount: amt, expense_date: date, paid_by: paidBy };
    const res = expense
      ? await supabase.from('farm_expenses').update(payload).eq('id', expense.id)
      : await supabase.from('farm_expenses').insert({ ...payload, ...('centreId' in scope ? { centre_id: scope.centreId } : { farmer_id: scope.farmerId }) });
    setBusy(false);
    if (res.error) return setError(errorMessage(res.error));
    await invalidate();
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={expense ? 'Edit expense' : 'Add expense'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" htmlFor="e-cat">
            <select id="e-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Date" htmlFor="e-date">
            <input id="e-date" type="date" max={todayIST()} required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Description" htmlFor="e-desc">
          <input id="e-desc" required value={desc} onChange={(e) => setDesc(e.target.value)} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)" htmlFor="e-amt">
            <input id="e-amt" type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} font-mono`} />
          </Field>
          <Field label="Paid by" htmlFor="e-paid">
            <select id="e-paid" value={paidBy} onChange={(e) => setPaidBy(e.target.value as typeof paidBy)} className={inputClass}>
              <option>Cash</option>
              <option>UPI</option>
              <option>Bank</option>
            </select>
          </Field>
        </div>
        <ErrorNote message={error} />
        <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>
          {busy ? 'Saving…' : 'Save Expense'}
        </button>
      </form>
    </Modal>
  );
}
