import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Factory, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDashboard } from '@/components/dairy/dashboard-context';
import { OwnerOnly } from '@/components/dairy/OwnerOnly';
import { ErrorNote, Field, Modal, Spinner, inputClass, primaryBtn, smallBtn } from '@/components/dairy/ui';
import { useBatches, useInvalidateAll } from '@/lib/dairy/api';
import { errorMessage, formatDate, inr } from '@/lib/dairy/format';
import { useLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/_authenticated/dashboard/production')({
  head: () => ({ meta: [{ title: 'Dairy Production — DairySetu' }] }),
  component: () => (
    <OwnerOnly>
      <ProductionPage />
    </OwnerOnly>
  ),
});

const PRODUCTS = ['Desi Ghee', 'Fresh Paneer', 'Curd (Dahi)', 'Buttermilk (Chaas)', 'Khoa', 'Other'] as const;

function ProductionPage() {
  const { lang, t } = useLanguage();
  const { centre } = useDashboard();
  const invalidate = useInvalidateAll();
  const { data: batches = [], isLoading } = useBatches(centre.id);
  const [open, setOpen] = useState(false);

  const markReady = async (id: string) => {
    const { error } = await supabase.from('production_batches').update({ status: 'Ready' }).eq('id', id);
    if (!error) invalidate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-deep tracking-tight">{t('menuProduction')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lang === 'hi' ? 'अतिरिक्त दूध से पनीर, देसी घी, दही व छाछ उत्पादन बैच' : 'Value-added dairy processing batches (Desi Ghee, Paneer, Curd, Chaas)'}
          </p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className={primaryBtn}>
          <Plus className="w-4 h-4" /> New batch
        </button>
      </div>
      {isLoading ? (
        <Spinner />
      ) : batches.length === 0 ? (
        <div className="bg-milk border border-line rounded-xl py-12 text-center text-sm text-muted-foreground">No production batches yet. Milk used in a batch is taken out of stock automatically.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {batches.map((batch) => (
            <div key={batch.id} className="bg-milk border border-line rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">{batch.batch_no}</span>
                <span className={batch.status === 'Ready' ? 'font-semibold text-forest' : 'font-semibold text-earth'}>{batch.status}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Factory className="w-4 h-4 text-forest" />
                  <h2 className="font-display text-base font-bold text-deep">{batch.product_name}</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {batch.milk_used_litres} L {batch.milk_type} Milk · {formatDate(batch.batch_date)}
                </p>
              </div>
              <div className="pt-3 border-t border-cream flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted-foreground">Output</div>
                  <div className="font-mono font-bold text-sm text-deep">{batch.output_quantity || '—'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-muted-foreground">Est. Value</div>
                  <div className="font-mono font-bold text-sm text-forest tabular-nums">{inr(batch.estimated_value)}</div>
                </div>
              </div>
              {batch.status !== 'Ready' && (
                <button type="button" className={smallBtn} onClick={() => markReady(batch.id)}>
                  Mark ready
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {open && <BatchModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function BatchModal({ onClose }: { onClose: () => void }) {
  const { centre, selectedDate } = useDashboard();
  const invalidate = useInvalidateAll();
  const [product, setProduct] = useState<(typeof PRODUCTS)[number]>('Fresh Paneer');
  const [milk, setMilk] = useState<'Cow' | 'Buffalo'>('Buffalo');
  const [used, setUsed] = useState('');
  const [output, setOutput] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('production_batches').insert({
      centre_id: centre.id,
      batch_date: selectedDate,
      product_name: product,
      milk_type: milk,
      milk_used_litres: parseFloat(used),
      output_quantity: output,
      estimated_value: parseFloat(value) || 0,
    });
    setBusy(false);
    if (err) return setError(errorMessage(err));
    await invalidate();
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="New production batch">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Product" htmlFor="b-prod">
            <select id="b-prod" value={product} onChange={(e) => setProduct(e.target.value as typeof product)} className={inputClass}>
              {PRODUCTS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Milk type" htmlFor="b-milk">
            <select id="b-milk" value={milk} onChange={(e) => setMilk(e.target.value as 'Cow' | 'Buffalo')} className={inputClass}>
              <option>Buffalo</option>
              <option>Cow</option>
            </select>
          </Field>
          <Field label="Milk used (L)" htmlFor="b-used">
            <input id="b-used" type="number" step="0.1" min="0.1" required value={used} onChange={(e) => setUsed(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Output quantity" htmlFor="b-out">
            <input id="b-out" value={output} onChange={(e) => setOutput(e.target.value)} placeholder="e.g. 19.5 kg" className={inputClass} />
          </Field>
        </div>
        <Field label="Estimated value (₹)" htmlFor="b-val">
          <input id="b-val" type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} />
        </Field>
        <ErrorNote message={error} />
        <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>
          {busy ? 'Saving…' : 'Save batch'}
        </button>
      </form>
    </Modal>
  );
}
