import { createFileRoute, Link, Navigate, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Calendar,
  Droplets,
  Factory,
  Globe,
  Home,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BrandLogo } from '@/components/dairy/BrandLogo';
import { DashboardContext } from '@/components/dairy/dashboard-context';
import { ErrorNote, Spinner } from '@/components/dairy/ui';
import { useNotifications } from '@/lib/dairy/api';
import { errorMessage, initials, timeAgo, todayIST } from '@/lib/dairy/format';
import { homePathFor, useMe } from '@/lib/dairy/session';
import { useLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/_authenticated/dashboard')({
  head: () => ({
    meta: [
      { title: 'Dairy Centre Dashboard — DairySetu' },
      { name: 'description', content: 'Milk collection, farmers, payments and stock for your dairy centre.' },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { data: me, isLoading, error } = useMe();
  const [selectedDate, setSelectedDate] = useState(todayIST());
  const [globalSearch, setGlobalSearch] = useState('');

  if (isLoading) return <Spinner label="Loading your centre…" />;
  if (error) return <div className="max-w-md mx-auto p-6"><ErrorNote message={errorMessage(error)} /></div>;
  if (!me || !me.membership || me.membership.centre.status !== 'active') {
    // Farmers go to their portal, super admins to the admin console; suspended centres see the no-access page.
    const target = me?.membership ? (me.isSuperAdmin ? '/admin' : '/no-access') : homePathFor(me ?? null);
    return <Navigate to={target} replace />;
  }

  const membership = me.membership;
  return (
    <DashboardContext.Provider
      value={{
        me,
        centre: membership.centre,
        isOwner: membership.staff_role === 'owner',
        canEditCollections: membership.staff_role === 'owner' || membership.can_edit_collections,
        selectedDate,
        setSelectedDate: (d) => setSelectedDate(d > todayIST() ? todayIST() : d),
        globalSearch,
        setGlobalSearch,
      }}
    >
      <Shell selectedDate={selectedDate} setSelectedDate={setSelectedDate} globalSearch={globalSearch} setGlobalSearch={setGlobalSearch} />
    </DashboardContext.Provider>
  );
}

function Shell({
  selectedDate,
  setSelectedDate,
  globalSearch,
  setGlobalSearch,
}: {
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
}) {
  const { lang, toggleLang, t } = useLanguage();
  const { data: me } = useMe();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: notifications = [] } = useNotifications(me?.userId);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const membership = me?.membership;
  const isOwner = membership?.staff_role === 'owner';
  const centre = membership?.centre;

  const navItems = useMemo(() => {
    const all = [
      { to: '/dashboard', label: t('menuOverview'), icon: LayoutDashboard, end: true, owner: false },
      { to: '/dashboard/farmers', label: t('menuFarmers'), icon: Users, owner: false },
      { to: '/dashboard/collection', label: t('menuCollection'), icon: Droplets, owner: false },
      { to: '/dashboard/payments', label: t('menuPayments'), icon: IndianRupee, owner: true },
      { to: '/dashboard/sales', label: t('menuSales'), icon: ShoppingBag, owner: true },
      { to: '/dashboard/inventory', label: t('menuInventory'), icon: Package, owner: true },
      { to: '/dashboard/animals', label: t('menuAnimals'), icon: Sprout, owner: false },
      { to: '/dashboard/production', label: t('menuProduction'), icon: Factory, owner: true },
      { to: '/dashboard/expenses', label: t('menuExpenses'), icon: Receipt, owner: true },
      { to: '/dashboard/reports', label: t('menuReports'), icon: BarChart3, owner: true },
      { to: '/dashboard/notifications', label: t('menuNotifications'), icon: Bell, owner: false, badge: unreadCount },
      { to: '/dashboard/settings', label: t('menuSettings'), icon: Settings, owner: false },
    ] as const;
    return all.filter((i) => isOwner || !i.owner);
  }, [t, isOwner, unreadCount]);

  const isActive = (to: string, end?: boolean) => (end ? location.pathname === to : location.pathname.startsWith(to));
  const currentNav = navItems.find((i) => isActive(i.to, 'end' in i ? i.end : false));
  const displayName = me?.profile?.full_name || me?.email || '';

  const signOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    window.__lovableEvents?.track?.(signOutError ? 'project.logout_failed' : 'project.logout_succeeded', { source: 'dashboard' });
    navigate({ to: '/login' });
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-milk border-r border-line">
      <div className="h-16 px-5 flex items-center justify-between border-b border-beige">
        <Link to="/" onClick={() => setSidebarOpen(false)}>
          <BrandLogo />
        </Link>
        <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-cream">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="px-4 py-3 border-b border-beige bg-cream/60">
        <div className="text-xs font-semibold text-deep truncate">{centre?.name}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
          {lang === 'hi' ? 'केंद्र कोड' : 'Centre Code'}: {centre?.code}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" aria-label="Dashboard Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to, 'end' in item ? item.end : false);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                active ? 'bg-forest text-milk' : 'text-deep/80 hover:bg-cream hover:text-deep'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {'badge' in item && item.badge > 0 && <span className="font-mono text-xs tabular-nums opacity-85 ml-2">{item.badge}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-beige space-y-1.5">
        {me?.isSuperAdmin && (
          <Link to="/admin" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-forest bg-cream hover:bg-beige transition-colors">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">Super Admin</span>
          </Link>
        )}
        <Link to="/" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-deep hover:bg-cream transition-colors">
          <Home className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('backToHome')}</span>
        </Link>
        <button type="button" onClick={signOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-deep hover:bg-cream transition-colors cursor-pointer">
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream text-deep flex">
      <aside className="hidden lg:block w-[256px] shrink-0 sticky top-0 h-screen no-print">{SidebarContent}</aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-deep/40" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
          <aside className="relative z-10 w-[268px] max-w-[85vw] h-full">{SidebarContent}</aside>
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-milk border-b border-line px-4 sm:px-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="lg:hidden p-2 rounded-lg text-deep hover:bg-cream shrink-0">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block text-sm font-semibold text-deep truncate">{currentNav?.label || t('menuOverview')}</div>
            <div className="relative ml-0 sm:ml-4 flex-1 max-w-xs hidden md:block">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !location.pathname.startsWith('/dashboard/farmers')) navigate({ to: '/dashboard/farmers' });
                }}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-cream border border-line rounded-lg text-deep placeholder:text-muted-foreground focus:outline-none focus:border-forest"
              />
            </div>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <label className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-cream border border-line rounded-lg text-xs text-deep">
              <Calendar className="w-3.5 h-3.5 text-forest" />
              <input
                type="date"
                value={selectedDate}
                max={todayIST()}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                aria-label="Select date"
                className="bg-transparent text-xs font-medium tabular-nums focus:outline-none cursor-pointer"
              />
            </label>
            <button
              type="button"
              onClick={toggleLang}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cream hover:bg-beige border border-line rounded-lg text-xs font-semibold text-deep transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-forest" />
              <span>{lang === 'en' ? 'EN / हिंदी' : 'हिंदी / EN'}</span>
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Notifications"
                className="relative p-2 rounded-lg border border-line bg-milk hover:bg-cream text-deep transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 rounded-full bg-forest text-milk text-[10px] font-mono flex items-center justify-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-milk border border-line rounded-xl shadow-lg p-3 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-beige">
                    <span className="text-xs font-semibold text-deep">{t('menuNotifications')}</span>
                    <Link to="/dashboard/notifications" onClick={() => setNotifOpen(false)} className="text-xs font-medium text-forest hover:underline">
                      {lang === 'hi' ? 'सभी देखें' : 'View all'}
                    </Link>
                  </div>
                  <div className="divide-y divide-cream max-h-64 overflow-y-auto">
                    {notifications.length === 0 && <p className="py-4 text-xs text-muted-foreground text-center">No notifications yet.</p>}
                    {notifications.slice(0, 4).map((n) => (
                      <div key={n.id} className="py-2.5 text-xs">
                        <div className="font-semibold text-deep">{lang === 'hi' ? n.title_hi || n.title : n.title}</div>
                        <div className="text-muted-foreground mt-0.5 line-clamp-2">{lang === 'hi' ? n.message_hi || n.message : n.message}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Link to="/dashboard/settings" className="flex items-center gap-2.5 pl-2 border-l border-beige shrink-0">
              <div className="w-8 h-8 rounded-full bg-forest text-milk text-xs font-semibold flex items-center justify-center shrink-0">
                {initials(displayName || 'DS')}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-deep leading-tight max-w-[140px] truncate">{displayName}</div>
                <div className="text-[11px] text-muted-foreground leading-tight">{isOwner ? t('ownerRole') : t('operatorRole')}</div>
              </div>
            </Link>
          </div>
        </header>
        <div className="sm:hidden px-4 pt-3 no-print">
          <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-milk border border-line rounded-lg text-xs text-deep w-fit">
            <Calendar className="w-3.5 h-3.5 text-forest" />
            <input type="date" value={selectedDate} max={todayIST()} onChange={(e) => e.target.value && setSelectedDate(e.target.value)} aria-label="Select date" className="bg-transparent text-xs font-medium focus:outline-none" />
          </label>
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
