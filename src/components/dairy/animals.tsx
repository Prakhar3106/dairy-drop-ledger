import { useState } from 'react';
import { Calendar, HeartPulse, Pencil, Plus, ShieldCheck, Sprout, Stethoscope, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { animalFallback } from './assets';
import { StoredPhoto } from './SafeImage';
import { Drawer, ErrorNote, Field, Modal, inputClass, primaryBtn, secondaryBtn, smallBtn } from './ui';
import { type AnimalRow, useAnimalRecords, useInvalidateAll } from '@/lib/dairy/api';
import { errorMessage, formatDate, inr, todayIST } from '@/lib/dairy/format';
import { uploadPhoto } from '@/lib/dairy/photos';
import { useLanguage } from '@/lib/i18n';

export const healthColor = (status: string) => (status === 'Healthy' ? 'text-forest' : status === 'Checkup Due' ? 'text-earth' : 'text-warn');

export function ageLabel(a: Pick<AnimalRow, 'age_years' | 'date_of_birth'>): string {
  if (a.date_of_birth) {
    const years = (Date.now() - new Date(a.date_of_birth).getTime()) / (365.25 * 86400000);
    return `${years.toFixed(1)} yrs`;
  }
  return a.age_years != null ? `${a.age_years} yrs` : 'Age unknown';
}

export function AnimalCard({ animal, onClick }: { animal: AnimalRow; onClick: () => void }) {
  const { lang } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-milk border border-line hover:border-forest/60 rounded-xl overflow-hidden transition-all duration-150 hover:-translate-y-0.5 flex flex-col cursor-pointer"
    >
      <div className="aspect-[4/3] w-full bg-cream overflow-hidden">
        <StoredPhoto path={animal.photo_path} fallbackSrc={animalFallback(animal.animal_type)} alt={`${animal.name} - ${animal.breed}`} className="w-full h-full object-cover" fallbackTitle={`${animal.breed} ${animal.animal_type}`} />
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">
              {animal.animal_code}
              {animal.tag_number ? ` · ${animal.tag_number}` : ''}
            </span>
            <span className={`font-semibold ${animal.status === 'Active' ? healthColor(animal.health_status) : 'text-muted-foreground'}`}>
              {animal.status === 'Active' ? animal.health_status : animal.status}
            </span>
          </div>
          <h3 className="font-display text-lg font-bold text-deep mt-1">{animal.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {animal.animal_type} · {animal.breed || '—'} · {ageLabel(animal)}
          </p>
        </div>
        <div className="pt-3 border-t border-cream flex items-center justify-between text-xs">
          <div>
            <span className="text-muted-foreground block">{lang === 'hi' ? 'पशुपालक' : 'Owner'}</span>
            <span className="font-medium text-deep">{animal.farmer?.name}</span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground block">{lang === 'hi' ? 'दैनिक दूध' : 'Daily Yield'}</span>
            <span className="font-mono font-bold text-forest text-sm tabular-nums">{Number(animal.daily_yield_litres).toFixed(1)} L/day</span>
          </div>
        </div>
      </div>
    </button>
  );
}

type FarmerOption = { id: string; farmer_code: string; name: string };

export function AnimalFormModal({
  animal,
  farmers,
  fixedFarmerId,
  centreId,
  onClose,
}: {
  animal: AnimalRow | null;
  farmers?: FarmerOption[] | undefined;
  fixedFarmerId?: string | undefined;
  centreId: string;
  onClose: () => void;
}) {
  const invalidate = useInvalidateAll();
  const [form, setForm] = useState({
    farmer_id: animal?.farmer_id ?? fixedFarmerId ?? farmers?.[0]?.id ?? '',
    name: animal?.name ?? '',
    tag_number: animal?.tag_number ?? '',
    animal_type: (animal?.animal_type ?? 'Cow') as 'Cow' | 'Buffalo',
    breed: animal?.breed ?? 'Gir',
    date_of_birth: animal?.date_of_birth ?? '',
    age_years: animal?.age_years != null ? String(animal.age_years) : '',
    purchase_date: animal?.purchase_date ?? '',
    purchase_price: animal?.purchase_price != null ? String(animal.purchase_price) : '',
    status: (animal?.status ?? 'Active') as 'Active' | 'Dry' | 'Sold' | 'Dead',
    sale_date: animal?.sale_date ?? '',
    sale_price: animal?.sale_price != null ? String(animal.sale_price) : '',
    health_status: (animal?.health_status ?? 'Healthy') as 'Healthy' | 'Checkup Due' | 'Under Care',
    daily_yield_litres: animal ? String(animal.daily_yield_litres) : '',
    feeding_plan: animal?.feeding_plan ?? '',
    notes: animal?.notes ?? '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const num = (v: string) => (v.trim() === '' ? null : Number(v));
  const date = (v: string) => (v.trim() === '' ? null : v);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.farmer_id) return setError('Choose the farmer who owns this animal');
    if (form.status === 'Sold' && !form.sale_date) return setError('Enter the sale date for a sold animal');
    setBusy(true);
    setError(null);
    try {
      const photo_path = photo ? await uploadPhoto(centreId, 'animals', photo) : animal?.photo_path ?? null;
      const payload = {
        farmer_id: form.farmer_id,
        centre_id: centreId,
        name: form.name.trim(),
        tag_number: form.tag_number.trim(),
        animal_type: form.animal_type,
        breed: form.breed.trim(),
        date_of_birth: date(form.date_of_birth),
        age_years: num(form.age_years),
        purchase_date: date(form.purchase_date),
        purchase_price: num(form.purchase_price),
        status: form.status,
        sale_date: date(form.sale_date),
        sale_price: num(form.sale_price),
        health_status: form.health_status,
        daily_yield_litres: num(form.daily_yield_litres) ?? 0,
        feeding_plan: form.feeding_plan.trim(),
        notes: form.notes.trim(),
        photo_path,
      };
      const res = animal ? await supabase.from('animals').update(payload).eq('id', animal.id) : await supabase.from('animals').insert(payload);
      if (res.error) throw res.error;
      await invalidate();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={animal ? `Edit ${animal.name}` : 'Register Cow or Buffalo'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {farmers && !fixedFarmerId && (
          <Field label="Farmer owner" htmlFor="a-farmer">
            <select id="a-farmer" value={form.farmer_id} onChange={set('farmer_id')} className={inputClass}>
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.farmer_code} — {f.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Animal name / ID" htmlFor="a-name">
            <input id="a-name" required value={form.name} onChange={set('name')} placeholder="e.g. Nandini" className={inputClass} />
          </Field>
          <Field label="Type" htmlFor="a-type">
            <select
              id="a-type"
              value={form.animal_type}
              onChange={(e) => {
                const v = e.target.value as 'Cow' | 'Buffalo';
                setForm((f) => ({ ...f, animal_type: v, breed: f.breed === 'Gir' || f.breed === 'Murrah' ? (v === 'Cow' ? 'Gir' : 'Murrah') : f.breed }));
              }}
              className={inputClass}
            >
              <option value="Cow">Cow</option>
              <option value="Buffalo">Buffalo</option>
            </select>
          </Field>
          <Field label="Breed" htmlFor="a-breed">
            <input id="a-breed" value={form.breed} onChange={set('breed')} className={inputClass} />
          </Field>
          <Field label="Tag number" htmlFor="a-tag">
            <input id="a-tag" value={form.tag_number} onChange={set('tag_number')} placeholder="IN-GJ-482199" className={inputClass} />
          </Field>
          <Field label="Date of birth" htmlFor="a-dob">
            <input id="a-dob" type="date" max={todayIST()} value={form.date_of_birth} onChange={set('date_of_birth')} className={inputClass} />
          </Field>
          <Field label="…or age (years)" htmlFor="a-age">
            <input id="a-age" type="number" step="0.5" min="0" value={form.age_years} onChange={set('age_years')} className={inputClass} />
          </Field>
          <Field label="Daily yield (L)" htmlFor="a-yield">
            <input id="a-yield" type="number" step="0.1" min="0" value={form.daily_yield_litres} onChange={set('daily_yield_litres')} className={inputClass} />
          </Field>
          <Field label="Health" htmlFor="a-health">
            <select id="a-health" value={form.health_status} onChange={set('health_status')} className={inputClass}>
              <option>Healthy</option>
              <option>Checkup Due</option>
              <option>Under Care</option>
            </select>
          </Field>
          <Field label="Status" htmlFor="a-status">
            <select id="a-status" value={form.status} onChange={set('status')} className={inputClass}>
              <option>Active</option>
              <option>Dry</option>
              <option>Sold</option>
              <option>Dead</option>
            </select>
          </Field>
          <Field label="Purchase date" htmlFor="a-pd">
            <input id="a-pd" type="date" max={todayIST()} value={form.purchase_date} onChange={set('purchase_date')} className={inputClass} />
          </Field>
          <Field label="Purchase price (₹)" htmlFor="a-pp">
            <input id="a-pp" type="number" min="0" value={form.purchase_price} onChange={set('purchase_price')} className={inputClass} />
          </Field>
          {form.status === 'Sold' && (
            <>
              <Field label="Sale date" htmlFor="a-sd">
                <input id="a-sd" type="date" max={todayIST()} value={form.sale_date} onChange={set('sale_date')} className={inputClass} />
              </Field>
              <Field label="Sale price (₹)" htmlFor="a-sp">
                <input id="a-sp" type="number" min="0" value={form.sale_price} onChange={set('sale_price')} className={inputClass} />
              </Field>
            </>
          )}
        </div>
        <Field label="Feeding & nutrition plan" htmlFor="a-feed">
          <input id="a-feed" value={form.feeding_plan} onChange={set('feeding_plan')} placeholder="e.g. 18 kg green fodder, 4 kg cattle feed" className={inputClass} />
        </Field>
        <Field label="Important notes" htmlFor="a-notes">
          <textarea id="a-notes" rows={2} value={form.notes} onChange={set('notes')} className={inputClass} />
        </Field>
        <Field label="Photo (optional, max 5 MB)" htmlFor="a-photo">
          <input id="a-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="text-xs" />
        </Field>
        <ErrorNote message={error} />
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className={`${primaryBtn} flex-1`}>
            {busy ? 'Saving…' : 'Save Animal'}
          </button>
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

type RecordKind = 'health' | 'vaccination' | 'breeding';

export function AnimalDrawer({ animal, canEdit, onClose, onEdit }: { animal: AnimalRow; canEdit: boolean; onClose: () => void; onEdit: () => void }) {
  const { lang } = useLanguage();
  const invalidate = useInvalidateAll();
  const { data, isLoading } = useAnimalRecords(animal.id);
  const [adding, setAdding] = useState<RecordKind | null>(null);
  const nextVacc = data?.vaccinations.filter((v) => v.status === 'Scheduled').sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0];
  const lastCheck = data?.health[0];

  const remove = async (table: 'animal_health_records' | 'vaccination_records' | 'breeding_records', id: string) => {
    if (!window.confirm('Delete this record?')) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) invalidate();
  };
  const completeVacc = async (id: string) => {
    const { error } = await supabase.from('vaccination_records').update({ status: 'Completed', administered_date: todayIST() }).eq('id', id);
    if (!error) invalidate();
  };

  return (
    <Drawer open onClose={onClose} label={animal.name}>
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-beige">
        <div>
          <div className="text-xs font-mono text-muted-foreground">
            {animal.animal_code}
            {animal.tag_number ? ` · ${animal.tag_number}` : ''}
          </div>
          <h2 className="font-display text-xl font-bold text-deep mt-0.5">{animal.name}</h2>
          <div className="text-xs text-muted-foreground mt-0.5">
            {animal.animal_type} · {animal.breed} · {ageLabel(animal)} · <span className={`font-semibold ${healthColor(animal.health_status)}`}>{animal.health_status}</span> ·{' '}
            {animal.status}
          </div>
        </div>
        <div className="flex gap-1">
          {canEdit && (
            <button type="button" onClick={onEdit} className={smallBtn} aria-label="Edit animal">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close animal details" className={smallBtn}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="aspect-[16/10] rounded-xl overflow-hidden border border-line">
        <StoredPhoto path={animal.photo_path} fallbackSrc={animalFallback(animal.animal_type)} alt={animal.name} className="w-full h-full object-cover" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-cream rounded-lg p-3">
          <div className="text-[11px] text-muted-foreground">{lang === 'hi' ? 'दैनिक दूध' : 'Daily Milk'}</div>
          <div className="font-mono text-lg font-bold text-forest tabular-nums">{animal.daily_yield_litres} L</div>
        </div>
        <div className="bg-cream rounded-lg p-3">
          <div className="text-[11px] text-muted-foreground">{lang === 'hi' ? 'पिछली जांच' : 'Last Checkup'}</div>
          <div className="text-xs font-semibold text-deep mt-1">{lastCheck ? formatDate(lastCheck.record_date) : '—'}</div>
        </div>
        <div className="bg-cream rounded-lg p-3">
          <div className="text-[11px] text-muted-foreground">{lang === 'hi' ? 'अगला टीका' : 'Next Vaccine'}</div>
          <div className="text-xs font-semibold text-earth mt-1">{nextVacc ? formatDate(nextVacc.scheduled_date) : '—'}</div>
        </div>
      </div>
      {(animal.purchase_date || animal.sale_date) && (
        <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2">
          {animal.purchase_date && (
            <span>
              Bought {formatDate(animal.purchase_date)}
              {animal.purchase_price != null ? ` · ${inr(animal.purchase_price)}` : ''}
            </span>
          )}
          {animal.sale_date && (
            <span>
              Sold {formatDate(animal.sale_date)}
              {animal.sale_price != null ? ` · ${inr(animal.sale_price)}` : ''}
            </span>
          )}
        </div>
      )}
      <div className="border border-beige rounded-xl p-4">
        <h3 className="text-sm font-bold text-deep flex items-center gap-2">
          <Sprout className="w-4 h-4 text-forest" />
          <span>{lang === 'hi' ? 'दैनिक आहार योजना' : 'Feeding & Nutrition Plan'}</span>
        </h3>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{animal.feeding_plan || 'No feeding plan recorded.'}</p>
        {animal.notes && <p className="text-xs text-deep mt-2">Note: {animal.notes}</p>}
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Loading records…</p>}

      <Section title={lang === 'hi' ? 'टीकाकरण इतिहास' : 'Vaccinations'} icon={<ShieldCheck className="w-4 h-4 text-forest" />} onAdd={canEdit ? () => setAdding('vaccination') : undefined}>
        {data?.vaccinations.map((v) => (
          <div key={v.id} className="px-4 py-3 flex items-center justify-between text-xs gap-2">
            <div>
              <div className="font-semibold text-deep">{v.vaccine_name}</div>
              <div className="text-muted-foreground">
                {formatDate(v.administered_date ?? v.scheduled_date)} {v.vet_name ? `· ${v.vet_name}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={v.status === 'Completed' ? 'font-semibold text-forest' : 'font-semibold text-earth'}>{v.status}</span>
              {canEdit && v.status === 'Scheduled' && (
                <button type="button" className={smallBtn} onClick={() => completeVacc(v.id)}>
                  Done
                </button>
              )}
              {canEdit && (
                <button type="button" className={smallBtn} onClick={() => remove('vaccination_records', v.id)} aria-label="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
        {data && data.vaccinations.length === 0 && <p className="px-4 py-3 text-xs text-muted-foreground">No vaccinations recorded.</p>}
      </Section>

      <Section title="Health Records" icon={<Stethoscope className="w-4 h-4 text-forest" />} onAdd={canEdit ? () => setAdding('health') : undefined}>
        {data?.health.map((h) => (
          <div key={h.id} className="px-4 py-3 text-xs flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-deep">
                {h.record_type} · {formatDate(h.record_date)}
              </div>
              <div className="text-muted-foreground mt-0.5">
                {h.description}
                {h.vet_name ? ` · ${h.vet_name}` : ''}
                {h.cost != null ? ` · ${inr(h.cost)}` : ''}
              </div>
              {h.next_followup_date && <div className="text-earth mt-0.5">Follow-up {formatDate(h.next_followup_date)}</div>}
            </div>
            {canEdit && (
              <button type="button" className={smallBtn} onClick={() => remove('animal_health_records', h.id)} aria-label="Delete">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        {data && data.health.length === 0 && <p className="px-4 py-3 text-xs text-muted-foreground">No health records yet.</p>}
      </Section>

      <Section title={lang === 'hi' ? 'प्रजनन व ब्यात रिकॉर्ड' : 'Breeding & Calving Records'} icon={<HeartPulse className="w-4 h-4 text-forest" />} onAdd={canEdit ? () => setAdding('breeding') : undefined}>
        {data?.breeding.map((b) => (
          <div key={b.id} className="px-4 py-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-deep">{b.event_type}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(b.event_date)}
                </span>
                {canEdit && (
                  <button type="button" className={smallBtn} onClick={() => remove('breeding_records', b.id)} aria-label="Delete">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </span>
            </div>
            <div className="text-muted-foreground mt-1">
              {b.notes}
              {b.calf_details ? ` · Calf: ${b.calf_details}` : ''}
              {b.expected_calving_date ? ` · Expected calving ${formatDate(b.expected_calving_date)}` : ''}
            </div>
          </div>
        ))}
        {data && data.breeding.length === 0 && <p className="px-4 py-3 text-xs text-muted-foreground">No breeding events logged yet.</p>}
      </Section>
      <p className="text-[11px] text-muted-foreground">Records are for keeping history only — they are not veterinary advice.</p>

      {adding && <RecordModal kind={adding} animalId={animal.id} onClose={() => setAdding(null)} />}
    </Drawer>
  );
}

function Section({ title, icon, onAdd, children }: { title: string; icon: React.ReactNode; onAdd?: (() => void) | undefined; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-sm font-bold text-deep flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </h3>
        {onAdd && (
          <button type="button" onClick={onAdd} className={smallBtn}>
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>
      <div className="border border-beige rounded-xl divide-y divide-cream">{children}</div>
    </div>
  );
}

function RecordModal({ kind, animalId, onClose }: { kind: RecordKind; animalId: string; onClose: () => void }) {
  const invalidate = useInvalidateAll();
  const [f, setF] = useState<Record<string, string>>({ date: todayIST(), type: kind === 'health' ? 'Checkup' : kind === 'breeding' ? 'Artificial Insemination' : 'Scheduled' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const v = (k: string) => f[k] ?? '';
  const opt = (k: string) => (v(k).trim() === '' ? null : v(k).trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    let res;
    if (kind === 'health') {
      res = await supabase.from('animal_health_records').insert({
        animal_id: animalId,
        record_date: v('date'),
        record_type: v('type') as 'Checkup',
        description: v('description'),
        vet_name: v('vet'),
        cost: opt('cost') ? Number(v('cost')) : null,
        next_followup_date: opt('followup'),
      });
    } else if (kind === 'vaccination') {
      const done = v('type') === 'Completed';
      res = await supabase.from('vaccination_records').insert({
        animal_id: animalId,
        vaccine_name: v('vaccine'),
        scheduled_date: v('date'),
        administered_date: done ? v('date') : null,
        status: done ? 'Completed' : 'Scheduled',
        vet_name: v('vet'),
        notes: v('notes'),
      });
    } else {
      res = await supabase.from('breeding_records').insert({
        animal_id: animalId,
        event_date: v('date'),
        event_type: v('type') as 'Calving',
        notes: v('notes'),
        expected_calving_date: opt('expected'),
        calf_details: v('calf'),
      });
    }
    setBusy(false);
    if (res.error) return setError(errorMessage(res.error));
    await invalidate();
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={kind === 'health' ? 'Add health record' : kind === 'vaccination' ? 'Add vaccination' : 'Add breeding / calving event'}>
      <form onSubmit={submit} className="space-y-4">
        {kind === 'health' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" htmlFor="r-date">
                <input id="r-date" type="date" required max={todayIST()} value={v('date')} onChange={set('date')} className={inputClass} />
              </Field>
              <Field label="Type" htmlFor="r-type">
                <select id="r-type" value={v('type')} onChange={set('type')} className={inputClass}>
                  {['Checkup', 'Treatment', 'Illness', 'Deworming', 'Note'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="What happened" htmlFor="r-desc">
              <input id="r-desc" required value={v('description')} onChange={set('description')} className={inputClass} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Vet name" htmlFor="r-vet">
                <input id="r-vet" value={v('vet')} onChange={set('vet')} className={inputClass} />
              </Field>
              <Field label="Cost (₹)" htmlFor="r-cost">
                <input id="r-cost" type="number" min="0" value={v('cost')} onChange={set('cost')} className={inputClass} />
              </Field>
              <Field label="Follow-up" htmlFor="r-fu">
                <input id="r-fu" type="date" value={v('followup')} onChange={set('followup')} className={inputClass} />
              </Field>
            </div>
          </>
        )}
        {kind === 'vaccination' && (
          <>
            <Field label="Vaccine" htmlFor="r-vac">
              <input id="r-vac" required value={v('vaccine')} onChange={set('vaccine')} placeholder="e.g. FMD (Foot & Mouth)" className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status" htmlFor="r-vs">
                <select id="r-vs" value={v('type')} onChange={set('type')} className={inputClass}>
                  <option value="Scheduled">Scheduled (reminder)</option>
                  <option value="Completed">Already given</option>
                </select>
              </Field>
              <Field label={v('type') === 'Completed' ? 'Date given' : 'Scheduled date'} htmlFor="r-vd">
                <input id="r-vd" type="date" required value={v('date')} onChange={set('date')} className={inputClass} />
              </Field>
            </div>
            <Field label="Vet name" htmlFor="r-vvet">
              <input id="r-vvet" value={v('vet')} onChange={set('vet')} className={inputClass} />
            </Field>
          </>
        )}
        {kind === 'breeding' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" htmlFor="r-bd">
                <input id="r-bd" type="date" required max={todayIST()} value={v('date')} onChange={set('date')} className={inputClass} />
              </Field>
              <Field label="Event" htmlFor="r-be">
                <select id="r-be" value={v('type')} onChange={set('type')} className={inputClass}>
                  {['Heat', 'Artificial Insemination', 'Natural Service', 'Pregnancy Check', 'Calving', 'Abortion', 'Other'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Notes" htmlFor="r-bn">
              <input id="r-bn" value={v('notes')} onChange={set('notes')} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Expected calving" htmlFor="r-bx">
                <input id="r-bx" type="date" value={v('expected')} onChange={set('expected')} className={inputClass} />
              </Field>
              <Field label="Calf details" htmlFor="r-bc">
                <input id="r-bc" value={v('calf')} onChange={set('calf')} placeholder="e.g. Female, 24 kg" className={inputClass} />
              </Field>
            </div>
          </>
        )}
        <ErrorNote message={error} />
        <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>
          {busy ? 'Saving…' : 'Save record'}
        </button>
      </form>
    </Modal>
  );
}
