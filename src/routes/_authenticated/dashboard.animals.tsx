import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useDashboard } from '@/components/dairy/dashboard-context';
import { AnimalCard, AnimalDrawer, AnimalFormModal } from '@/components/dairy/animals';
import { ErrorNote, Segmented, Spinner, primaryBtn } from '@/components/dairy/ui';
import { type AnimalRow, useAnimals, useFarmers } from '@/lib/dairy/api';
import { errorMessage } from '@/lib/dairy/format';
import { useLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/_authenticated/dashboard/animals')({
  head: () => ({ meta: [{ title: 'Animals — DairySetu' }] }),
  component: AnimalsPage,
});

function AnimalsPage() {
  const { lang, t } = useLanguage();
  const { centre, isOwner } = useDashboard();
  const { data: animals = [], isLoading, error } = useAnimals({ centreId: centre.id });
  const { data: farmers = [] } = useFarmers(centre.id, false);
  const [typeFilter, setTypeFilter] = useState<'All' | 'Cow' | 'Buffalo'>('All');
  const [healthFilter, setHealthFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AnimalRow | 'new' | null>(null);

  const filtered = useMemo(
    () =>
      animals.filter((a) => {
        if (typeFilter !== 'All' && a.animal_type !== typeFilter) return false;
        if (healthFilter !== 'All' && (healthFilter === 'Sold/Dead' ? !['Sold', 'Dead'].includes(a.status) : a.health_status !== healthFilter || a.status !== 'Active')) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return a.name.toLowerCase().includes(q) || a.animal_code.toLowerCase().includes(q) || a.breed.toLowerCase().includes(q) || (a.farmer?.name ?? '').toLowerCase().includes(q) || a.tag_number.toLowerCase().includes(q);
        }
        return true;
      }),
    [animals, typeFilter, healthFilter, search],
  );
  const selected = animals.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-deep tracking-tight">{t('menuAnimals')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lang === 'hi' ? 'गाय और भैंस पंजीकरण, दैनिक दूध उत्पादन, टीकाकरण व प्रजनन इतिहास' : 'Cows & buffaloes registry with daily milk yield, vaccination, breeding & feeding plans'}
          </p>
        </div>
        {isOwner && (
          <button type="button" onClick={() => setEditing('new')} disabled={farmers.length === 0} className={primaryBtn}>
            <Plus className="w-4 h-4" />
            <span>{lang === 'hi' ? 'नया पशु जोड़ें' : 'Add Animal'}</span>
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
            placeholder={lang === 'hi' ? 'पशु आईडी, नस्ल या किसान खोजें...' : 'Search by animal ID, tag, breed or farmer...'}
            className="w-full pl-9 pr-3 py-2 text-sm bg-cream border border-line rounded-lg focus:outline-none focus:border-forest"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Segmented value={typeFilter} options={['All', 'Cow', 'Buffalo'] as const} onChange={setTypeFilter} />
          <select value={healthFilter} onChange={(e) => setHealthFilter(e.target.value)} aria-label="Filter by health status" className="px-3 py-2 text-xs font-medium bg-cream border border-line rounded-lg">
            <option value="All">All Health Status</option>
            <option value="Healthy">Healthy</option>
            <option value="Checkup Due">Checkup Due</option>
            <option value="Under Care">Under Care</option>
            <option value="Sold/Dead">Sold / Dead</option>
          </select>
        </div>
      </div>

      <ErrorNote message={error ? errorMessage(error) : null} />
      {isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div className="bg-milk border border-line rounded-xl py-12 text-center text-sm text-muted-foreground">
          {animals.length === 0 ? 'No animals registered yet. Owners and farmers can add cows and buffaloes here.' : 'No animals match your filter.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((animal) => (
            <AnimalCard key={animal.id} animal={animal} onClick={() => setSelectedId(animal.id)} />
          ))}
        </div>
      )}

      {selected && <AnimalDrawer animal={selected} canEdit={isOwner} onClose={() => setSelectedId(null)} onEdit={() => setEditing(selected)} />}
      {editing && <AnimalFormModal animal={editing === 'new' ? null : editing} farmers={farmers} centreId={centre.id} onClose={() => setEditing(null)} />}
    </div>
  );
}
