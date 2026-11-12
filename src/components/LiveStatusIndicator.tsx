import React from 'react';
import { Eye, EyeOff, Radio, Smartphone, Activity, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { LocateGoStatus } from '../types';

interface LiveStatusIndicatorProps {
  status: LocateGoStatus;
  maxDistanceKm: number;
  maxPickupDistanceKm?: number;
}

export const LiveStatusIndicator: React.FC<LiveStatusIndicatorProps> = ({ status, maxDistanceKm, maxPickupDistanceKm = 1.5 }) => {
  const acceptanceRate =
    status.totalScanned > 0 ? Math.round((status.acceptedCount / status.totalScanned) * 100) : 0;

  return (
    <div className="bg-gradient-to-b from-[#121929] to-[#0c1220] rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
      {/* Background ambient grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b10_1px,transparent_1px),linear-gradient(to_bottom,#1e293b10_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Radar & Status Headline */}
        <div className="flex items-center gap-5 w-full md:w-auto">
          {/* Circular Radar Scanner */}
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-slate-950 border-2 border-slate-800 shadow-inner shrink-0 overflow-hidden">
            {/* Radar concentric rings */}
            <div className="absolute w-14 h-14 rounded-full border border-slate-800/80" />
            <div className="absolute w-8 h-8 rounded-full border border-slate-800/80" />
            <div className="absolute w-2 h-2 rounded-full bg-slate-600" />

            {status.isRunning ? (
              <>
                {/* Rotating scanner beam */}
                <div className="absolute inset-0 animate-[spin_3s_linear_infinite] origin-center">
                  <div className="w-1/2 h-1/2 bg-gradient-to-br from-emerald-500/40 via-emerald-500/10 to-transparent rounded-tl-full" />
                </div>
                {/* Center live pulse dot */}
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                {/* Blip dots */}
                <span className="absolute top-3 right-4 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="absolute bottom-4 left-5 w-1 h-1 rounded-full bg-cyan-400 animate-pulse delay-300" />
              </>
            ) : (
              <EyeOff className="w-6 h-6 text-slate-600" />
            )}
          </div>

          {/* Status Text & Description */}
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                  status.isRunning
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-emerald-950/50'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${status.isRunning ? 'animate-pulse' : ''}`} />
                {status.isRunning ? 'متصلة وتراقب الشاشة حالياً (Live Monitoring)' : 'الأداة متوقفة حالياً (Idle)'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mt-1.5">
              {status.isRunning
                ? 'فحص الشاشة مستمر لكافة طلبات تطبيقات التوصيل'
                : 'الأداة في وضع الاستعداد - اضغط تشغيل لبدء الرصد'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {status.isRunning
                ? `رصد فوري مستمر: قبول الطلب بالسحب الفائق (90ms) إذا كانت مسافة المطعم ≤ ${maxPickupDistanceKm} كم ومسافة العميل ≤ ${maxDistanceKm} كم`
                : 'لن يتم قبول أو تحليل أي طلبات حتى يتم تشغيل الأداة عبر الزر الرئيسي'}
            </p>
          </div>
        </div>

        {/* Live System Diagnostics Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
          {/* Overlay Permission */}
          <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800 text-right">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>النافذة العائمة</span>
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold text-slate-200">مسموحة (Overlay)</span>
            </div>
          </div>

          {/* Accessibility Service */}
          <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800 text-right">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>مراقبة الشاشة</span>
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${status.isRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              <span className="text-xs font-bold text-slate-200">
                {status.isRunning ? 'نشطة (Active)' : 'متوقفة'}
              </span>
            </div>
          </div>

          {/* Scan Latency */}
          <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800 text-right">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>زمن الاستجابة</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xs font-mono font-bold text-slate-200">
              {status.isRunning ? `${status.latencyMs} ms` : '--'}
            </div>
          </div>

          {/* Scanned Count */}
          <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800 text-right">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>إجمالي المرصود</span>
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xs font-mono font-bold text-white">
              {status.totalScanned} طلب
            </div>
          </div>
        </div>

      </div>

      {/* Metrics Bar at bottom of card */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-slate-900/50">
          <span className="text-[11px] text-slate-400 block">تم القبول تلقائياً</span>
          <span className="text-sm font-bold text-emerald-400 font-mono flex items-center justify-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {status.acceptedCount}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-slate-900/50">
          <span className="text-[11px] text-slate-400 block">تم التجاهل (مسافة زائدة)</span>
          <span className="text-sm font-bold text-rose-400 font-mono flex items-center justify-center gap-1 mt-0.5">
            <XCircle className="w-3.5 h-3.5" />
            {status.rejectedCount}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-slate-900/50">
          <span className="text-[11px] text-slate-400 block">نسبة القبول</span>
          <span className="text-sm font-bold text-cyan-400 font-mono mt-0.5 block">
            {acceptanceRate}%
          </span>
        </div>
      </div>
    </div>
  );
};
