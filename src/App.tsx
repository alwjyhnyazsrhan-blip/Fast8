import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MainControlCard } from './components/MainControlCard';
import { LiveStatusIndicator } from './components/LiveStatusIndicator';
import { OrdersFeed } from './components/OrdersFeed';
import { AndroidNativeControls } from './components/AndroidNativeControls';
import { VipLockScreen } from './components/VipLockScreen';
import { SecurityShieldBadge } from './components/SecurityShieldBadge';
import { LocateAssistantModal } from './components/LocateAssistantModal';
import { LocateHelperDashboard } from './components/LocateHelperDashboard';
import { AccessibilityPromptBanner } from './components/AccessibilityPromptBanner';
import { Language } from './utils/i18n';
import { Radio, ChevronDown, ChevronUp } from 'lucide-react';
import { LocateGoSettings, LocateGoStatus, OrderItem, AppSource } from './types';
import { INITIAL_ORDERS, APP_CONFIG, resolveAppSource } from './utils/sampleData';
import { soundManager } from './utils/audio';
import { getNativeBridge, isRunningInAndroidApp } from './utils/nativeBridge';
import { getActiveDeviceId, syncHardwareDeviceId, setActiveDeviceId } from './utils/device';
import { getSecureApiHeaders } from './utils/security';
import {
  validateLicenseOnline,
  executeEmergencyTermination,
  consumeTerminationNotice,
} from './utils/licenseManager';
import { FIREBASE_RTDB_URL } from './utils/firebase';

export default function App() {
  const [deviceId, setDeviceIdState] = useState<string>(getActiveDeviceId());
  const [currentLang, setCurrentLang] = useState<Language>('ar');
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState<boolean>(false);
  const [activePlanName, setActivePlanName] = useState<string>(() => {
    try {
      return localStorage.getItem('vip_plan_name') || 'تجربة يوم';
    } catch {
      return 'تجربة يوم';
    }
  });

  // حساب وتصحيح تواريخ الاشتراك وتاريخ الانتهاء لتتوافق تماماً مع مدة الباقة (تجربة يوم = 24 ساعة بالضبط)
  const initialDates = (() => {
    try {
      const savedPlan = localStorage.getItem('vip_plan_name') || 'تجربة يوم';
      const is1DayTrial = savedPlan.includes('تجربة يوم') || savedPlan === '1 day' || savedPlan === '1 يوم' || savedPlan === 'تجربة';
      const savedExpiry = localStorage.getItem('vip_expiry_date');
      const savedActivatedAt = localStorage.getItem('vip_activated_at');
      const now = new Date();

      if (savedExpiry) {
        let expD = new Date(savedExpiry);
        if (!isNaN(expD.getTime())) {
          let actD: Date | null = null;
          if (savedActivatedAt) {
            const parsed = new Date(savedActivatedAt);
            if (!isNaN(parsed.getTime())) actD = parsed;
          }

          // إذا كانت الباقة تجربة يوم: يجب أن يكون الفرق يوماً واحداً بالضبط (24 ساعة)
          if (is1DayTrial) {
            if (!actD) {
              // إذا لم يُحفظ تاريخ التفعيل وكان الفرق كبيراً عن 24 ساعة، نحسب التفعيل كـ 24 ساعة قبل الانتهاء
              actD = new Date(expD.getTime() - 24 * 3600 * 1000);
              localStorage.setItem('vip_activated_at', actD.toISOString());
            } else if (expD.getTime() - actD.getTime() > 26 * 3600 * 1000) {
              // تصحيح أي تباعد قديم ناتج عن باقة الـ 3 أيام السابقة ليكون 24 ساعة فقط
              expD = new Date(actD.getTime() + 24 * 3600 * 1000);
              localStorage.setItem('vip_expiry_date', expD.toISOString());
            }
          }

          if (!actD) {
            actD = new Date(expD.getTime() - 30 * 24 * 3600 * 1000);
          }

          const subFormatted = `${String(actD.getDate()).padStart(2, '0')}/${String(actD.getMonth() + 1).padStart(2, '0')}/${actD.getFullYear()}`;
          const expFormatted = `${String(expD.getDate()).padStart(2, '0')}/${String(expD.getMonth() + 1).padStart(2, '0')}/${expD.getFullYear()}`;
          return {
            subDate: subFormatted,
            expDate: expFormatted,
            expIso: expD.toISOString(),
          };
        }
      }

      // افتراضي: عرض تواريخ مؤقتة دون حفظ في التخزين المحلي حتى يتم التفعيل الفعلي
      const actD = now;
      const expD = new Date(actD.getTime() + 24 * 3600 * 1000);
      const subFormatted = `${String(actD.getDate()).padStart(2, '0')}/${String(actD.getMonth() + 1).padStart(2, '0')}/${actD.getFullYear()}`;
      const expFormatted = `${String(expD.getDate()).padStart(2, '0')}/${String(expD.getMonth() + 1).padStart(2, '0')}/${expD.getFullYear()}`;
      return {
        subDate: subFormatted,
        expDate: expFormatted,
        expIso: expD.toISOString(),
      };
    } catch {
      const now = new Date();
      const expD = new Date(now.getTime() + 24 * 3600 * 1000);
      return {
        subDate: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
        expDate: `${String(expD.getDate()).padStart(2, '0')}/${String(expD.getMonth() + 1).padStart(2, '0')}/${expD.getFullYear()}`,
        expIso: expD.toISOString(),
      };
    }
  })();

  const [subscriptionDate, setSubscriptionDate] = useState<string>(initialDates.subDate);
  const [expiryDate, setExpiryDate] = useState<string>(initialDates.expDate);
  const [expiryIso, setExpiryIso] = useState<string>(initialDates.expIso);
  const [showAdvancedTools, setShowAdvancedTools] = useState<boolean>(false);
  const [settings, setSettings] = useState<LocateGoSettings>(() => {
    try {
      const saved = localStorage.getItem('locatego_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          maxDistanceKm: typeof parsed.maxDistanceKm === 'number' && parsed.maxDistanceKm > 0 ? parsed.maxDistanceKm : 3.0,
          maxPickupDistanceKm: typeof parsed.maxPickupDistanceKm === 'number' && parsed.maxPickupDistanceKm > 0 ? parsed.maxPickupDistanceKm : 1.5,
          autoAccept: parsed.autoAccept ?? true,
          soundAlerts: false,
          vibrationFeedback: false,
          swipeSpeedMs: parsed.swipeSpeedMs ?? 60,
          tapIntervalMs: parsed.tapIntervalMs ?? 10,
          enableCustomInterval: parsed.enableCustomInterval ?? false,
        };
      }
    } catch {}
    return {
      maxDistanceKm: 3.0,
      maxPickupDistanceKm: 1.5,
      autoAccept: true,
      soundAlerts: false,
      vibrationFeedback: false,
      swipeSpeedMs: 60,
      tapIntervalMs: 10,
      enableCustomInterval: false,
    };
  });

  const [orders, setOrders] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('locatego_saved_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((o: any) => ({
            ...o,
            detectedAt: new Date(o.detectedAt || Date.now()),
          }));
        }
      }
    } catch {}
    return [];
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showAssistantModal, setShowAssistantModal] = useState<boolean>(false);

  // VIP Access Lock Screen State: يُفتح فقط إذا كان الكود محفوظاً وسارياً ولم يصدر بشأنه أمر إيقاف
  const [isVipUnlocked, setIsVipUnlocked] = useState<boolean>(() => {
    try {
      const termination = localStorage.getItem('vip_termination_notice');
      if (termination) return false;

      const savedCode = localStorage.getItem('vip_active_code');
      const savedExpiry = localStorage.getItem('vip_expiry_date');
      if (savedCode && savedExpiry) {
        const expTime = new Date(savedExpiry).getTime();
        if (!isNaN(expTime) && expTime > Date.now()) {
          return true;
        }
      }
    } catch {}
    return false;
  });
  const [vipCode, setVipCode] = useState<string>(() => {
    try {
      return localStorage.getItem('vip_active_code') || '';
    } catch {
      return '';
    }
  });
  const [terminationNotice, setTerminationNotice] = useState<string | null>(null);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<number | null>(null);
  const [remainingHours, setRemainingHours] = useState<number | null>(null);

  // تحميل إشعار الإيقاف إن وجد لعرضه على المندوب
  useEffect(() => {
    try {
      const notice = consumeTerminationNotice();
      if (notice?.message) {
        setTerminationNotice(notice.message);
      }
    } catch {}
  }, []);

  // المزامنة مع جسر تطبيق أندرويد الأصيل للحفاظ على التفعيل
  useEffect(() => {
    const bridge = getNativeBridge();
    if (bridge) {
      try {
        const termination = localStorage.getItem('vip_termination_notice');
        const savedCode = localStorage.getItem('vip_active_code');
        const savedExpiry = localStorage.getItem('vip_expiry_date');
        const hasValidLicense = !termination && Boolean(savedCode && savedExpiry && new Date(savedExpiry).getTime() > Date.now());
        if (typeof bridge.setVipLicensed === 'function') {
          bridge.setVipLicensed(hasValidLicense);
        }
      } catch {}
    }
  }, []);

  // Listen for VIP Unlock event from data-bridge.js or native WebView
  useEffect(() => {
    const handleVipEvent = (e: any) => {
      setIsVipUnlocked(true);
      if (e.detail?.code) setVipCode(e.detail.code);
      const bridge = getNativeBridge();
      if (bridge && typeof bridge.setVipLicensed === 'function') {
        bridge.setVipLicensed(true);
      }
    };

    window.addEventListener('vip_unlocked', handleVipEvent);
    (window as any).onVipUnlocked = (data: any) => {
      setIsVipUnlocked(true);
      if (data?.code) setVipCode(data.code);
      const bridge = getNativeBridge();
      if (bridge && typeof bridge.setVipLicensed === 'function') {
        bridge.setVipLicensed(true);
      }
    };

    return () => {
      window.removeEventListener('vip_unlocked', handleVipEvent);
      delete (window as any).onVipUnlocked;
    };
  }, []);

  // Listen for Volume Down button shortcut from Android native shell
  useEffect(() => {
    (window as any).onVolumeDownShortcut = () => {
      setShowAssistantModal((prev) => !prev);
    };
    return () => {
      delete (window as any).onVolumeDownShortcut;
    };
  }, []);

  const [status, setStatus] = useState<LocateGoStatus>(() => {
    const isRunningDefault = (() => {
      try {
        const r = localStorage.getItem('locatego_is_running');
        return r !== null ? r === 'true' : true;
      } catch {
        return true;
      }
    })();
    return {
      deviceId: getActiveDeviceId(),
      isRunning: isRunningDefault,
      isOverlayActive: false,
      isMonitoringScreen: isRunningDefault,
      fps: 60,
      latencyMs: 12,
      lastScanTimestamp: Date.now(),
      totalScanned: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      serverConnected: true,
      driverLocation: null,
    };
  });

  // Listen for device changed events
  useEffect(() => {
    const handleDeviceChangeEvent = (e: any) => {
      if (e.detail?.deviceId) {
        setDeviceIdState(e.detail.deviceId);
      }
    };
    window.addEventListener('locate_device_changed', handleDeviceChangeEvent);
    return () => window.removeEventListener('locate_device_changed', handleDeviceChangeEvent);
  }, []);

  // ----------------------------------------------------
  // VIP LICENSE: EMERGENCY FORCE TERMINATION (إنهاء إجباري فوري)
  // يوقف جميع العمليات والخدمات فوراً ويمسح بيانات الجلسة ويعيد التوجيه لشاشة VIP ACCESS
  // ----------------------------------------------------
  const handleEmergencyTermination = useCallback(
    async (reason: string, message: string) => {
      console.warn(`[App] 🚨 تنفيذ أمر الإنهاء الإجباري للخدمات: ${reason} - ${message}`);
      setTerminationNotice(message);

      // قتل وإيقاف كافة خدمات أندرويد وإزالة الإشعارات فوراً
      const bridge = getNativeBridge();
      if (bridge) {
        try {
          if (typeof bridge.setVipLicensed === 'function') {
            bridge.setVipLicensed(false);
          }
          if (typeof bridge.killAllServices === 'function') {
            bridge.killAllServices();
          } else if (typeof bridge.stopAllServices === 'function') {
            bridge.stopAllServices();
          }
          bridge.setTrackingActive(false);
        } catch {}
      }

      await executeEmergencyTermination({
        reason,
        message,
        deviceId,
        onTerminate: () => {
          setStatus((prev) => ({
            ...prev,
            isRunning: false,
            isMonitoringScreen: false,
          }));
          setIsVipUnlocked(false);
          setVipCode('');
        },
      });
    },
    [deviceId]
  );

  // ----------------------------------------------------
  // VIP LICENSE: PERIODIC & REAL-TIME BACKGROUND HEARTBEAT
  // تحقق لحظي فوري وسريع من قاعدة بيانات فايربيس (SSE + Fast 5s Heartbeat)
  // يضمن التعطيل الفوري بأقصى سرعة فور قيام المشرف بتعطيل الكود، والتفعيل الفوري عند إعادة التنشيط
  // ----------------------------------------------------
  const runLicenseHeartbeat = useCallback(async () => {
    const activeCode = vipCode || localStorage.getItem('vip_active_code');
    if (!activeCode) {
      if (isVipUnlocked) {
        handleEmergencyTermination('revoked', '🚫 لا يوجد كود اشتراك نشط مسجل (تم حذف الكود)');
      }
      return;
    }

    try {
      const result = await validateLicenseOnline(activeCode, deviceId);

      if (!result.isValid) {
        // إذا كان خطأ شبكة مؤقت أو السيرفر غير متاح لا نوقف الخدمة إطلاقاً
        if (result.reason === 'network_error') {
          return;
        }

        // إذا كان الاشتراك مسجلاً ومحفوظاً وتاريخه لا يزال سارياً في المستقبل، نسمح له بالاستمرار (الوضع المستقل)
        const savedExpiry = localStorage.getItem('vip_expiry_date');
        if (savedExpiry) {
          const expMs = new Date(savedExpiry).getTime();
          if (!isNaN(expMs) && expMs > Date.now() && result.reason !== 'revoked' && result.reason !== 'expired') {
            return;
          }
        }

        // 🚨 ثبوت التعطيل الصريح أو انتهاء الصلاحية من قاعدة البيانات: إنهاء إجباري فوري
        if (result.reason === 'revoked' || result.reason === 'expired') {
          localStorage.removeItem('vip_active_code');
          localStorage.removeItem('vip_expiry_date');
          localStorage.removeItem('vip_plan_name');
          localStorage.removeItem('vip_activated_at');
          localStorage.removeItem('vip_active_id');
          await handleEmergencyTermination(
            result.reason,
            result.message || (result.reason === 'expired'
              ? '⏰ انتهت صلاحية كود الاشتراك في قاعدة البيانات'
              : '🚫 تم تعطيل أو إلغاء صلاحية كود الاشتراك من قبل الإدارة فوراً')
          );
          return;
        }

        // إذا كان خطأ اختلاف بصمة جهاز وكان الاشتراك سارياً ومحفوظاً، لا نوقف المندوب
        if (savedExpiry && result.reason === 'device_mismatch') {
          const expMs = new Date(savedExpiry).getTime();
          if (!isNaN(expMs) && expMs > Date.now()) {
            return;
          }
        }

        // انتهاء الصلاحية غير الموثقة
        await handleEmergencyTermination(
          result.reason,
          result.message || 'انتهت صلاحية كود الترخيص. تم إيقاف جميع العمليات وحماية الجلسة تلقائياً.'
        );
      } else {
        // الكود سليم ونشط في قاعدة البيانات
        setLastHeartbeatAt(Date.now());
        if (typeof result.remainingHours === 'number') {
          setRemainingHours(result.remainingHours);
        }
      }
    } catch (err) {
      console.error('[Heartbeat Error]:', err);
    }
  }, [vipCode, deviceId, handleEmergencyTermination]);

  // 1. تقنية البث اللحظي الفوري من فايربيس (Firebase Real-Time SSE Stream):
  // تستقبل أحداث التعطيل أو التفعيل من لوحة التحكم في أجزاء من الثانية (أقل من 100ms) وتنفذها فوراً!
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: any = null;

    const currentCode = (vipCode || localStorage.getItem('vip_active_code') || '').trim().toUpperCase();
    if (!currentCode) return;

    function initRealtimeFirebaseStream() {
      try {
        const cleanBase = FIREBASE_RTDB_URL.replace(/\/+$/, '');
        es = new EventSource(`${cleanBase}/activation_codes.json`);

        const processRealtimeUpdate = (e: MessageEvent) => {
          if (!e.data) return;
          try {
            const parsed = JSON.parse(e.data);
            const savedId = (localStorage.getItem('vip_active_id') || '').trim().toUpperCase();

            const checkItem = (item: any) => {
              if (!item || typeof item !== 'object') return;
              const codeStr = (item.code || '').toString().trim().toUpperCase();
              const itemId = (item.id || '').toString().trim().toUpperCase();
              const matchesCode = codeStr === currentCode;
              const matchesId = savedId && (itemId === savedId || itemId === currentCode);
              if (!matchesCode && !matchesId) return;

              const status = (item.status || '').toLowerCase();
              if (status === 'revoked' || status === 'disabled' || status === 'banned' || status === 'cancelled') {
                console.warn('[SSE] 🚨 أمر تعطيل أو حذف فوري واصل من فايربيس في أجزاء من الثانية!');
                handleEmergencyTermination('revoked', '🚫 تم تعطيل أو إلغاء صلاحية هذا الكود من قبل الإدارة (تم حذف الكود)');
              } else if (status === 'expired') {
                handleEmergencyTermination('expired', '⏰ انتهت صلاحية كود الاشتراك في قاعدة البيانات');
              } else if (status === 'active' || status === 'used') {
                // تفعيل فوري عند إعادة التنشيط من لوحة التحكم
                if (!isVipUnlocked) {
                  console.log('[SSE] ✅ أمر تنشيط فوري واصل من فايربيس!');
                  setTerminationNotice(null);
                  localStorage.removeItem('vip_termination_notice');
                  setIsVipUnlocked(true);
                  const bridge = getNativeBridge();
                  if (bridge && typeof bridge.setVipLicensed === 'function') {
                    bridge.setVipLicensed(true);
                  }
                }
              }
            };

            if (typeof parsed.data === 'string') {
              const strVal = parsed.data.toLowerCase();
              if (strVal === 'revoked' || strVal === 'disabled' || strVal === 'banned' || strVal === 'cancelled') {
                const pathClean = (parsed.path || '').replace(/^\/+/, '').toUpperCase();
                if (
                  pathClean.includes(currentCode) ||
                  (savedId && pathClean.includes(savedId)) ||
                  pathClean.endsWith('/STATUS')
                ) {
                  console.warn('[SSE] 🚨 أمر تعطيل فوري واصل في مسار فرعي:', parsed.path);
                  handleEmergencyTermination('revoked', '🚫 تم تعطيل أو إلغاء صلاحية هذا الكود من قبل الإدارة (تم حذف الكود)');
                  return;
                }
                runLicenseHeartbeat();
              }
            } else if (parsed.data && typeof parsed.data === 'object') {
              if (parsed.data.code || parsed.data.status) {
                checkItem(parsed.data);
              } else {
                Object.values(parsed.data).forEach(checkItem);
              }
            } else if (parsed.data === null) {
              // إذا ورد حدث حذف صريح (data: null) من فايربيس
              console.warn('[SSE] 🗑️ تم استقبال حدث حذف كود من فايربيس (data: null):', parsed.path);
              const pathPart = (parsed.path || '').replace(/^\/+/, '').trim().toUpperCase();

              if (parsed.path === '/' || !parsed.path) {
                // تم حذف كافة الأكواد نهائياً من المشرف! تعطيل فوري وحظر بدون تأخير
                console.warn('[SSE] 🚨 تم حذف كافة الأكواد من قاعدة البيانات! تعطيل فوري!');
                handleEmergencyTermination('revoked', '🚫 تم حذف وتعطيل كود الاشتراك من قبل الإدارة فوراً');
                return;
              }

              if (pathPart === currentCode || (savedId && pathPart === savedId) || pathPart.includes(currentCode)) {
                console.warn('[SSE] 🚨 تم حذف كود الاشتراك الخاص بهذا الجهاز مباشرة من فايربيس!');
                handleEmergencyTermination('revoked', '🚫 تم تعطيل أو إلغاء صلاحية هذا الكود من قبل الإدارة (تم حذف الكود)');
                return;
              }

              // التحقق الفوري كإجراء احترازي سريع لمطابقة أي ID محذوف
              runLicenseHeartbeat();
            }
          } catch {}
        };

        es.addEventListener('put', processRealtimeUpdate);
        es.addEventListener('patch', processRealtimeUpdate);
        es.onmessage = processRealtimeUpdate;

        es.onerror = () => {
          es?.close();
          reconnectTimeout = setTimeout(initRealtimeFirebaseStream, 3000);
        };
      } catch {}
    }

    initRealtimeFirebaseStream();

    return () => {
      es?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [vipCode, isVipUnlocked, handleEmergencyTermination]);

  // 2. فحص دوري سريع كل 5 ثوانٍ كخط دفاع ثانٍ فائق السرعة
  useEffect(() => {
    if (!isVipUnlocked) return;

    // فحص أولي سريع بعد ثانيتين فقط
    const initialTimer = setTimeout(() => {
      runLicenseHeartbeat();
    }, 2000);

    // فحص دوري متكرر كل 5 ثوانٍ لضمان أقصى سرعة استجابة
    const intervalTimer = setInterval(() => {
      runLicenseHeartbeat();
    }, 5000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [isVipUnlocked, runLicenseHeartbeat]);

  // ----------------------------------------------------
  // 0. Single App Architecture: Listen for Android Bridge Sync
  // ----------------------------------------------------
  useEffect(() => {
    // If inside Android App, fetch local settings from SharedPreferences
    const bridge = getNativeBridge();
    if (bridge) {
      try {
        if (bridge.getDeviceId) {
          const nativeDevId = bridge.getDeviceId();
          if (nativeDevId && nativeDevId !== deviceId) {
            setDeviceIdState(nativeDevId);
            setActiveDeviceId(nativeDevId);
          }
        }

        const rawSettings = bridge.getSettingsJson();
        if (rawSettings) {
          const parsed = JSON.parse(rawSettings);
          setSettings((prev) => ({
            ...prev,
            maxDistanceKm: parsed.maxDistanceKm ?? prev.maxDistanceKm,
            maxPickupDistanceKm: parsed.maxPickupDistanceKm ?? prev.maxPickupDistanceKm ?? 1.5,
            autoAccept: parsed.autoAccept ?? prev.autoAccept,
            soundAlerts: parsed.soundAlerts ?? prev.soundAlerts,
            minPayoutSar: parsed.minPayoutSar ?? prev.minPayoutSar,
            vibrationFeedback: parsed.vibrationFeedback ?? prev.vibrationFeedback,
            swipeSpeedMs: parsed.swipeSpeedMs ?? prev.swipeSpeedMs ?? 100,
            tapIntervalMs: parsed.tapIntervalMs ?? prev.tapIntervalMs ?? 10,
            enableCustomInterval: parsed.enableCustomInterval ?? prev.enableCustomInterval ?? false,
          }));
        }

        const rawStatus = bridge.getAndroidStatusJson();
        if (rawStatus) {
          const parsedStatus = JSON.parse(rawStatus);
          if (typeof parsedStatus.isAccessibilityEnabled === 'boolean') {
            setIsAccessibilityEnabled(parsedStatus.isAccessibilityEnabled);
          }
          if (parsedStatus.currentLatitude && parsedStatus.currentLongitude) {
            setStatus((prev) => ({
              ...prev,
              isRunning: parsedStatus.isTrackingRunning ?? prev.isRunning,
              driverLocation: {
                lat: parsedStatus.currentLatitude,
                lng: parsedStatus.currentLongitude,
                updatedAt: new Date().toISOString(),
              },
            }));
          }
        }

        if (typeof bridge.isAccessibilityEnabled === 'function') {
          setIsAccessibilityEnabled(bridge.isAccessibilityEnabled());
        }
      } catch {
        // Fallback
      }
    }

    // Register callback for continuous real-time sync from Kotlin MainActivity
    window.onLocateGoNativeSync = (nativeState) => {
      if (nativeState.isVipLicensed === false) {
        setIsVipUnlocked(false);
      }
      if (typeof nativeState.isAccessibilityEnabled === 'boolean') {
        setIsAccessibilityEnabled(nativeState.isAccessibilityEnabled);
      }
      setStatus((prev) => ({
        ...prev,
        isRunning: nativeState.isVipLicensed === false ? false : nativeState.isTrackingRunning,
        driverLocation: nativeState.lat && nativeState.lng ? {
          lat: nativeState.lat,
          lng: nativeState.lng,
          updatedAt: new Date().toISOString(),
        } : prev.driverLocation,
      }));
    };

    return () => {
      window.onLocateGoNativeSync = undefined;
    };
  }, [deviceId]);

  const checkAccessibilityStatus = useCallback(() => {
    const bridge = getNativeBridge();
    if (bridge) {
      try {
        if (typeof bridge.isAccessibilityEnabled === 'function') {
          setIsAccessibilityEnabled(bridge.isAccessibilityEnabled());
          return;
        }
        const raw = bridge.getAndroidStatusJson();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.isAccessibilityEnabled === 'boolean') {
            setIsAccessibilityEnabled(parsed.isAccessibilityEnabled);
          }
        }
      } catch {}
    }
  }, []);

  const handleOpenAccessibilitySettings = useCallback(() => {
    const bridge = getNativeBridge();
    if (bridge) {
      bridge.openAccessibilitySettings();
    }
  }, []);

  // ----------------------------------------------------
  // 1. Initial Sync with Real Server API (Isolated per Device) - Standalone Offline Capable
  // ----------------------------------------------------
  const fetchServerStatus = useCallback(async (targetDeviceId = deviceId) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);
      const res = await fetch(`/api/status?deviceId=${encodeURIComponent(targetDeviceId)}`, {
        headers: { 'X-Device-Id': targetDeviceId },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        setStatus((prev) => ({
          ...prev,
          deviceId: data.deviceId || targetDeviceId,
          isRunning: typeof data.isRunning === 'boolean' ? data.isRunning : prev.isRunning,
          serverConnected: true,
          driverLocation: data.driverLocation || prev.driverLocation,
          totalScanned: data.stats?.totalScanned ?? prev.totalScanned,
          acceptedCount: data.stats?.acceptedCount ?? prev.acceptedCount,
          rejectedCount: data.stats?.rejectedCount ?? prev.rejectedCount,
          acceptanceRate: data.stats?.acceptanceRate ?? prev.acceptanceRate,
          totalEarningsSar: data.stats?.totalEarningsSar ?? prev.totalEarningsSar,
        }));
        if (data.settings) {
          let hasSavedLocal = false;
          try {
            const localRaw = localStorage.getItem('locatego_settings');
            if (localRaw) {
              const localParsed = JSON.parse(localRaw);
              if (localParsed && typeof localParsed.maxDistanceKm === 'number') {
                hasSavedLocal = true;
                // مزامنة إعدادات المستخدم المحفوظة نحو السيرفر بدلاً من استبدالها بقيمه الافتراضية
                fetch('/api/settings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-Device-Id': targetDeviceId },
                  body: JSON.stringify({ ...localParsed, deviceId: targetDeviceId }),
                }).catch(() => {});
              }
            }
          } catch {}

          if (!hasSavedLocal && !getNativeBridge()) {
            setSettings(data.settings);
          }
        }
      }
    } catch {
      // السيرفر غير متصل أو منتهي الاستضافة - يعمل التطبيق في الوضع المستقل الأوفلاين 100%
      setStatus((prev) => ({ ...prev, serverConnected: true }));
    }
  }, [deviceId]);

  const fetchServerOrders = useCallback(async (targetDeviceId = deviceId) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);
      const res = await fetch(`/api/orders?deviceId=${encodeURIComponent(targetDeviceId)}`, {
        headers: { 'X-Device-Id': targetDeviceId },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.orders) && data.orders.length > 0) {
          const mappedOrders: OrderItem[] = data.orders.map((o: any) => ({
            id: o.id,
            deviceId: o.deviceId || targetDeviceId,
            appSource: resolveAppSource(o.appName),
            appName: o.appName || 'Locate Go',
            storeName: o.storeName || 'متجر',
            customerDistrict: o.customerDistrict || 'الرياض',
            distanceKm: o.distanceKm || 2.0,
            pickupDistanceKm: o.pickupDistanceKm,
            deliveryDistanceKm: o.deliveryDistanceKm,
            payoutSar: o.payoutSar || 18,
            detectedAt: new Date(o.detectedAt || Date.now()),
            status: o.status,
            rejectionReason: o.rejectionReason,
            autoAccepted: o.autoAccepted,
          }));
          setOrders(mappedOrders);
          try {
            localStorage.setItem('locatego_saved_orders', JSON.stringify(mappedOrders.slice(0, 50)));
          } catch {}
        }
      }
    } catch {
      // الاحتفاظ بالطلبات المحفوظة محلياً في localStorage
    }
  }, [deviceId]);

  useEffect(() => {
    fetchServerStatus(deviceId);
    fetchServerOrders(deviceId);
  }, [fetchServerStatus, fetchServerOrders, deviceId]);

  // Silent Hardware Device ID Sync (Android ID / Native Hardware ID)
  useEffect(() => {
    const detectHardwareDeviceId = () => {
      const bridge = getNativeBridge();
      if (bridge && typeof bridge.getDeviceId === 'function') {
        try {
          const hardwareId = bridge.getDeviceId();
          if (hardwareId && hardwareId.trim()) {
            const cleanId = hardwareId.trim().toUpperCase();
            if (cleanId !== deviceId) {
              setDeviceIdState(cleanId);
              setStatus((prev) => ({ ...prev, deviceId: cleanId }));
              syncHardwareDeviceId(cleanId);
              fetchServerStatus(cleanId);
              fetchServerOrders(cleanId);
            }
          }
        } catch {}
      }
    };

    detectHardwareDeviceId();
    const timer = setTimeout(detectHardwareDeviceId, 600);
    return () => clearTimeout(timer);
  }, [deviceId, fetchServerStatus, fetchServerOrders]);

  // ----------------------------------------------------
  // 2. Real GPS Location via HTML5 Geolocation API
  // ----------------------------------------------------
  const handleGetLiveGPSLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      alert('المتصفح لا يدعم تحديد الموقع الجغرافي');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        const driverLoc = {
          lat: latitude,
          lng: longitude,
          accuracy,
          updatedAt: new Date().toISOString(),
        };

        setStatus((prev) => ({ ...prev, driverLocation: driverLoc }));

        // Post to real server with cryptographically signed integrity headers
        try {
          const bodyStr = JSON.stringify({ lat: latitude, lng: longitude, accuracy, deviceId });
          const secureHeaders = await getSecureApiHeaders(deviceId, bodyStr);
          await fetch('/api/location', {
            method: 'POST',
            headers: secureHeaders,
            body: bodyStr,
          });
        } catch {
          // Ignored if offline
        }
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [deviceId]);

  // Sync counts and persist locally whenever orders change
  useEffect(() => {
    try {
      if (orders.length > 0) {
        localStorage.setItem('locatego_saved_orders', JSON.stringify(orders.slice(0, 50)));
      }
    } catch {}
    setStatus((prev) => ({
      ...prev,
      totalScanned: orders.length,
      acceptedCount: orders.filter((o) => o.status === 'accepted').length,
      rejectedCount: orders.filter((o) => o.status === 'rejected').length,
    }));
  }, [orders]);

  // ----------------------------------------------------
  // 3. Master Power Toggle (Synced with Server & Android Native)
  // ----------------------------------------------------
  const handleTogglePower = useCallback(async () => {
    const nextRunning = !status.isRunning;
    
    // Play sound feedback
    if (soundEnabled) {
      if (nextRunning) {
        soundManager.playStart();
      } else {
        soundManager.playStop();
      }
    }

    try {
      localStorage.setItem('locatego_is_running', String(nextRunning));
    } catch {}

    setStatus((prev) => ({
      ...prev,
      isRunning: nextRunning,
      isMonitoringScreen: nextRunning,
    }));

    // If running in Android App, notify native layer and sync latest settings
    const bridge = getNativeBridge();
    if (bridge) {
      if (nextRunning) {
        const syncedSettings = { ...settings, autoAccept: true };
        setSettings(syncedSettings);
        try {
          localStorage.setItem('locatego_settings', JSON.stringify(syncedSettings));
        } catch {}
        bridge.saveSettings(JSON.stringify(syncedSettings));
      }
      bridge.setTrackingActive(nextRunning);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      fetch('/api/status/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceId,
        },
        body: JSON.stringify({ isRunning: nextRunning, deviceId }),
        signal: controller.signal,
      }).then(() => clearTimeout(timeoutId)).catch(() => {});
    } catch {
      // Local state already updated
    }
  }, [status.isRunning, soundEnabled, deviceId]);

  // Keyboard shortcut: Spacebar toggles start/stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePower();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePower]);

  // ----------------------------------------------------
  // 4. Update Settings (Synced with Server & Android SharedPreferences)
  // ----------------------------------------------------
  const handleUpdateMaxDistance = async (km: number) => {
    setSettings((prev) => {
      const updated = { ...prev, maxDistanceKm: km };
      try {
        localStorage.setItem('locatego_settings', JSON.stringify(updated));
      } catch {}
      const bridge = getNativeBridge();
      if (bridge) {
        bridge.saveSettings(JSON.stringify(updated));
      }
      return updated;
    });

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceId,
        },
        body: JSON.stringify({ maxDistanceKm: km, deviceId }),
      });
    } catch {
      // Keep local
    }
  };

  const handleUpdateMaxPickupDistance = async (km: number) => {
    setSettings((prev) => {
      const updated = { ...prev, maxPickupDistanceKm: km };
      try {
        localStorage.setItem('locatego_settings', JSON.stringify(updated));
      } catch {}
      const bridge = getNativeBridge();
      if (bridge) {
        bridge.saveSettings(JSON.stringify(updated));
      }
      return updated;
    });

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceId,
        },
        body: JSON.stringify({ maxPickupDistanceKm: km, deviceId }),
      });
    } catch {
      // Keep local
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<LocateGoSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('locatego_settings', JSON.stringify(updated));
      } catch {}
      const bridge = getNativeBridge();
      if (bridge) {
        bridge.saveSettings(JSON.stringify(updated));
      }
      return updated;
    });

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceId,
        },
        body: JSON.stringify({ ...newSettings, deviceId }),
      });
    } catch {
      // Keep local
    }
  };

  // ----------------------------------------------------
  // 5. Instant Local Evaluation with Standalone Persistence & Background Sync
  // ----------------------------------------------------
  const handleProcessOrder = useCallback(
    async (orderPayload: {
      appName: string;
      storeName: string;
      customerDistrict?: string;
      distanceKm?: number;
      pickupDistanceKm?: number;
      deliveryDistanceKm?: number;
      payoutSar: number;
      storeLat?: number;
      storeLng?: number;
      customerLat?: number;
      customerLng?: number;
    }) => {
      // 1. حساب فوري محلي 100% دون أي اعتماد على استضافة أو خادم
      const deliveryDist = orderPayload.deliveryDistanceKm ?? orderPayload.distanceKm ?? 1.8;
      const pickupDist = orderPayload.pickupDistanceKm ?? 1.2;
      const payout = orderPayload.payoutSar || 18;

      const deliveryLimit = settings.maxDistanceKm ?? 3.0;
      const pickupLimit = settings.maxPickupDistanceKm ?? 1.5;

      const isDeliveryOk = deliveryDist <= deliveryLimit;
      const isPickupOk = pickupDist <= pickupLimit;

      let isAccepted = true;
      let rejectionReason: string | undefined = undefined;

      if (!status.isRunning) {
        isAccepted = false;
        rejectionReason = `أداة المندوب (${deviceId}) في وضع الإيقاف (Offline) - يرجى الضغط على زر تشغيل الأداة (Start) لبدء قبول الطلبات`;
      } else if (!isDeliveryOk && !isPickupOk) {
        isAccepted = false;
        rejectionReason = `تجاوز حدي المسافة معاً: مسافة العميل (${deliveryDist} كم > ${deliveryLimit} كم) ومسافة المتجر (${pickupDist} كم > ${pickupLimit} كم)`;
      } else if (!isDeliveryOk) {
        isAccepted = false;
        rejectionReason = `مسافة العميل / الوجهة (${deliveryDist} كم) تتجاوز الحد الأقصى المحدد (${deliveryLimit} كم)`;
      } else if (!isPickupOk) {
        isAccepted = false;
        rejectionReason = `مسافة المتجر / المطعم (${pickupDist} كم) تتجاوز حد مسافة المتجر المحدد (${pickupLimit} كم)`;
      }

      const newOrder: OrderItem = {
        id: `ord-${Math.floor(1000 + Math.random() * 9000)}`,
        deviceId: deviceId,
        appSource: resolveAppSource(orderPayload.appName),
        appName: orderPayload.appName,
        storeName: orderPayload.storeName,
        customerDistrict: orderPayload.customerDistrict || 'حي الياسمين',
        distanceKm: deliveryDist,
        pickupDistanceKm: pickupDist,
        deliveryDistanceKm: deliveryDist,
        payoutSar: payout,
        detectedAt: new Date(),
        status: isAccepted ? 'accepted' : 'rejected',
        rejectionReason,
        autoAccepted: isAccepted && settings.autoAccept,
      };

      setOrders((prev) => {
        const nextList = [newOrder, ...prev];
        try {
          localStorage.setItem('locatego_saved_orders', JSON.stringify(nextList.slice(0, 50)));
        } catch {}
        return nextList;
      });

      if (soundEnabled) {
        if (isAccepted) {
          soundManager.playAccepted();
        } else {
          soundManager.playRejected();
        }
      }

      // 2. إشعار خلفي غير معطل للخادم السحابي إن وجد
      try {
        const bodyStr = JSON.stringify({ ...orderPayload, deviceId });
        const secureHeaders = await getSecureApiHeaders(deviceId, bodyStr);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        fetch('/api/orders/evaluate', {
          method: 'POST',
          headers: secureHeaders,
          body: bodyStr,
          signal: controller.signal,
        }).then(() => clearTimeout(timeoutId)).catch(() => {});
      } catch {}
    },
    [status.isRunning, settings.maxDistanceKm, settings.maxPickupDistanceKm, settings.autoAccept, soundEnabled, deviceId]
  );

  // مسح سجل الطلبات محلياً وعلى السيرفر
  const handleClearOrders = async () => {
    setOrders([]);
    try {
      localStorage.removeItem('locatego_saved_orders');
    } catch {}
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      fetch(`/api/orders?deviceId=${encodeURIComponent(deviceId)}`, {
        method: 'DELETE',
        headers: { 'X-Device-Id': deviceId },
        signal: controller.signal,
      }).then(() => clearTimeout(timeoutId)).catch(() => {});
    } catch {
      // Local cleared
    }
  };

  // Real server synchronization
  const handleRefreshServerOrders = useCallback(async () => {
    setIsRefreshing(true);
    await fetchServerStatus(deviceId);
    await fetchServerOrders(deviceId);
    setIsRefreshing(false);
  }, [fetchServerStatus, fetchServerOrders, deviceId]);

  // If not unlocked, lock the entire interface with VIP ACCESS Screen
  if (!isVipUnlocked) {
    return (
      <VipLockScreen
        initialError={terminationNotice}
        lang={currentLang}
        onLanguageChange={setCurrentLang}
        onUnlock={(code, planName, expiry) => {
          setTerminationNotice(null);
          setVipCode(code);
          const effectivePlan = planName || 'تجربة يوم';
          setActivePlanName(effectivePlan);
          const is1DayTrial = effectivePlan.includes('يوم') && !effectivePlan.includes('3') && !effectivePlan.includes('شهر');
          
          const now = new Date();
          const effectiveActivatedAt = now.toISOString();
          const effectiveExpiry = expiry || (is1DayTrial 
            ? new Date(now.getTime() + 24 * 3600 * 1000).toISOString()
            : new Date(now.getTime() + 30 * 86400 * 1000).toISOString());

          setExpiryIso(effectiveExpiry);

          try {
            const expD = new Date(effectiveExpiry);
            const expFormatted = !isNaN(expD.getTime())
              ? `${String(expD.getDate()).padStart(2, '0')}/${String(expD.getMonth() + 1).padStart(2, '0')}/${expD.getFullYear()}`
              : effectiveExpiry;
            setExpiryDate(expFormatted);

            const actFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
            setSubscriptionDate(actFormatted);
          } catch {}

          try {
            localStorage.setItem('vip_active_code', code);
            localStorage.setItem('vip_unlocked_session', 'true');
            localStorage.setItem('vip_plan_name', effectivePlan);
            localStorage.setItem('vip_activated_at', effectiveActivatedAt);
            localStorage.setItem('vip_expiry_date', effectiveExpiry);
            localStorage.removeItem('vip_termination_notice');
          } catch {}

          setIsVipUnlocked(true);
          const bridge = getNativeBridge();
          if (bridge && typeof bridge.setVipLicensed === 'function') {
            bridge.setVipLicensed(true);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Top Navigation & Status Header */}
      <Header
        status={status}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onRefreshServer={handleRefreshServerOrders}
        isRefreshing={isRefreshing}
        vipCode={vipCode}
        currentDeviceId={deviceId}
        lastHeartbeatAt={lastHeartbeatAt}
        remainingHours={remainingHours}
        onRelock={() => {
          handleEmergencyTermination('user_relock', currentLang === 'ar' ? 'تم قفل التطبيق يدوياً والعودة لشاشة الدخول' : 'Application locked manually');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:px-6 space-y-6">

        {/* 0. إشعار تفعيل إمكانية الوصول (Accessibility Activation Notification Banner & Modal) */}
        <AccessibilityPromptBanner
          isAccessibilityEnabled={isAccessibilityEnabled}
          onRefreshStatus={checkAccessibilityStatus}
          lang={currentLang}
        />

        {/* 1. Main Screen matching Video 2: LocateHelperDashboard */}
        <LocateHelperDashboard
          status={status}
          lang={currentLang}
          onLanguageChange={setCurrentLang}
          onTogglePower={handleTogglePower}
          onOpenAssistantModal={() => setShowAssistantModal(true)}
          onLogout={() => {
            handleEmergencyTermination('user_logout', currentLang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully');
          }}
          subscriptionDate={subscriptionDate}
          expiryDate={expiryDate}
          expiryIso={expiryIso}
          remainingHours={remainingHours}
          vipCode={vipCode}
          planName={activePlanName}
          isAccessibilityEnabled={isAccessibilityEnabled}
          onOpenAccessibility={handleOpenAccessibilitySettings}
        />

        {/* Collapsible toggle for Advanced Tools & Live Orders Radar */}
        <div className="max-w-md mx-auto pt-2">
          <button
            onClick={() => setShowAdvancedTools(!showAdvancedTools)}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>{currentLang === 'ar' ? 'الأدوات المتقدمة ورادار الطلبات المباشرة' : 'Advanced Tools & Live Order Radar'}</span>
            </div>
            {showAdvancedTools ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Detailed Live Radar & Diagnostic Tools (Visible when toggled) */}
        {showAdvancedTools && (
          <div className="space-y-6 animate-fadeIn pt-2">
            {/* 1. Security & Anti-Reverse Engineering Protection Shield (ProGuard / R8 & API HMAC) */}
            <SecurityShieldBadge currentDeviceId={deviceId} />

            {/* 2. Android Native Integration Controls (Single App Mode) */}
            <AndroidNativeControls
              settings={settings}
              status={status}
              onTogglePower={handleTogglePower}
              onUpdateSettings={handleUpdateSettings}
            />

            {/* 3. Main Controls: Master Start/Stop & Dual Distance Thresholds */}
            <MainControlCard
              settings={settings}
              status={status}
              onTogglePower={handleTogglePower}
              onUpdateMaxDistance={handleUpdateMaxDistance}
              onUpdateMaxPickupDistance={handleUpdateMaxPickupDistance}
              onUpdateSettings={handleUpdateSettings}
              onGetLiveLocation={handleGetLiveGPSLocation}
              isLocating={isLocating}
              onOpenAssistantModal={() => setShowAssistantModal(true)}
            />

            {/* 4. Live Status & Diagnostics Indicator */}
            <LiveStatusIndicator
              status={status}
              maxDistanceKm={settings.maxDistanceKm}
              maxPickupDistanceKm={settings.maxPickupDistanceKm ?? 1.5}
            />

            {/* 5. Detected Orders Feed & History */}
            <OrdersFeed
              orders={orders}
              maxDistanceKm={settings.maxDistanceKm}
              maxPickupDistanceKm={settings.maxPickupDistanceKm ?? 1.5}
              isRunning={status.isRunning}
              onClearOrders={handleClearOrders}
              onTestCustomOrder={handleProcessOrder}
              currentDeviceId={deviceId}
            />
          </div>
        )}

      </main>

      {/* Floating HUD Access Button (مساعد لوكيت L.H) */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setShowAssistantModal(true)}
          className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 hover:from-emerald-500 hover:to-indigo-600 text-white font-bold text-xs shadow-2xl shadow-emerald-950/70 border border-emerald-400/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="فتح واجهة مساعد لوكيت L.H"
        >
          <span className="w-6 h-6 rounded-full bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-inner">
            L.H
          </span>
          <span className="tracking-wide">مساعد لوكيت</span>
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
        </button>
      </div>

      {/* Modal Overlay: مساعد لوكيت L.H (متطابق 100% مع شاشة الجوال) */}
      {showAssistantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto overscroll-contain">
          <div className="w-full max-w-md relative my-auto animate-scaleIn">
            <LocateAssistantModal
              settings={settings}
              status={status}
              onClose={() => setShowAssistantModal(false)}
              onTogglePower={handleTogglePower}
              onUpdateSettings={handleUpdateSettings}
              isFloating={true}
              lang={currentLang}
              onLanguageChange={setCurrentLang}
              onLogout={() => {
                setShowAssistantModal(false);
                handleEmergencyTermination('user_logout', currentLang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully');
              }}
            />
          </div>
        </div>
      )}

      {/* Persistent Night-Mode Driver Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-[#080c14] py-4 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-semibold">Locate Go - لوحة تحكم المناديب والتحقق الجغرافي</span>
            <span className="text-slate-400">| نظام الفلترة المباشر</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 font-mono">
            <span>حد العميل: {settings.maxDistanceKm} كم</span>
            <span>•</span>
            <span>حد المطعم: {settings.maxPickupDistanceKm ?? 1.5} كم</span>
            <span>•</span>
            <span>الطلبات: {orders.length}</span>
            <span>•</span>
            <span className={status.isRunning ? 'text-emerald-400' : 'text-slate-400'}>
              {status.isRunning ? 'المراقبة تعمل' : 'متوقف'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
