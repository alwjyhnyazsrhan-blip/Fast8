import React, { useState, useEffect } from 'react';
import { 
  Power, 
  Play, 
  Square, 
  MapPin, 
  Store,
  UserCheck,
  Shield, 
  Navigation,
  RefreshCw,
  Zap,
  SlidersHorizontal,
  CheckCircle2
} from 'lucide-react';
import { LocateGoSettings, LocateGoStatus } from '../types';

interface MainControlCardProps {
  settings: LocateGoSettings;
  status: LocateGoStatus;
  onTogglePower: () => void;
  onUpdateMaxDistance: (km: number) => void;
  onUpdateMaxPickupDistance?: (km: number) => void;
  onUpdateSettings: (newSettings: Partial<LocateGoSettings>) => void;
  onGetLiveLocation?: () => void;
  isLocating?: boolean;
  onOpenAssistantModal?: () => void;
}

const DELIVERY_DISTANCE_PRESETS = [1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];
const PICKUP_DISTANCE_PRESETS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0];

export const MainControlCard: React.FC<MainControlCardProps> = ({
  settings,
  status,
  onTogglePower,
  onUpdateMaxDistance,
  onUpdateMaxPickupDistance,
  onUpdateSettings,
  onGetLiveLocation,
  isLocating,
  onOpenAssistantModal,
}) => {
  // Input string state for Delivery (Customer) Distance
  const [deliveryInput, setDeliveryInput] = useState(settings.maxDistanceKm.toString());
  // Input string state for Pickup (Restaurant) Distance
  const [pickupInput, setPickupInput] = useState((settings.maxPickupDistanceKm ?? 1.5).toString());

  useEffect(() => {
    setDeliveryInput(settings.maxDistanceKm.toString());
  }, [settings.maxDistanceKm]);

  useEffect(() => {
    setPickupInput((settings.maxPickupDistanceKm ?? 1.5).toString());
  }, [settings.maxPickupDistanceKm]);

  const handleDeliveryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDeliveryInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && num <= 50) {
      onUpdateMaxDistance(Math.round(num * 10) / 10);
    }
  };

  const handlePickupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPickupInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && num <= 50 && onUpdateMaxPickupDistance) {
      onUpdateMaxPickupDistance(Math.round(num * 10) / 10);
    }
  };

  const adjustDeliveryDistance = (delta: number) => {
    const nextVal = Math.max(0.5, Math.min(25, Math.round((settings.maxDistanceKm + delta) * 10) / 10));
    setDeliveryInput(nextVal.toString());
    onUpdateMaxDistance(nextVal);
  };

  const adjustPickupDistance = (delta: number) => {
    const current = settings.maxPickupDistanceKm ?? 1.5;
    const nextVal = Math.max(0.2, Math.min(25, Math.round((current + delta) * 10) / 10));
    setPickupInput(nextVal.toString());
    if (onUpdateMaxPickupDistance) {
      onUpdateMaxPickupDistance(nextVal);
    } else {
      onUpdateSettings({ maxPickupDistanceKm: nextVal });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. BIG START / STOP BUTTON & GPS BAR (Left Column) */}
      <div className="lg:col-span-5 bg-gradient-to-b from-[#121929] to-[#0c1220] rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between relative overflow-hidden">
        {/* Glow ambient background aura */}
        <div
          className={`absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
            status.isRunning ? 'bg-emerald-500/20' : 'bg-rose-500/10'
          }`}
        />

        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
                <Power className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-white">التحكم الرئيسي بالأداة</h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  status.isRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
                }`}
              />
              <span className={`font-semibold ${status.isRunning ? 'text-emerald-400' : 'text-slate-400'}`}>
                {status.isRunning ? 'يعمل بنشاط' : 'متوقف مؤقتاً'}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            يراقب الشاشة ويفلتر مسافتي المطعم والعميل لحظياً، ويسحب شريط القبول بأقصى سرعة فور مطابقة الشروط.
          </p>
        </div>

        {/* The Massive Start/Stop Button */}
        <div className="my-2 flex flex-col items-center justify-center">
          <button
            id="btn-master-start-stop"
            onClick={onTogglePower}
            className={`group relative w-full sm:w-64 h-36 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 active:scale-95 cursor-pointer select-none border-2 shadow-2xl ${
              status.isRunning
                ? 'bg-gradient-to-b from-rose-950/80 to-rose-900/60 border-rose-500/80 text-rose-100 hover:border-rose-400 shadow-rose-950/50 hover:shadow-rose-900/40'
                : 'bg-gradient-to-b from-emerald-950/80 to-emerald-900/60 border-emerald-500/80 text-emerald-100 hover:border-emerald-400 shadow-emerald-950/50 hover:shadow-emerald-900/40'
            }`}
          >
            {status.isRunning && (
              <span className="absolute inset-0 rounded-2xl border-2 border-rose-500 animate-ping opacity-25 pointer-events-none" />
            )}

            <div
              className={`w-13 h-13 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg ${
                status.isRunning
                  ? 'bg-rose-500 text-white shadow-rose-600/40'
                  : 'bg-emerald-500 text-slate-950 shadow-emerald-600/40'
              }`}
            >
              {status.isRunning ? (
                <Square className="w-6 h-6 fill-white" />
              ) : (
                <Play className="w-6 h-6 fill-current mr-0.5" />
              )}
            </div>

            <div className="text-center">
              <span className="text-xl font-black tracking-tight block">
                {status.isRunning ? 'إيقاف الأداة' : 'تشغيل الأداة'}
              </span>
              <span
                className={`text-[11px] font-medium block mt-0.5 ${
                  status.isRunning ? 'text-rose-300' : 'text-emerald-300'
                }`}
              >
                {status.isRunning
                  ? 'المراقبة وفلترة المسافات نشطة'
                  : 'اضغط للبدء الفوري برصد الطلبات'}
              </span>
            </div>
          </button>
        </div>

        {/* GPS Location & Live Sync Bar */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Navigation className="w-3.5 h-3.5 text-cyan-400" />
              <span>موقع المندوب الجغرافي:</span>
            </div>
            {onGetLiveLocation && (
              <button
                onClick={onGetLiveLocation}
                disabled={isLocating}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'جاري التحديد...' : 'تحديث GPS'}</span>
              </button>
            )}
          </div>

          <div className="bg-[#090d16] p-2 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-400 flex items-center justify-between">
            {status.driverLocation ? (
              <div className="text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>خط العرض: {status.driverLocation.lat.toFixed(4)}</span>
                <span>•</span>
                <span>خط الطول: {status.driverLocation.lng.toFixed(4)}</span>
              </div>
            ) : (
              <span className="text-slate-500">اضغط "تحديث GPS" لالتقاط إحداثيات موقعك الحقيقية</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. DUAL DISTANCE CONTROLS: RESTAURANT & CUSTOMER (Right Column) */}
      <div className="lg:col-span-7 bg-gradient-to-b from-[#121929] to-[#0c1220] rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
                <SlidersHorizontal className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-white">التحكم المزدوج بمسافة المطعم والعميل</h2>
                <p className="text-[11px] text-slate-400">تحكم مستقل بمسافة الاستلام ومسافة التوصيل</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                <span className="text-slate-300 text-[11px] font-semibold">قبول تلقائي:</span>
                <input
                  id="checkbox-auto-accept"
                  type="checkbox"
                  checked={settings.autoAccept}
                  onChange={(e) => onUpdateSettings({ autoAccept: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-7 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-500 relative"></div>
              </label>
            </div>
          </div>

          {/* CONTROL BOX 1: RESTAURANT DISTANCE (مسافة المطعم / الاستلام) */}
          <div className="bg-[#090d16] p-4 rounded-xl border border-teal-900/40 hover:border-teal-700/50 transition-all text-center mb-3.5">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <span className="text-red-400 text-sm">📍</span>
              <h3 className="text-sm font-bold text-teal-200">مسافة المطعم</h3>
            </div>

            {/* Stepper Buttons Row: [ 1+ ] [ + ] [ 1.0 كم ] [ - ] [ -1 ] */}
            <div className="flex items-center justify-center gap-2 mb-2 dir-ltr">
              <button
                id="btn-pickup-minus-one"
                onClick={() => adjustPickupDistance(-1.0)}
                className="w-10 h-9 rounded-lg bg-[#182346] hover:bg-[#223060] active:scale-95 border border-indigo-400/30 font-bold text-xs text-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                title="تقليل 1 كم"
              >
                -1
              </button>
              <button
                id="btn-decrease-pickup"
                onClick={() => adjustPickupDistance(-0.5)}
                className="w-10 h-9 rounded-lg bg-[#182346] hover:bg-[#223060] active:scale-95 border border-indigo-400/30 font-bold text-sm text-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                title="تقليل نصف كم"
              >
                -
              </button>

              {/* Center Value Pill */}
              <div className="min-w-[95px] h-9 px-2.5 rounded-lg bg-[#0e152a] border border-cyan-500/50 flex items-center justify-center shadow-inner font-mono font-extrabold text-sm text-white tracking-wider">
                {(settings.maxPickupDistanceKm ?? 1.5).toFixed(1)} كم
              </div>

              <button
                id="btn-increase-pickup"
                onClick={() => adjustPickupDistance(0.5)}
                className="w-10 h-9 rounded-lg bg-[#182346] hover:bg-[#223060] active:scale-95 border border-indigo-400/30 font-bold text-sm text-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                title="زيادة نصف كم"
              >
                +
              </button>
              <button
                id="btn-pickup-plus-one"
                onClick={() => adjustPickupDistance(1.0)}
                className="w-10 h-9 rounded-lg bg-[#182346] hover:bg-[#223060] active:scale-95 border border-indigo-400/30 font-bold text-xs text-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                title="زيادة 1 كم"
              >
                1+
              </button>
            </div>

            <p className="text-[11px] text-slate-400">تعديل حد مسافة المتجر / المطعم (الافتراضي: 1.5 كم)</p>
          </div>

          {/* CONTROL BOX 2: CUSTOMER DISTANCE (مسافة العميل / الوجهة) */}
          <div className="bg-[#090d16] p-4 rounded-xl border border-emerald-900/40 hover:border-emerald-700/50 transition-all text-center">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <span className="text-red-400 text-sm">📍</span>
              <h3 className="text-sm font-bold text-emerald-200">مسافة العميل</h3>
            </div>

            {/* Stepper Buttons Row: [ 1+ ] [ + ] [ 3.0 كم ] [ - ] [ -1 ] */}
            <div className="flex items-center justify-center gap-2 mb-2 dir-ltr">
              <button
                id="btn-delivery-minus-one"
                onClick={() => adjustDeliveryDistance(-1.0)}
                className="w-10 h-9 rounded-lg bg-[#182346] hover:bg-[#223060] active:scale-95 border border-indigo-400/30 font-bold text-xs text-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                title="تقليل 1 كم"
              >
                -1
              </button>
              <button
                id="btn-decrease-delivery"
                onClick={() => adjustDeliveryDistance(-0.5)}
                className="w-10 h-9 rounded-lg bg-[#182346] hover:bg-[#223060] active:scale-95 border border-indigo-400/30 font-bold text-sm text-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                title="تقليل نصف كم"
              >
                -
              </button>

              {/* Center Value Pill */}
              <div className="min-w-[95px] h-9 px-2.5 rounded-lg bg-[#0e152a] border border-cyan-500/50 flex items-center justify-center shadow-inner font-mono font-extrabold text-sm text-white tracking-wider">
                {(settings.maxDistanceKm ?? 3.0).toFixed(1)} كم
              </div>

              <button
                id="btn-increase-delivery"
                onClick={() => adjustDeliveryDistance(0.5)}
                className="w-10 h-9 rounded-lg bg-[#182346] hover:bg-[#223060] active:scale-95 border border-indigo-400/30 font-bold text-sm text-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                title="زيادة نصف كم"
              >
                +
              </button>
              <button
                id="btn-delivery-plus-one"
                onClick={() => adjustDeliveryDistance(1.0)}
                className="w-10 h-9 rounded-lg bg-[#182346] hover:bg-[#223060] active:scale-95 border border-indigo-400/30 font-bold text-xs text-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                title="زيادة 1 كم"
              >
                1+
              </button>
            </div>

            <p className="text-[11px] text-slate-400">تعديل الحد الأقصى لمسافة العميل / الوجهة (الافتراضي: 3.0 كم، نطاق 0.5 - 25 كم)</p>
          </div>
        </div>

        {/* 3. سرعة السحب & فاصل النقرات المتتالية (طراز مساعد لوكيت L.H) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* سرعة السحب */}
          <div className="p-3.5 bg-[#090d16] rounded-xl border border-indigo-500/30 text-center">
            <h4 className="text-xs font-bold text-slate-200 mb-1">سرعة السحب</h4>
            <div className="text-lg font-mono font-extrabold text-cyan-400 my-0.5">
              {settings.swipeSpeedMs ?? 100} ms
            </div>
            <div className="grid grid-cols-4 gap-1 my-1.5">
              {[40, 60, 100, 150].map((preset) => (
                <button
                  key={preset}
                  onClick={() => onUpdateSettings({ swipeSpeedMs: preset })}
                  className={`py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    (settings.swipeSpeedMs ?? 60) === preset
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">
              40ms (صاروخي) | 60 | 100 | 150 – الأقل أسرع في اصطياد الطلبات
            </p>
          </div>

          {/* فاصل النقرات المتتالية */}
          <div className="p-3.5 bg-[#090d16] rounded-xl border border-indigo-500/30 flex flex-col justify-between">
            <h4 className="text-xs font-bold text-slate-200 text-center">
              فاصل النقرات المتتالية | Repeated-tap Interval
            </h4>
            <div className="flex items-center justify-between text-[11px] text-slate-300 my-1.5">
              <span>تفعيل القيمة المخصصة</span>
              <button
                onClick={() =>
                  onUpdateSettings({ enableCustomInterval: !(settings.enableCustomInterval ?? false) })
                }
                type="button"
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors ${
                  settings.enableCustomInterval ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    settings.enableCustomInterval ? 'translate-x-0' : '-translate-x-4'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-center gap-1.5 dir-ltr">
              <input
                type="number"
                min={5}
                max={1000}
                disabled={!settings.enableCustomInterval}
                value={settings.tapIntervalMs ?? 10}
                onChange={(e) =>
                  onUpdateSettings({ tapIntervalMs: Math.max(5, Math.min(1000, Number(e.target.value))) })
                }
                className={`w-18 h-7 text-center rounded-lg font-mono font-bold text-xs border ${
                  settings.enableCustomInterval
                    ? 'bg-[#0e152a] text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-800/60 text-slate-500 border-slate-700 cursor-not-allowed'
                }`}
              />
              <span className="text-[10px] text-slate-400 font-mono">ms (5-1000)</span>
            </div>
          </div>
        </div>

        {/* 4. زر فتح واجهة مساعد لوكيت L.H العائمة */}
        {onOpenAssistantModal && (
          <button
            onClick={onOpenAssistantModal}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-indigo-500/20 hover:from-emerald-500/30 hover:to-indigo-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group"
          >
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
              L.H
            </span>
            <span>فتح نافذة «مساعد لوكيت L.H» العائمة المتطابقة مع الجوال</span>
          </button>
        )}
      </div>
    </div>
  );
};
