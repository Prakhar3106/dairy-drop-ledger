import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Bell, Calendar, Download, Droplets, Globe, HeartPulse, IndianRupee, LayoutDashboard, LogOut, Pencil, Plus, Sprout, Trash2, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { BrandLogo } from '@/components/dairy/BrandLogo';
import { StoredPhoto } from '@/components/dairy/SafeImage';
import { ASSETS } from '@/components/dairy/assets';
import { AnimalDrawer, AnimalFormModal, ageLabel, healthColor } from '@/components/dairy/animals';
import { FARMER_CATEGORIES, ExpenseModal } from '@/components/dairy/expenses';
import { animalFallback } from '@/components/dairy/assets';
import { ErrorNote, Spinner, chartColors, smallBtn, smallPrimaryBtn, tooltipStyle } from '@/components/dairy/ui';
import { type AnimalRow, type ExpenseRow, useAnimals, useCollections, useExpenses, useFarmerBalance, useInvalidateAll, useLedger, useNotifications, usePayments, useUpcomingVaccinations } from '@/lib/dairy/api';
import { buildDailySeries, estimatedNetIncome, monthlyIncomeExpense, summarizeCollections } from '@/lib/dairy/calc';
import { addDays, errorMessage, formatDate, inr, litres, timeAgo, todayIST } from '@/lib/dairy/format';
import { useMe } from '@/lib/dairy/session';
import { downloadFarmerStatement } from '@/lib/dairy/statements';
import { useLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/_authenticated/farmer-portal')({
  head: () => ({
    meta: [
      { title: 'My Dairy — DairySetu Farmer Portal' },
      { name: 'description', content: 'Your milk collection, payments, animals and farm expenses.' },
    ],
  }),
  component: FarmerPortalPage,
});

function FarmerPortalPage() {
  const { data: me, isLoading, error } = useMe();
  if (isLoading) return <Spinner label="Loading your dairy…" />;
  if (error) return <div className="max-w-md mx-auto p-6"><ErrorNote message={errorMessage(error)} /></div>;
  if (!me?.farmer) return <Navigate to={me?.membership ? '/dashboard' : '/no-access'} replace />;
  return <Portal />;
}

function Portal() {
  const { lang, toggleLang, t } = useLanguage();
  const navigate = useNavigate();
  const invalidate = useInvalidateAll();
  const { data: me } = useMe();
  const farmer = me!.farmer!;
  const centreName = farmer.centre?.name ?? '';
  const today = todayIST();
  const [activeTab, setActiveTab] = useState<'overview' | 'milk' | 'animals' | 'money'>('overview');
  const [animalEdit, setAnimalEdit] = useState<AnimalRow | 'new' | null>(null);
  const [animalOpen, setAnimalOpen] = useState<string | null>(null);
  const [expenseEdit, setExpenseEdit] = useState<ExpenseRow | 'new' | null>(null);

  const { data: balance } = useFarmerBalance(farmer.id);
  const { data: milk = [], isLoading: loadingMilk } = useCollections({ farmerId: farmer.id, from: addDays(today, -180), limit: 1000 });
  const { data: payments = [] } = usePayments({ farmerId: farmer.id, limit: 100 });
  const { data: animals = [] } = useAnimals({ farmerId: farmer.id });
  const { data: expenses = [] } = useExpenses({ farmerId: farmer.id, from: addDays(today, -180) });
  const { data: ledger = [] } = useLedger(farmer.id);
  const { data: notifications = [] } = useNotifications(me?.userId);
  const { data: vaccinations = [] } = useUpcomingVaccinations(animals.map((a) => a.id), today, addDays(today, 60));

  const activeMilk = milk.filter((m) => m.status === 'active');
  const todays = summarizeCollections(activeMilk.filter((m) => m.collection_date === today));
  const monthKey = today.slice(0, 7);
  const thisMonth = summarizeCollections(activeMilk.filter((m) => m.collection_date.startsWith(monthKey)));
  const series = useMemo(
    () =>
      buildDailySeries(
        activeMilk.map((m) => ({ day: m.collection_date, shift: m.shift, milk_type: m.milk_type, litres: Number(m.quantity_litres), amount: Number(m.total_amount) })),
        addDays(today, -6),
        today,
      ),
    [activeMilk, today],
  );
  const months = monthlyIncomeExpense(milk, expenses).slice(-6);
  const monthIncome = months.find((m) => m.month === monthKey)?.income ?? 0;
  const monthExpense = months.find((m) => m.month === monthKey)?.expense ?? 0;
  const pending = Number(balance?.balance ?? 0);
  const unread = notifications.filter((n) => !n.is_read);
  const nextVaccByAnimal = new Map<string, string>();
  for (const v of vaccinations) if (!nextVaccByAnimal.has(v.animal_id)) nextVaccByAnimal.set(v.animal_id, v.scheduled_date);

  const removeExpense = async (id: string) => {
    if (!window.confirm('Delete this expense?')) return;
    const { error } = await supabase.from('farm_expenses').delete().eq('id', id);
    if (!error) invalidate();
  };
  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    invalidate();
  };

  return (
    <div className="min-h-screen bg-cream text-deep pb-20 sm:pb-10">
      <header className="sticky top-0 z-30 bg-milk border-b border-line no-print">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" aria-label="Back to DairySetu Home">
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={toggleLang} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-cream border border-line rounded-lg text-deep cursor-pointer">
              <Globe className="w-4 h-4 text-forest" />
              <span>{lang === 'en' ? 'हिंदी' : 'English'}</span>
            </button>
            {me?.membership && (
              <Link to="/dashboard" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-forest text-milk rounded-lg hover:bg-deep">
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang === 'hi' ? 'केंद्र डैशबोर्ड' : 'Centre View'}</span>
              </Link>
            )}
            <button
              type="button"
              onClick={async () => {
                const { error: signOutError } = await supabase.auth.signOut();
    window.__lovableEvents?.track?.(signOutError ? 'project.logout_failed' : 'project.logout_succeeded', { source: 'farmer_portal' });
                navigate({ to: '/login' });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-line rounded-lg text-deep hover:bg-cream cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('logout')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-5 space-y-5">
        <div className="bg-forest text-milk rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <StoredPhoto path={farmer.photo_path} fallbackSrc={ASSETS.farmerRamesh} alt={farmer.name} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-leaf shrink-0" fallbackTitle="" />
            <div className="min-w-0">
              <div className="text-xs text-beige">
                {lang === 'hi' ? 'नमस्ते किसान भाई' : 'Namaste'} · {farmer.farmer_code}
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold truncate">{lang === 'hi' ? farmer.name_hi || farmer.name : farmer.name}</h1>
              <div className="text-xs text-beige mt-0.5">
                {lang === 'hi' ? `गाँव ${farmer.village_hi || farmer.village}` : `Village ${farmer.village}`} · {centreName}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => downloadFarmerStatement({ centreName, farmer, ledger })}
            disabled={ledger.length === 0}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-milk/10 hover:bg-milk/20 border border-milk/30 rounded-lg cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" /> {lang === 'hi' ? 'विवरण PDF' : 'Statement PDF'}
          </button>
        </div>

        {unread.length > 0 && (
          <div className="bg-milk border border-line rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-deep">
              <Bell className="w-4 h-4 text-forest" /> {unread.length} new
            </div>
            {unread.slice(0, 3).map((n) => (
              <button key={n.id} type="button" onClick={() => markRead(n.id)} className="w-full text-left text-xs py-1.5 border-t border-cream cursor-pointer">
                <span className="font-semibold text-deep">{lang === 'hi' ? n.title_hi || n.title : n.title}</span>
                <span className="text-muted-foreground"> · {lang === 'hi' ? n.message_hi || n.message : n.message} · {timeAgo(n.created_at)}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-4 gap-1.5 p-1 bg-milk border border-line rounded-xl no-print">
          {[
            { id: 'overview', label: lang === 'hi' ? 'सारांश' : 'Summary' },
            { id: 'milk', label: lang === 'hi' ? 'मेरा दूध' : 'My Milk' },
            { id: 'animals', label: lang === 'hi' ? 'मेरे पशु' : 'Animals' },
            { id: 'money', label: lang === 'hi' ? 'कमाई/खर्च' : 'Income' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-2.5 px-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${activeTab === tab.id ? 'bg-forest text-milk' : 'text-deep hover:bg-cream'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-milk border border-line rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Droplets className="w-4 h-4 text-forest" />
                  <span>{t('todaysMilkQty')}</span>
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-deep mt-2 font-mono tabular-nums">{litres(todays.litres)}</div>
                <div className="text-xs text-forest font-medium mt-1 tabular-nums">
                  {inr(todays.amount)} {lang === 'hi' ? 'आज की आय' : "today's value"}
                </div>
              </div>
              <div className="bg-milk border border-line rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Wallet className="w-4 h-4 text-earth" />
                  <span>{pending < 0 ? (lang === 'hi' ? 'अग्रिम लिया' : 'Advance taken') : t('pendingPayments')}</span>
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-earth mt-2 font-mono tabular-nums">{inr(Math.abs(pending))}</div>
                <div className="text-xs text-muted-foreground mt-1">{pending < 0 ? 'Deducted from future milk payments' : lang === 'hi' ? 'केंद्र से मिलना बाकी' : 'Due from your centre'}</div>
              </div>
              <div className="bg-milk border border-line rounded-2xl p-4 sm:p-5">
                <div className="text-xs font-medium text-muted-foreground">{lang === 'hi' ? 'इस महीने का दूध' : 'This Month'}</div>
                <div className="font-display text-2xl font-bold text-deep mt-2 font-mono tabular-nums">{litres(thisMonth.litres)}</div>
                <div className="text-xs text-muted-foreground mt-1">{lang === 'hi' ? `कुल ${litres(Number(balance?.total_litres ?? 0))}` : `All-time ${litres(Number(balance?.total_litres ?? 0))}`}</div>
              </div>
              <div className="bg-milk border border-line rounded-2xl p-4 sm:p-5">
                <div className="text-xs font-medium text-muted-foreground">{t('totalEarnings')}</div>
                <div className="font-display text-2xl font-bold text-forest mt-2 font-mono tabular-nums">{inr(Number(balance?.total_earned ?? 0))}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {inr(Number(balance?.total_paid ?? 0))} {lang === 'hi' ? 'प्राप्त' : 'received'}
                </div>
              </div>
            </div>

            <div className="bg-milk border border-line rounded-2xl p-5">
              <h2 className="font-display text-base font-bold text-deep mb-1">{t('dailyProduction')}</h2>
              <p className="text-xs text-muted-foreground mb-4">{lang === 'hi' ? 'पिछले 7 दिनों का कुल दूध (लीटर)' : 'Last 7 days total milk poured (Litres)'}</p>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="total" name={t('litres')} fill={chartColors.forest} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-milk border border-line rounded-2xl p-5 space-y-4">
              <h2 className="font-display text-base font-bold text-deep">{t('monthlySummary')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-cream rounded-xl p-4">
                  <div className="text-xs text-muted-foreground">{lang === 'hi' ? 'इस माह दूध आय' : 'Milk income this month'}</div>
                  <div className="font-mono text-xl font-bold text-forest mt-1 tabular-nums">{inr(monthIncome)}</div>
                </div>
                <div className="bg-cream rounded-xl p-4">
                  <div className="text-xs text-muted-foreground">{lang === 'hi' ? 'इस माह खर्च' : 'Expenses this month'}</div>
                  <div className="font-mono text-xl font-bold text-earth mt-1 tabular-nums">{monthExpense > 0 ? '−' : ''}{inr(monthExpense)}</div>
                </div>
                <div className="bg-forest text-milk rounded-xl p-4">
                  <div className="text-xs text-beige">{t('netSavings')}</div>
                  <div className="font-mono text-xl font-bold mt-1 tabular-nums">{inr(estimatedNetIncome(monthIncome, monthExpense))}</div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Estimate based only on milk recorded at your centre and the expenses you entered.</p>
              {months.length > 0 && (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={months.map((m) => ({ ...m, label: formatDate(`${m.month}-01`).slice(3) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="income" name="Income" fill={chartColors.forest} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name="Expenses" fill={chartColors.earth} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}

        {(activeTab === 'milk' || activeTab === 'overview') && (
          <div className="bg-milk border border-line rounded-2xl p-5 space-y-3">
            <h2 className="font-display text-base font-bold text-deep">{t('myMilkCollection')}</h2>
            {loadingMilk && <p className="text-xs text-muted-foreground">Loading…</p>}
            {!loadingMilk && milk.length === 0 && <p className="text-xs text-muted-foreground">No milk recorded yet.</p>}
            <div className="divide-y divide-cream">
              {milk.slice(0, activeTab === 'overview' ? 5 : 200).map((m) => (
                <div key={m.id} className={`py-3 flex items-center justify-between gap-3 ${m.status !== 'active' ? 'opacity-50' : ''}`}>
                  <div>
                    <div className="text-sm font-semibold text-deep">
                      {formatDate(m.collection_date)} · {m.shift === 'Morning' ? t('morningShift') : t('eveningShift')} {m.status !== 'active' && '· cancelled'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {m.milk_type} · Fat {m.fat_percent}% · SNF {m.snf_percent}% · ₹{m.rate_per_litre}/L · {m.receipt_no}
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className="text-base font-bold text-deep">{m.quantity_litres} L</div>
                    <div className="text-xs font-semibold text-forest">{inr(m.total_amount, 0)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeTab === 'animals' || activeTab === 'overview') && (
          <div className="bg-milk border border-line rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-deep flex items-center gap-2">
                <Sprout className="w-4 h-4 text-forest" />
                <span>{t('myAnimals')}</span>
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{animals.filter((a) => a.status === 'Active' || a.status === 'Dry').length} animals</span>
                <button type="button" className={smallPrimaryBtn} onClick={() => setAnimalEdit('new')}>
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
            </div>
            {animals.length === 0 && <p className="text-xs text-muted-foreground">Add your cows and buffaloes to keep health and vaccination records.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {animals.map((a) => (
                <button key={a.id} type="button" onClick={() => setAnimalOpen(a.id)} className="text-left border border-beige rounded-xl overflow-hidden cursor-pointer hover:border-forest/50">
                  <div className="aspect-[16/10] bg-cream">
                    <StoredPhoto path={a.photo_path} fallbackSrc={animalFallback(a.animal_type)} alt={a.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-deep">{a.name}</span>
                      <span className={`text-xs font-semibold ${a.status === 'Active' ? healthColor(a.health_status) : 'text-muted-foreground'}`}>{a.status === 'Active' ? a.health_status : a.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.breed} · {ageLabel(a)} · <strong className="text-deep">{a.daily_yield_litres} L/day</strong>
                    </div>
                    <div className="pt-2 border-t border-cream text-xs text-muted-foreground flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-earth shrink-0" />
                      <span>
                        {lang === 'hi' ? 'अगला टीका:' : 'Next Vaccine:'} {nextVaccByAnimal.has(a.id) ? formatDate(nextVaccByAnimal.get(a.id)) : '—'}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {(activeTab === 'money' || activeTab === 'overview') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-milk border border-line rounded-2xl p-5 space-y-3">
              <h2 className="font-display text-base font-bold text-deep flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-forest" />
                <span>{t('paymentHistory')}</span>
              </h2>
              {payments.length === 0 && <p className="text-xs text-muted-foreground">No payments yet.</p>}
              <div className="divide-y divide-cream">
                {payments.slice(0, activeTab === 'overview' ? 5 : 100).map((p) => (
                  <div key={p.id} className={`py-3 flex items-center justify-between text-xs ${p.status === 'reversed' ? 'opacity-50' : ''}`}>
                    <div>
                      <div className="font-semibold text-deep">
                        {formatDate(p.payment_date)} · {p.method}
                      </div>
                      <div className="text-muted-foreground mt-0.5 capitalize">
                        {p.payment_type} · {p.txn_id} {p.status === 'reversed' ? '· reversed' : ''}
                      </div>
                    </div>
                    <div className="font-mono text-sm font-bold text-forest tabular-nums">{inr(p.amount)}</div>
                  </div>
                ))}
              </div>
              {activeTab === 'money' && (
                <button type="button" className={smallBtn} disabled={ledger.length === 0} onClick={() => downloadFarmerStatement({ centreName, farmer, ledger })}>
                  <Download className="w-3 h-3" /> Download full statement
                </button>
              )}
            </div>
            <div className="bg-milk border border-line rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-deep flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-earth" />
                  <span>{t('feedExpenses')}</span>
                </h2>
                <button type="button" className={smallPrimaryBtn} onClick={() => setExpenseEdit('new')}>
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {expenses.length === 0 && <p className="text-xs text-muted-foreground">Record feed, medicine and other costs to see your estimated income.</p>}
              <div className="divide-y divide-cream">
                {expenses.slice(0, activeTab === 'overview' ? 5 : 200).map((f) => (
                  <div key={f.id} className="py-3 flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-deep truncate">
                        {f.category}
                        {f.description ? ` · ${f.description}` : ''}
                      </div>
                      <div className="text-muted-foreground mt-0.5">{formatDate(f.expense_date)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-sm font-bold text-earth tabular-nums">{inr(f.amount)}</span>
                      <button type="button" className={smallBtn} onClick={() => setExpenseEdit(f)} aria-label="Edit expense">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button type="button" className={smallBtn} onClick={() => removeExpense(f.id)} aria-label="Delete expense">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {animalEdit && <AnimalFormModal animal={animalEdit === 'new' ? null : animalEdit} fixedFarmerId={farmer.id} centreId={farmer.centre_id} onClose={() => setAnimalEdit(null)} />}
      {animalOpen && (() => {
        const a = animals.find((x) => x.id === animalOpen);
        return a ? <AnimalDrawer animal={a} canEdit onClose={() => setAnimalOpen(null)} onEdit={() => setAnimalEdit(a)} /> : null;
      })()}
      {expenseEdit && <ExpenseModal scope={{ farmerId: farmer.id }} categories={FARMER_CATEGORIES} expense={expenseEdit === 'new' ? null : expenseEdit} onClose={() => setExpenseEdit(null)} />}
    </div>
  );
}
