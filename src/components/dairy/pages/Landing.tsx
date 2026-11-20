import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  BarChart3,
  Calculator,
  Check,
  Droplets,
  Globe,
  HeartPulse,
  Menu,
  Package,
  Receipt,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/dairy/BrandLogo';
import { SafeImage } from '@/components/dairy/SafeImage';
import { ASSETS } from '@/components/dairy/assets';
import { useLanguage } from '@/lib/i18n';

export function LandingPage() {
  const { lang, toggleLang, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      num: '01',
      title: lang === 'hi' ? 'दूध संकलन प्रबंधन' : 'Milk Collection Management',
      desc:
        lang === 'hi'
          ? 'सुबह और शाम की पाली में गाय व भैंस के दूध का सटीक वज़न, फैट और एसएनएफ तुरंत दर्ज करें।'
          : 'Record morning and evening shifts for cow and buffalo milk with instant Fat, SNF and litre weight capture.',
      icon: Droplets,
      route: '/dashboard/collection',
      span: 'lg:col-span-2',
    },
    {
      num: '02',
      title: lang === 'hi' ? 'किसान प्रबंधन' : 'Farmer Management',
      desc:
        lang === 'hi'
          ? 'हर किसान का डिजिटल प्रोफाइल, गाँव विवरण, दूध इतिहास और बकाया हिसाब एक जगह।'
          : 'Complete farmer directory with village records, mobile numbers, milk supply history and balance tracking.',
      icon: Users,
      route: '/dashboard/farmers',
      span: 'lg:col-span-1',
    },
    {
      num: '03',
      title: lang === 'hi' ? 'स्वचालित भुगतान गणना' : 'Automatic Payment Calculation',
      desc:
        lang === 'hi'
          ? 'फैट और एसएनएफ दर के आधार पर सही भुगतान, अग्रिम कटौती और 10-दिवसीय पासबुक।'
          : 'Auto-calculated Fat & SNF rates, advance deductions, and clear 10-day settlement statements.',
      icon: Calculator,
      route: '/dashboard/payments',
      span: 'lg:col-span-1',
    },
    {
      num: '04',
      title: lang === 'hi' ? 'पशु प्रबंधन व स्वास्थ्य' : 'Animal Management',
      desc:
        lang === 'hi'
          ? 'गिर गाय और मुर्रा भैंस के टीकाकरण, प्रजनन, आहार और दैनिक दूध उत्पादन का पूरा रिकॉर्ड।'
          : 'Track Gir cows and Murrah buffaloes with vaccination schedules, breeding history, feeding and daily yields.',
      icon: HeartPulse,
      route: '/dashboard/animals',
      span: 'lg:col-span-2',
    },
    {
      num: '05',
      title: lang === 'hi' ? 'दूध बिक्री व स्टॉक' : 'Milk Sales & Inventory',
      desc:
        lang === 'hi'
          ? 'गाय और भैंस के दूध का अलग-अलग स्टॉक, चिलिंग प्लांट डिस्पैच और ग्राहक बिक्री।'
          : 'Separate Cow and Buffalo milk stock ledgers, chilling plant dispatches, retail booths and wastage logs.',
      icon: Package,
      route: '/dashboard/inventory',
      span: 'lg:col-span-1',
    },
    {
      num: '06',
      title: lang === 'hi' ? 'डेयरी खर्च हिसाब' : 'Dairy Expenses',
      desc:
        lang === 'hi'
          ? 'हरा चारा, पशु आहार, बिजली, परिवहन और दवाइयों के खर्च पर पूरा नियंत्रण।'
          : 'Monitor fodder, cattle feed, veterinary care, chilling plant electricity and transport costs effortlessly.',
      icon: Receipt,
      route: '/dashboard/expenses',
      span: 'lg:col-span-1',
    },
    {
      num: '07',
      title: lang === 'hi' ? 'रिपोर्ट्स और विश्लेषण' : 'Reports & Analytics',
      desc:
        lang === 'hi'
          ? 'मासिक लाभ-हानि, गाँव-वार संकलन और गुणवत्ता रुझान सरल चार्ट में देखें।'
          : 'Clear monthly revenue, collection trends, cow-to-buffalo mix and exportable CSV summaries.',
      icon: BarChart3,
      route: '/dashboard/reports',
      span: 'lg:col-span-1',
    },
    {
      num: '08',
      title: lang === 'hi' ? 'किसान मोबाइल पोर्टल' : 'Farmer Mobile Portal',
      desc:
        lang === 'hi'
          ? 'किसानों के लिए सरल मोबाइल स्क्रीन — आज का दूध, कमाई, पशु स्वास्थ्य और चारा खर्च हिंदी में।'
          : 'Simple mobile-friendly portal for farmers to check daily milk poured, pending payouts and herd income.',
      icon: Smartphone,
      route: '/farmer-portal',
      span: 'lg:col-span-1',
    },
  ];

  const whyPoints = [
    {
      title: lang === 'hi' ? 'आसान दैनिक दूध रिकॉर्ड' : 'Easy daily milk records',
      detail:
        lang === 'hi'
          ? 'सुबह-शाम के संकलन में प्रति प्रविष्टि 10 सेकंड से भी कम समय लगता है।'
          : 'Enter morning and evening shifts in under 10 seconds per farmer with automatic rate lookup.',
    },
    {
      title: lang === 'hi' ? 'पारदर्शी किसान भुगतान' : 'Transparent farmer payments',
      detail:
        lang === 'hi'
          ? 'हर लीटर, फैट% और अग्रिम कटौती का स्पष्ट हिसाब — कोई भ्रम नहीं।'
          : 'Every litre, Fat%, SNF% and advance deduction is visible to both operator and farmer.',
    },
    {
      title: lang === 'hi' ? 'बेहतर डेयरी और पशु प्रबंधन' : 'Better dairy management',
      detail:
        lang === 'hi'
          ? 'दूध उत्पादन, पशु टीकाकरण और बिक्री स्टॉक एक ही छत के नीचे।'
          : 'Unite milk chilling stock, value-added paneer/ghee batches, expenses and livestock health.',
    },
    {
      title: lang === 'hi' ? 'स्थायी डिजिटल रजिस्टर' : 'Digital records',
      detail:
        lang === 'hi'
          ? 'कागज़ी बही-खातों के खोने या हिसाब में गलती होने का डर समाप्त।'
          : 'Replace fragile paper registers with clean, searchable digital logs and instant payment statements.',
    },
    {
      title: lang === 'hi' ? 'सरल हिंदी-अनुकूल इंटरफ़ेस' : 'Simple Hindi-friendly interface',
      detail:
        lang === 'hi'
          ? 'एक क्लिक में अंग्रेज़ी और हिंदी भाषा के बीच स्विच करें।'
          : 'Switch seamlessly between English and Hindi (हिंदी) across every screen for rural ease.',
    },
  ];

  return (
    <div className="min-h-screen bg-cream text-deep flex flex-col">
      {/* Top Navigation — Clean 3-zone contract */}
      <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur-sm border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark */}
          <Link to="/" aria-label="DairySetu Home" className="shrink-0">
            <BrandLogo />
          </Link>

          {/* Zone 2: 5 concise nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-deep/80">
            <a href="#home" className="hover:text-forest transition-colors whitespace-nowrap shrink-0">
              {t('navHome')}
            </a>
            <a href="#features" className="hover:text-forest transition-colors whitespace-nowrap shrink-0">
              {t('navFeatures')}
            </a>
            <a href="#centres" className="hover:text-forest transition-colors whitespace-nowrap shrink-0">
              {t('navCentres')}
            </a>
            <a href="#farmers" className="hover:text-forest transition-colors whitespace-nowrap shrink-0">
              {t('navFarmers')}
            </a>
            <a href="#about" className="hover:text-forest transition-colors whitespace-nowrap shrink-0">
              {t('navAbout')}
            </a>
          </nav>

          {/* Zone 3: Login & Primary CTA */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-deep hover:text-forest transition-colors whitespace-nowrap shrink-0 cursor-pointer">
              {t('login')}
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-semibold text-milk bg-forest hover:bg-deep rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {t('getStarted')}
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-lg text-deep hover:bg-beige transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-line bg-milk px-4 py-4 space-y-3">
            <nav className="flex flex-col gap-2 text-sm font-medium">
              <a href="#home" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 rounded hover:bg-cream">
                {t('navHome')}
              </a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 rounded hover:bg-cream">
                {t('navFeatures')}
              </a>
              <a href="#centres" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 rounded hover:bg-cream">
                {t('navCentres')}
              </a>
              <a href="#farmers" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 rounded hover:bg-cream">
                {t('navFarmers')}
              </a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 rounded hover:bg-cream">
                {t('navAbout')}
              </a>
            </nav>
            <div className="pt-2 border-t border-line flex items-center gap-3">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 py-2.5 px-4 text-sm font-medium border border-forest text-forest rounded-lg text-center">
                {t('login')}
              </Link>
              <Link
                to="/register"
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-center text-milk bg-forest rounded-lg"
              >
                {t('getStarted')}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden bg-deep">
        <div className="relative min-h-[560px] lg:min-h-[620px] flex items-center">
          {/* Background realistic Indian dairy photography */}
          <SafeImage
            src={ASSETS.heroDairy}
            alt="Indian dairy farmer standing with Gir cows and Murrah buffaloes in morning village pasture"
            className="absolute inset-0 w-full h-full object-cover object-center"
            fallbackTitle="Rural Indian Dairy Heritage"
          />
          {/* Measured editorial scrim for high text legibility */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-deep/92 via-deep/75 to-deep/25"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 w-full">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-medium text-beige mb-5">
                <span>{t('tagline')}</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={toggleLang}
                  className="inline-flex items-center gap-1.5 text-milk hover:text-leaf underline underline-offset-4 cursor-pointer transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'हिंदी में देखें' : 'View in English'}</span>
                </button>
              </div>

              <h1
                className="font-display font-bold text-milk tracking-tight text-balance leading-[1.12]"
                style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.85rem)' }}
              >
                {t('heroHeading')}
              </h1>

              <p className="mt-5 text-base sm:text-lg text-cream/90 leading-relaxed max-w-xl">
                {t('heroSubtitle')}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-deep bg-cream hover:bg-milk rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{t('explorePlatform')}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-milk bg-forest hover:bg-leaf hover:text-deep border border-leaf/40 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{t('getStarted')}</span>
                </Link>
                <Link
                  to="/farmer-portal"
                  className="inline-flex items-center gap-1.5 px-3 py-3 text-sm font-medium text-beige hover:text-milk underline underline-offset-4 whitespace-nowrap shrink-0"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{t('openFarmerPortal')}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Column Proof Strip directly below Hero */}
        <div className="bg-milk border-b border-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-beige">
            <div className="pt-2 lg:pt-0 lg:pr-6">
              <div className="font-display text-2xl sm:text-3xl font-bold text-forest tabular-nums">
                540+
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                {lang === 'hi' ? 'गाँव दुग्ध समितियाँ जुड़ी' : 'Village Dairy Centres Connected'}
              </div>
            </div>
            <div className="pt-2 lg:pt-0 lg:px-6">
              <div className="font-display text-2xl sm:text-3xl font-bold text-forest tabular-nums">
                18,400+
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                {lang === 'hi' ? 'पंजीकृत पशुपालक किसान' : 'Active Dairy Farmers Onboarded'}
              </div>
            </div>
            <div className="pt-2 lg:pt-0 lg:px-6">
              <div className="font-display text-2xl sm:text-3xl font-bold text-forest tabular-nums">
                1,24,000 L
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                {lang === 'hi' ? 'दैनिक दूध संकलन व जांच' : 'Daily Milk Collected & Tested'}
              </div>
            </div>
            <div className="pt-2 lg:pt-0 lg:pl-6">
              <div className="font-display text-2xl sm:text-3xl font-bold text-forest tabular-nums">
                10-Day
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                {lang === 'hi' ? 'पारदर्शी किसान भुगतान चक्र' : 'Transparent Settlement Cycle'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section — Asymmetric 8-module grid */}
      <section id="features" className="py-16 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl mb-12">
          <p className="text-xs font-semibold tracking-wider text-earth mb-2">
            {lang === 'hi' ? 'सम्पूर्ण डेयरी प्रणाली' : 'Complete Dairy Operations Suite'}
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-deep tracking-tight text-balance">
            {lang === 'hi'
              ? 'दूध संग्रह से लेकर किसान भुगतान तक, हर काम आसान।'
              : 'Everything a village collection centre and dairy farm needs.'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <Link
                key={feat.num}
                to={feat.route}
                className={`group bg-milk border border-line hover:border-forest/50 rounded-xl p-6 transition-all duration-150 hover:-translate-y-0.5 flex flex-col justify-between ${feat.span}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-cream border border-beige flex items-center justify-center text-forest group-hover:bg-forest group-hover:text-milk transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">{feat.num}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-deep group-hover:text-forest transition-colors">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                </div>
                <div className="mt-5 pt-4 border-t border-cream flex items-center justify-between text-xs font-semibold text-forest">
                  <span>{lang === 'hi' ? 'मॉड्यूल खोलें' : 'Open Module'}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Village Dairy Section — For Dairy Centres */}
      <section id="centres" className="py-16 lg:py-24 bg-beige/55 border-y border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-earth mb-2">
                  {lang === 'hi' ? 'गाँव दुग्ध केंद्रों के लिए' : 'For Village Milk Collection Centres'}
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-deep tracking-tight text-balance">
                  {lang === 'hi'
                    ? 'कागज़ी रजिस्टर से डिजिटल दुग्ध समिति तक का सफर'
                    : 'From paper registers to a calm, digital milk collection desk.'}
                </h2>
                <p className="mt-4 text-base text-deep/80 leading-relaxed">
                  {lang === 'hi'
                    ? 'सुबह 6 बजे किसानों की कतार के बीच भी डेटा एंट्री तेज़ और सटीक रहती है। फैट और एसएनएफ दर्ज करते ही दर व राशि अपने आप बनती है।'
                    : 'Built for busy 6 AM and 6 PM shifts. Search any farmer by ID or name, pick Cow or Buffalo milk, enter Fat and SNF, and let DairySetu calculate the exact payout instantly.'}
                </p>

                <div className="mt-7 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-forest text-milk flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-deep">
                        {lang === 'hi' ? 'गाय और भैंस की अलग दर तालिका' : 'Separate Cow & Buffalo Rate Formulas'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {lang === 'hi'
                          ? 'फैट % और एसएनएफ % के अनुसार सटीक प्रति लीटर दर।'
                          : 'Automatic Fat% and SNF% formula calculation with manual rate override when needed.'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-forest text-milk flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-deep">
                        {lang === 'hi' ? 'सीधा चिलिंग प्लांट व स्थानीय बिक्री हिसाब' : 'Bulk Chilling Tank & Local Sales Tracking'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {lang === 'hi'
                          ? 'बचे हुए दूध से पनीर, घी व दही उत्पादन का रिकॉर्ड।'
                          : 'Track how much milk went to chilling plants, local sweet shops, or in-house paneer & ghee batches.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/dashboard/collection"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-milk bg-forest hover:bg-deep rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>{lang === 'hi' ? 'दूध संकलन डेस्क खोलें' : 'Try Milk Collection Desk'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[340px] rounded-xl overflow-hidden border border-line bg-milk">
                <SafeImage
                  src={ASSETS.collectionCentre}
                  alt="Indian village milk collection centre with farmers and stainless steel milk cans"
                  className="w-full h-full object-cover"
                  fallbackTitle="Village Milk Collection Centre"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why DairySetu & For Farmers Section */}
      <section id="farmers" className="py-16 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left: Why DairySetu 5 pillars */}
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold text-earth mb-2">
              {lang === 'hi' ? 'किसानों व केंद्रों का भरोसा' : 'Why DairySetu'}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-deep tracking-tight text-balance">
              {lang === 'hi'
                ? 'ग्रामीण भारत के लिए सरल, भरोसेमंद और पारदर्शी तकनीक।'
                : 'Built around rural clarity, transparent payouts and Hindi-first comfort.'}
            </h2>

            <div className="mt-8 divide-y divide-line border-t border-b border-line">
              {whyPoints.map((item, idx) => (
                <div key={item.title} className="py-4 flex items-start gap-4">
                  <span className="font-mono text-xs font-semibold text-forest pt-1 tabular-nums">
                    0{idx + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-deep">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Farmer Portal Showcase + Real Farmer Proof */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-milk border border-line rounded-xl p-6">
              <div className="flex items-center gap-4 pb-5 border-b border-cream">
                <SafeImage
                  src={ASSETS.farmerRamesh}
                  alt="Rameshbhai Patel, Dairy Farmer in Gopalpur"
                  className="w-16 h-16 rounded-full object-cover border border-beige shrink-0"
                  fallbackTitle="RP"
                />
                <div>
                  <div className="font-display font-bold text-base text-deep">
                    {lang === 'hi' ? 'रमेशभाई पटेल' : 'Rameshbhai Patel'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {lang === 'hi' ? 'गोपालपुर दुग्ध समिति · किसान #DS-F101' : 'Gopalpur Milk Society · Farmer #DS-F101'}
                  </div>
                </div>
              </div>

              <blockquote className="mt-4 text-sm text-deep/90 leading-relaxed italic">
                {lang === 'hi'
                  ? '“पहले पर्ची खो जाती थी तो हिसाब मिलाने में दिक्कत होती थी। अब मोबाइल पर ही सुबह-शाम का दूध, फैट दर और बकाया पैसा साफ़ दिखता है।”'
                  : '“Earlier we worried about losing paper milk slips before the 10-day payout. With DairySetu, I see every morning and evening litre, Fat rate and my cattle feed expenses right on my phone.”'}
              </blockquote>

              <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-cream">
                <div className="bg-cream rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">{t('todaysMilkQty')}</div>
                  <div className="font-display text-xl font-bold text-forest mt-0.5 tabular-nums">
                    47.5 L
                  </div>
                </div>
                <div className="bg-cream rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">{t('pendingPayments')}</div>
                  <div className="font-display text-xl font-bold text-earth mt-0.5 tabular-nums">
                    ₹14,850
                  </div>
                </div>
              </div>

              <Link
                to="/farmer-portal"
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-milk bg-forest hover:bg-deep rounded-lg transition-colors"
              >
                <Smartphone className="w-4 h-4" />
                <span>{lang === 'hi' ? 'किसान मोबाइल पोर्टल खोलें' : 'Open Individual Farmer Portal'}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About & CTA Band */}
      <section id="about" className="bg-forest text-milk py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-balance">
              {lang === 'hi'
                ? 'क्या आप अपने गाँव की डेयरी को डिजिटल बनाना चाहते हैं?'
                : 'Ready to bring clarity to your village dairy centre?'}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-beige">
              {lang === 'hi'
                ? 'अपना डेयरी केंद्र पंजीकृत करें या किसान पोर्टल खोलें।'
                : 'Explore the full Dairy Centre Operations Dashboard or switch to the mobile-first Farmer Portal.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/dashboard"
              className="px-5 py-3 text-sm font-semibold bg-cream text-deep hover:bg-milk rounded-lg transition-colors whitespace-nowrap"
            >
              {lang === 'hi' ? 'केंद्र डैशबोर्ड खोलें' : 'Open Dairy Dashboard'}
            </Link>
            <Link
              to="/farmer-portal"
              className="px-5 py-3 text-sm font-semibold border border-milk/40 text-milk hover:bg-milk/10 rounded-lg transition-colors whitespace-nowrap"
            >
              {lang === 'hi' ? 'किसान पोर्टल' : 'Farmer Portal'}
            </Link>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="bg-milk border-t border-line py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-beige">
            <div className="md:col-span-2">
              <BrandLogo />
              <p className="mt-3 text-sm text-muted-foreground max-w-sm leading-relaxed">
                {t('tagline')}
              </p>
              <button
                type="button"
                onClick={toggleLang}
                className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-line rounded-lg text-deep hover:bg-cream cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-forest" />
                <span>{lang === 'en' ? 'Language: English / हिंदी' : 'भाषा: हिंदी / English'}</span>
              </button>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-deep mb-3">
                {lang === 'hi' ? 'प्लेटफ़ॉर्म' : 'Platform'}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/dashboard" className="hover:text-forest">
                    {t('menuOverview')}
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/collection" className="hover:text-forest">
                    {t('menuCollection')}
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/farmers" className="hover:text-forest">
                    {t('menuFarmers')}
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/payments" className="hover:text-forest">
                    {t('menuPayments')}
                  </Link>
                </li>
                <li>
                  <Link to="/farmer-portal" className="hover:text-forest">
                    {t('openFarmerPortal')}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-deep mb-3">
                {lang === 'hi' ? 'संपर्क' : 'Contact'}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>namaste@dairysetu.in</li>
                <li className="tabular-nums">+91 79 2640 8120</li>
                <li>Anand Dairy Corridor, Gujarat</li>
                <li>Jaipur Gramin Hub, Rajasthan</li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>© 2026 DairySetu. {lang === 'hi' ? 'सर्वाधिकार सुरक्षित।' : 'All rights reserved.'}</span>
            <span>
              {lang === 'hi'
                ? 'ग्रामीण दुग्ध सहकारी समितियों और पशुपालकों के लिए निर्मित'
                : 'Built for Indian Milk Collection Centres & Dairy Farmers'}
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
