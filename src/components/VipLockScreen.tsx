import React, { useState, useEffect } from 'react';
import { Copy, Check, ChevronDown, MessageSquare, Send, Sparkles } from 'lucide-react';
import { getVipDeviceId, isAuthorizedDevice } from '../utils/device';
import { getNativeBridge } from '../utils/nativeBridge';
import { Language, translations } from '../utils/i18n';
import { FIREBASE_RTDB_URL } from '../utils/firebase';

interface VipLockScreenProps {
  onUnlock: (code: string, planName?: string, expiryDate?: string) => void;
  initialError?: string | null;
  lang?: Language;
  onLanguageChange?: (lang: Language) => void;
}

interface PackagePlan {
  id: string;
  priceSar: number | string;
  durationLabelAr: string;
  durationLabelEn: string;
  featuresAr: string[];
  featuresEn: string[];
  days: number;
}

const PACKAGES: PackagePlan[] = [
  {
    id: '1_month',
    priceSar: '',
    durationLabelAr: 'شهر',
    durationLabelEn: '1 Month',
    featuresAr: ['دعم مستمر', 'تحسين في الأداء', 'تحديثات'],
    featuresEn: ['Continuous Support', 'Performance Improvement', 'Regular Updates'],
    days: 30,
  },
  {
    id: '2_months',
    priceSar: '',
    durationLabelAr: 'شهرين',
    durationLabelEn: '2 Months',
    featuresAr: ['دعم مستمر', 'تحسين في الأداء', 'تحديثات'],
    featuresEn: ['Continuous Support', 'Performance Improvement', 'Regular Updates'],
    days: 60,
  },
  {
    id: '3_months',
    priceSar: '',
    durationLabelAr: '3 أشهر',
    durationLabelEn: '3 Months',
    featuresAr: ['دعم مستمر', 'تحسين في الأداء', 'تحديثات'],
    featuresEn: ['Continuous Support', 'Performance Improvement', 'Regular Updates'],
    days: 90,
  },
  {
    id: 'trial_1_day',
    priceSar: '',
    durationLabelAr: 'تجربة يوم',
    durationLabelEn: 'Trial (1 Day)',
    featuresAr: ['دعم مستمر', 'تحسين في الأداء', 'تحديثات'],
    featuresEn: ['Continuous Support', 'Performance Improvement', 'Regular Updates'],
    days: 1,
  },
];

export const VipLockScreen: React.FC<VipLockScreenProps> = ({
  onUnlock,
  initialError,
  lang = 'ar',
  onLanguageChange,
}) => {
  const [currentLang, setCurrentLang] = useState<Language>(lang);
  const t = translations[currentLang];

  const [deviceId, setDeviceId] = useState<string>('');
  const [activationKey, setActivationKey] = useState<string>('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('trial_1_day');
  const [errorMessage, setErrorMessage] = useState<string>(initialError || '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialChecking, setIsInitialChecking] = useState<boolean>(true);

  // Sync external language prop
  useEffect(() => {
    setCurrentLang(lang);
  }, [lang]);

  const handleLangToggle = (newLang: Language) => {
    setCurrentLang(newLang);
    if (onLanguageChange) onLanguageChange(newLang);
  };

  // Get active Hardware Device ID
  useEffect(() => {
    const rawId = getVipDeviceId();
    setDeviceId(rawId);
  }, []);

  // Check saved license on mount - الدخول الصامت الفوري طالما الاشتراك ساري الصلاحية
  useEffect(() => {
    const checkSaved = async () => {
      try {
        // 1. إذا كان هناك أمر إيقاف مسجل، نمنع الفتح التلقائي تماماً ونعرض رسالة الإلغاء
        const termination = localStorage.getItem('vip_termination_notice');
        if (termination || initialError) {
          setIsInitialChecking(false);
          return;
        }

        const savedCode = localStorage.getItem('vip_active_code');
        const savedExpiry = localStorage.getItem('vip_expiry_date');

        if (!savedCode || !savedExpiry) {
          setIsInitialChecking(false);
          return;
        }

        const expTime = new Date(savedExpiry).getTime();
        if (isNaN(expTime) || expTime <= Date.now()) {
          setIsInitialChecking(false);
          return;
        }

        // 2. التحقق اللحظي من السيرفر أو فايربيس
        const isValidStill = await verifyCodeOnline(savedCode, true);
        if (!isValidStill) {
          // 🛡️ فحص أمان أوفلاين: إذا كان السيرفر متوقفاً/منتهياً وتاريخ الاشتراك لا يزال سارياً
          const isStillTimeValid = expTime > Date.now();
          if (isStillTimeValid && !localStorage.getItem('vip_termination_notice')) {
            console.log('[VipLockScreen] ⚡ Offline Standalone: Retaining valid local subscription');
            const savedPlan = localStorage.getItem('vip_plan_name') || 'اشتراك نشط';
            const bridge = getNativeBridge();
            if (bridge && typeof bridge.setVipLicensed === 'function') {
              bridge.setVipLicensed(true);
            }
            onUnlock(savedCode, savedPlan, savedExpiry);
            setIsInitialChecking(false);
            return;
          }

          // الكود حُذف أو أُلغي صراحة
          localStorage.removeItem('vip_active_code');
          localStorage.removeItem('vip_expiry_date');
          localStorage.removeItem('vip_plan_name');
          localStorage.removeItem('vip_activated_at');
          localStorage.removeItem('vip_active_id');
          setIsInitialChecking(false);
          return;
        }
      } catch {
        setIsInitialChecking(false);
      }
    };
    checkSaved();
  }, [initialError]);

  // فحص تلقائي سريع (كل 3 ثوانٍ) لإعادة فتح التطبيق فوراً بمجرد تنشيط الكود من المشرف
  useEffect(() => {
    const savedCode = localStorage.getItem('vip_active_code');
    if (!savedCode) return;

    const autoReactivateInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/license/verify?code=${encodeURIComponent(savedCode)}&deviceId=${encodeURIComponent(deviceId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isValid) {
            console.log('[VipLockScreen] ✅ Code re-activated by admin, unlocking immediately!');
            localStorage.removeItem('vip_termination_notice');
            setErrorMessage('');
            onUnlock(savedCode, data.planName, data.expiryDate);
          }
        }
      } catch {}
    }, 3000);

    return () => clearInterval(autoReactivateInterval);
  }, [deviceId, onUnlock]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleCopyUserId = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(deviceId);
      } else {
        const el = document.createElement('textarea');
        el.value = deviceId;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setIsCopied(true);
      showToast(t.copied);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      showToast(deviceId);
    }
  };

  const handleSelectPackage = (pkg: PackagePlan) => {
    setSelectedPackageId(pkg.id);
    const label = currentLang === 'ar' ? pkg.durationLabelAr : pkg.durationLabelEn;
    showToast(`${t.selectedPackageToast}: ${label}`);
  };

  const getSelectedPlan = (): PackagePlan => {
    return PACKAGES.find((p) => p.id === selectedPackageId) || PACKAGES[3];
  };

  // Contact via Telegram
  const handleContactTelegram = () => {
    const url = 'https://t.me/Wsxderfpo';
    try {
      const bridge = (window as any).LocateGoNative;
      if (bridge && typeof bridge.openUrl === 'function') {
        const handled = bridge.openUrl(url);
        if (handled) return;
      }
    } catch {}
    window.open(url, '_blank');
  };

  // Contact via WhatsApp with exact message template from Video 1
  const handleContactWhatsApp = () => {
    const plan = getSelectedPlan();
    const planLabel = currentLang === 'ar' ? plan.durationLabelAr : plan.durationLabelEn;
    const phone = '967712397720';

    const text =
      currentLang === 'ar'
        ? `مرحباً، أريد الاستفسار أو الاشتراك\n\nUser ID: ${deviceId}\n\nالباقة المختارة: ${planLabel}`
        : `Hello, I would like to inquire or subscribe\n\nUser ID: ${deviceId}\n\nSelected Package: ${planLabel}`;

    // 1. Try Native Android Bridge first to launch Intent directly and avoid ERR_UNKNOWN_URL_SCHEME
    try {
      const bridge = (window as any).LocateGoNative;
      if (bridge && typeof bridge.openWhatsApp === 'function') {
        const handled = bridge.openWhatsApp(phone, text);
        if (handled) return;
      }
    } catch {}

    // 2. Fallback to wa.me URL
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    try {
      window.open(url, '_blank');
    } catch {
      window.location.href = url;
    }
  };

  // Verify and unlock
  const verifyCodeOnline = async (codeToTest: string, isSilent = false): Promise<boolean> => {
    const cleanCode = codeToTest.trim().toUpperCase();
    if (!cleanCode) {
      if (!isSilent) setErrorMessage(currentLang === 'ar' ? 'الرجاء إدخال مفتاح التفعيل' : 'Please enter activation key');
      return false;
    }

    if (!isSilent) setIsLoading(true);
    setErrorMessage('');

    try {
      const currentPlan = getSelectedPlan();

      // 1. فحص الكود عبر واجهة التحقق الموحدة في السيرفر (/api/license/verify)
      // تدعم مطابقة الصفر والحرف O والربط المباشر مع قاعدة بيانات Firebase
      try {
        const vipFp = getVipDeviceId();
        const serverRes = await fetch(
          `/api/license/verify?code=${encodeURIComponent(cleanCode)}&deviceId=${encodeURIComponent(deviceId)}&vipDeviceId=${encodeURIComponent(vipFp)}`,
          {
            headers: {
              'X-Device-Id': deviceId,
              'X-Vip-Device-Id': vipFp,
            },
          }
        );

        if (serverRes.ok) {
          const verifyData = await serverRes.json();
          if (verifyData.isValid) {
            const nowIso = new Date().toISOString();
            const expiry = verifyData.expiryDate || new Date(Date.now() + (verifyData.durationDays || 30) * 86400 * 1000).toISOString();
            const plan = verifyData.planName || (verifyData.durationDays ? (verifyData.durationDays === 1 ? 'تجربة يوم' : (verifyData.durationDays <= 10 ? `${verifyData.durationDays} أيام` : `${verifyData.durationDays} يوم`)) : currentPlan.durationLabelAr);
            localStorage.setItem('vip_active_code', cleanCode);
            if (verifyData.id) {
              localStorage.setItem('vip_active_id', String(verifyData.id));
            }
            localStorage.setItem('vip_device_id', deviceId);
            localStorage.setItem('vip_plan_name', plan);
            localStorage.setItem('vip_activated_at', nowIso);
            localStorage.setItem('vip_expiry_date', expiry);
            localStorage.removeItem('vip_termination_notice');

            const bridge = getNativeBridge();
            if (bridge && typeof bridge.setVipLicensed === 'function') {
              bridge.setVipLicensed(true);
            }

            onUnlock(cleanCode, plan, expiry);
            setIsLoading(false);
            setIsInitialChecking(false);
            return true;
          } else {
            // الكود مسجل ولكن غير صالح (منتهي أو مخصص لجهاز آخر)
            if (!isSilent) {
              setErrorMessage(verifyData.message || (currentLang === 'ar' ? 'كود الاشتراك غير صالح' : 'Invalid subscription code'));
            }
            setIsLoading(false);
            setIsInitialChecking(false);
            return false;
          }
        }
      } catch (serverErr) {
        console.warn('[VipLockScreen] Server verify endpoint bypassed, falling back to database query:', serverErr);
      }

      // 3. الفحص الاحتياطي المباشر من قاعدة بيانات Firebase RTDB
      try {
        const cleanBase = FIREBASE_RTDB_URL.replace(/\/+$/, '');
        const directRes = await fetch(`${cleanBase}/activation_codes.json`);
        if (directRes.ok) {
          const directData = await directRes.json();
          if (directData && typeof directData === 'object') {
            const entries = Object.entries(directData) as [string, any][];
            const foundEntry = entries.find(
              ([, c]) => (c?.code || '').toString().trim().toUpperCase() === cleanCode
            );
            if (foundEntry) {
              const [matchKey, match] = foundEntry;
              const status = (match.status || '').toLowerCase();
              if (status === 'revoked' || status === 'disabled' || status === 'banned' || status === 'cancelled') {
                if (!isSilent) setErrorMessage(currentLang === 'ar' ? '🚫 تم تعطيل أو إلغاء صلاحية هذا الكود من قبل الإدارة' : 'This code has been revoked');
                setIsLoading(false);
                setIsInitialChecking(false);
                return false;
              }

              const matchExpiry = match.expiry_date || match.expiryDate;
              if (status === 'expired' || (matchExpiry && !isNaN(new Date(matchExpiry).getTime()) && Date.now() > new Date(matchExpiry).getTime() + 5 * 60 * 1000)) {
                if (!isSilent) setErrorMessage(currentLang === 'ar' ? '⏰ انتهت صلاحية هذا الكود' : 'This code has expired');
                setIsLoading(false);
                setIsInitialChecking(false);
                return false;
              }

              const targetDev = match.target_device_id || match.targetDeviceId || match.used_by || match.usedByDeviceId;
              if (targetDev && String(targetDev).trim() !== '' && !isAuthorizedDevice(String(targetDev), deviceId)) {
                if (!isSilent) setErrorMessage(currentLang === 'ar' ? `⚠️ كود الاشتراك مخصص لجهاز آخر (${targetDev})` : 'Code is locked to another device');
                setIsLoading(false);
                setIsInitialChecking(false);
                return false;
              }

              const nowIso = new Date().toISOString();
              const days = Number(match.duration_days || match.durationDays || currentPlan.days || 30);
              const startMode = match.start_mode || match.startMode || 'on_first_activation';
              const isFirstActivation = !(match.activated_at || match.activatedAt) && !(match.used_by || match.usedByDeviceId);
              const expiry =
                isFirstActivation && startMode === 'on_first_activation'
                  ? new Date(Date.now() + days * 24 * 3600 * 1000).toISOString()
                  : (matchExpiry || new Date(Date.now() + days * 24 * 3600 * 1000).toISOString());
              const plan = match.plan_name || match.planName || (days === 1 ? 'تجربة يوم' : (days <= 10 ? `${days} أيام` : `${days} يوم`));

              // ربط الكود بالجهاز في قاعدة بيانات Firebase RTDB عند أول استخدام
              if (!targetDev || isFirstActivation) {
                fetch(`${cleanBase}/activation_codes/${matchKey}.json`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    used_by: deviceId,
                    usedByDeviceId: deviceId,
                    used_count: 1,
                    status: 'used',
                    activated_at: match.activated_at || match.activatedAt || nowIso,
                    activatedAt: match.activatedAt || match.activated_at || nowIso,
                    expiry_date: expiry,
                    expiryDate: expiry,
                  }),
                }).catch(() => {});
              }

              localStorage.setItem('vip_active_code', cleanCode);
              localStorage.setItem('vip_active_id', String(match.id || matchKey));
              localStorage.setItem('vip_device_id', deviceId);
              localStorage.setItem('vip_plan_name', plan);
              localStorage.setItem('vip_activated_at', match.activated_at || match.activatedAt || nowIso);
              localStorage.setItem('vip_expiry_date', expiry);
              localStorage.removeItem('vip_termination_notice');

              const bridge = getNativeBridge();
              if (bridge && typeof bridge.setVipLicensed === 'function') {
                bridge.setVipLicensed(true);
              }

              onUnlock(cleanCode, plan, expiry);
              setIsLoading(false);
              setIsInitialChecking(false);
              return true;
            } else {
              // الكود غير موجود في فايربيس (تم حذفه نهائياً)
              if (!isSilent) setErrorMessage(currentLang === 'ar' ? '❌ كود الاشتراك غير مسجل أو تم حذفه من قبل الإدارة' : 'Code not found or deleted by admin');
              setIsLoading(false);
              setIsInitialChecking(false);
              return false;
            }
          }
        }
      } catch (fbErr) {
        console.warn('[VipLockScreen] Direct Firebase check failed:', fbErr);
      }

      if (!isSilent) setErrorMessage(currentLang === 'ar' ? '❌ كود الاشتراك غير مسجل أو تم حذفه من قبل الإدارة' : 'Code not found or deleted by admin');
      setIsLoading(false);
      setIsInitialChecking(false);
      return false;
    } catch {
      if (!isSilent) setErrorMessage(currentLang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Connection error');
      setIsLoading(false);
      setIsInitialChecking(false);
      return false;
    }
  };

  const handleActivateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationKey.trim()) {
      setErrorMessage(
        currentLang === 'ar'
          ? 'يرجى إدخال كود الاشتراك أولاً (حتى لباقة تجربة يوم)'
          : 'Please enter a valid subscription code first'
      );
      return;
    }
    verifyCodeOnline(activationKey, false);
  };

  if (isInitialChecking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b14]">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full bg-[#070b14] text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 select-none relative overflow-y-auto"
      dir={currentLang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#1e293b]/95 border border-emerald-400/50 text-emerald-200 px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce backdrop-blur-md">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Outer Phone Frame Container */}
      <div className="w-full max-w-[430px] my-auto space-y-4">
        
        {/* TOP BAR: Language Selector (English | العربية) */}
        <div className="flex items-center justify-end px-1">
          <div className="flex items-center gap-1 bg-[#10172a] p-1 rounded-2xl border border-slate-800 shadow-inner">
            <button
              onClick={() => handleLangToggle('en')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentLang === 'en'
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              English
            </button>
            <button
              onClick={() => handleLangToggle('ar')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentLang === 'ar'
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              العربية
            </button>
          </div>
        </div>

        {/* HEADER TITLE CARD */}
        <div className="text-center pt-1 pb-2">
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">
            {t.loginTitle}
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            {t.loginSubtitle}
          </p>
        </div>

        {/* ERROR / NOTICE ALERT */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs font-semibold text-center animate-fadeIn shadow-lg">
            {errorMessage}
          </div>
        )}

        {/* CARD 1: User ID & Copy */}
        <div className="bg-[#10172a] border border-slate-800 rounded-3xl p-4 shadow-xl space-y-2.5">
          <label className="text-xs font-bold text-slate-300 block text-right">
            {t.userIdLabel}
          </label>
          <div className="w-full bg-[#0a0f1d] border border-slate-700/80 rounded-2xl p-3 text-center font-mono font-bold text-xs text-slate-200 break-all select-all shadow-inner">
            {deviceId || 'SAMSUNG-SM-S938B-D4E5C02A0597B0B2'}
          </div>
          <button
            onClick={handleCopyUserId}
            className="w-full py-2.5 px-4 rounded-xl bg-[#1b2642] hover:bg-[#233156] active:scale-98 border border-indigo-400/30 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? t.copied : t.copyUserId}</span>
          </button>
        </div>

        {/* CARD 2: Activation Key Input & Submit */}
        <form onSubmit={handleActivateSubmit} className="bg-[#10172a] border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
          <input
            type="text"
            value={activationKey}
            onChange={(e) => setActivationKey(e.target.value)}
            placeholder={t.pasteKeyPlaceholder}
            className="w-full bg-[#0a0f1d] border border-slate-700 rounded-2xl px-4 py-3 text-center text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-all"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-98 text-slate-950 font-black text-xs tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>{t.activateApp}</span>
            )}
          </button>
        </form>

        {/* SWIPE UP INDICATOR */}
        <div className="flex flex-col items-center justify-center text-slate-400 py-1">
          <span className="text-[11px] font-medium tracking-wide">
            {t.swipeUpToViewPackages}
          </span>
          <ChevronDown className="w-4 h-4 animate-bounce mt-0.5 text-slate-500" />
        </div>

        {/* PACKAGES HEADING */}
        <div className="text-center pt-1 pb-1">
          <h2 className="text-sm font-bold text-white tracking-wide">
            {t.choosePackageHeading}
          </h2>
        </div>

        {/* PACKAGES CARDS LIST */}
        <div className="space-y-2.5">
          {PACKAGES.map((pkg) => {
            const isSelected = selectedPackageId === pkg.id;
            const title = currentLang === 'ar' ? pkg.durationLabelAr : pkg.durationLabelEn;
            const features = currentLang === 'ar' ? pkg.featuresAr : pkg.featuresEn;

            return (
              <div
                key={pkg.id}
                onClick={() => handleSelectPackage(pkg)}
                className={`w-full p-4 rounded-2xl border transition-all cursor-pointer text-center relative ${
                  isSelected
                    ? 'bg-[#15203b] border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400'
                    : 'bg-[#10172a] hover:bg-[#141d33] border-slate-800'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-3 left-3 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 shadow-sm">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}

                <h3 className="text-sm font-black text-white mb-1.5">
                  {title}
                </h3>

                <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
                  {features.map((feat, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-slate-500" />
                      <span>{feat}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* CONTACT BUTTONS (Telegram & WhatsApp) */}
        <div className="space-y-2.5 pt-2">
          {/* Telegram */}
          <button
            onClick={handleContactTelegram}
            className="w-full py-3 px-4 rounded-2xl bg-[#18233e] hover:bg-[#202f54] active:scale-98 border border-slate-700/80 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Send className="w-4 h-4 text-cyan-400" />
            <span>{t.contactTelegram}</span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleContactWhatsApp}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            <MessageSquare className="w-4 h-4 fill-slate-950" />
            <span>{t.contactWhatsApp}</span>
          </button>
        </div>

        {/* FOOTER NOTE */}
        <div className="text-center pt-2 pb-4">
          <p className="text-[11px] text-slate-500 font-medium">
            {t.licenseDeviceBound}
          </p>
        </div>
      </div>
    </div>
  );
};
