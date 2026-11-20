import { createFileRoute } from '@tanstack/react-router';
import { OwnerOnly } from '@/components/dairy/OwnerOnly';
import { SalesInventoryPage } from '@/components/dairy/pages/SalesInventory';

export const Route = createFileRoute('/_authenticated/dashboard/inventory')({
  head: () => ({ meta: [{ title: 'Milk Inventory — DairySetu' }] }),
  component: () => (
    <OwnerOnly>
      <SalesInventoryPage mode="inventory" />
    </OwnerOnly>
  ),
});
