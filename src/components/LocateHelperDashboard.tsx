import React, { useState, useEffect } from 'react';
import { Play, Square, Key, Calendar, Clock, ChevronDown, ChevronUp, Radio } from 'lucide-react';
import { LocateGoStatus } from '../types';
import { Language, translations } from '../utils/i18n';

interface LocateHelperDashboardProps {
  status: LocateGoStatus;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onTogglePower: () => void;
  onOpenAssistantModal: () => void;
  onLogout: () => void;
  subscriptionDate?: string;
  expiryDate?: string;
  expiryIso?: string;
  remainingHours?: number | null;
  vipCode?: string;
  planName?: string;
  isAccessibilityEnabled?: boolean;
  onOpenAccessibility?: () => void;
}

function getExpiryTimestamp(expiryIso?: string, expiryDate?: string, remainingHours?: number | null): number {
  if (expiryIso) {
    const t = new Date(expiryIso).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (expiryDate && expiryDate.includes('/')) {
    const parts = expiryDate.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day, 23, 59, 59);
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }
  if (typeof remainingHours === 'number' && remainingHours > 0) {
    return Date.now() + remainingHours * 3600 * 1000;
  }
  return Date.now() + 24 * 3600 * 1000;
}

export const LocateHelperDashboard: React.FC<LocateHelperDashboardProps> = ({
  status,
  lang,
  onLanguageChange,
  onTogglePower,
  onOpenAssistantModal,
  onLogout,
  subscriptionDate,
  expiryDate,
  expiryIso,
  remainingHours,
  vipCode,
  planName,
  isAccessibilityEnabled = true,
  onOpenAccessibility,
}) => {
  const t = translations[lang];
  const [showToast, setShowToast] = useState<{ message: string; isWarning?: boolean } | null>(null);

  // عداد تنازلي حي ينقص كل ثانية في الوقت الفعلي أمام المستخدم
  const [currentTick, setCurrentTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const expiryTimestamp = getExpiryTimestamp(expiryIso, expiryDate, remainingHours);
  const diffMs = Math.max(0, expiryTimestamp - currentTick);
  const isExpired = diffMs <= 0;

  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  let timeRemainingStr = '';
  if (isExpired) {
    timeRemainingStr = lang === 'ar' ? 'انتهت الصلاحية' : 'Expired';
  } else if (days > 0) {
    timeRemainingStr =
      lang === 'ar'
        ? `${days} يوم و ${hours} ساعة و ${minutes} دقيقة و ${seconds} ثانية`
        : `${days}d ${hours}h ${minutes}m ${seconds}s`;
  } else {
    timeRemainingStr =
      lang === 'ar'
        ? `${hours} ساعة و ${minutes} دقيقة و ${seconds} ثانية`
        : `${hours}h ${minutes}m ${seconds}s`;
  }

  const handleStartHelper = () => {
    if (!status.isRunning) {
      onTogglePower();
    }

    if (!isAccessibilityEnabled) {
      setShowToast({
        message: lang === 'ar' 
          ? '⚠️ تنبيه: يرجى تفعيل إمكانية الوصول ليعمل السحب التلقائي للطلبات!' 
          : '⚠️ Alert: Please enable Accessibility Service for auto-swipe to work!',
        isWarning: true,
      });
      setTimeout(() => {
        setShowToast(null);
        if (onOpenAccessibility) onOpenAccessibility();
      }, 2500);
      return;
    }

    setShowToast({ message: t.orderStartSent });
    setTimeout(() => {
      setShowToast(null);
    }, 2800);

    setTimeout(() => {
      onOpenAssistantModal();
    }, 400);
  };

  const handleStopHelper = () => {
    if (status.isRunning) {
      onTogglePower();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto relative select-none animate-fadeIn" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Toast Notification for Start Command */}
      {showToast && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-scaleIn backdrop-blur-md border ${
          showToast.isWarning 
            ? 'bg-amber-950/95 border-amber-400 text-amber-200 shadow-amber-900/50' 
            : 'bg-[#1e293b]/95 border-slate-600 text-white'
        }`}>
          <span className={`w-2.5 h-2.5 rounded-full animate-ping ${
            showToast.isWarning ? 'bg-amber-400' : 'bg-emerald-400'
          }`} />
          <span>{showToast.message}</span>
        </div>
      )}

      {/* TOP BAR: Language Toggle + Logout Button */}
      <div className="flex items-center justify-between mb-6 px-1">
        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="px-4 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 border border-slate-700/80 text-rose-300 hover:text-rose-200 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
        >
          {t.logout}
        </button>

        {/* Language Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 shadow-inner">
          <button
            onClick={() => onLanguageChange('en')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              lang === 'en'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            English
          </button>
          <button
            onClick={() => onLanguageChange('ar')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              lang === 'ar'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            العربية
          </button>
        </div>
      </div>

      {/* MAIN CARD CONTAINER */}
      <div className="bg-[#10172a]/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Glow backdrop aura */}
        <div
          className={`absolute -top-20 -left-20 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
            status.isRunning ? 'bg-emerald-500/20' : 'bg-indigo-500/10'
          }`}
        />

        {/* Round Green "L" Badge */}
        <div className="w-16 h-16 rounded-full bg-emerald-500 border-2 border-emerald-300 text-slate-950 font-black text-2xl flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.55)] mb-3">
          L
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-2xl font-black text-white tracking-tight mb-1">
          {t.helperTitle}
        </h1>
        <p className="text-xs text-slate-400 mb-5">
          {t.helperSubtitle}
        </p>

        {/* Subscription Details Box (🔑 تفاصيل الاشتراك) */}
        <div className="w-full bg-[#18223c]/80 border border-slate-700/60 rounded-2xl p-4 mb-6 text-right">
          <div className="flex items-center justify-center gap-1.5 font-bold text-xs text-slate-200 mb-3 pb-2 border-b border-slate-700/50">
            <span>🔑</span>
            <span>{t.subscriptionDetails}</span>
            {planName && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {planName}
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400 font-sans">
                <span>📅</span>
                <span>{t.subscriptionDate}</span>
              </span>
              <span className="font-bold text-slate-200">{subscriptionDate}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400 font-sans">
                <span>⏳</span>
                <span>{t.expiryDate}</span>
              </span>
              <span className="font-bold text-slate-200">{expiryDate}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/80">
              <span className="flex items-center gap-1.5 text-slate-400 font-sans">
                <span>⌛</span>
                <span>{t.timeRemaining}</span>
              </span>
              <span className="font-bold text-emerald-400">{timeRemainingStr}</span>
            </div>
          </div>
        </div>

        {/* ACCESSIBILITY PROMPT NOTIFICATION PILL */}
        {!isAccessibilityEnabled && (
          <button
            onClick={onOpenAccessibility}
            type="button"
            className="w-full mb-3.5 py-2.5 px-3.5 rounded-2xl bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-lg shadow-amber-950/30 active:scale-98 animate-pulse"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span>{lang === 'ar' ? '⚠️ إمكانية الوصول غير مفعلة في الهاتف' : '⚠️ Accessibility not enabled'}</span>
            </div>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950">
              {lang === 'ar' ? 'تفعيل الآن ⚡' : 'Enable ⚡'}
            </span>
          </button>
        )}

        {/* ACTION BUTTON 1: Large Green "Start Locate Helper" */}
        <button
          onClick={handleStartHelper}
          className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-black text-sm tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 mb-3"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>{t.startHelper}</span>
        </button>

        {/* ACTION BUTTON 2: Large Red "Stop Locate Helper" */}
        <button
          onClick={handleStopHelper}
          className="w-full py-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-98 text-white font-black text-sm tracking-wide shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 mb-6"
        >
          <Square className="w-4 h-4 fill-white" />
          <span>{t.stopHelper}</span>
        </button>

        {/* VOLUME DOWN SHORTCUT NOTE */}
        <div className="w-full p-3.5 rounded-2xl bg-[#0e1526] border border-slate-800 text-center">
          <p className="text-xs text-slate-300 leading-relaxed font-sans mb-1.5">
            {t.volumeDownHint}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            {t.quickControlHint}
          </p>
        </div>
      </div>
    </div>
  );
};
