import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'en' | 'hi';

interface Translations {
  [key: string]: {
    en: string;
    hi: string;
  };
}

const DICTIONARY: Translations = {
  // Brand & Top Navigation
  brandName: { en: 'DairySetu', hi: 'डेयरीसेतु' },
  tagline: {
    en: 'Connecting Farmers, Milk Collection & Dairy Management.',
    hi: 'किसानों, दूध संकलन और डेयरी प्रबंधन को जोड़ने वाला मंच।',
  },
  navHome: { en: 'Home', hi: 'होम' },
  navFeatures: { en: 'Features', hi: 'सुविधाएँ' },
  navCentres: { en: 'For Dairy Centres', hi: 'डेयरी केंद्रों के लिए' },
  navFarmers: { en: 'For Farmers', hi: 'किसानों के लिए' },
  navAbout: { en: 'About', hi: 'हमारे बारे में' },
  login: { en: 'Login', hi: 'लॉगिन' },
  getStarted: { en: 'Get Started', hi: 'शुरू करें' },

  // Hero
  heroHeading: { en: 'Gaon Ki Dairy, Ab Digital.', hi: 'गाँव की डेयरी, अब डिजिटल।' },
  heroSubtitle: {
    en: 'Manage milk collection, farmers, payments, animals and dairy operations — all from one simple platform.',
    hi: 'दूध संकलन, किसान हिसाब, भुगतान, पशु प्रबंधन और डेयरी संचालन — सब कुछ एक आसान मंच पर।',
  },
  explorePlatform: { en: 'Explore Platform', hi: 'प्लेटफ़ॉर्म देखें' },
  openFarmerPortal: { en: 'Farmer Mobile Portal', hi: 'किसान मोबाइल पोर्टल' },

  // Sidebar Navigation
  menuOverview: { en: 'Overview', hi: 'डैशबोर्ड' },
  menuFarmers: { en: 'Farmers', hi: 'किसान' },
  menuCollection: { en: 'Milk Collection', hi: 'दूध संकलन' },
  menuPayments: { en: 'Payments', hi: 'भुगतान' },
  menuSales: { en: 'Milk Sales', hi: 'दूध बिक्री' },
  menuInventory: { en: 'Inventory', hi: 'स्टॉक व इन्वेंट्री' },
  menuAnimals: { en: 'Animals', hi: 'पशु प्रबंधन' },
  menuProduction: { en: 'Production', hi: 'डेयरी उत्पाद' },
  menuExpenses: { en: 'Expenses', hi: 'खर्च हिसाब' },
  menuReports: { en: 'Reports', hi: 'रिपोर्ट्स' },
  menuNotifications: { en: 'Notifications', hi: 'सूचनाएँ' },
  menuSettings: { en: 'Settings', hi: 'सेटिंग्स' },
  farmerPortalLink: { en: 'Farmer Portal View', hi: 'किसान पोर्टल देखें' },
  backToHome: { en: 'Back to Website', hi: 'वेबसाइट पर जाएँ' },

  // Top Bar Dashboard
  searchPlaceholder: { en: 'Search farmer, ID, village...', hi: 'किसान, आईडी या गाँव खोजें...' },
  operatorRole: { en: 'Collection Operator', hi: 'संकलन संचालक' },
  ownerRole: { en: 'Centre Owner', hi: 'केंद्र स्वामी' },
  adminRole: { en: 'Super Admin', hi: 'सुपर एडमिन' },
  logout: { en: 'Sign out', hi: 'लॉग आउट' },
  loading: { en: 'Loading…', hi: 'लोड हो रहा है…' },
  save: { en: 'Save', hi: 'सहेजें' },
  cancel: { en: 'Cancel', hi: 'रद्द करें' },

  // Dashboard Overview KPIs
  totalFarmers: { en: 'Total Farmers', hi: 'कुल किसान' },
  todaysCollection: { en: "Today's Milk Collection", hi: 'आज का दूध संकलन' },
  morningCollection: { en: 'Morning Collection', hi: 'सुबह का संकलन' },
  eveningCollection: { en: 'Evening Collection', hi: 'शाम का संकलन' },
  pendingPayments: { en: 'Pending Farmer Payments', hi: 'बकाया किसान भुगतान' },
  todaysSales: { en: "Today's Milk Sales", hi: 'आज की दूध बिक्री' },
  totalAnimals: { en: 'Total Animals', hi: 'कुल पशु' },
  monthlyRevenue: { en: 'Monthly Revenue', hi: 'मासिक आय' },

  // Sections & Actions
  collectionTrend: { en: '7-Day Milk Collection Trend', hi: '7 दिन का दूध संकलन रुझान' },
  cowVsBuffalo: { en: 'Cow vs Buffalo Milk Mix', hi: 'गाय बनाम भैंस का दूध' },
  recentCollections: { en: 'Recent Milk Collections', hi: 'हालिया दूध संकलन' },
  pendingPayoutList: { en: 'Pending Farmer Payouts', hi: 'बकाया भुगतान सूची' },
  upcomingReminders: { en: 'Upcoming Reminders', hi: 'आगामी अनुस्मारक' },
  recentActivities: { en: 'Recent Activities', hi: 'हाल की गतिविधियाँ' },
  addEntry: { en: 'New Milk Entry', hi: 'नई दूध प्रविष्टि' },
  saveEntry: { en: 'Save Entry', hi: 'प्रविष्टि सहेजें' },
  reset: { en: 'Reset', hi: 'रीसेट करें' },
  addFarmer: { en: 'Add Farmer', hi: 'नया किसान जोड़ें' },
  cowMilk: { en: 'Cow Milk', hi: 'गाय का दूध' },
  buffaloMilk: { en: 'Buffalo Milk', hi: 'भैंस का दूध' },
  morningShift: { en: 'Morning', hi: 'सुबह' },
  eveningShift: { en: 'Evening', hi: 'शाम' },
  litres: { en: 'Litres', hi: 'लीटर' },
  fatPercent: { en: 'Fat %', hi: 'फैट %' },
  snfPercent: { en: 'SNF %', hi: 'एसएनएफ %' },
  ratePerLitre: { en: 'Rate / Litre', hi: 'दर / लीटर' },
  calculatedAmount: { en: 'Calculated Amount', hi: 'कुल राशि' },

  // Farmer Portal
  myMilkCollection: { en: 'My Milk Collection', hi: 'मेरा दूध संकलन' },
  totalMilkSupplied: { en: 'Total Milk Supplied', hi: 'कुल दिया गया दूध' },
  todaysMilkQty: { en: "Today's Milk Quantity", hi: 'आज का दूध' },
  totalEarnings: { en: 'Total Earnings', hi: 'कुल कमाई' },
  myAnimals: { en: 'My Animals', hi: 'मेरे पशु' },
  animalHealthRecords: { en: 'Animal Health & Vaccination', hi: 'पशु स्वास्थ्य व टीकाकरण' },
  dailyProduction: { en: 'Daily Milk Production', hi: 'दैनिक दूध उत्पादन' },
  feedExpenses: { en: 'Feed & Care Expenses', hi: 'चारा व देखभाल खर्च' },
  monthlySummary: { en: 'Monthly Income & Expense', hi: 'मासिक आय और खर्च' },
  netSavings: { en: 'Estimated Net Income', hi: 'शुद्ध मासिक आय' },
  paymentHistory: { en: 'Payment History', hi: 'भुगतान इतिहास' },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    const saved = window.localStorage.getItem('dairysetu-lang');
    if (saved === 'hi' || saved === 'en') setLangState(saved);
  }, []);

  const setLang = (next: Language) => {
    setLangState(next);
    window.localStorage.setItem('dairysetu-lang', next);
  };

  const toggleLang = () => setLang(lang === 'en' ? 'hi' : 'en');

  const t = (key: string): string => {
    const entry = DICTIONARY[key];
    if (!entry) return key;
    return entry[lang] || entry.en;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
