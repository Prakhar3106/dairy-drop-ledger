import { createFileRoute } from '@tanstack/react-router';
import { OwnerOnly } from '@/components/dairy/OwnerOnly';
import { SalesInventoryPage } from '@/components/dairy/pages/SalesInventory';

export const Route = createFileRoute('/_authenticated/dashboard/sales')({
  head: () => ({ meta: [{ title: 'Milk Sales — DairySetu' }] }),
  component: () => (
    <OwnerOnly>
      <SalesInventoryPage mode="sales" />
    </OwnerOnly>
  ),
});
