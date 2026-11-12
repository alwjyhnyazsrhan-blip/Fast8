import React, { useState } from 'react';
import { 
  Accessibility, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  ChevronRight, 
  X, 
  RefreshCw, 
  Smartphone,
  ShieldAlert,
  Zap,
  Info
} from 'lucide-react';
import { getNativeBridge, isRunningInAndroidApp } from '../utils/nativeBridge';

interface AccessibilityPromptBannerProps {
  isAccessibilityEnabled: boolean;
  onRefreshStatus?: () => void;
  lang?: 'ar' | 'en';
}

export const AccessibilityPromptBanner: React.FC<AccessibilityPromptBannerProps> = ({
  isAccessibilityEnabled,
  onRefreshStatus,
  lang = 'ar',
}) => {
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isAndroid = isRunningInAndroidApp();

  const handleOpenSettings = () => {
    const bridge = getNativeBridge();
    if (bridge) {
      bridge.openAccessibilitySettings();
      showToast(lang === 'ar' ? 'تم فتح إعدادات الهاتف.. يرجى تفعيل Locate Go' : 'Opening Settings.. Please enable Locate Go');
    } else {
      setShowGuideModal(true);
      showToast(lang === 'ar' ? 'أنت في محاكي المتصفح، هذه خطوات تفعيلها على هاتف أندرويد' : 'Browser simulation mode: follow Android steps');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCheckStatus = () => {
    setChecking(true);
    if (onRefreshStatus) onRefreshStatus();
    setTimeout(() => {
      setChecking(false);
      const bridge = getNativeBridge();
      const enabled = bridge?.isAccessibilityEnabled ? bridge.isAccessibilityEnabled() : isAccessibilityEnabled;
      if (enabled) {
        showToast(lang === 'ar' ? '✅ خدمة إمكانية الوصول مفعلة وتعمل بنجاح!' : '✅ Accessibility Service is enabled & active!');
      } else {
        showToast(lang === 'ar' ? '⚠️ الخدمة ما زالت غير مفعلة في إعدادات الهاتف' : '⚠️ Service is still disabled in phone settings');
      }
    }, 700);
  };

  // If already enabled, show sleek confirmed banner / badge
  if (isAccessibilityEnabled) {
    return (
      <div className="w-full max-w-md mx-auto mb-4 animate-fadeIn" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-emerald-950/40 border border-emerald-500/40 rounded-2xl px-4 py-2.5 shadow-lg shadow-emerald-950/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">
                  {lang === 'ar' ? 'خدمة إمكانية الوصول' : 'Accessibility Service'}
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950">
                  {lang === 'ar' ? 'مفعلة ⚡' : 'ACTIVE ⚡'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-300/80">
                {lang === 'ar' ? 'جاهز لرصد الشاشة وسحب القبول التلقائي الفوري' : 'Ready for screen monitoring & zero-delay auto-accept'}
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenSettings}
            title={lang === 'ar' ? 'فتح إعدادات إمكانية الوصول' : 'Open Accessibility Settings'}
            className="p-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // If user dismissed, show a compact warning pill that can be expanded
  if (isDismissed) {
    return (
      <div className="w-full max-w-md mx-auto mb-4 flex justify-end" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <button
          onClick={() => setIsDismissed(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/80 hover:bg-amber-900/90 border border-amber-500/50 text-amber-300 text-xs font-bold shadow-lg shadow-amber-950/40 active:scale-95 transition-all cursor-pointer animate-pulse"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>{lang === 'ar' ? 'تنبيه: يلزم تفعيل إمكانية الوصول ⚡' : 'Alert: Enable Accessibility Service ⚡'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto mb-5 animate-scaleIn relative select-none" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#1e293b]/95 border border-amber-400/80 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-fadeIn backdrop-blur-md">
          <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Alert Card */}
      <div className="bg-gradient-to-b from-[#241a0d]/95 via-[#1a150e]/95 to-[#120f0a]/95 border-2 border-amber-500/60 rounded-3xl p-4 sm:p-5 shadow-[0_0_30px_rgba(245,158,11,0.22)] relative overflow-hidden backdrop-blur-md">
        
        {/* Glow ambient background */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header Row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0 animate-pulse">
              <Accessibility className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white tracking-tight">
                  {lang === 'ar' ? 'إشعار تفعيل إمكانية الوصول' : 'Accessibility Service Required'}
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {lang === 'ar' ? 'مطلوب للقبول' : 'Required'}
                </span>
              </div>
              <p className="text-[11px] font-medium text-amber-300/90 mt-0.5">
                {lang === 'ar'
                  ? 'خدمة Locate Go غير مفعلة في الهاتف حالياً'
                  : 'Locate Go service is currently not enabled on this device'}
              </p>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => setIsDismissed(true)}
            title={lang === 'ar' ? 'إخفاء مؤقت' : 'Dismiss'}
            className="w-7 h-7 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Description */}
        <div className="bg-[#100d08]/80 border border-amber-500/20 rounded-2xl p-3 mb-4">
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {lang === 'ar' ? (
              <>
                لكي تتمكن الأداة من <strong className="text-amber-300 font-bold">قراءة كروت الطلبات من الشاشة</strong> وتنفيذ <strong className="text-emerald-400 font-bold">السحب التلقائي الفوري (Auto-Swipe)</strong> فور توفر العرض المناسب، يلزم تفعيل إمكانية الوصول لـ Locate Go في إعدادات الهاتف.
              </>
            ) : (
              <>
                To allow Locate Go to <strong className="text-amber-300 font-bold">read order offers</strong> and execute <strong className="text-emerald-400 font-bold">instant auto-swipe</strong>, you must enable Locate Go in Android Accessibility settings.
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Main Action: Open Settings */}
          <button
            onClick={handleOpenSettings}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>{lang === 'ar' ? 'تفعيل إمكانية الوصول الآن ⚡' : 'Enable Accessibility Now ⚡'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Secondary Action: Guide Modal */}
          <button
            onClick={() => setShowGuideModal(true)}
            className="w-full sm:w-auto py-3 px-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'ar' ? 'طريقة التفعيل (3 خطوات)' : 'How-to Guide'}</span>
          </button>

          {/* Quick Check Refresh */}
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            title={lang === 'ar' ? 'فحص الحالة الآن' : 'Check Status'}
            className="w-full sm:w-auto py-3 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-amber-400' : ''}`} />
            <span className="sm:hidden">{lang === 'ar' ? 'فحص الحالة' : 'Check'}</span>
          </button>
        </div>
      </div>

      {/* Guide Modal: Step-by-Step Instructions */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#10172a] border border-amber-500/40 rounded-3xl p-5 shadow-2xl relative animate-scaleIn text-right">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Accessibility className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">
                    {lang === 'ar' ? 'خطوات تفعيل إمكانية الوصول' : 'Accessibility Activation Steps'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'اتبع 3 خطوات بسيطة على هاتفك الأندرويد' : 'Follow 3 simple steps on your Android device'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Steps Container */}
            <div className="space-y-3 mb-5">
              {/* Step 1 */}
              <div className="bg-[#18223c]/70 border border-slate-800 rounded-2xl p-3 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <h5 className="text-xs font-bold text-white mb-0.5">
                    {lang === 'ar' ? 'فتح إعدادات إمكانية الوصول' : 'Open Accessibility Settings'}
                  </h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {lang === 'ar' 
                      ? 'انقر على زر "فتح الإعدادات الآن" بالأسفل للانتقال مباشرة لشاشة الإعدادات في جوالك.' 
                      : 'Click the button below to go directly to Android Accessibility settings.'}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-[#18223c]/70 border border-slate-800 rounded-2xl p-3 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <h5 className="text-xs font-bold text-white mb-0.5">
                    {lang === 'ar' ? 'الدخول إلى "الخدمات التي تم تنزيلها"' : 'Go to "Downloaded / Installed apps"'}
                  </h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {lang === 'ar' 
                      ? 'ابحث عن قسم "الخدمات المثبتة" أو "الخدمات التي تم تنزيلها" (Downloaded Apps / Installed Services).' 
                      : 'Look for Installed Services or Downloaded Apps section.'}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-[#18223c]/70 border border-slate-800 rounded-2xl p-3 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <h5 className="text-xs font-bold text-white mb-0.5">
                    {lang === 'ar' ? 'اختيار Locate Go وتشغيل المفتاح' : 'Select Locate Go & Turn ON'}
                  </h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {lang === 'ar' 
                      ? 'اختر تطبيق Locate Go من القائمة، وقم بتفعيل المفتاح واضغط على "سماح" (Allow).' 
                      : 'Find Locate Go in the list, toggle switch to ON and tap Allow.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleOpenSettings}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>{lang === 'ar' ? 'فتح إعدادات الهاتف الآن' : 'Open Settings Now'}</span>
              </button>

              <button
                onClick={() => {
                  handleCheckStatus();
                  setShowGuideModal(false);
                }}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'تم التفعيل' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
