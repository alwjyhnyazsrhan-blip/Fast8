import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { LocateGoSettings, LocateGoStatus } from '../types';
import { Language, translations } from '../utils/i18n';

interface LocateAssistantModalProps {
  settings: LocateGoSettings;
  status: LocateGoStatus;
  onClose?: () => void;
  onTogglePower: () => void;
  onUpdateSettings: (newSettings: Partial<LocateGoSettings>) => void;
  isFloating?: boolean;
  lang?: Language;
  onLanguageChange?: (lang: Language) => void;
  onLogout?: () => void;
}

export const LocateAssistantModal: React.FC<LocateAssistantModalProps> = ({
  settings,
  status,
  onClose,
  onTogglePower,
  onUpdateSettings,
  isFloating = false,
  lang = 'ar',
  onLanguageChange,
  onLogout,
}) => {
  const t = translations[lang];
  const [saveToast, setSaveToast] = useState<boolean>(false);

  const isAutoAcceptActive = settings.autoAccept && status.isRunning;
  const currentPickupKm = settings.maxPickupDistanceKm ?? 1.5;
  const currentDeliveryKm = settings.maxDistanceKm ?? 3.0;
  const currentSwipeSpeed = settings.swipeSpeedMs ?? 100;
  const currentTapInterval = settings.tapIntervalMs ?? 10;
  const isCustomIntervalEnabled = settings.enableCustomInterval ?? false;
  const currentCardLang = settings.orderCardLanguage ?? lang;

  const handleAdjustPickup = (delta: number) => {
    const next = Math.max(0.2, Math.min(25, Math.round((currentPickupKm + delta) * 10) / 10));
    onUpdateSettings({ maxPickupDistanceKm: next });
  };

  const handleAdjustDelivery = (delta: number) => {
    const next = Math.max(0.5, Math.min(25, Math.round((currentDeliveryKm + delta) * 10) / 10));
    onUpdateSettings({ maxDistanceKm: next });
  };

  const handleSwipeSpeedChange = (speed: number) => {
    onUpdateSettings({ swipeSpeedMs: speed });
  };

  const handleTapIntervalChange = (val: number) => {
    const clamped = Math.max(5, Math.min(1000, val));
    onUpdateSettings({ tapIntervalMs: clamped });
  };

  const handleCardLangChange = (selectedLang: 'ar' | 'en') => {
    onUpdateSettings({ orderCardLanguage: selectedLang });
  };

  const handleSaveSettings = () => {
    onUpdateSettings({
      maxPickupDistanceKm: currentPickupKm,
      maxDistanceKm: currentDeliveryKm,
      swipeSpeedMs: currentSwipeSpeed,
      tapIntervalMs: currentTapInterval,
      enableCustomInterval: isCustomIntervalEnabled,
      orderCardLanguage: currentCardLang,
      autoAccept: settings.autoAccept,
    });
    // Show green toast
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      if (onClose) onClose();
    }, 1200);
  };

  return (
    <div
      className={`w-full max-w-md mx-auto bg-[#131b34]/98 backdrop-blur-2xl border border-indigo-500/40 rounded-3xl shadow-2xl text-white font-sans select-none relative max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden ${
        isFloating ? 'ring-1 ring-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.25)]' : ''
      }`}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Toast Notification: تم حفظ الإعدادات بنجاح (Fixed inside top of modal) */}
      {saveToast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/98 border-2 border-emerald-400 text-emerald-200 px-5 py-2 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.8)] flex items-center gap-2 text-xs font-extrabold animate-bounce">
          <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
          <span>{t.settingsSavedToast}</span>
        </div>
      )}

      {/* HEADER: L.H Badge + Title + Language switcher + Logout + Close Button (Fixed at Top) */}
      <div className="shrink-0 p-4 pb-2 border-b border-indigo-500/20 bg-[#131b34]">
        <div className="flex items-center justify-between pb-1.5">
          <div className="flex items-center gap-2.5">
            {/* L.H Round Badge */}
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-xs shadow-[0_0_15px_rgba(16,185,129,0.5)] border-2 border-emerald-300">
              L.H
            </div>
            <h2 className="text-lg font-extrabold tracking-tight text-white">
              {t.helperTitle}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Toggle in Modal */}
            {onLanguageChange && (
              <div className="flex bg-[#0e1528] rounded-xl p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`px-2.5 py-0.5 text-[11px] font-bold rounded-lg transition-all ${
                    lang === 'en' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  En
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('ar')}
                  className={`px-2.5 py-0.5 text-[11px] font-bold rounded-lg transition-all ${
                    lang === 'ar' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  عربي
                </button>
              </div>
            )}

            {/* Logout in Modal */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-2.5 py-1 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-[10px] font-bold hover:bg-rose-900/60"
              >
                {t.logout}
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* STATUS SUB-HEADER */}
        <div className="text-center pt-0.5">
          <p
            className={`text-xs font-bold tracking-wide transition-colors ${
              isAutoAcceptActive
                ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                : 'text-amber-400/90'
            }`}
          >
            {isAutoAcceptActive ? t.autoAcceptActive : t.autoAcceptStopped}
          </p>
        </div>
      </div>

      {/* SCROLLABLE BODY: Contains all the settings cards smoothly */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 py-3 space-y-3 custom-scrollbar">
        {/* SECTION 1: القبول التلقائي (Card with Toggle Switch) */}
        <div className="bg-[#1b2548]/85 hover:bg-[#1f2b54] transition-all rounded-2xl p-3.5 border border-indigo-500/20 shadow-sm flex items-center justify-between">
          <div className="text-right">
            <h3 className="text-sm font-bold text-white mb-0.5">{t.autoAcceptToggleTitle}</h3>
            <p className="text-[11px] text-slate-300/80">{t.autoAcceptToggleDesc}</p>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={onTogglePower}
            type="button"
            className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-300 ease-in-out focus:outline-none ${
              settings.autoAccept && status.isRunning
                ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : 'bg-slate-700'
            }`}
            role="switch"
            aria-checked={settings.autoAccept && status.isRunning}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
                settings.autoAccept && status.isRunning ? 'translate-x-0' : '-translate-x-6'
              }`}
            />
          </button>
        </div>

      {/* SECTION 2: مسافة المطعم (Restaurant Distance Stepper Card) */}
      <div className="bg-[#1b2548]/85 rounded-2xl p-3.5 mb-3 border border-indigo-500/20 shadow-sm text-center">
        <div className="flex items-center justify-center gap-1.5 mb-2 text-slate-200">
          <span className="text-red-400 text-sm">📍</span>
          <h3 className="text-sm font-bold">{t.restaurantDistanceTitle}</h3>
        </div>

        {/* Stepper Buttons Row: [ 1+ ] [ + ] [ 1.5 كم ] [ - ] [ -1 ] */}
        <div className="flex items-center justify-center gap-2 mb-1.5 dir-ltr">
          <button
            onClick={() => handleAdjustPickup(-1.0)}
            className="w-10 h-9 rounded-xl bg-[#23315e] hover:bg-[#2b3c74] active:scale-95 border border-indigo-400/30 font-bold text-xs text-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm"
            title="تقليل 1 كم"
          >
            -1
          </button>
          <button
            onClick={() => handleAdjustPickup(-0.5)}
            className="w-10 h-9 rounded-xl bg-[#23315e] hover:bg-[#2b3c74] active:scale-95 border border-indigo-400/30 font-bold text-sm text-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm"
            title="تقليل 0.5 كم"
          >
            -
          </button>

          {/* Central Value Display Pill */}
          <div className="min-w-[95px] h-9 px-2.5 rounded-xl bg-[#0e152a] border border-cyan-500/40 flex items-center justify-center shadow-inner font-mono font-extrabold text-sm text-white tracking-wider">
            {currentPickupKm.toFixed(1)} {t.kmUnit}
          </div>

          <button
            onClick={() => handleAdjustPickup(0.5)}
            className="w-10 h-9 rounded-xl bg-[#23315e] hover:bg-[#2b3c74] active:scale-95 border border-indigo-400/30 font-bold text-sm text-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm"
            title="زيادة 0.5 كم"
          >
            +
          </button>
          <button
            onClick={() => handleAdjustPickup(1.0)}
            className="w-10 h-9 rounded-xl bg-[#23315e] hover:bg-[#2b3c74] active:scale-95 border border-indigo-400/30 font-bold text-xs text-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm"
            title="زيادة 1 كم"
          >
            1+
          </button>
        </div>

        <p className="text-[11px] text-slate-300/80">{t.restaurantDistanceDesc}</p>
      </div>

      {/* SECTION 3: مسافة العميل (Customer Distance Stepper Card) */}
      <div className="bg-[#1b2548]/85 rounded-2xl p-3.5 mb-3 border border-indigo-500/20 shadow-sm text-center">
        <div className="flex items-center justify-center gap-1.5 mb-2 text-slate-200">
          <span className="text-red-400 text-sm">📍</span>
          <h3 className="text-sm font-bold">{t.customerDistanceTitle}</h3>
        </div>

        {/* Stepper Buttons Row: [ 1+ ] [ + ] [ 3.0 كم ] [ - ] [ -1 ] */}
        <div className="flex items-center justify-center gap-2 mb-1.5 dir-ltr">
          <button
            onClick={() => handleAdjustDelivery(-1.0)}
            className="w-10 h-9 rounded-xl bg-[#23315e] hover:bg-[#2b3c74] active:scale-95 border border-indigo-400/30 font-bold text-xs text-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm"
            title="تقليل 1 كم"
          >
            -1
          </button>
          <button
            onClick={() => handleAdjustDelivery(-0.5)}
            className="w-10 h-9 rounded-xl bg-[#23315e] hover:bg-[#2b3c74] active:scale-95 border border-indigo-400/30 font-bold text-sm text-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm"
            title="تقليل 0.5 كم"
          >
            -
          </button>

          {/* Central Value Display Pill */}
          <div className="min-w-[95px] h-9 px-2.5 rounded-xl bg-[#0e152a] border border-cyan-500/40 flex items-center justify-center shadow-inner font-mono font-extrabold text-sm text-white tracking-wider">
            {currentDeliveryKm.toFixed(1)} {t.kmUnit}
          </div>

          <button
            onClick={() => handleAdjustDelivery(0.5)}
            className="w-10 h-9 rounded-xl bg-[#23315e] hover:bg-[#2b3c74] active:scale-95 border border-indigo-400/30 font-bold text-sm text-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm"
            title="زيادة 0.5 كم"
          >
            +
          </button>
          <button
            onClick={() => handleAdjustDelivery(1.0)}
            className="w-10 h-9 rounded-xl bg-[#23315e] hover:bg-[#2b3c74] active:scale-95 border border-indigo-400/30 font-bold text-xs text-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm"
            title="زيادة 1 كم"
          >
            1+
          </button>
        </div>

        <p className="text-[11px] text-slate-300/80">{t.customerDistanceDesc}</p>
      </div>

      {/* SECTION 4: السحب السريع (Swipe Speed Slider Card) */}
      <div className="bg-[#1b2548]/85 rounded-2xl p-3.5 mb-3 border border-indigo-500/20 shadow-sm text-center">
        <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center justify-center gap-1.5">
          <span>⚡</span>
          <span>{t.fastSwipeTitle}</span>
        </h3>

        <div className="text-lg font-extrabold font-mono text-cyan-400 my-0.5 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
          {currentSwipeSpeed} {t.fastSwipeUnit}
        </div>

        {/* Range Slider */}
        <div className="px-2 my-1.5 dir-ltr">
          <input
            type="range"
            min={40}
            max={200}
            step={20}
            value={currentSwipeSpeed}
            onChange={(e) => handleSwipeSpeedChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Preset Buttons for Quick Selection */}
        <div className="grid grid-cols-4 gap-1.5 my-1.5">
          {[60, 100, 150, 200].map((preset) => (
            <button
              key={preset}
              onClick={() => handleSwipeSpeedChange(preset)}
              className={`py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                currentSwipeSpeed === preset
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'bg-[#23315e] hover:bg-[#2b3c74] text-slate-300'
              }`}
            >
              {preset} ms
            </button>
          ))}
        </div>

        <p className="text-[10px] text-slate-400 font-medium">
          60ms (الأسرع والأقوى) — {t.fastSwipeDesc}
        </p>
      </div>

      {/* SECTION 5: لغة بطاقة الطلب (Order Card Language) */}
      <div className="bg-[#1b2548]/85 rounded-2xl p-3.5 mb-3 border border-indigo-500/20 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="text-right">
            <h3 className="text-xs font-bold text-slate-200">{t.orderCardLangTitle}</h3>
            <p className="text-[10px] text-slate-400">{t.orderCardLangDesc}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-[#0e152a] p-1 rounded-xl border border-indigo-500/30">
            <button
              type="button"
              onClick={() => handleCardLangChange('en')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentCardLang === 'en'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => handleCardLangChange('ar')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentCardLang === 'ar'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              العربية
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 6: فاصل النقرات المتتالية (Repeated-tap Interval Card) */}
      <div className="bg-[#1b2548]/85 rounded-2xl p-3.5 mb-4 border border-indigo-500/20 shadow-sm">
        <div className="text-center mb-1.5">
          <h3 className="text-xs font-bold text-slate-200">
            {t.repeatedTapTitle}
          </h3>
        </div>

        {/* Enable custom interval toggle row */}
        <div className="flex items-center justify-between my-1.5 text-xs text-slate-300">
          <span className="text-[11px]">{t.enableCustomValue}</span>
          <button
            onClick={() => onUpdateSettings({ enableCustomInterval: !isCustomIntervalEnabled })}
            type="button"
            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
              isCustomIntervalEnabled ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isCustomIntervalEnabled ? 'translate-x-0' : '-translate-x-5'
              }`}
            />
          </button>
        </div>

        {/* Numeric input box */}
        <div className="flex items-center justify-center gap-2 mt-1.5 dir-ltr">
          <input
            type="number"
            min={5}
            max={1000}
            disabled={!isCustomIntervalEnabled}
            value={currentTapInterval}
            onChange={(e) => handleTapIntervalChange(Number(e.target.value))}
            className={`w-20 h-8 px-2 text-center rounded-xl font-mono font-bold text-xs border transition-all ${
              isCustomIntervalEnabled
                ? 'bg-[#0e152a] text-cyan-300 border-cyan-500/50 shadow-inner'
                : 'bg-slate-800/60 text-slate-500 border-slate-700/50 cursor-not-allowed'
            }`}
          />
          <span className="text-[11px] text-slate-400 font-mono">{t.msUnit}</span>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-1">
          {t.repeatedTapDesc}
        </p>
      </div>
      {/* Close SECTION 6 */}
      </div>
      {/* Close SCROLLABLE BODY (flex-1 overflow-y-auto) */}

      {/* STICKY FOOTER: زر حفظ الإعدادات ثابت دائماً في الأسفل وواضح 100% */}
      <div className="shrink-0 p-4 pt-2.5 pb-3 border-t border-indigo-500/30 bg-[#101728]/98 backdrop-blur-md shadow-[0_-10px_25px_rgba(0,0,0,0.5)] z-20">
        {/* BIG GLOWING GREEN BUTTON: حفظ الإعدادات (Save Settings) */}
        <button
          type="button"
          onClick={handleSaveSettings}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-98 text-slate-950 font-black text-sm tracking-wide shadow-[0_0_25px_rgba(16,185,129,0.55)] transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-300/40"
        >
          <Check className="w-5 h-5 stroke-[3]" />
          <span>{t.saveSettings}</span>
        </button>

        {/* FOOTER SHORTCUT HINT */}
        <p className="text-[10px] text-slate-400 text-center mt-1.5 font-medium leading-relaxed">
          {t.volumeDownHint}
        </p>
      </div>
    </div>
  );
};
