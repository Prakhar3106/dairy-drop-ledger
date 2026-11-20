import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Ban, Droplets, Pencil, Printer, RotateCcw, Search, Sun, Sunset } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDashboard } from '@/components/dairy/dashboard-context';
import { ErrorNote, Field, Modal, Segmented, SuccessNote, inputClass, primaryBtn, secondaryBtn, smallBtn } from '@/components/dairy/ui';
import { type CollectionRow, useCollections, useFarmers, useInvalidateAll } from '@/lib/dairy/api';
import { summarizeCollections, type MilkType, type Shift } from '@/lib/dairy/calc';
import { addDays, errorMessage, formatDate, formatTime, inr, newIdempotencyKey } from '@/lib/dairy/format';
import { useLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/_authenticated/dashboard/collection')({
  head: () => ({ meta: [{ title: 'Milk Collection — DairySetu' }] }),
  component: MilkCollectionPage,
});

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function MilkCollectionPage() {
  const { lang, t } = useLanguage();
  const { centre, isOwner, canEditCollections, selectedDate, me } = useDashboard();
  const invalidate = useInvalidateAll();
  const { data: farmers = [] } = useFarmers(centre.id, false);
  const activeFarmers = farmers.filter((f) => f.status === 'Active');

  const [farmerSearch, setFarmerSearch] = useState('');
  const [selectedFarmerId, setSelectedFarmerId] = useState('');
  const [milkType, setMilkType] = useState<MilkType>('Buffalo');
  const [shift, setShift] = useState<Shift>(() => (new Date(Date.now() + 330 * 60000).getUTCHours() < 13 ? 'Morning' : 'Evening'));
  const [quantity, setQuantity] = useState('');
  const [fat, setFat] = useState('6.8');
  const [snf, setSnf] = useState('9.1');
  const [overrideRate, setOverrideRate] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitKey = useRef(newIdempotencyKey());
  const [receipt, setReceipt] = useState<CollectionRow | null>(null);

  const [historyShift, setHistoryShift] = useState<'All' | Shift>('All');
  const [historyMilk, setHistoryMilk] = useState<'All' | MilkType>('All');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyRange, setHistoryRange] = useState<'day' | '7d'>('day');
  const [cancelTarget, setCancelTarget] = useState<CollectionRow | null>(null);
  const [correctTarget, setCorrectTarget] = useState<CollectionRow | null>(null);

  const matchingFarmers = useMemo(() => {
    const q = farmerSearch.trim().toLowerCase();
    if (!q) return activeFarmers;
    return activeFarmers.filter(
      (f) => f.name.toLowerCase().includes(q) || f.farmer_code.toLowerCase().includes(q) || f.village.toLowerCase().includes(q) || f.mobile.includes(q),
    );
  }, [activeFarmers, farmerSearch]);

  useEffect(() => {
    if (matchingFarmers.length && !matchingFarmers.some((f) => f.id === selectedFarmerId)) setSelectedFarmerId(matchingFarmers[0]?.id ?? '');
  }, [matchingFarmers, selectedFarmerId]);

  const activeFarmer = activeFarmers.find((f) => f.id === selectedFarmerId);
  const qtyNum = parseFloat(quantity) || 0;
  const fatNum = parseFloat(fat) || 0;
  const snfNum = parseFloat(snf) || 0;
  const debFat = useDebounced(fatNum, 250);
  const debSnf = useDebounced(snfNum, 250);

  const ratePreview = useQuery({
    queryKey: ['rate-preview', centre.id, milkType, selectedDate, debFat, debSnf],
    retry: false,
    queryFn: async () => {
      const { data, error: err } = await supabase.rpc('preview_milk_rate', {
        _centre: centre.id,
        _milk: milkType,
        _date: selectedDate,
        _fat: debFat,
        _snf: debSnf,
      });
      if (err) throw err;
      return data?.[0] ?? null;
    },
  });
  const usingOverride = isOwner && overrideRate !== '' && parseFloat(overrideRate) > 0;
  const effectiveRate = usingOverride ? parseFloat(overrideRate) : Number(ratePreview.data?.rate ?? 0);
  const previewAmount = Math.round(qtyNum * effectiveRate * 100) / 100;

  const handleMilkTypeChange = (type: MilkType) => {
    setMilkType(type);
    setOverrideRate('');
    if (type === 'Cow') {
      setFat('4.3');
      setSnf('8.5');
    } else {
      setFat('6.8');
      setSnf('9.1');
    }
  };

  const handleReset = () => {
    setQuantity('');
    setOverrideRate('');
    setFeedback(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFarmer || qtyNum <= 0 || saving) return;
    setSaving(true);
    setError(null);
    setFeedback(null);
    const { data, error: err } = await supabase
      .from('milk_collections')
      .insert({
        centre_id: centre.id,
        farmer_id: activeFarmer.id,
        collection_date: selectedDate,
        shift,
        milk_type: milkType,
        quantity_litres: qtyNum,
        fat_percent: fatNum,
        snf_percent: snfNum,
        idempotency_key: submitKey.current,
        ...(usingOverride ? { rate_override: true, rate_per_litre: parseFloat(overrideRate) } : {}),
      })
      .select('*, farmer:farmers(farmer_code, name, name_hi, village)')
      .single();
    setSaving(false);
    if (err) {
      if (err.code === '23505') {
        setError('This entry was already saved. Check the history below.');
        submitKey.current = newIdempotencyKey();
      } else setError(errorMessage(err));
      return;
    }
    submitKey.current = newIdempotencyKey();
    const saved = data as unknown as CollectionRow;
    setFeedback(
      lang === 'hi'
        ? `${activeFarmer.name_hi || activeFarmer.name} (${qtyNum} L) की प्रविष्टि सहेजी गई · रसीद ${saved.receipt_no} · ${inr(saved.total_amount, 2)}`
        : `Saved for ${activeFarmer.name} · ${qtyNum} L × ₹${Number(saved.rate_per_litre).toFixed(2)} = ${inr(saved.total_amount, 2)} · Receipt ${saved.receipt_no}`,
    );
    setReceipt(saved);
    setQuantity('');
    setOverrideRate('');
    invalidate();
  };

  const historyFrom = historyRange === 'day' ? selectedDate : addDays(selectedDate, -6);
  const { data: entries = [], isLoading } = useCollections({ centreId: centre.id, from: historyFrom, to: selectedDate });
  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        if (historyShift !== 'All' && entry.shift !== historyShift) return false;
        if (historyMilk !== 'All' && entry.milk_type !== historyMilk) return false;
        if (historyQuery.trim()) {
          const q = historyQuery.toLowerCase();
          return (
            (entry.farmer?.name ?? '').toLowerCase().includes(q) ||
            (entry.farmer?.farmer_code ?? '').toLowerCase().includes(q) ||
            entry.receipt_no.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [entries, historyShift, historyMilk, historyQuery],
  );
  const totals = summarizeCollections(filteredEntries);
  const canAct = (c: CollectionRow) =>
    c.status === 'active' && (isOwner || (canEditCollections && c.operator_id === me.userId && c.collection_date >= addDays(selectedDate, -1)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-deep tracking-tight">{t('menuCollection')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {lang === 'hi'
            ? 'सुबह और शाम के दूध संकलन की त्वरित प्रविष्टि व लाइव दर गणना'
            : 'Fast morning & evening collection desk with live Fat/SNF rate calculation'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-5 bg-milk border border-line rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-beige">
            <h2 className="font-display text-lg font-bold text-deep flex items-center gap-2">
              <Droplets className="w-5 h-5 text-forest" />
              <span>{t('addEntry')}</span>
            </h2>
            <span className="text-xs font-mono text-muted-foreground">{formatDate(selectedDate)}</span>
          </div>

          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-deep">{lang === 'hi' ? 'किसान खोजें और चुनें' : 'Search & Select Farmer'}</label>
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={farmerSearch}
                onChange={(e) => setFarmerSearch(e.target.value)}
                placeholder={lang === 'hi' ? 'नाम, आईडी या गाँव लिखें...' : 'Filter by name, farmer ID or village...'}
                className="w-full pl-9 pr-3 py-2 text-sm bg-cream border border-line rounded-lg focus:outline-none focus:border-forest"
              />
            </div>
            <select
              value={selectedFarmerId}
              onChange={(e) => setSelectedFarmerId(e.target.value)}
              aria-label="Select farmer"
              className="w-full px-3 py-2.5 text-sm font-medium bg-milk border border-line rounded-lg focus:outline-none focus:border-forest"
            >
              {matchingFarmers.length === 0 && <option value="">{activeFarmers.length ? 'No farmer matches' : 'Add farmers first'}</option>}
              {matchingFarmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.farmer_code} — {lang === 'hi' ? f.name_hi || f.name : f.name} ({f.village})
                </option>
              ))}
            </select>
            {activeFarmer && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-cream rounded-lg px-3 py-2">
                  <div className="text-[11px] text-muted-foreground">{lang === 'hi' ? 'किसान आईडी' : 'Farmer ID'}</div>
                  <div className="font-mono text-sm font-semibold text-deep">{activeFarmer.farmer_code}</div>
                </div>
                <div className="bg-cream rounded-lg px-3 py-2">
                  <div className="text-[11px] text-muted-foreground">{lang === 'hi' ? 'किसान नाम' : 'Farmer Name'}</div>
                  <div className="text-sm font-semibold text-deep truncate">{lang === 'hi' ? activeFarmer.name_hi || activeFarmer.name : activeFarmer.name}</div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-deep mb-1.5">{lang === 'hi' ? 'दूध का प्रकार' : 'Milk Type'}</label>
              <div className="grid grid-cols-2 p-1 bg-cream border border-line rounded-lg">
                <button
                  type="button"
                  onClick={() => handleMilkTypeChange('Cow')}
                  className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${milkType === 'Cow' ? 'bg-earth text-milk' : 'text-deep hover:bg-beige'}`}
                >
                  {lang === 'hi' ? 'गाय' : 'Cow'}
                </button>
                <button
                  type="button"
                  onClick={() => handleMilkTypeChange('Buffalo')}
                  className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${milkType === 'Buffalo' ? 'bg-forest text-milk' : 'text-deep hover:bg-beige'}`}
                >
                  {lang === 'hi' ? 'भैंस' : 'Buffalo'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-deep mb-1.5">{lang === 'hi' ? 'संकलन पाली' : 'Collection Shift'}</label>
              <div className="grid grid-cols-2 p-1 bg-cream border border-line rounded-lg">
                {(['Morning', 'Evening'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setShift(s)}
                    className={`py-2 text-xs font-semibold rounded-md inline-flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      shift === s ? 'bg-forest text-milk' : 'text-deep hover:bg-beige'
                    }`}
                  >
                    {s === 'Morning' ? <Sun className="w-3.5 h-3.5" /> : <Sunset className="w-3.5 h-3.5" />}
                    <span>{s === 'Morning' ? t('morningShift') : t('eveningShift')}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-2 ${isOwner ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="qty-input" className="block text-xs font-semibold text-deep mb-1">{t('litres')}</label>
              <input id="qty-input" type="number" step="0.1" min="0.1" max="2000" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputClass} font-mono tabular-nums`} />
            </div>
            <div>
              <label htmlFor="fat-input" className="block text-xs font-semibold text-deep mb-1">{t('fatPercent')}</label>
              <input id="fat-input" type="number" step="0.1" min="0" max="15" required value={fat} onChange={(e) => setFat(e.target.value)} className={`${inputClass} font-mono tabular-nums`} />
            </div>
            <div>
              <label htmlFor="snf-input" className="block text-xs font-semibold text-deep mb-1">{t('snfPercent')}</label>
              <input id="snf-input" type="number" step="0.1" min="0" max="15" required value={snf} onChange={(e) => setSnf(e.target.value)} className={`${inputClass} font-mono tabular-nums`} />
            </div>
            {isOwner && (
              <div>
                <label htmlFor="rate-input" className="block text-xs font-semibold text-deep mb-1">{lang === 'hi' ? 'दर बदलें' : 'Override rate'}</label>
                <input
                  id="rate-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={ratePreview.data ? Number(ratePreview.data.rate).toFixed(2) : '—'}
                  value={overrideRate}
                  onChange={(e) => setOverrideRate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-cream border border-line rounded-lg focus:outline-none focus:border-forest"
                />
              </div>
            )}
          </div>

          <div className="bg-cream border border-beige rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium text-muted-foreground">{t('calculatedAmount')}</div>
              {ratePreview.isError && !usingOverride ? (
                <div className="text-xs font-medium text-destructive mt-0.5">{errorMessage(ratePreview.error)}</div>
              ) : (
                <div className="text-xs font-mono text-muted-foreground mt-0.5 tabular-nums">
                  {qtyNum.toFixed(1)} L × ₹{effectiveRate.toFixed(2)}/L
                  {usingOverride ? ' · manual rate' : ratePreview.data ? ` · ${ratePreview.data.quality_status}` : ''}
                </div>
              )}
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-forest font-mono tabular-nums shrink-0">
              ₹{previewAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-3">
            {lang === 'hi' ? 'अंतिम दर और राशि सर्वर पर आपके दर चार्ट से तय होती है।' : 'Final rate and amount are calculated on the server from your centre’s rate chart.'}
          </p>

          <SuccessNote message={feedback} />
          <ErrorNote message={error} />

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={qtyNum <= 0 || !activeFarmer || saving} className={`${primaryBtn} flex-1`}>
              {saving ? (lang === 'hi' ? 'सहेजा जा रहा है…' : 'Saving…') : t('saveEntry')}
            </button>
            {receipt && (
              <button type="button" onClick={() => window.print()} className={secondaryBtn} title="Print last receipt">
                <Printer className="w-4 h-4" />
              </button>
            )}
            <button type="button" onClick={handleReset} className={secondaryBtn}>
              <RotateCcw className="w-4 h-4" />
              <span>{t('reset')}</span>
            </button>
          </div>
        </form>

        <div className="lg:col-span-7 bg-milk border border-line rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-beige">
            <div>
              <h2 className="font-display text-lg font-bold text-deep">{lang === 'hi' ? 'दूध संकलन इतिहास' : 'Milk Collection History'}</h2>
              <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                {totals.count} {lang === 'hi' ? 'प्रविष्टियाँ' : 'entries'} · {totals.litres.toFixed(1)} L · {inr(totals.amount, 0)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented value={historyRange} options={['day', '7d'] as const} onChange={setHistoryRange} labels={{ day: formatDate(selectedDate), '7d': 'Last 7 days' }} />
              <Segmented value={historyShift} options={['All', 'Morning', 'Evening'] as const} onChange={setHistoryShift} />
              <Segmented value={historyMilk} options={['All', 'Cow', 'Buffalo'] as const} onChange={setHistoryMilk} />
            </div>
          </div>
          <div className="mt-4 mb-3 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              placeholder={lang === 'hi' ? 'संकलन इतिहास में खोजें...' : 'Search history by farmer or receipt number...'}
              className="w-full pl-9 pr-3 py-2 text-sm bg-cream border border-line rounded-lg focus:outline-none focus:border-forest"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-beige text-xs text-muted-foreground">
                  <th className="pb-2.5 font-medium">{lang === 'hi' ? 'समय / रसीद' : 'Time / Receipt'}</th>
                  <th className="pb-2.5 font-medium">{lang === 'hi' ? 'किसान' : 'Farmer'}</th>
                  <th className="pb-2.5 font-medium">{lang === 'hi' ? 'प्रकार' : 'Type'}</th>
                  <th className="pb-2.5 font-medium text-right">{t('litres')}</th>
                  <th className="pb-2.5 font-medium text-right">Fat / SNF</th>
                  <th className="pb-2.5 font-medium text-right">{lang === 'hi' ? 'दर' : 'Rate'}</th>
                  <th className="pb-2.5 font-medium text-right">{lang === 'hi' ? 'राशि' : 'Amount'}</th>
                  <th className="pb-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-cream">
                {filteredEntries.map((entry) => {
                  const cancelled = entry.status !== 'active';
                  return (
                    <tr key={entry.id} className={`hover:bg-cream/50 transition-colors ${cancelled ? 'opacity-55' : ''}`}>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <div className="text-xs font-medium text-deep">
                          {historyRange === '7d' ? `${formatDate(entry.collection_date)} · ` : ''}
                          {formatTime(entry.collected_at)}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground">{entry.receipt_no}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className={`font-medium text-deep ${cancelled ? 'line-through' : ''}`}>{entry.farmer?.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{entry.farmer?.farmer_code}</div>
                      </td>
                      <td className="py-3 pr-3 text-xs text-deep/80 whitespace-nowrap">
                        {entry.milk_type} · {entry.shift}
                        {cancelled && <div className="text-destructive font-semibold">Cancelled</div>}
                        {!cancelled && entry.quality_status !== 'Accepted' && <div className="text-earth font-semibold">{entry.quality_status}</div>}
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums font-semibold text-deep">{Number(entry.quantity_litres).toFixed(1)}</td>
                      <td className="py-3 text-right font-mono tabular-nums text-xs text-muted-foreground">
                        {Number(entry.fat_percent).toFixed(1)} / {Number(entry.snf_percent).toFixed(1)}
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums text-xs text-muted-foreground">
                        ₹{Number(entry.rate_per_litre).toFixed(2)}
                        {entry.rate_override && <div className="text-[10px] text-earth">manual</div>}
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums font-bold text-forest">{inr(entry.total_amount, 2)}</td>
                      <td className="py-3 pl-2 text-right whitespace-nowrap">
                        {canAct(entry) && (
                          <span className="inline-flex gap-1">
                            <button type="button" className={smallBtn} onClick={() => setCorrectTarget(entry)} aria-label="Correct entry">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button type="button" className={smallBtn} onClick={() => setCancelTarget(entry)} aria-label="Cancel entry">
                              <Ban className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!isLoading && filteredEntries.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">{lang === 'hi' ? 'कोई मिलान प्रविष्टि नहीं मिली।' : 'No matching milk collection records.'}</div>
            )}
            {isLoading && <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>}
          </div>
        </div>
      </div>

      {receipt && <PrintableReceipt entry={receipt} centreName={centre.name} centreCode={centre.code} />}
      <CancelModal target={cancelTarget} onClose={() => setCancelTarget(null)} onDone={invalidate} />
      <CorrectModal target={correctTarget} onClose={() => setCorrectTarget(null)} onDone={invalidate} />
    </div>
  );
}

function PrintableReceipt({ entry, centreName, centreCode }: { entry: CollectionRow; centreName: string; centreCode: string }) {
  return (
    <div className="hidden print:block fixed inset-0 bg-milk p-8 text-deep">
      <div className="max-w-xs mx-auto border border-line rounded-lg p-4 text-xs space-y-1 font-mono">
        <div className="text-center font-bold text-sm">{centreName}</div>
        <div className="text-center">{centreCode} · Milk Collection Receipt</div>
        <hr className="my-2 border-line" />
        <div>Receipt: {entry.receipt_no}</div>
        <div>Date: {formatDate(entry.collection_date)} {formatTime(entry.collected_at)}</div>
        <div>Farmer: {entry.farmer?.farmer_code} {entry.farmer?.name}</div>
        <div>Milk: {entry.milk_type} · {entry.shift}</div>
        <div>Qty: {Number(entry.quantity_litres).toFixed(2)} L</div>
        <div>Fat/SNF: {entry.fat_percent}% / {entry.snf_percent}%</div>
        <div>Rate: ₹{Number(entry.rate_per_litre).toFixed(2)}/L</div>
        <div className="font-bold text-sm">Amount: {inr(entry.total_amount, 2)}</div>
        <div>Quality: {entry.quality_status}</div>
      </div>
    </div>
  );
}

function CancelModal({ target, onClose, onDone }: { target: CollectionRow | null; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!target) return null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc('cancel_collection', { _id: target.id, _reason: reason });
    setBusy(false);
    if (err) return setError(errorMessage(err));
    setReason('');
    onDone();
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Cancel entry ${target.receipt_no}`}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {target.farmer?.name} · {Number(target.quantity_litres)} L · {inr(target.total_amount, 2)}. The entry stays in history as cancelled and the farmer's balance and stock are reversed.
        </p>
        <Field label="Reason" htmlFor="cancel-reason">
          <input id="cancel-reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Entered for wrong farmer" className={inputClass} />
        </Field>
        <ErrorNote message={error} />
        <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>
          {busy ? 'Cancelling…' : 'Cancel this entry'}
        </button>
      </form>
    </Modal>
  );
}

function CorrectModal({ target, onClose, onDone }: { target: CollectionRow | null; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState('');
  const [fat, setFat] = useState('');
  const [snf, setSnf] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(newIdempotencyKey());
  useEffect(() => {
    if (target) {
      setQty(String(target.quantity_litres));
      setFat(String(target.fat_percent));
      setSnf(String(target.snf_percent));
      setReason('');
      setError(null);
      key.current = newIdempotencyKey();
    }
  }, [target]);
  if (!target) return null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc('correct_collection', {
      _id: target.id,
      _quantity: parseFloat(qty),
      _fat: parseFloat(fat),
      _snf: parseFloat(snf),
      _reason: reason,
      _idempotency_key: key.current,
    });
    setBusy(false);
    if (err) return setError(errorMessage(err));
    onDone();
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Correct entry ${target.receipt_no}`}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {target.farmer?.name} · {target.milk_type} {target.shift} · {formatDate(target.collection_date)}. A new receipt is created and the original is kept as cancelled.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Litres" htmlFor="c-qty">
            <input id="c-qty" type="number" step="0.1" min="0.1" required value={qty} onChange={(e) => setQty(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Fat %" htmlFor="c-fat">
            <input id="c-fat" type="number" step="0.1" min="0" max="15" required value={fat} onChange={(e) => setFat(e.target.value)} className={inputClass} />
          </Field>
          <Field label="SNF %" htmlFor="c-snf">
            <input id="c-snf" type="number" step="0.1" min="0" max="15" required value={snf} onChange={(e) => setSnf(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Reason" htmlFor="c-reason">
          <input id="c-reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fat reading re-tested" className={inputClass} />
        </Field>
        <ErrorNote message={error} />
        <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>
          {busy ? 'Saving…' : 'Save correction'}
        </button>
      </form>
    </Modal>
  );
}
