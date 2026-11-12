import React, { useState } from 'react';
import { X, Key, Copy, Check, Send, Sparkles, Calendar, Smartphone, User, ShieldCheck } from 'lucide-react';
import { FIREBASE_RTDB_URL } from '../utils/firebase';

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDeviceId?: string;
}

export const CreateSubscriptionModal: React.FC<CreateSubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentDeviceId,
}) => {
  const [code, setCode] = useState<string>(() => generateRandomCode());
  const [customDays, setCustomDays] = useState<number>(30);
  const [planName, setPlanName] = useState<string>('شهر (30 يوم)');
  const [targetDeviceId, setTargetDeviceId] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [startMode, setStartMode] = useState<'on_first_activation' | 'from_now'>('on_first_activation');
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdCodeObj, setCreatedCodeObj] = useState<any | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  function generateRandomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let p1 = '';
    let p2 = '';
    for (let i = 0; i < 4; i++) {
      p1 += chars.charAt(Math.floor(Math.random() * chars.length));
      p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `VIP-${p1}-${p2}`;
  }

  function formatPlanLabel(days: number): string {
    if (days === 1) return 'تجربة يوم';
    if (days === 2) return 'يومان';
    if (days >= 3 && days <= 10) return `${days} أيام`;
    if (days === 30) return 'شهر (30 يوم)';
    if (days === 60) return 'شهرين (60 يوم)';
    if (days === 90) return '3 أشهر (90 يوم)';
    if (days === 180) return '6 أشهر (180 يوم)';
    if (days === 365) return 'سنة (365 يوم)';
    return `${days} يوم`;
  }

  const handleSelectPreset = (days: number, label?: string) => {
    setCustomDays(days);
    setPlanName(label || formatPlanLabel(days));
  };

  const handleCustomDaysChange = (val: string) => {
    let num = parseInt(val, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > 3650) num = 3650;
    setCustomDays(num);
    setPlanName(formatPlanLabel(num));
  };

  const handleAdjustDays = (delta: number) => {
    const next = Math.max(1, Math.min(3650, customDays + delta));
    setCustomDays(next);
    setPlanName(formatPlanLabel(next));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = (codeStr: string, plan: string, days: number, devId: string, phone: string) => {
    const msg = `🎉 تم تفعيل اشتراكك في نظام Locate Go!\n\n🔑 رمز الاشتراك: ${codeStr}\n⏱️ مدة الاشتراك: ${plan} (${days} يوم)\n📱 الجهاز المرتبط: ${devId || 'أي جهاز (يرتبط عند أول تفعيل)'}\n\nيرجى فتح تطبيق Locate Go ولصق الرمز للبدء فوراً.`;
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const cleanCode = code.trim().toUpperCase();
    const cleanDeviceId = targetDeviceId.replace(/[\u200B-\u200F\uFEFF\u202A-\u202E\s]/g, '').toUpperCase() || null;
    const now = Date.now();
    const expiryDate = new Date(now + customDays * 86400 * 1000).toISOString();
    const newId = `sub-${now}-${Math.floor(Math.random() * 1000)}`;

    const record = {
      id: newId,
      code: cleanCode,
      plan_name: planName,
      planName: planName,
      duration: `custom_${customDays}_days`,
      duration_days: customDays,
      durationDays: customDays,
      target_device_id: cleanDeviceId || '',
      targetDeviceId: cleanDeviceId,
      used_by: cleanDeviceId || '',
      usedByDeviceId: cleanDeviceId,
      driver_name: driverName.trim() || '',
      driverName: driverName.trim() || null,
      driver_phone: driverPhone.trim() || '',
      driverPhone: driverPhone.trim() || null,
      status: 'active',
      start_mode: startMode,
      startMode: startMode,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      activated_at: startMode === 'from_now' ? new Date().toISOString() : null,
      activatedAt: startMode === 'from_now' ? new Date().toISOString() : null,
      expiry_date: expiryDate,
      expiryDate: expiryDate,
      max_uses: 1,
      used_count: cleanDeviceId ? 1 : 0,
    };

    try {
      // 1. Direct write to Firebase Realtime Database
      const cleanBase = FIREBASE_RTDB_URL.replace(/\/+$/, '');
      try {
        await fetch(`${cleanBase}/activation_codes/${newId}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
      } catch (fbErr) {
        console.warn('Firebase RTDB direct write error:', fbErr);
      }

      // 2. Write to backend API using the exact same ID so no duplicate is created
      try {
        await fetch('/api/admin/subscriptions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': 'locate_go_master_key_9977',
          },
          body: JSON.stringify({
            id: newId,
            code: cleanCode,
            planName,
            duration: `custom_${customDays}_days`,
            durationDays: customDays,
            targetDeviceId: cleanDeviceId,
            driverName: driverName.trim(),
            driverPhone: driverPhone.trim(),
            startMode,
          }),
        });
      } catch (srvErr) {
        console.warn('Server create-code warning:', srvErr);
      }

      setCreatedCodeObj(record);
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ أثناء إنشاء الكود');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in" dir="rtl">
      <div className="bg-[#121929] border border-cyan-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 bg-[#0c1220] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Key className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">إنشاء كود اشتراك مخصص بالأيام</h2>
              <p className="text-[11px] text-slate-400">توليد رمز اشتراك بأي عدد أيام تريده وحفظه في Firebase</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">

          {/* Success Banner if Created */}
          {createdCodeObj && (
            <div className="bg-emerald-950/90 border-2 border-emerald-400 rounded-xl p-4 shadow-xl text-center space-y-3 animate-in zoom-in-95">
              <div className="flex items-center justify-center gap-2 text-emerald-300 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>تم إنشاء وتفعيل كود الاشتراك بنجاح!</span>
              </div>
              
              <div className="bg-[#090d18] border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between gap-2">
                <span className="font-mono font-black text-xl text-emerald-300 tracking-wider dir-ltr select-all">
                  {createdCodeObj.code}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(createdCodeObj.code)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ الكود'}</span>
                </button>
              </div>

              <div className="text-[11px] text-emerald-200/90 flex flex-wrap items-center justify-center gap-3">
                <span>⏱️ الباقة: <strong>{createdCodeObj.planName} ({createdCodeObj.durationDays} يوم)</strong></span>
                <span>•</span>
                <span>📱 الجهاز: <strong>{createdCodeObj.targetDeviceId || 'أي جهاز'}</strong></span>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(createdCodeObj.code, createdCodeObj.planName, createdCodeObj.durationDays, createdCodeObj.targetDeviceId || '', createdCodeObj.driverPhone || '')}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold flex items-center gap-2 transition-all cursor-pointer shadow"
                >
                  <Send className="w-4 h-4" />
                  <span>مشاركة عبر واتساب</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedCodeObj(null);
                    setCode(generateRandomCode());
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
                >
                  إنشاء كود إضافي
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-950/80 border border-rose-500/50 text-rose-200 p-3 rounded-xl text-center font-bold">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleCreateCode} className="space-y-4">
            
            {/* Code Field with Randomize */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">رمز الكود (Code)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="VIP-ABCD-1234"
                  className="flex-1 h-10 px-3 rounded-xl bg-[#0a0f1d] border border-slate-700 font-mono font-bold text-white text-sm focus:outline-none focus:border-cyan-400 tracking-wider dir-ltr"
                />
                <button
                  type="button"
                  onClick={() => setCode(generateRandomCode())}
                  className="h-10 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-cyan-300 cursor-pointer transition-all"
                >
                  توليد عشوائي
                </button>
              </div>
            </div>

            {/* Duration Selector: Presets + Custom Days Stepper */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-300 font-bold">مدة الاشتراك (عدد الأيام)</label>
                <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                  {planName} ({customDays} يوم)
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                {[
                  { days: 1, label: '1 يوم' },
                  { days: 3, label: '3 أيام' },
                  { days: 7, label: '7 أيام' },
                  { days: 15, label: '15 يوم' },
                  { days: 30, label: '30 يوم (شهر)' },
                  { days: 60, label: '60 يوم (شهرين)' },
                  { days: 90, label: '90 يوم (3 أشهر)' },
                  { days: 180, label: '180 يوم' },
                ].map((item) => (
                  <button
                    key={item.days}
                    type="button"
                    onClick={() => handleSelectPreset(item.days)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                      customDays === item.days
                        ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-sm'
                        : 'bg-[#151f38] border-slate-700/80 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Direct Custom Days Input & Stepper */}
              <div className="p-3 rounded-xl bg-[#0a0f1d] border border-cyan-500/50 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <span>🎯</span>
                    <span>حدد أي عدد أيام مخصص تريده:</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">1 إلى 3650 يوم</span>
                </div>

                <div className="flex items-center gap-1.5 dir-ltr">
                  <button
                    type="button"
                    onClick={() => handleAdjustDays(-10)}
                    className="h-10 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs border border-slate-700 cursor-pointer transition-all"
                    title="إنقاص 10 أيام"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustDays(-1)}
                    className="h-10 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-sm border border-slate-700 cursor-pointer transition-all"
                    title="إنقاص يوم"
                  >
                    -1
                  </button>

                  <div className="flex-1 relative flex items-center">
                    <input
                      type="number"
                      min="1"
                      max="3650"
                      value={customDays}
                      onChange={(e) => handleCustomDaysChange(e.target.value)}
                      className="w-full h-10 px-3 pl-12 rounded-xl bg-[#151f38] border border-cyan-500/60 font-mono font-black text-center text-cyan-200 text-base focus:outline-none focus:border-cyan-300 shadow-inner"
                      placeholder="30"
                    />
                    <span className="absolute left-3 text-slate-400 font-bold text-xs pointer-events-none">يوم</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdjustDays(1)}
                    className="h-10 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-sm border border-slate-700 cursor-pointer transition-all"
                    title="زيادة يوم"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustDays(10)}
                    className="h-10 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs border border-slate-700 cursor-pointer transition-all"
                    title="زيادة 10 أيام"
                  >
                    +10
                  </button>
                </div>

                {/* Day Shortcuts */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-bold">أمثلة سريعة:</span>
                  <div className="flex items-center gap-1">
                    {[5, 10, 14, 20, 45, 100].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleSelectPreset(d)}
                        className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-cyan-950 text-cyan-300 border border-slate-700 text-[10px] font-bold cursor-pointer transition-all"
                      >
                        {d} يوم
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Target Device ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-bold">ربط بمعرف جهاز المندوب (اختياري)</label>
                {currentDeviceId && (
                  <button
                    type="button"
                    onClick={() => setTargetDeviceId(currentDeviceId)}
                    className="text-[10px] text-cyan-400 hover:underline cursor-pointer font-mono"
                  >
                    استخدام معرف جهازي الحالي ({currentDeviceId})
                  </button>
                )}
              </div>
              <input
                type="text"
                value={targetDeviceId}
                onChange={(e) => setTargetDeviceId(e.target.value.toUpperCase())}
                placeholder="اتركه فارغاً ليتم ربطه تلقائياً عند أول تفعيل من المندوب"
                className="w-full h-10 px-3 rounded-xl bg-[#0a0f1d] border border-slate-700 font-mono text-cyan-300 text-xs focus:outline-none focus:border-cyan-400 dir-ltr"
              />
            </div>

            {/* Driver Name & Phone */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 font-bold mb-1">اسم المندوب (اختياري)</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="محمد العمري"
                  className="w-full h-9 px-3 rounded-xl bg-[#0a0f1d] border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">رقم الجوال / واتساب</label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="9665XXXXXXXX"
                  className="w-full h-9 px-3 rounded-xl bg-[#0a0f1d] border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-cyan-400 dir-ltr"
                />
              </div>
            </div>

            {/* Start Mode */}
            <div className="bg-[#141e3a] p-2.5 rounded-xl border border-slate-700/80">
              <span className="block text-slate-300 font-bold mb-1">بدء احتساب الصلاحية:</span>
              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="radio"
                    name="startMode"
                    value="on_first_activation"
                    checked={startMode === 'on_first_activation'}
                    onChange={() => setStartMode('on_first_activation')}
                    className="accent-emerald-500"
                  />
                  <span>يبدأ احتساب الأيام عند أول تفعيل من المندوب (مستحسن)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                  <input
                    type="radio"
                    name="startMode"
                    value="from_now"
                    checked={startMode === 'from_now'}
                    onChange={() => setStartMode('from_now')}
                    className="accent-emerald-500"
                  />
                  <span>يبدأ العد من الآن مباشرة</span>
                </label>
              </div>
            </div>

            {/* Submit & Cancel */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4 stroke-[2.5]" />
                <span>{isSubmitting ? 'جارٍ الحفظ في Firebase...' : `إنشاء كود اشتراك (${customDays} يوم)`}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-4 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
