import React from 'react';
import { 
  Locate, 
  ShieldCheck, 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  LayoutDashboard, 
  RefreshCw, 
  Wifi, 
  WifiOff
} from 'lucide-react';
import { LocateGoStatus } from '../types';

interface HeaderProps {
  status: LocateGoStatus;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRefreshServer: () => void;
  isRefreshing?: boolean;
  vipCode?: string;
  onRelock?: () => void;
  currentDeviceId?: string;
  lastHeartbeatAt?: number | null;
  remainingHours?: number | null;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  soundEnabled,
  onToggleSound,
  onRefreshServer,
  isRefreshing = false,
  vipCode,
  onRelock,
  currentDeviceId,
  lastHeartbeatAt,
  remainingHours,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0c1220]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Brand & Live Connection Tag */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-cyan-500/20 border border-emerald-500/40 shadow-lg shadow-emerald-950/40">
              <Locate className={`w-6 h-6 ${status.isRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              {status.isRunning && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  <span>Locate</span>
                  <span className="text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-500/30 text-sm">GO</span>
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  v2.4 Live
                </span>
                <span className="hidden sm:flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/40 font-bold" title="قاعدة بيانات Firebase السحابية مفعلة">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Firebase Cloud
                </span>
                {status.serverConnected ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    النظام متصل
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-500/30">
                    <WifiOff className="w-3 h-3 text-amber-400" />
                    محلي
                  </span>
                )}
                {currentDeviceId && (
                  <span className="hidden sm:flex items-center gap-1 text-[11px] text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30 font-mono" title="معرف الجهاز النشط (بيانات معزولة 100%)">
                    <Smartphone className="w-3 h-3 text-cyan-400" />
                    {currentDeviceId}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">نظام معالجة وتصفية طلبات التوصيل والتحقق الجغرافي للمناديب</p>
            </div>
          </div>

          {/* Quick status pill on mobile */}
          <div className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-900/90">
            {status.isRunning ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                يراقب
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-500" />
                متوقف
              </span>
            )}
          </div>
        </div>



        {/* Global Controls & Action trigger */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {/* Real Server Sync Button */}
          <button
            id="btn-refresh-server"
            onClick={onRefreshServer}
            title="مزامنة وتحديث سجل الطلبات اللحظي"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border-slate-700 shadow-sm cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث الطلبات</span>
          </button>

          {/* VIP Status Badge with Real-Time Background Heartbeat Indicator */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold"
            title={
              lastHeartbeatAt 
                ? `فحص الترخيص الدوري نشط (كل دقيقة) - آخر تحقق سليم: ${new Date(lastHeartbeatAt).toLocaleTimeString('ar-SA')}` 
                : 'فحص الترخيص الدوري نشط في الخلفية (كل دقيقة)'
            }
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>👑 VIP</span>
            {vipCode && <span className="hidden sm:inline font-mono text-[11px] text-amber-200/90">{vipCode}</span>}
            {remainingHours !== null && remainingHours !== undefined && (
              <span className="hidden md:inline text-[10px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-mono">
                {remainingHours > 24 ? `${Math.floor(remainingHours / 24)} يوم` : `${remainingHours} س`}
              </span>
            )}
          </div>

          {/* Relock Button */}
          {onRelock && (
            <button
              id="btn-vip-relock"
              onClick={onRelock}
              title="قفل التطبيق والعودة لشاشة VIP ACCESS"
              className="p-2 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-rose-950/40 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-all cursor-pointer text-xs"
            >
              🔒
            </button>
          )}

          {/* Sound Toggle (Silent Mode) */}
          <button
            id="btn-sound-toggle"
            onClick={onToggleSound}
            title={soundEnabled ? 'كتم التنبيهات الصوتية' : 'الوضع الصامت مفعل (بدون أي أصوات)'}
            className={`p-2 rounded-lg border transition-all ${
              soundEnabled
                ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Status Indicator Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
            {status.isRunning ? (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-semibold">المراقبة نشطة</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400">
                <ShieldAlert className="w-4 h-4 text-slate-500" />
                <span>المراقبة متوقفة</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
