import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarClock, Droplets, IndianRupee, Package, ShoppingBag, Sun, Sunset, Users, Wallet } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDashboard } from '@/components/dairy/dashboard-context';
import { Segmented, chartColors, tooltipStyle } from '@/components/dairy/ui';
import { currentChart, useAnimals, useCollections, useDailySummary, useFarmers, useInventory, usePayments, useRateCharts, useSales, useUpcomingVaccinations } from '@/lib/dairy/api';
import { buildDailySeries, summarizeCollections } from '@/lib/dairy/calc';
import { addDays, formatDate, formatTime, inr, litres } from '@/lib/dairy/format';
import { useLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/_authenticated/dashboard/')({
  head: () => ({ meta: [{ title: 'Overview — DairySetu Dashboard' }] }),
  component: DashboardOverview,
});

function DashboardOverview() {
  const { lang, t } = useLanguage();
  const { centre, isOwner, selectedDate } = useDashboard();
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const from = addDays(selectedDate, range === '7d' ? -6 : -29);

  const { data: farmers = [] } = useFarmers(centre.id, isOwner);
  const { data: todays = [], isLoading: loadingToday } = useCollections({ centreId: centre.id, from: selectedDate, to: selectedDate });
  const { data: summary = [] } = useDailySummary(centre.id, from, selectedDate);
  const { data: sales = [] } = useSales(isOwner ? centre.id : undefined, selectedDate, selectedDate);
  const { data: inventory } = useInventory(isOwner ? centre.id : undefined);
  const { data: payments = [] } = usePayments({ centreId: isOwner ? centre.id : undefined, limit: 5 });
  const { data: animals = [] } = useAnimals({ centreId: centre.id });
  const { data: charts } = useRateCharts(centre.id);
  const { data: vaccinations = [] } = useUpcomingVaccinations(animals.map((a) => a.id), selectedDate, addDays(selectedDate, 14));

  const totals = summarizeCollections(todays);
  const morningRows = summarizeCollections(todays.filter((e) => e.shift === 'Morning'));
  const eveningRows = summarizeCollections(todays.filter((e) => e.shift === 'Evening'));
  const series = useMemo(() => buildDailySeries((summary ?? []) as never, from, selectedDate), [summary, from, selectedDate]);
  const dueFarmers = farmers.filter((f) => f.balance > 0).sort((a, b) => b.balance - a.balance);
  const pendingTotal = dueFarmers.reduce((s, f) => s + f.balance, 0);
  const salesAmount = sales.reduce((s, x) => s + Number(x.total_amount), 0);
  const salesLitres = sales.reduce((s, x) => s + Number(x.quantity_litres), 0);
  const missingRates = (['Cow', 'Buffalo'] as const).filter((m) => !currentChart(charts, m, selectedDate));
  const animalById = new Map(animals.map((a) => [a.id, a]));
  const isToday = selectedDate === new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const dayLabel = isToday ? (lang === 'hi' ? 'आज' : 'Today') : formatDate(selectedDate);

  const kpis = [
    {
      label: t('totalFarmers'),
      value: String(farmers.length),
      sub: `${farmers.filter((f) => f.status === 'Active').length} ${lang === 'hi' ? 'सक्रिय' : 'active in register'}`,
      icon: Users,
      to: '/dashboard/farmers' as const,
    },
    {
      label: `${dayLabel} · ${lang === 'hi' ? 'दूध संकलन' : 'Milk Collection'}`,
      value: litres(totals.litres),
      sub: `${lang === 'hi' ? 'गाय' : 'Cow'} ${litres(totals.cow)} · ${lang === 'hi' ? 'भैंस' : 'Buffalo'} ${litres(totals.buffalo)}`,
      icon: Droplets,
      to: '/dashboard/collection' as const,
    },
    {
      label: t('morningCollection'),
      value: litres(morningRows.litres),
      sub: morningRows.count ? `Avg Fat ${morningRows.avgFat}% · SNF ${morningRows.avgSnf}%` : lang === 'hi' ? 'कोई प्रविष्टि नहीं' : 'No entries yet',
      icon: Sun,
      to: '/dashboard/collection' as const,
    },
    {
      label: t('eveningCollection'),
      value: litres(eveningRows.litres),
      sub: eveningRows.count ? `Avg Fat ${eveningRows.avgFat}% · SNF ${eveningRows.avgSnf}%` : lang === 'hi' ? 'कोई प्रविष्टि नहीं' : 'No entries yet',
      icon: Sunset,
      to: '/dashboard/collection' as const,
    },
    ...(isOwner
      ? [
          {
            label: `${dayLabel} · ${lang === 'hi' ? 'देय राशि' : 'Payable'}`,
            value: inr(totals.amount),
            sub: `${totals.count} ${lang === 'hi' ? 'प्रविष्टियाँ' : 'entries'}`,
            icon: Wallet,
            to: '/dashboard/payments' as const,
          },
          {
            label: t('pendingPayments'),
            value: inr(pendingTotal),
            sub: `${dueFarmers.length} ${lang === 'hi' ? 'किसान बकाया' : 'farmers due'}`,
            icon: IndianRupee,
            to: '/dashboard/payments' as const,
          },
          {
            label: `${dayLabel} · ${lang === 'hi' ? 'दूध बिक्री' : 'Milk Sales'}`,
            value: inr(salesAmount),
            sub: `${litres(salesLitres)} ${lang === 'hi' ? 'बेचा गया' : 'dispatched'}`,
            icon: ShoppingBag,
            to: '/dashboard/sales' as const,
          },
          {
            label: lang === 'hi' ? 'वर्तमान स्टॉक' : 'Current Inventory',
            value: litres(inventory?.stock.total ?? 0),
            sub: `Cow ${litres(inventory?.stock.cow ?? 0)} · Buffalo ${litres(inventory?.stock.buffalo ?? 0)}`,
            icon: Package,
            to: '/dashboard/inventory' as const,
          },
        ]
      : [
          {
            label: lang === 'hi' ? 'कुल प्रविष्टियाँ' : 'Entries Recorded',
            value: String(totals.count),
            sub: `${new Set(todays.filter((e) => e.status === 'active').map((e) => e.farmer_id)).size} ${lang === 'hi' ? 'किसान' : 'farmers poured'}`,
            icon: Droplets,
            to: '/dashboard/collection' as const,
          },
        ]),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-deep tracking-tight">{t('menuOverview')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {centre.name} · {formatDate(selectedDate)} · {lang === 'hi' ? 'दैनिक संचालन सारांश' : 'Daily dairy operations summary'}
          </p>
        </div>
        <Link to="/dashboard/collection" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-milk bg-forest hover:bg-deep rounded-lg transition-colors whitespace-nowrap shrink-0">
          <Droplets className="w-4 h-4" />
          <span>{t('addEntry')}</span>
        </Link>
      </div>

      {missingRates.length > 0 && (
        <div className="flex items-start gap-3 bg-earth/10 border border-earth/30 rounded-xl p-4 text-sm">
          <AlertTriangle className="w-5 h-5 text-earth shrink-0" />
          <div>
            <div className="font-semibold text-deep">
              {lang === 'hi' ? 'दूध दर निर्धारित नहीं है' : `No ${missingRates.join(' & ')} milk rate set for ${formatDate(selectedDate)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isOwner ? (
                <>
                  Collections for this milk type can't be saved until you set a rate.{' '}
                  <Link to="/dashboard/settings" search={{ tab: 'rates' }} className="font-semibold text-forest hover:underline">
                    Set milk rates
                  </Link>
                </>
              ) : (
                'Ask the centre owner to set milk rates before recording collections.'
              )}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} to={item.to} className="bg-milk border border-line hover:border-forest/50 rounded-xl p-5 transition-colors flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                <div className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center text-forest shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-display text-2xl font-bold text-deep tabular-nums">{loadingToday ? '…' : item.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{item.sub}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-milk border border-line rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-deep">
                {range === '7d' ? t('collectionTrend') : lang === 'hi' ? '30 दिन का दूध संकलन' : '30-Day Milk Collection'}
              </h2>
              <p className="text-xs text-muted-foreground">{lang === 'hi' ? 'सुबह बनाम शाम संकलन (लीटर)' : 'Morning vs Evening collection in Litres'}</p>
            </div>
            <Segmented value={range} options={['7d', '30d'] as const} onChange={setRange} labels={{ '7d': '7 days', '30d': '30 days' }} />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: chartColors.axis }} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis tick={{ fontSize: 12, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="morning" name={t('morningShift')} stroke={chartColors.forest} strokeWidth={2} fill={chartColors.forest} fillOpacity={0.14} />
                <Area type="monotone" dataKey="evening" name={t('eveningShift')} stroke={chartColors.leaf} strokeWidth={2} fill={chartColors.leaf} fillOpacity={0.22} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="lg:col-span-5 bg-milk border border-line rounded-xl p-5">
          <div className="mb-4">
            <h2 className="font-display text-base font-bold text-deep">{t('cowVsBuffalo')}</h2>
            <p className="text-xs text-muted-foreground">{lang === 'hi' ? 'गाय और भैंस दूध का दैनिक अनुपात' : 'Daily Litres by milk source'}</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series.slice(-7)} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cow" name={lang === 'hi' ? 'गाय' : 'Cow'} fill={chartColors.earth} radius={[4, 4, 0, 0]} />
                <Bar dataKey="buffalo" name={lang === 'hi' ? 'भैंस' : 'Buffalo'} fill={chartColors.forest} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-milk border border-line rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-bold text-deep">{t('recentCollections')}</h2>
            <Link to="/dashboard/collection" className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline">
              <span>{lang === 'hi' ? 'सभी देखें' : 'View all'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-beige text-xs text-muted-foreground">
                  <th className="pb-2.5 font-medium">{lang === 'hi' ? 'किसान' : 'Farmer'}</th>
                  <th className="pb-2.5 font-medium">{lang === 'hi' ? 'दूध / पाली' : 'Type / Shift'}</th>
                  <th className="pb-2.5 font-medium text-right">{t('litres')}</th>
                  <th className="pb-2.5 font-medium text-right">Fat / SNF</th>
                  <th className="pb-2.5 font-medium text-right">{lang === 'hi' ? 'राशि' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream">
                {todays.filter((e) => e.status === 'active').slice(0, 6).map((entry) => (
                  <tr key={entry.id} className="hover:bg-cream/50 transition-colors">
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-deep">{lang === 'hi' ? entry.farmer?.name_hi || entry.farmer?.name : entry.farmer?.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {entry.farmer?.farmer_code} · {formatTime(entry.collected_at)}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-deep/80">
                      {entry.milk_type} · {entry.shift}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-medium text-deep">{Number(entry.quantity_litres).toFixed(1)} L</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-xs text-muted-foreground">
                      {Number(entry.fat_percent).toFixed(1)} / {Number(entry.snf_percent).toFixed(1)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-forest">{inr(entry.total_amount, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {todays.length === 0 && !loadingToday && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {lang === 'hi' ? 'इस दिन कोई संकलन दर्ज नहीं हुआ।' : `No milk collected on ${formatDate(selectedDate)} yet.`}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-5">
          {isOwner && (
            <div className="bg-milk border border-line rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-base font-bold text-deep">{t('pendingPayoutList')}</h2>
                <Link to="/dashboard/payments" className="text-xs font-semibold text-forest hover:underline">
                  {lang === 'hi' ? 'निपटान करें' : 'Settle'}
                </Link>
              </div>
              <div className="divide-y divide-cream">
                {dueFarmers.length === 0 && <p className="py-3 text-xs text-muted-foreground">{lang === 'hi' ? 'कोई बकाया नहीं।' : 'No pending payouts.'}</p>}
                {dueFarmers.slice(0, 4).map((f) => (
                  <div key={f.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-deep truncate">{lang === 'hi' ? f.name_hi || f.name : f.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.farmer_code} · {f.village}
                      </div>
                    </div>
                    <div className="font-mono text-sm font-bold text-earth tabular-nums shrink-0">{inr(f.balance)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-milk border border-line rounded-xl p-5">
            <h2 className="font-display text-base font-bold text-deep mb-3">{t('upcomingReminders')}</h2>
            <div className="space-y-3">
              {vaccinations.length === 0 && (
                <p className="text-xs text-muted-foreground">{lang === 'hi' ? 'अगले 14 दिनों में कोई टीकाकरण नहीं।' : 'No vaccinations scheduled in the next 14 days.'}</p>
              )}
              {vaccinations.slice(0, 4).map((v) => {
                const a = animalById.get(v.animal_id);
                return (
                  <div key={v.id} className="flex items-start gap-3 pb-3 border-b border-cream last:border-0 last:pb-0">
                    <CalendarClock className="w-4 h-4 text-forest mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-deep">
                        {v.vaccine_name} · {a?.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(v.scheduled_date)} · {a?.farmer?.name} {v.vet_name ? `· ${v.vet_name}` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {isOwner && (
              <div className="mt-4 pt-3 border-t border-beige">
                <div className="text-xs font-semibold text-muted-foreground mb-2">{lang === 'hi' ? 'हाल के लेन-देन' : 'Recent Transactions'}</div>
                <div className="space-y-1.5 text-xs text-deep/80">
                  {payments.length === 0 && <p className="text-muted-foreground">No payments recorded yet.</p>}
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {p.farmer?.name} · {p.method}
                        {p.status === 'reversed' ? ' (reversed)' : ''}
                      </span>
                      <span className="font-mono text-forest shrink-0">{inr(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
