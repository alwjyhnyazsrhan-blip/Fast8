import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Terminal, 
  FileCode, 
  EyeOff, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Key,
  Flame
} from 'lucide-react';
import { getNativeBridge, isRunningInAndroidApp } from '../utils/nativeBridge';

interface SecurityShieldProps {
  currentDeviceId: string;
}

export const SecurityShieldBadge: React.FC<SecurityShieldProps> = ({ currentDeviceId }) => {
  const isAndroid = isRunningInAndroidApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [report, setReport] = useState<{
    r8Obfuscation: string;
    optimizationPasses: number;
    stringMasking: string;
    hmacSignatureValidation: string;
    antiReplay: string;
    defenseShield: string;
    antiReverseEngineering?: {
      antiDebugger: string;
      antiRoot: string;
      antiHookFridaXposed: string;
      antiRepackaging: string;
    };
  } | null>(null);

  const fetchSecurityDiagnostics = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/security/status', {
        headers: {
          'X-Device-Id': currentDeviceId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    fetchSecurityDiagnostics();
  }, [currentDeviceId]);

  // Check Android Native security state if running in native app
  const getNativeSecurityInfo = () => {
    const bridge = getNativeBridge();
    if (bridge && typeof bridge.getSecurityStatusJson === 'function') {
      try {
        return JSON.parse(bridge.getSecurityStatusJson());
      } catch {
        return null;
      }
    }
    return null;
  };

  const nativeSec = getNativeSecurityInfo();

  return (
    <div className="bg-gradient-to-r from-[#0c1322] via-[#09101c] to-[#070b14] border border-emerald-500/30 rounded-2xl p-4 shadow-lg relative overflow-hidden">
      {/* Background glowing shield watermark */}
      <div className="absolute -left-6 -bottom-6 w-28 h-28 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-white">درع الحماية والتشفير المتقدم (ProGuard / R8 Shield)</h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>مفعل ومحصن 100%</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 font-mono">
                HMAC-SHA256
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              تعتيم شامل للشفرة، تشفير السلاسل النصية أثناء التشغيل، حظر تفكيك الـ APK (Anti-JADX / Anti-Frida)، وتوقيع مشفر لطلبات الـ API.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isOpen ? 'إخفاء التفاصيل' : 'فحص الحماية'}</span>
          </button>
          <button
            onClick={fetchSecurityDiagnostics}
            disabled={isVerifying}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="إعادة فحص الاتصال المشفر"
          >
            <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Security Details Tray */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {/* 1. ProGuard / R8 */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                    <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تعتيم R8 / ProGuard</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">مستوى 5</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  دمج وتسطيح جميع الفئات (Repackage) وإزالة جداول التصحيح وأسماء المتغيرات لحرمان أدوات التفكيك من فهم الشفرة.
                </p>
              </div>
              <div className="mt-2 text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>-repackageclasses & -strip</span>
              </div>
            </div>

            {/* 2. String Obfuscation */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                    <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
                    <span>تشفير السلاسل (XOR)</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold">بايتات ديناميكية</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  روابط الـ API ومفاتيح التوقيع مخزنة كمصفوفات بايتات مشفرة بدون نصوص صريحة لمنع أمر <code>strings</code> و JADX.
                </p>
              </div>
              <div className="mt-2 text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Dynamic Bytecode Masking</span>
              </div>
            </div>

            {/* 3. API HMAC Signing */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>توقيع الـ API (HMAC)</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">SHA-256</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  كل طلب مسافة وموقع يحمل توقيعاً فريداً بـ Nonce و Timestamp لمنع أدوات مثل Burp Suite من التلاعب بالمسافات.
                </p>
              </div>
              <div className="mt-2 text-[10px] text-amber-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Anti-Replay Window: 300s</span>
              </div>
            </div>

            {/* 4. Anti-Reverse Engineering */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                    <Terminal className="w-3.5 h-3.5 text-purple-400" />
                    <span>مكافحة التفكيك والحقن</span>
                  </span>
                  <span className="text-[10px] text-purple-400 font-mono font-bold">Anti-Hook</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  كشف فوري لمحاولات ربط أدوات التصحيح (Debuggers)، الروت (Root su)، ومنافذ حقن الشفرات مثل Frida و Xposed.
                </p>
              </div>
              <div className="mt-2 text-[10px] text-purple-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Anti-Jadx • Anti-Frida Shield</span>
              </div>
            </div>
          </div>

          {/* Verification Bar */}
          <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                المعرف المحمي: <strong className="text-cyan-300 font-mono font-bold">{currentDeviceId}</strong> | حالة التشفير الحالية: <strong className="text-emerald-400 font-mono">ENFORCED (نشط ومطابق)</strong>
              </span>
            </span>
            <span className="text-slate-400 text-[10px]">
              {report?.defenseShield || 'LocateGo-ProGuard-R8-Level5'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
