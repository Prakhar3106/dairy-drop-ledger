import { useMemo, useRef, useState } from 'react';
import { CheckCheck, PackageMinus, Plus, ShoppingBag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDashboard } from '@/components/dairy/dashboard-context';
import { ErrorNote, Field, Modal, Segmented, inputClass, primaryBtn, secondaryBtn, smallBtn } from '@/components/dairy/ui';
import { useInvalidateAll, useInventory, useSales } from '@/lib/dairy/api';
import { dayStock, type MilkType } from '@/lib/dairy/calc';
import { addDays, errorMessage, formatDate, inr, newIdempotencyKey } from '@/lib/dairy/format';
import { useLanguage } from '@/lib/i18n';

const MOVEMENT_LABEL: Record<string, string> = {
  opening: 'Opening stock',
  collection: 'Collected',
  collection_reversal: 'Collection cancelled',
  sale: 'Sold',
  wastage: 'Wastage',
  production: 'Used in production',
  adjustment: 'Adjustment',
};

export function SalesInventoryPage({ mode }: { mode: 'sales' | 'inventory' }) {
  const { lang, t } = useLanguage();
  const { centre, selectedDate } = useDashboard();
  const invalidate = useInvalidateAll();
  const [milkFilter, setMilkFilter] = useState<'All' | MilkType>('All');
  const [saleOpen, setSaleOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const { data: inv, isLoading } = useInventory(centre.id);
  const { data: sales = [] } = useSales(centre.id, mode === 'sales' ? addDays(selectedDate, -30) : selectedDate, selectedDate);
  const movements = inv?.movements ?? [];
  const cow = dayStock(movements, selectedDate, 'Cow');
  const buffalo = dayStock(movements, selectedDate, 'Buffalo');
  const total = {
    opening: cow.opening + buffalo.opening,
    collected: cow.collected + buffalo.collected,
    sold: cow.sold + buffalo.sold,
    wasted: cow.wasted + buffalo.wasted,
    closing: cow.closing + buffalo.closing,
    production: cow.production + buffalo.production,
  };
  const filteredSales = sales.filter((s) => milkFilter === 'All' || s.milk_type === milkFilter);
  const recentMovements = useMemo(
    () => [...movements].reverse().filter((m) => milkFilter === 'All' || m.milk_type === milkFilter).slice(0, 60),
    [movements, milkFilter],
  );

  const markReceived = async (id: string) => {
    const { error } = await supabase.rpc('mark_sale_received', { _sale: id });
    if (!error) invalidate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-deep tracking-tight">{mode === 'sales' ? t('menuSales') : t('menuInventory')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lang === 'hi'
              ? 'गाय व भैंस दूध का अलग-अलग स्टॉक, बर्बादी नियंत्रण और ग्राहक बिक्री विवरण'
              : 'Separate Cow & Buffalo milk stock, wastage tracking and customer dispatches'}{' '}
            · {formatDate(selectedDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setStockOpen(true)} className={secondaryBtn}>
            <PackageMinus className="w-4 h-4" />
            <span>{lang === 'hi' ? 'स्टॉक प्रविष्टि' : 'Stock entry'}</span>
          </button>
          <button type="button" onClick={() => setSaleOpen(true)} className={primaryBtn}>
            <Plus className="w-4 h-4" />
            <span>{lang === 'hi' ? 'नई बिक्री दर्ज करें' : 'Record Milk Sale'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Metric label={lang === 'hi' ? 'प्रारंभिक स्टॉक' : 'Opening Stock'} value={total.opening} tone="text-deep" />
        <Metric label={lang === 'hi' ? 'संकलित दूध' : 'Milk Collected'} value={total.collected} tone="text-forest" />
        <Metric label={lang === 'hi' ? 'बेचा गया दूध' : 'Milk Sold'} value={total.sold} tone="text-forest" />
        <Metric label={lang === 'hi' ? 'बर्बादी / उत्पादन' : 'Wastage + Production'} value={total.wasted + total.production} tone="text-muted-foreground" />
        <Metric label={lang === 'hi' ? 'शेष स्टॉक' : 'Closing Stock'} value={total.closing} tone="text-earth" />
      </div>
      <p className="text-xs text-muted-foreground -mt-3">Closing stock = Opening stock + Milk collected − Milk sold − Milk wasted − Milk used in production (± adjustments).</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Tank title={t('cowMilk')} s={cow} tone="text-earth" loading={isLoading} />
        <Tank title={t('buffaloMilk')} s={buffalo} tone="text-forest" loading={isLoading} />
      </div>

      {mode === 'sales' ? (
        <div className="bg-milk border border-line rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-deep flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-forest" />
              <span>{lang === 'hi' ? 'ग्राहक दूध बिक्री इतिहास (30 दिन)' : 'Customer Sales History (last 30 days)'}</span>
            </h2>
            <Segmented value={milkFilter} options={['All', 'Cow', 'Buffalo'] as const} onChange={setMilkFilter} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-beige text-xs text-muted-foreground">
                  <th className="pb-2.5 font-medium">Date / ID</th>
                  <th className="pb-2.5 font-medium">Customer</th>
                  <th className="pb-2.5 font-medium">Milk Type</th>
                  <th className="pb-2.5 font-medium text-right">{t('litres')}</th>
                  <th className="pb-2.5 font-medium text-right">{t('ratePerLitre')}</th>
                  <th className="pb-2.5 font-medium text-right">Total</th>
                  <th className="pb-2.5 font-medium pl-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream">
                {filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-cream/50 transition-colors">
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <div className="text-xs font-medium text-deep">{formatDate(s.sale_date)}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{s.sale_no}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-medium text-deep">{s.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{s.customer_type}</div>
                    </td>
                    <td className="py-3 pr-3 text-xs text-deep/85">{s.milk_type}</td>
                    <td className="py-3 text-right font-mono tabular-nums font-semibold">{s.quantity_litres} L</td>
                    <td className="py-3 text-right font-mono tabular-nums text-xs text-muted-foreground">₹{Number(s.rate_per_litre).toFixed(2)}</td>
                    <td className="py-3 text-right font-mono tabular-nums font-bold text-forest">{inr(s.total_amount, 2)}</td>
                    <td className="py-3 pl-3 text-xs font-semibold whitespace-nowrap">
                      <span className={s.payment_status === 'Received' ? 'text-forest' : 'text-earth'}>{s.payment_status}</span>
                      {s.payment_status === 'Credit' && (
                        <button type="button" onClick={() => markReceived(s.id)} className={`${smallBtn} ml-2`}>
                          <CheckCheck className="w-3 h-3" /> Received
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSales.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No sales recorded in this period.</div>}
          </div>
        </div>
      ) : (
        <div className="bg-milk border border-line rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-deep">Stock History</h2>
            <Segmented value={milkFilter} options={['All', 'Cow', 'Buffalo'] as const} onChange={setMilkFilter} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-beige text-xs text-muted-foreground">
                  <th className="pb-2.5 font-medium">Date</th>
                  <th className="pb-2.5 font-medium">Movement</th>
                  <th className="pb-2.5 font-medium">Milk</th>
                  <th className="pb-2.5 font-medium">Notes</th>
                  <th className="pb-2.5 font-medium text-right">Litres</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream">
                {recentMovements.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 pr-3 text-xs whitespace-nowrap">{formatDate(m.movement_date)}</td>
                    <td className="py-2 pr-3 text-xs font-medium text-deep">{MOVEMENT_LABEL[m.movement_type] ?? m.movement_type}</td>
                    <td className="py-2 pr-3 text-xs">{m.milk_type}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground truncate max-w-[240px]">{m.notes}</td>
                    <td className={`py-2 text-right font-mono tabular-nums font-semibold ${Number(m.quantity_litres) >= 0 ? 'text-forest' : 'text-earth'}`}>
                      {Number(m.quantity_litres) >= 0 ? '+' : ''}
                      {Number(m.quantity_litres).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentMovements.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No stock movements yet. Milk collections add stock automatically.</div>}
          </div>
        </div>
      )}

      {saleOpen && <SaleModal stock={{ Cow: inv?.stock.cow ?? 0, Buffalo: inv?.stock.buffalo ?? 0 }} onClose={() => setSaleOpen(false)} />}
      {stockOpen && <StockEntryModal onClose={() => setStockOpen(false)} />}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-milk border border-line rounded-xl p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl font-bold mt-1.5 font-mono tabular-nums ${tone}`}>{value.toFixed(1)} L</div>
    </div>
  );
}

function Tank({ title, s, tone, loading }: { title: string; s: ReturnType<typeof dayStock>; tone: string; loading: boolean }) {
  const cells: [string, number, string][] = [
    ['Opening', s.opening, 'text-deep'],
    ['Collected', s.collected, 'text-deep'],
    ['Sold', s.sold, 'text-forest'],
    ['Wastage', s.wasted + s.production, 'text-muted-foreground'],
  ];
  return (
    <div className="bg-milk border border-line rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-beige">
        <h2 className="font-display text-lg font-bold text-deep">{title}</h2>
        <span className={`font-mono text-sm font-bold tabular-nums ${tone}`}>{loading ? '…' : `${s.closing.toFixed(1)} L left`}</span>
      </div>
      <div className="grid grid-cols-4 gap-3 text-center">
        {cells.map(([label, v, c]) => (
          <div key={label} className="bg-cream rounded-lg p-3">
            <div className="text-[11px] text-muted-foreground">{label}</div>
            <div className={`font-mono font-bold text-sm mt-0.5 tabular-nums ${c}`}>{v.toFixed(1)} L</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SaleModal({ stock, onClose }: { stock: Record<MilkType, number>; onClose: () => void }) {
  const { centre, selectedDate } = useDashboard();
  const invalidate = useInvalidateAll();
  const [customerName, setCustomerName] = useState('');
  const [customerType, setCustomerType] = useState<'Sweet Shop' | 'Household' | 'Retail Booth' | 'Chilling Plant' | 'Other'>('Sweet Shop');
  const [milkType, setMilkType] = useState<MilkType>('Buffalo');
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');
  const [status, setStatus] = useState<'Received' | 'Credit'>('Received');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(newIdempotencyKey());
  const q = parseFloat(qty) || 0;
  const r = parseFloat(rate) || 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('milk_sales').insert({
      centre_id: centre.id,
      sale_date: selectedDate,
      customer_name: customerName.trim(),
      customer_type: customerType,
      milk_type: milkType,
      quantity_litres: q,
      rate_per_litre: r,
      payment_status: status,
      idempotency_key: key.current,
    });
    setBusy(false);
    if (err) return setError(err.code === '23505' ? 'This sale was already saved.' : errorMessage(err));
    await invalidate();
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Record Customer Milk Sale">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Customer / buyer name" htmlFor="s-name">
          <input id="s-name" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Patel Dairy & Sweets" className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Buyer type" htmlFor="s-type">
            <select id="s-type" value={customerType} onChange={(e) => setCustomerType(e.target.value as typeof customerType)} className={inputClass}>
              <option>Sweet Shop</option>
              <option>Household</option>
              <option>Retail Booth</option>
              <option>Chilling Plant</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Milk type" htmlFor="s-milk" hint={`${stock[milkType].toFixed(1)} L in stock`}>
            <select id="s-milk" value={milkType} onChange={(e) => setMilkType(e.target.value as MilkType)} className={inputClass}>
              <option value="Buffalo">Buffalo</option>
              <option value="Cow">Cow</option>
            </select>
          </Field>
          <Field label="Quantity (litres)" htmlFor="s-qty">
            <input id="s-qty" type="number" step="0.1" min="0.1" required value={qty} onChange={(e) => setQty(e.target.value)} className={`${inputClass} font-mono`} />
          </Field>
          <Field label="Rate (₹ / litre)" htmlFor="s-rate">
            <input id="s-rate" type="number" step="0.01" min="0" required value={rate} onChange={(e) => setRate(e.target.value)} className={`${inputClass} font-mono`} />
          </Field>
        </div>
        <Field label="Payment" htmlFor="s-status">
          <select id="s-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputClass}>
            <option value="Received">Received</option>
            <option value="Credit">On credit</option>
          </select>
        </Field>
        <div className="text-xs text-muted-foreground">
          Total: <strong className="text-deep font-mono">{inr(Math.round(q * r * 100) / 100, 2)}</strong> (confirmed by the server on save)
        </div>
        <ErrorNote message={error} />
        <button type="submit" disabled={busy || q <= 0} className={`${primaryBtn} w-full`}>
          {busy ? 'Saving…' : 'Save Sale'}
        </button>
      </form>
    </Modal>
  );
}

function StockEntryModal({ onClose }: { onClose: () => void }) {
  const { centre, selectedDate } = useDashboard();
  const invalidate = useInvalidateAll();
  const [type, setType] = useState<'wastage' | 'opening' | 'adjustment'>('wastage');
  const [milk, setMilk] = useState<MilkType>('Buffalo');
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc('record_inventory_entry', {
      _centre: centre.id,
      _milk: milk,
      _type: type,
      _quantity: parseFloat(qty),
      _notes: notes,
      _date: selectedDate,
    });
    setBusy(false);
    if (err) return setError(errorMessage(err));
    await invalidate();
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Stock entry">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Entry type" htmlFor="st-type">
          <select id="st-type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className={inputClass}>
            <option value="wastage">Wastage / spoilage</option>
            <option value="opening">Opening stock</option>
            <option value="adjustment">Correction (+/−)</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Milk type" htmlFor="st-milk">
            <select id="st-milk" value={milk} onChange={(e) => setMilk(e.target.value as MilkType)} className={inputClass}>
              <option value="Buffalo">Buffalo</option>
              <option value="Cow">Cow</option>
            </select>
          </Field>
          <Field label="Litres" htmlFor="st-qty" hint={type === 'adjustment' ? 'Use a minus sign to reduce stock' : undefined}>
            <input id="st-qty" type="number" step="0.1" required value={qty} onChange={(e) => setQty(e.target.value)} className={`${inputClass} font-mono`} />
          </Field>
        </div>
        <Field label={type === 'adjustment' ? 'Reason (required)' : 'Notes'} htmlFor="st-notes">
          <input id="st-notes" required={type === 'adjustment'} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </Field>
        <ErrorNote message={error} />
        <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>
          {busy ? 'Saving…' : 'Save stock entry'}
        </button>
      </form>
    </Modal>
  );
}
