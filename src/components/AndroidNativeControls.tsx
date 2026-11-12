import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Layers, 
  Accessibility, 
  BatteryCharging, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  ShieldCheck,
  Radio,
  RefreshCw,
  Target,
  Zap
} from 'lucide-react';
import { getNativeBridge, isRunningInAndroidApp } from '../utils/nativeBridge';
import { LocateGoSettings, LocateGoStatus } from '../types';

interface AndroidNativeControlsProps {
  settings: LocateGoSettings;
  status: LocateGoStatus;
  onTogglePower: () => void;
  onUpdateSettings: (newSettings: Partial<LocateGoSettings>) => void;
}

const TARGET_PACKAGES_INFO = [
  { pkg: 'Sa.lg.android.locate', name: 'Locate Go', label: 'الرئيسي' },
  { pkg: 'sa.lg.android.locatcc', name: 'Locate CC', label: 'كول سنتر' },
  { pkg: 'Sa.lg.android.locati', name: 'Locate I', label: 'فئة I' },
  { pkg: 'sa.lg.android.locatm', name: 'Locate M', label: 'فئة M' },
  { pkg: 'sa.lg.android.locatg', name: 'Locate G', label: 'فئة G' },
  { pkg: 'Sa.lg.android.locatf', name: 'Locate F', label: 'فئة F' },
];

export const AndroidNativeControls: React.FC<AndroidNativeControlsProps> = ({
  settings,
  status,
  onTogglePower,
  onUpdateSettings,
}) => {
  const isAndroid = isRunningInAndroidApp();
  const [nativeStatus, setNativeStatus] = useState<{
    isTrackingRunning?: boolean;
    hasOverlayPermission?: boolean;
    isOverlayShowing?: boolean;
    isAccessibilityEnabled?: boolean;
    currentLatitude?: number | null;
    currentLongitude?: number | null;
    isNativeApp?: boolean;
    androidVersion?: string;
  }>({});

  const refreshNativeState = () => {
    const bridge = getNativeBridge();
    if (bridge) {
      try {
        const res = JSON.parse(bridge.getAndroidStatusJson());
        if (typeof bridge.isAccessibilityEnabled === 'function') {
          res.isAccessibilityEnabled = bridge.isAccessibilityEnabled();
        }
        setNativeStatus(res);
      } catch {
        // Fallback
      }
    }
  };

  useEffect(() => {
    refreshNativeState();
    const timer = setInterval(refreshNativeState, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenAccessibility = () => {
    const bridge = getNativeBridge();
    if (bridge) {
      bridge.openAccessibilitySettings();
    } else {
      alert('متاح فقط عند تشغيل التطبيق داخل بيئة أندرويد (Single App)');
    }
  };

  const handleToggleOverlay = () => {
    const bridge = getNativeBridge();
    if (bridge) {
      bridge.toggleFloatingOverlay();
      setTimeout(refreshNativeState, 500);
    } else {
      alert('متاح فقط عند تشغيل التطبيق داخل بيئة أندرويد (Single App)');
    }
  };

  const handleBatteryOptimization = () => {
    const bridge = getNativeBridge();
    if (bridge) {
      bridge.requestBatteryOptimization();
    } else {
      alert('متاح فقط عند تشغيل التطبيق داخل بيئة أندرويد (Single App)');
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#0e1626] to-[#0a0f1d] border border-cyan-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">إدارة نظام أندرويد المتكاملة (Single App Mode)</h3>
              {isAndroid ? (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  داخل تطبيق أندرويد
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400">
                  <Radio className="w-3 h-3 text-cyan-400" />
                  محاكاة المتصفح
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              تحكم مباشر بخدمات الهاتف الخلفية، قراءة الشاشة، والنافذة العائمة من نفس واجهة السائق
            </p>
          </div>
        </div>

        {isAndroid && (
          <button
            onClick={refreshNativeState}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-3 py-1.5 rounded-lg cursor-pointer active:scale-95 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تحديث حالة النظام</span>
          </button>
        )}
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        {/* Button 1: Accessibility Service */}
        <button
          onClick={handleOpenAccessibility}
          className={`flex flex-col text-right p-3.5 rounded-xl bg-slate-900/80 border transition-all cursor-pointer group ${
            nativeStatus.isAccessibilityEnabled
              ? 'border-emerald-500/40 hover:bg-slate-800/60'
              : 'border-amber-500/40 hover:border-amber-400 bg-amber-950/20 hover:bg-amber-950/30'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className={`p-2 rounded-lg transition-transform group-hover:scale-105 ${
              nativeStatus.isAccessibilityEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              <Accessibility className="w-4 h-4" />
            </div>
            <span className={`text-[11px] px-2 py-0.5 rounded-md border ${
              nativeStatus.isAccessibilityEnabled
                ? 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30'
                : 'text-amber-300 bg-amber-950/60 border-amber-500/40 animate-pulse'
            }`}>
              {nativeStatus.isAccessibilityEnabled ? 'الخدمة مفعلة ✅' : 'يلزم التفعيل ⚡'}
            </span>
          </div>
          <span className="text-sm font-semibold text-white mb-0.5">خدمة إمكانية الوصول (قراءة الشاشة)</span>
          <span className="text-[11px] text-slate-400 leading-relaxed">
            {nativeStatus.isAccessibilityEnabled
              ? 'الخدمة نشطة وتعمل الآن، قادرة على قراءة الطلبات والسحب التلقائي.'
              : 'اضغط لفتح إعدادات الهاتف وتفعيل Locate Go للسماح بالسحب التلقائي.'}
          </span>
        </button>

        {/* Button 2: Floating Overlay Pill */}
        <button
          onClick={handleToggleOverlay}
          className="flex flex-col text-right p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-800/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
            <span className={`text-[11px] px-2 py-0.5 rounded-md border ${
              nativeStatus.isOverlayShowing 
                ? 'text-cyan-300 bg-cyan-950/70 border-cyan-500/40' 
                : 'text-slate-400 bg-slate-800/60 border-slate-700'
            }`}>
              {nativeStatus.isOverlayShowing ? 'النافذة نشطة' : 'تفعيل / إيقاف'}
            </span>
          </div>
          <span className="text-sm font-semibold text-white mb-0.5">النافذة العائمة (Overlay Pill)</span>
          <span className="text-[11px] text-slate-400 leading-relaxed">
            ظهور كبسولة عائمة خفيفة وقابلة للتحريك أثناء استخدام تطبيقات التوصيل.
          </span>
        </button>

        {/* Button 3: Battery Optimization */}
        <button
          onClick={handleBatteryOptimization}
          className="flex flex-col text-right p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-800/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
              <BatteryCharging className="w-4 h-4" />
            </div>
            <span className="text-[11px] text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-500/20">
              استثناء فوري
            </span>
          </div>
          <span className="text-sm font-semibold text-white mb-0.5">استثناء توفير الطاقة</span>
          <span className="text-[11px] text-slate-400 leading-relaxed">
            منع نظام أندرويد من قتل خدمة الخلفية عند قفل شاشة الهاتف.
          </span>
        </button>
      </div>

      {/* Target Delivery Applications Matrix */}
      <div className="mt-4 pt-3.5 border-t border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">حزم تطبيقات التوصيل المستهدفة (6 حزم نشطة - Zero Delay):</span>
          </div>
          <span className="text-[11px] text-teal-300 font-medium flex items-center gap-1">
            <Zap className="w-3 h-3 text-teal-400" />
            تحكم مزدوج: المطعم (≤ {settings.maxPickupDistanceKm ?? 1.5} كم) • العميل (≤ {settings.maxDistanceKm ?? 3.0} كم) • سحب فائق (90ms)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {TARGET_PACKAGES_INFO.map((item) => (
            <div
              key={item.pkg}
              className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-2.5 flex flex-col justify-between transition-colors"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-white">{item.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 font-mono">
                  {item.label}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 truncate dir-ltr select-all" title={item.pkg}>
                {item.pkg}
              </span>
              <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  مراقب لحظياً
                </span>
                <span className="text-teal-300 font-bold">سحب فائق ⚡</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live System Diagnostics Sub-bar */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>حالة خدمة أندرويد: {status.isRunning ? 'نشطة ومتصلة' : 'متوقفة'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>نطاق العميل: <strong className="text-emerald-400 font-bold">{settings.maxDistanceKm ?? 3.0} كم</strong></span>
          <span>•</span>
          <span>نطاق المطعم: <strong className="text-teal-400 font-bold">{settings.maxPickupDistanceKm ?? 1.5} كم</strong></span>
          <span>•</span>
          <span>آلية القبول: <strong className="text-teal-300 font-bold">سحب فوري (90ms)</strong></span>
          <span>•</span>
          <span>القبول التلقائي: <strong className={settings.autoAccept ? 'text-emerald-400' : 'text-slate-400'}>{settings.autoAccept ? 'مفعل' : 'معطل'}</strong></span>
        </div>
      </div>
    </div>
  );
};
