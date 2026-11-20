import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Bell, CheckCheck, Megaphone, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDashboard } from '@/components/dairy/dashboard-context';
import { ErrorNote, Field, SuccessNote, inputClass, primaryBtn, smallBtn } from '@/components/dairy/ui';
import { useInvalidateAll, useNotifications } from '@/lib/dairy/api';
import { errorMessage, timeAgo } from '@/lib/dairy/format';
import { useLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/_authenticated/dashboard/notifications')({
  head: () => ({ meta: [{ title: 'Notifications — DairySetu' }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { lang, t } = useLanguage();
  const { me, centre, isOwner } = useDashboard();
  const invalidate = useInvalidateAll();
  const { data: notifications = [], isLoading } = useNotifications(me.userId);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    invalidate();
  };
  const markAll = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', me.userId).eq('is_read', false);
    invalidate();
  };
  const remove = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    invalidate();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-deep tracking-tight">{t('menuNotifications')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{lang === 'hi' ? 'टीकाकरण, भुगतान और स्टॉक अलर्ट' : 'Farmer registrations, payments, vaccinations, stock alerts and announcements'}</p>
        </div>
        <button type="button" onClick={markAll} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-forest bg-milk border border-line rounded-lg hover:bg-cream cursor-pointer">
          <CheckCheck className="w-4 h-4" />
          <span>{lang === 'hi' ? 'सभी पढ़ा चिह्नित करें' : 'Mark all read'}</span>
        </button>
      </div>

      {isOwner && <Announcement centreId={centre.id} />}

      <div className="bg-milk border border-line rounded-xl divide-y divide-cream">
        {isLoading && <p className="p-5 text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && notifications.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">You're all caught up. New alerts will appear here.</p>}
        {notifications.map((n) => (
          <div key={n.id} className={`p-5 flex items-start justify-between gap-4 transition-colors ${n.is_read ? 'bg-milk' : 'bg-cream/60'}`}>
            <button type="button" onClick={() => !n.is_read && markRead(n.id)} className="flex items-start gap-3 text-left cursor-pointer flex-1">
              <Bell className={`w-4 h-4 mt-1 shrink-0 ${n.is_read ? 'text-muted-foreground' : 'text-forest'}`} />
              <div>
                <div className="text-sm font-semibold text-deep">{lang === 'hi' ? n.title_hi || n.title : n.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{lang === 'hi' ? n.message_hi || n.message : n.message}</div>
                <div className="text-[11px] text-muted-foreground mt-2">
                  {n.category} · {timeAgo(n.created_at)}
                  {n.link && n.link.startsWith('/dashboard') && (
                    <>
                      {' · '}
                      <Link to={n.link} className="text-forest font-semibold hover:underline">
                        Open
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              {!n.is_read && <span className="text-xs font-semibold text-forest">New</span>}
              <button type="button" className={smallBtn} onClick={() => remove(n.id)} aria-label="Delete notification">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Notifications are shown inside DairySetu only. No SMS, WhatsApp or email is sent.</p>
    </div>
  );
}

function Announcement({ centreId }: { centreId: string }) {
  const invalidate = useInvalidateAll();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    const { data, error: err } = await supabase.rpc('send_centre_announcement', { _centre: centreId, _title: title, _message: message });
    setBusy(false);
    if (err) return setError(errorMessage(err));
    setDone(`Announcement delivered in-app to ${data} people (staff and farmers with a login).`);
    setTitle('');
    setMessage('');
    invalidate();
  };
  return (
    <form onSubmit={submit} className="bg-milk border border-line rounded-xl p-5 space-y-3">
      <h2 className="font-display text-base font-bold text-deep flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-forest" /> Centre announcement
      </h2>
      <Field label="Title" htmlFor="an-title">
        <input id="an-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Payout on 21 Nov at 10 AM" className={inputClass} />
      </Field>
      <Field label="Message" htmlFor="an-msg">
        <input id="an-msg" value={message} onChange={(e) => setMessage(e.target.value)} className={inputClass} />
      </Field>
      <ErrorNote message={error} />
      <SuccessNote message={done} />
      <button type="submit" disabled={busy} className={primaryBtn}>
        {busy ? 'Sending…' : 'Send to centre'}
      </button>
    </form>
  );
}
