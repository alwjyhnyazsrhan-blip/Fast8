export type Language = 'ar' | 'en';

export interface Translations {
  // Login & Activation Screen
  loginTitle: string;
  loginSubtitle: string;
  userIdLabel: string;
  copyUserId: string;
  copied: string;
  pasteKeyPlaceholder: string;
  activateApp: string;
  swipeUpToViewPackages: string;
  choosePackageHeading: string;
  selectedPackageToast: string;
  contactTelegram: string;
  contactWhatsApp: string;
  licenseDeviceBound: string;
  trialDays: string;
  monthsCount: string;
  yearCount: string;
  yearsCount: string;
  sar: string;
  continuousSupport: string;
  performanceImprovement: string;
  updates: string;
  quickFreeTrial: string;
  instantActivation: string;

  // Main Dashboard
  helperTitle: string;
  helperSubtitle: string;
  subscriptionDetails: string;
  subscriptionDate: string;
  expiryDate: string;
  timeRemaining: string;
  startHelper: string;
  stopHelper: string;
  volumeDownHint: string;
  quickControlHint: string;
  logout: string;
  orderStartSent: string;

  // Locate Helper L.H HUD Modal
  autoAcceptActive: string;
  autoAcceptStopped: string;
  autoAcceptToggleTitle: string;
  autoAcceptToggleDesc: string;
  restaurantDistanceTitle: string;
  restaurantDistanceDesc: string;
  customerDistanceTitle: string;
  customerDistanceDesc: string;
  fastSwipeTitle: string;
  fastSwipeDesc: string;
  fastSwipeUnit: string;
  fastSwipeFaster: string;
  fastSwipeSlower: string;
  orderCardLangTitle: string;
  orderCardLangDesc: string;
  repeatedTapTitle: string;
  enableCustomValue: string;
  repeatedTapDesc: string;
  saveSettings: string;
  settingsSavedToast: string;
  kmUnit: string;
  msUnit: string;
  langArabic: string;
  langEnglish: string;
}

export const translations: Record<Language, Translations> = {
  ar: {
    // Login & Activation Screen
    loginTitle: 'الدخول والتفعيل',
    loginSubtitle: 'فعل التطبيق او اختر الباقة المناسبة لك',
    userIdLabel: 'الخاص بجهازك: User ID',
    copyUserId: 'نسخ User ID',
    copied: 'تم النسخ بنجاح',
    pasteKeyPlaceholder: 'الصق مفتاح التفعيل هنا',
    activateApp: 'تفعيل التطبيق',
    swipeUpToViewPackages: 'اسحب لفوق لرؤية الباقات',
    choosePackageHeading: 'اختر باقتك بالضغط عليها',
    selectedPackageToast: 'تم اختيار باقة',
    contactTelegram: 'التواصل عبر تيلجرام',
    contactWhatsApp: 'التواصل عبر واتساب',
    licenseDeviceBound: 'الترخيص مرتبط بجهازك هذا الجهاز',
    trialDays: 'تجربة يوم',
    monthsCount: '3 أشهر',
    yearCount: 'سنة',
    yearsCount: '3 سنوات',
    sar: 'ريال',
    continuousSupport: 'دعم مستمر',
    performanceImprovement: 'تحسين في الأداء',
    updates: 'تحديثات',
    quickFreeTrial: 'تجربة مجانية سريعة',
    instantActivation: 'تفعيل فوري',

    // Main Dashboard
    helperTitle: 'مساعد لوكيت',
    helperSubtitle: 'إدارة تشغيل وإيقاف المساعد بسهولة',
    subscriptionDetails: 'تفاصيل الاشتراك',
    subscriptionDate: 'تاريخ الاشتراك',
    expiryDate: 'تاريخ انتهاء الاشتراك',
    timeRemaining: 'المتبقي من الاشتراك',
    startHelper: 'تشغيل مساعد لوكيت',
    stopHelper: 'إيقاف مساعد لوكيت',
    volumeDownHint: 'لفتح نافذة مساعد لوكيت، افتح تطبيق لوكيت واضغط ضغطة واحدة على زر خفض الصوت.',
    quickControlHint: 'تحكم سريع في خدمة المساعد',
    logout: 'تسجيل الخروج',
    orderStartSent: 'تم إرسال أمر تشغيل مساعد لوكيت',

    // Locate Helper L.H HUD Modal
    autoAcceptActive: 'القبول التلقائي يعمل',
    autoAcceptStopped: 'القبول التلقائي متوقف',
    autoAcceptToggleTitle: 'القبول التلقائي',
    autoAcceptToggleDesc: 'تشغيل أو تعطيل قبول الطلبات',
    restaurantDistanceTitle: 'مسافة المطعم',
    restaurantDistanceDesc: 'تعديل المسافة المسموحة بينك وبين المطعم',
    customerDistanceTitle: 'مسافة العميل',
    customerDistanceDesc: 'تعديل المسافة المسموحة بين المطعم والعميل',
    fastSwipeTitle: 'السحب السريع',
    fastSwipeDesc: 'أسرع معدل لالتقاط الطلبات السريعة',
    fastSwipeUnit: 'ms',
    fastSwipeFaster: 'سريع 100',
    fastSwipeSlower: '200 أبطأ',
    orderCardLangTitle: 'لغة بطاقة الطلب',
    orderCardLangDesc: 'اختر لغة تطبيق التوصيل',
    repeatedTapTitle: 'فاصل النقرات المتتالية',
    enableCustomValue: 'تفعيل القيمة المخصصة',
    repeatedTapDesc: 'عند تعطيل التردد، الحد الأقصى 5 نقرات في الثانية',
    saveSettings: 'حفظ الإعدادات',
    settingsSavedToast: 'تم حفظ الإعدادات بنجاح',
    kmUnit: 'كم',
    msUnit: 'ms (5-1000)',
    langArabic: 'العربية',
    langEnglish: 'English',
  },
  en: {
    // Login & Activation Screen
    loginTitle: 'Login & Activation',
    loginSubtitle: 'Activate the app or choose a suitable plan for you',
    userIdLabel: 'Your Device User ID',
    copyUserId: 'Copy User ID',
    copied: 'Copied successfully',
    pasteKeyPlaceholder: 'Paste activation key here',
    activateApp: 'Activate Application',
    swipeUpToViewPackages: 'Swipe up to view packages',
    choosePackageHeading: 'Choose your package by tapping on it',
    selectedPackageToast: 'Selected package',
    contactTelegram: 'Contact via Telegram',
    contactWhatsApp: 'Contact via WhatsApp',
    licenseDeviceBound: 'The license is bound to this specific device',
    trialDays: 'Trial (1 Day)',
    monthsCount: '3 Months',
    yearCount: '1 Year',
    yearsCount: '3 Years',
    sar: 'SAR',
    continuousSupport: 'Continuous Support',
    performanceImprovement: 'Performance Improvement',
    updates: 'Regular Updates',
    quickFreeTrial: 'Quick Free Trial',
    instantActivation: 'Instant Activation',

    // Main Dashboard
    helperTitle: 'Locate Helper',
    helperSubtitle: 'Start and stop the helper easily',
    subscriptionDetails: 'Subscription details',
    subscriptionDate: 'Subscription date',
    expiryDate: 'Expiry date',
    timeRemaining: 'Time remaining',
    startHelper: 'Start Locate Helper',
    stopHelper: 'Stop Locate Helper',
    volumeDownHint: 'To open the Locate Helper window, open the Locate app and press the volume-down button.',
    quickControlHint: 'Quick control of the helper service',
    logout: 'Log out',
    orderStartSent: 'Locate Helper start command sent',

    // Locate Helper L.H HUD Modal
    autoAcceptActive: 'Auto-accept is active',
    autoAcceptStopped: 'Auto-accept is stopped',
    autoAcceptToggleTitle: 'Auto Accept',
    autoAcceptToggleDesc: 'Enable or disable accepting orders',
    restaurantDistanceTitle: 'Restaurant Distance',
    restaurantDistanceDesc: 'Adjust allowed distance between you and restaurant',
    customerDistanceTitle: 'Customer Distance',
    customerDistanceDesc: 'Adjust allowed distance between restaurant and customer',
    fastSwipeTitle: 'Fast Swipe',
    fastSwipeDesc: 'Fastest rate to catch incoming orders',
    fastSwipeUnit: 'ms',
    fastSwipeFaster: 'Fast 100',
    fastSwipeSlower: '200 Slower',
    orderCardLangTitle: 'Order Card Language',
    orderCardLangDesc: 'Select delivery application language',
    repeatedTapTitle: 'Repeated-tap Interval',
    enableCustomValue: 'Enable custom value',
    repeatedTapDesc: 'When disabled, max 5 taps per second',
    saveSettings: 'Save Settings',
    settingsSavedToast: 'Settings saved successfully',
    kmUnit: 'km',
    msUnit: 'ms (5-1000)',
    langArabic: 'العربية',
    langEnglish: 'English',
  },
};
