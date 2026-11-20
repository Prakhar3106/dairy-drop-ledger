import { Link } from '@tanstack/react-router';
import { Globe } from 'lucide-react';
import type { ReactNode } from 'react';
import { BrandLogo } from './BrandLogo';
import { SafeImage } from './SafeImage';
import { ASSETS } from './assets';
import { useLanguage } from '@/lib/i18n';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string | undefined; children: ReactNode }) {
  const { lang, toggleLang } = useLanguage();
  return (
    <div className="min-h-screen bg-cream text-deep grid lg:grid-cols-2">
      <div className="relative hidden lg:block bg-deep">
        <SafeImage src={ASSETS.collectionCentre} alt="Village milk collection centre" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-deep/90 via-deep/50 to-deep/20" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 right-0 p-10 text-milk">
          <p className="font-display text-3xl font-bold leading-tight text-balance">
            {lang === 'hi' ? 'गाँव की डेयरी, अब डिजिटल।' : 'Gaon Ki Dairy, Ab Digital.'}
          </p>
          <p className="mt-2 text-sm text-beige max-w-md">
            {lang === 'hi'
              ? 'दूध संकलन, किसान भुगतान और पशु रिकॉर्ड — सब एक जगह।'
              : 'Milk collection, farmer payments and animal records — all in one place.'}
          </p>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="h-16 px-5 sm:px-8 flex items-center justify-between border-b border-line bg-milk">
          <Link to="/" aria-label="DairySetu home">
            <BrandLogo />
          </Link>
          <button
            type="button"
            onClick={toggleLang}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cream hover:bg-beige border border-line rounded-lg text-xs font-semibold text-deep cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-forest" />
            <span>{lang === 'en' ? 'हिंदी' : 'English'}</span>
          </button>
        </header>
        <main className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md">
            <h1 className="font-display text-2xl font-bold text-deep tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function safeRedirect(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value, 'http://x');
    const path = url.pathname + url.search;
    if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/login') || path.startsWith('/register')) return null;
    return path;
  } catch {
    return null;
  }
}
