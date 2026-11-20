import { createFileRoute } from '@tanstack/react-router';
import { LandingPage } from '@/components/dairy/pages/Landing';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'DairySetu — Gaon Ki Dairy, Ab Digital | Milk Collection & Farmer Payments' },
      {
        name: 'description',
        content: 'Manage milk collection, Fat/SNF rates, farmer payments, animals, stock and reports for your village dairy centre — in English and Hindi.',
      },
      { property: 'og:title', content: 'DairySetu — Smart Dairy & Farmer Management System' },
      { property: 'og:description', content: 'Connecting farmers, milk collection and dairy management across rural India.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: LandingPage,
});
