import { createFileRoute } from '@tanstack/react-router';
import { useDashboard } from '@/components/dairy/dashboard-context';
import { ExpensesPanel } from '@/components/dairy/expenses';
import { OwnerOnly } from '@/components/dairy/OwnerOnly';
import { useLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/_authenticated/dashboard/expenses')({
  head: () => ({ meta: [{ title: 'Centre Expenses — DairySetu' }] }),
  component: () => (
    <OwnerOnly>
      <ExpensesPage />
    </OwnerOnly>
  ),
});

function ExpensesPage() {
  const { lang, t } = useLanguage();
  const { centre } = useDashboard();
  return (
    <ExpensesPanel
      scope={{ centreId: centre.id }}
      title={t('menuExpenses')}
      subtitle={lang === 'hi' ? 'चारा, खली-चुरी, चिलिंग बिजली, पशु चिकित्सा व परिवहन खर्च' : 'Fodder, cattle feed, chilling power, veterinary & transport expense log'}
    />
  );
}
