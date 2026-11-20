import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useMemo, useState } from 'react';
import { Download, KeyRound, Pencil, Phone, Plus, Search, UserCheck, UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDashboard } from '@/components/dairy/dashboard-context';
import { StoredPhoto } from '@/components/dairy/SafeImage';
import { Drawer, ErrorNote, Field, Modal, Segmented, SuccessNote, inputClass, primaryBtn, secondaryBtn, smallBtn } from '@/components/dairy/ui';
import { type FarmerWithBalance, useCollections, useInvalidateAll, useFarmers, useLedger, usePayments } from '@/lib/dairy/api';
import { errorMessage, formatDate, initials, inr, litres } from '@/lib/dairy/format';
import { displayLoginId } from '@/lib/dairy/identity';
import { uploadPhoto } from '@/lib/dairy/photos';
import { buildStatement, downloadFarmerStatement } from '@/lib/dairy/statements';
import { useLanguage } from '@/lib/i18n';
import { createFarmerLogin, resetMemberPassword, setMemberAccess } from '@/lib/accounts.functions';

export const Route = createFileRoute('/_authenticated/dashboard/farmers')({
  head: () => ({ meta: [{ title: 'Farmers — DairySetu' }] }),
  component: FarmersPage,
});

function FarmersPage() {
  const { lang, t } = useLanguage();
  const { centre, isOwner, globalSearch } = useDashboard();
  const { data: farmers = [], isLoading, error } = useFarmers(centre.id, isOwner);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [villageFilter, setVillageFilter] = useState('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<FarmerWithBalance | 'new' | null>(null);

  const villages = useMemo(() => ['All', ...Array.from(new Set(farmers.map((f) => f.village).filter(Boolean)))], [farmers]);
  const q = (search || globalSearch).trim().toLowerCase();
  const filtered = useMemo(
    () =>
      farmers.filter((f) => {
        if (statusFilter !== 'All' && f.status !== statusFilter) return false;
        if (villageFilter !== 'All' && f.village !== villageFilter) return false;
        if (q) {
          return (
            f.name.toLowerCase().includes(q) ||
            f.name_hi.toLowerCase().includes(q) ||
            f.farmer_code.toLowerCase().includes(q) ||
            f.village.toLowerCase().includes(q) ||
            f.mobile.includes(q)
          );
        }
        return true;
      }),
    [farmers, statusFilter, villageFilter, q],
  );
  const selected = farmers.find((f) => f.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-deep tracking-tight">{t('menuFarmers')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lang === 'hi' ? 'पंजीकृत किसानों की सूची, दूध आपूर्ति इतिहास और बकाया शेष' : 'Registered milk producers, village directory and individual passbooks'}
          </p>
        </div>
        {isOwner && (
          <button type="button" onClick={() => setEditing('new')} className={primaryBtn}>
            <Plus className="w-4 h-4" />
            <span>{t('addFarmer')}</span>
          </button>
        )}
      </div>

      <div className="bg-milk border border-line rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 text-sm bg-cream border border-line rounded-lg focus:outline-none focus:border-forest"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <select value={villageFilter} onChange={(e) => setVillageFilter(e.target.value)} aria-label="Filter by village" className="px-3 py-2 text-xs font-medium bg-cream border border-line rounded-lg focus:outline-none">
            {villages.map((v) => (
              <option key={v} value={v}>
                {v === 'All' ? (lang === 'hi' ? 'सभी गाँव' : 'All Villages') : v}
              </option>
            ))}
          </select>
          <Segmented value={statusFilter} options={['All', 'Active', 'Inactive'] as const} onChange={setStatusFilter} />
        </div>
      </div>

      <ErrorNote message={error ? errorMessage(error) : null} />
      <div className="bg-milk border border-line rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-cream/70 border-b border-beige text-xs text-muted-foreground">
              <tr>
                <th className="py-3 px-4 font-medium">{lang === 'hi' ? 'किसान' : 'Farmer'}</th>
                <th className="py-3 px-4 font-medium">{lang === 'hi' ? 'गाँव' : 'Village'}</th>
                <th className="py-3 px-4 font-medium">{lang === 'hi' ? 'मोबाइल' : 'Mobile'}</th>
                <th className="py-3 px-4 font-medium">{lang === 'hi' ? 'दूध प्रकार' : 'Milk Type'}</th>
                {isOwner && <th className="py-3 px-4 font-medium text-right">{t('totalMilkSupplied')}</th>}
                {isOwner && <th className="py-3 px-4 font-medium text-right">{lang === 'hi' ? 'बकाया राशि' : 'Balance Due'}</th>}
                <th className="py-3 px-4 font-medium">{lang === 'hi' ? 'स्थिति' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream">
              {filtered.map((farmer) => (
                <tr key={farmer.id} onClick={() => setSelectedId(farmer.id)} className="hover:bg-cream/60 transition-colors cursor-pointer">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {farmer.photo_path ? (
                        <StoredPhoto path={farmer.photo_path} alt={farmer.name} className="w-9 h-9 rounded-full object-cover border border-beige shrink-0" fallbackTitle={initials(farmer.name)} />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-beige text-deep font-semibold text-xs flex items-center justify-center shrink-0">{initials(farmer.name)}</div>
                      )}
                      <div>
                        <div className="font-semibold text-deep">{lang === 'hi' ? farmer.name_hi || farmer.name : farmer.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{farmer.farmer_code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-deep/85">{lang === 'hi' ? farmer.village_hi || farmer.village : farmer.village}</td>
                  <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground tabular-nums">{farmer.mobile}</td>
                  <td className="py-3.5 px-4 text-xs text-deep/85">{farmer.milk_type}</td>
                  {isOwner && <td className="py-3.5 px-4 text-right font-mono tabular-nums font-medium text-deep">{litres(farmer.total_litres)}</td>}
                  {isOwner && (
                    <td className={`py-3.5 px-4 text-right font-mono tabular-nums font-semibold ${farmer.balance < 0 ? 'text-earth' : 'text-forest'}`}>
                      {farmer.balance < 0 ? `Adv ${inr(-farmer.balance)}` : inr(farmer.balance)}
                    </td>
                  )}
                  <td className="py-3.5 px-4 text-xs font-medium">
                    <span className={farmer.status === 'Active' ? 'text-forest' : 'text-muted-foreground'}>{farmer.status}</span>
                    {farmer.user_id && <span className="ml-1.5 text-[10px] text-muted-foreground">· login</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isLoading && <div className="py-12 text-center text-sm text-muted-foreground">Loading farmers…</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {farmers.length === 0
              ? isOwner
                ? 'No farmers yet. Add your first farmer to start recording milk.'
                : 'No farmers registered yet.'
              : lang === 'hi'
                ? 'कोई किसान नहीं मिला।'
                : 'No farmers match your current filter.'}
          </div>
        )}
      </div>

      {selected && <FarmerDrawer farmer={selected} onClose={() => setSelectedId(null)} onEdit={() => setEditing(selected)} />}
      {editing && <FarmerFormModal farmer={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function FarmerFormModal({ farmer, onClose }: { farmer: FarmerWithBalance | null; onClose: () => void }) {
  const { lang, t } = useLanguage();
  const { centre } = useDashboard();
  const invalidate = useInvalidateAll();
  const [form, setForm] = useState({
    farmer_code: '',
    name: farmer?.name ?? '',
    name_hi: farmer?.name_hi ?? '',
    village: farmer?.village ?? centre.village ?? '',
    village_hi: farmer?.village_hi ?? '',
    mobile: farmer?.mobile ?? '',
    address: farmer?.address ?? '',
    milk_type: (farmer?.milk_type ?? 'Buffalo') as 'Cow' | 'Buffalo' | 'Both',
    bank_account: farmer?.bank_account ?? '',
    ifsc: farmer?.ifsc ?? '',
    upi_id: farmer?.upi_id ?? '',
    status: (farmer?.status ?? 'Active') as 'Active' | 'Inactive',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length < 2) return setError('Enter the farmer name');
    if (form.mobile && form.mobile.replace(/\D/g, '').length < 10) return setError('Enter a valid 10-digit mobile number');
    setBusy(true);
    try {
      const photo_path = photo ? await uploadPhoto(centre.id, 'farmers', photo) : farmer?.photo_path ?? null;
      const payload = {
        name: form.name.trim(),
        name_hi: form.name_hi.trim(),
        village: form.village.trim(),
        village_hi: form.village_hi.trim(),
        mobile: form.mobile.trim(),
        address: form.address.trim(),
        milk_type: form.milk_type,
        bank_account: form.bank_account.trim(),
        ifsc: form.ifsc.trim().toUpperCase(),
        upi_id: form.upi_id.trim(),
        status: form.status,
        photo_path,
      };
      const res = farmer
        ? await supabase.from('farmers').update(payload).eq('id', farmer.id)
        : await supabase.from('farmers').insert({ ...payload, centre_id: centre.id, farmer_code: form.farmer_code.trim() });
      if (res.error) {
        throw res.error.code === '23505' ? new Error('This farmer ID is already used in your centre') : res.error;
      }
      await invalidate();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={farmer ? `Edit ${farmer.farmer_code}` : t('addFarmer')} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={lang === 'hi' ? 'किसान का पूरा नाम' : 'Farmer full name'} htmlFor="f-name">
            <input id="f-name" required value={form.name} onChange={set('name')} placeholder="e.g. Arvindbhai Chaudhary" className={inputClass} />
          </Field>
          <Field label="Name in Hindi (optional)" htmlFor="f-namehi">
            <input id="f-namehi" value={form.name_hi} onChange={set('name_hi')} className={inputClass} />
          </Field>
          <Field label={lang === 'hi' ? 'गाँव' : 'Village'} htmlFor="f-vil">
            <input id="f-vil" required value={form.village} onChange={set('village')} className={inputClass} />
          </Field>
          <Field label="Village in Hindi (optional)" htmlFor="f-vilhi">
            <input id="f-vilhi" value={form.village_hi} onChange={set('village_hi')} className={inputClass} />
          </Field>
          <Field label={lang === 'hi' ? 'मोबाइल नंबर' : 'Mobile number'} htmlFor="f-mob">
            <input id="f-mob" type="tel" required value={form.mobile} onChange={set('mobile')} placeholder="98250 00000" className={inputClass} />
          </Field>
          <Field label={lang === 'hi' ? 'दूध प्रकार' : 'Milk type'} htmlFor="f-milk">
            <select id="f-milk" value={form.milk_type} onChange={set('milk_type')} className={inputClass}>
              <option value="Buffalo">Buffalo</option>
              <option value="Cow">Cow</option>
              <option value="Both">Both</option>
            </select>
          </Field>
        </div>
        <Field label="Address" htmlFor="f-addr">
          <input id="f-addr" value={form.address} onChange={set('address')} className={inputClass} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Bank account" htmlFor="f-bank">
            <input id="f-bank" value={form.bank_account} onChange={set('bank_account')} className={inputClass} />
          </Field>
          <Field label="IFSC" htmlFor="f-ifsc">
            <input id="f-ifsc" value={form.ifsc} onChange={set('ifsc')} className={inputClass} />
          </Field>
          <Field label="UPI ID" htmlFor="f-upi">
            <input id="f-upi" value={form.upi_id} onChange={set('upi_id')} placeholder="farmer@oksbi" className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {!farmer && (
            <Field label="Farmer ID (optional)" htmlFor="f-code" hint="Leave blank to number automatically">
              <input id="f-code" value={form.farmer_code} onChange={set('farmer_code')} placeholder="Auto" className={inputClass} />
            </Field>
          )}
          {farmer && (
            <Field label="Status" htmlFor="f-status">
              <select id="f-status" value={form.status} onChange={set('status')} className={inputClass}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </Field>
          )}
          <Field label="Photo (optional, max 5 MB)" htmlFor="f-photo">
            <input id="f-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="text-xs" />
          </Field>
        </div>
        <ErrorNote message={error} />
        <div className="pt-2 flex items-center gap-3">
          <button type="submit" disabled={busy} className={`${primaryBtn} flex-1`}>
            {busy ? 'Saving…' : farmer ? 'Save changes' : lang === 'hi' ? 'किसान जोड़ें' : 'Add to Register'}
          </button>
          <button type="button" onClick={onClose} className={secondaryBtn}>
            {t('cancel')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function FarmerDrawer({ farmer, onClose, onEdit }: { farmer: FarmerWithBalance; onClose: () => void; onEdit: () => void }) {
  const { lang, t } = useLanguage();
  const { centre, isOwner } = useDashboard();
  const { data: milk = [] } = useCollections({ farmerId: farmer.id, limit: 30 });
  const { data: payments = [] } = usePayments({ farmerId: isOwner ? farmer.id : undefined, limit: 20 });
  const { data: ledger = [] } = useLedger(isOwner ? farmer.id : undefined);
  const [loginOpen, setLoginOpen] = useState(false);
  const statement = buildStatement(ledger);

  return (
    <Drawer open onClose={onClose} label={farmer.name}>
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-beige">
        <div className="flex items-center gap-3.5">
          {farmer.photo_path ? (
            <StoredPhoto path={farmer.photo_path} alt={farmer.name} className="w-14 h-14 rounded-full object-cover border border-beige" fallbackTitle={initials(farmer.name)} />
          ) : (
            <div className="w-14 h-14 rounded-full bg-forest text-milk font-display font-bold text-lg flex items-center justify-center">{initials(farmer.name)}</div>
          )}
          <div>
            <h2 className="font-display text-xl font-bold text-deep">{lang === 'hi' ? farmer.name_hi || farmer.name : farmer.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {farmer.farmer_code} · {farmer.village} · {farmer.status}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close profile" className={smallBtn}>
          ✕
        </button>
      </div>

      {isOwner && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryBtn} onClick={onEdit}>
            <Pencil className="w-4 h-4" /> Edit
          </button>
          <button type="button" className={secondaryBtn} onClick={() => setLoginOpen(true)}>
            <KeyRound className="w-4 h-4" /> {farmer.user_id ? 'Manage login' : 'Create login'}
          </button>
          <button
            type="button"
            className={secondaryBtn}
            disabled={ledger.length === 0}
            onClick={() => downloadFarmerStatement({ centreName: centre.name, farmer, ledger })}
          >
            <Download className="w-4 h-4" /> Statement PDF
          </button>
        </div>
      )}

      {isOwner && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-cream rounded-lg p-3">
            <div className="text-[11px] text-muted-foreground">{t('totalMilkSupplied')}</div>
            <div className="font-mono text-lg font-bold text-deep mt-0.5 tabular-nums">{litres(farmer.total_litres)}</div>
          </div>
          <div className="bg-cream rounded-lg p-3">
            <div className="text-[11px] text-muted-foreground">{lang === 'hi' ? 'कुल भुगतान' : 'Total Paid'}</div>
            <div className="font-mono text-lg font-bold text-forest mt-0.5 tabular-nums">{inr(farmer.total_paid)}</div>
          </div>
          <div className="bg-cream rounded-lg p-3">
            <div className="text-[11px] text-muted-foreground">{farmer.balance < 0 ? 'Advance given' : lang === 'hi' ? 'बकाया' : 'Pending Due'}</div>
            <div className="font-mono text-lg font-bold text-earth mt-0.5 tabular-nums">{inr(Math.abs(farmer.balance))}</div>
          </div>
        </div>
      )}

      <div className="border border-beige rounded-xl p-4 space-y-2.5 text-sm">
        <h3 className="font-semibold text-deep flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-forest" />
          <span>{lang === 'hi' ? 'व्यक्तिगत व बैंक विवरण' : 'Personal & Payout Details'}</span>
        </h3>
        <div className="grid grid-cols-2 gap-y-2 text-xs pt-1">
          <div className="text-muted-foreground">Mobile</div>
          <div className="font-mono text-deep flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-forest" />
            {farmer.mobile || '—'}
          </div>
          <div className="text-muted-foreground">Milk Type</div>
          <div className="text-deep font-medium">{farmer.milk_type}</div>
          {isOwner && (
            <>
              <div className="text-muted-foreground">Bank Account</div>
              <div className="font-mono text-deep">{farmer.bank_account ? `${farmer.bank_account} (${farmer.ifsc})` : '—'}</div>
              <div className="text-muted-foreground">UPI ID</div>
              <div className="font-mono text-deep">{farmer.upi_id || '—'}</div>
            </>
          )}
          <div className="text-muted-foreground">Address</div>
          <div className="text-deep">{farmer.address || '—'}</div>
          <div className="text-muted-foreground">Member Since</div>
          <div className="text-deep">{formatDate(farmer.joined_date)}</div>
          <div className="text-muted-foreground">Portal login</div>
          <div className="text-deep">{farmer.user_id ? 'Enabled' : 'Not created'}</div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-deep mb-2">{lang === 'hi' ? 'हालिया दूध आपूर्ति इतिहास' : 'Recent Milk Supply History'}</h3>
        {milk.length > 0 ? (
          <div className="border border-beige rounded-xl divide-y divide-cream">
            {milk.map((m) => (
              <div key={m.id} className={`px-4 py-2.5 flex items-center justify-between text-xs ${m.status !== 'active' ? 'opacity-50' : ''}`}>
                <div>
                  <div className="font-medium text-deep">
                    {formatDate(m.collection_date)} · {m.shift} ({m.milk_type}) {m.status !== 'active' && '· cancelled'}
                  </div>
                  <div className="text-muted-foreground font-mono">
                    Fat {m.fat_percent}% · SNF {m.snf_percent}% · ₹{m.rate_per_litre}/L · {m.receipt_no}
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="font-semibold text-deep">{m.quantity_litres} L</div>
                  <div className="text-forest">{inr(m.total_amount, 0)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-3">No milk recorded yet.</p>
        )}
      </div>

      {isOwner && (
        <div>
          <h3 className="text-sm font-bold text-deep mb-2">{t('paymentHistory')}</h3>
          {payments.length > 0 ? (
            <div className="border border-beige rounded-xl divide-y divide-cream">
              {payments.map((p) => (
                <div key={p.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-medium text-deep">
                      {formatDate(p.payment_date)} · {p.payment_type} · {p.method}
                    </div>
                    <div className="text-muted-foreground font-mono">
                      {p.txn_id} {p.reference_no ? `· ${p.reference_no}` : ''} {p.status === 'reversed' ? '· reversed' : ''}
                    </div>
                  </div>
                  <div className={`font-mono font-bold tabular-nums ${p.status === 'reversed' ? 'line-through text-muted-foreground' : 'text-forest'}`}>{inr(p.amount)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-3">No payments recorded yet.</p>
          )}
        </div>
      )}

      {isOwner && ledger.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-deep mb-2">Ledger</h3>
          <div className="border border-beige rounded-xl divide-y divide-cream max-h-72 overflow-y-auto">
            {[...statement.lines].reverse().slice(0, 40).map((l) => (
              <div key={l.id} className="px-4 py-2 flex items-center justify-between text-xs gap-3">
                <div className="min-w-0">
                  <div className="text-deep truncate">{l.description}</div>
                  <div className="text-muted-foreground">{formatDate(l.entry_date)}</div>
                </div>
                <div className="text-right font-mono tabular-nums shrink-0">
                  <div className={Number(l.amount) >= 0 ? 'text-forest' : 'text-earth'}>
                    {Number(l.amount) >= 0 ? '+' : '−'}
                    {inr(Math.abs(Number(l.amount)), 2)}
                  </div>
                  <div className="text-muted-foreground">Bal {inr(l.running, 2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loginOpen && <FarmerLoginModal farmer={farmer} onClose={() => setLoginOpen(false)} />}
    </Drawer>
  );
}

function FarmerLoginModal({ farmer, onClose }: { farmer: FarmerWithBalance; onClose: () => void }) {
  const { centre } = useDashboard();
  const invalidate = useInvalidateAll();
  const createLogin = useServerFn(createFarmerLogin);
  const resetPw = useServerFn(resetMemberPassword);
  const setAccess = useServerFn(setMemberAccess);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      setDone(await fn());
      await invalidate();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={farmer.user_id ? `Login for ${farmer.name}` : `Create login for ${farmer.name}`}>
      {!farmer.user_id ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const r = await createLogin({ data: { farmerId: farmer.id, email, password } });
              return `Login created. ${farmer.name} can sign in with ${displayLoginId(r.loginId) || r.loginId} and the password you set.`;
            });
          }}
          className="space-y-4"
        >
          <p className="text-sm text-muted-foreground">
            The farmer signs in with their mobile number <strong>{farmer.mobile || '(add one first)'}</strong>, or with an email if you enter one.
          </p>
          <Field label="Email (optional)" htmlFor="fl-email">
            <input id="fl-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Password (min 8 characters)" htmlFor="fl-pw">
            <input id="fl-pw" type="text" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </Field>
          <ErrorNote message={error} />
          <SuccessNote message={done} />
          <button type="submit" disabled={busy || !!done} className={`${primaryBtn} w-full`}>
            {busy ? 'Creating…' : 'Create farmer login'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await resetPw({ data: { centreId: centre.id, userId: farmer.user_id as string, password } });
                return 'Password updated. Share the new password with the farmer.';
              });
            }}
            className="space-y-3"
          >
            <Field label="Set a new password" htmlFor="fl-npw">
              <input id="fl-npw" type="text" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </Field>
            <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>
              <KeyRound className="w-4 h-4" /> Reset password
            </button>
          </form>
          <div className="flex gap-2 pt-2 border-t border-beige">
            <button
              type="button"
              disabled={busy}
              className={secondaryBtn}
              onClick={() =>
                run(async () => {
                  await setAccess({ data: { centreId: centre.id, userId: farmer.user_id as string, active: false } });
                  return 'Login disabled. The farmer can no longer sign in.';
                })
              }
            >
              <UserX className="w-4 h-4" /> Disable login
            </button>
            <button
              type="button"
              disabled={busy}
              className={secondaryBtn}
              onClick={() =>
                run(async () => {
                  await setAccess({ data: { centreId: centre.id, userId: farmer.user_id as string, active: true } });
                  return 'Login enabled.';
                })
              }
            >
              <UserCheck className="w-4 h-4" /> Enable login
            </button>
          </div>
          <ErrorNote message={error} />
          <SuccessNote message={done} />
        </div>
      )}
    </Modal>
  );
}
