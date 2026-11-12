/**
 * Locate Go - VIP License & Security Manager
 * يدير فحص نبضات الترخيص الدورية (Heartbeat)، وإنهاء الخدمات الإجباري في الخلفية (Emergency Termination)
 */

import { getNativeBridge } from './nativeBridge';
import { soundManager } from './audio';
import { getVipDeviceId, isAuthorizedDevice } from './device';
import { db, FIREBASE_RTDB_URL } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

export interface LicenseValidationResult {
  isValid: boolean;
  reason: 'active' | 'expired' | 'revoked' | 'not_found' | 'device_mismatch' | 'network_error';
  message: string;
  code?: string;
  expiryDate?: string | null;
  remainingHours?: number;
  usedBy?: string;
  id?: string;
}

export interface TerminationNotice {
  reason: string;
  message: string;
  timestamp: number;
}

const FIREBASE_DB_URL = FIREBASE_RTDB_URL.replace(/\/+$/, '');

/**
 * دالة التحقق اللحظي من كود الترخيص من قاعدة البيانات (Firebase RTDB / Server Proxy)
 */
export async function validateLicenseOnline(
  rawCode: string,
  targetDeviceId?: string
): Promise<LicenseValidationResult> {
  const normalized = (rawCode || '').trim().toUpperCase();
  if (!normalized) {
    return {
      isValid: false,
      reason: 'not_found',
      message: 'كود الترخيص مفقود أو غير مسجل',
    };
  }

  const savedLocalCode = (typeof localStorage !== 'undefined' ? localStorage.getItem('vip_active_code') : '')?.trim().toUpperCase();
  const savedLocalExpiry = typeof localStorage !== 'undefined' ? localStorage.getItem('vip_expiry_date') : null;

  const currentDevice = targetDeviceId || getVipDeviceId();
  const vipFingerprint = getVipDeviceId();

  try {
    // محاولة 1: الفحص المباشر والسريع عبر قاعدة بيانات Firebase RTDB السحابية (مجانية ودائمة ولا تنام)
    let codesList: any[] = [];
    let networkFetchSuccess = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const directRes = await fetch(`${FIREBASE_DB_URL}/activation_codes.json`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (directRes.ok) {
        const directData = await directRes.json();
        networkFetchSuccess = true;
        if (directData && typeof directData === 'object') {
          codesList = Object.values(directData);
        }
      }
    } catch {
      // قاعدة البيانات السحابية غير متاحة حالياً أو أوفلاين
    }

    // محاولة 2: خادم Locate Go المحلي إذا كان متاحاً
    if (!networkFetchSuccess) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const serverCheckUrl = `/api/license/verify?code=${encodeURIComponent(normalized)}&deviceId=${encodeURIComponent(currentDevice)}&vipDeviceId=${encodeURIComponent(vipFingerprint)}`;
        const serverRes = await fetch(serverCheckUrl, {
          signal: controller.signal,
          headers: {
            'X-Device-Id': currentDevice,
            'X-Vip-Device-Id': vipFingerprint,
          },
        });
        clearTimeout(timeoutId);

        if (serverRes.ok) {
          const result: LicenseValidationResult = await serverRes.json();
          return result;
        }
      } catch {
        // الخادم غير متصل (الوضع المستقل نشط)
      }
    }

    // محاولة 3: فحص Cloud Firestore
    if (!networkFetchSuccess && !codesList.length) {
      try {
        const snap = await getDocs(collection(db, 'activation_codes'));
        if (!snap.empty) {
          networkFetchSuccess = true;
          snap.forEach((docSnap) => {
            codesList.push({ id: docSnap.id, ...docSnap.data() });
          });
        }
      } catch {}
    }

    // 🛡️ درع الحماية الأوفلاين: إذا كان هناك انقطاع شبكة أو السيرفر مغلق وكان الكود مفعلاً ومسجلاً محلياً وتاريخه سارٍ
    if (!networkFetchSuccess) {
      if (savedLocalCode === normalized && savedLocalExpiry) {
        const expTime = new Date(savedLocalExpiry).getTime();
        if (!isNaN(expTime) && expTime > Date.now()) {
          const remainingHours = Math.max(0, Math.ceil((expTime - Date.now()) / (1000 * 3600)));
          return {
            isValid: true,
            reason: 'active',
            message: '✅ ترخيص محلي نشط وساري الصلاحية (يعمل بشكل مستقل بدون استضافة)',
            code: normalized,
            expiryDate: savedLocalExpiry,
            remainingHours,
          };
        }
      }

      return {
        isValid: false,
        reason: 'network_error',
        message: 'تعذر الاتصال بقاعدة البيانات السحابية للتحقق الدوري (وضع العمل الأوفلاين مستمر)',
      };
    }

    // البحث عن الكود المطابق في قاعدة البيانات
    const match = codesList.find(
      (item: any) => (item?.code || '').toString().trim().toUpperCase() === normalized
    );

    if (!match) {
      return {
        isValid: false,
        reason: 'revoked',
        message: '🚫 تم تعطيل أو إلغاء صلاحية هذا الكود من قبل الإدارة (تم حذف الكود)',
      };
    }

    // 1. التحقق من حالة الإلغاء أو التعطيل
    const status = (match.status || '').toLowerCase();
    if (status === 'revoked' || status === 'banned' || status === 'disabled' || status === 'cancelled') {
      return {
        isValid: false,
        reason: 'revoked',
        message: '🚫 تم تعطيل أو إلغاء صلاحية هذا الكود من قبل الإدارة',
      };
    }

    const matchExpiry = match.expiry_date || match.expiryDate;

    // التحقق من حالة الانتهاء الصريحة في قاعدة البيانات
    if (status === 'expired') {
      return {
        isValid: false,
        reason: 'expired',
        message: '⏰ انتهى اشتراكك في قاعدة البيانات',
        expiryDate: matchExpiry,
      };
    }

    // 2. التحقق من انتهاء تاريخ الصلاحية الفعلي المسجل بقاعدة البيانات مع هامش أمان لفروقات التوقيت
    if (matchExpiry) {
      const expiryTimestamp = new Date(matchExpiry).getTime();
      const now = Date.now();
      // إضافة هامش زمني للأمان (5 دقائق = 300,000 مللي ثانية) لمنع أي تعارض مع فروقات التوقيت في الأجهزة
      if (!isNaN(expiryTimestamp) && now > expiryTimestamp + 5 * 60 * 1000) {
        return {
          isValid: false,
          reason: 'expired',
          message: `⏰ انتهت صلاحية اشتراكك في (${new Date(matchExpiry).toLocaleDateString('ar-SA')})`,
          expiryDate: matchExpiry,
          remainingHours: 0,
        };
      }
    }

    // 3. التحقق المرن والموثوق من ارتباط الكود بهذا الجهاز
    const boundDevice = match.target_device_id || match.targetDeviceId || match.used_by || match.usedByDeviceId;
    if (boundDevice && typeof boundDevice === 'string' && boundDevice.trim() !== '') {
      const isMatched = isAuthorizedDevice(boundDevice, currentDevice);
      if (!isMatched) {
        return {
          isValid: false,
          reason: 'device_mismatch',
          message: `⚠️ كود الترخيص مخصص لجهاز آخر (${boundDevice})`,
          usedBy: boundDevice,
        };
      }
    }

    // حساب الساعات المتبقية للاشتراك لعرضها فقط (دون التأثير على صلاحية الكود)
    let remainingHours: number | undefined = undefined;
    if (matchExpiry) {
      const diffMs = new Date(matchExpiry).getTime() - Date.now();
      remainingHours = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
    }

    if (match.id) {
      try {
        localStorage.setItem('vip_active_id', String(match.id));
      } catch {}
    }

    return {
      isValid: true,
      reason: 'active',
      message: '✅ كود الترخيص نشط وصالح',
      code: match.code,
      expiryDate: matchExpiry,
      remainingHours,
      usedBy: match.used_by || match.usedByDeviceId,
      id: match.id,
    };
  } catch (err) {
    console.error('[LicenseManager] Verification error:', err);
    return {
      isValid: false,
      reason: 'network_error',
      message: 'حدث خطأ أثناء الاتصال بقاعدة البيانات',
    };
  }
}

/**
 * دالة الإنهاء الإجباري (Emergency Kill Switch):
 * توقف جميع العمليات والخدمات فوراً وتلغي الجلسة وتمسح التخزين المحلي وتعيد التوجيه لشاشة VIP ACCESS
 */
export async function executeEmergencyTermination(options: {
  reason: string;
  message: string;
  deviceId?: string;
  onTerminate: () => void;
}): Promise<void> {
  const { reason, message, deviceId, onTerminate } = options;
  console.warn(`[LicenseManager] 🚨 EMERGENCY FORCE TERMINATION TRIGGERED: ${reason} - ${message}`);

  // 1. إيقاف الخدمات وحالة المراقبة في واجهة المستخدم فوراً
  try {
    onTerminate();
  } catch (e) {
    console.error('Error during onTerminate callback:', e);
  }

  // 2. إيقاف أي أصوات أو تنبيهات جارية
  try {
    soundManager.playStop();
  } catch {}

  // 3. إيقاف وقتل كافة خدمات أندرويد الخلفية ومسح الإشعارات فوراً عبر Native Bridge
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
      bridge.showToast?.(`🛑 تم إيقاف وقتل كافة الخدمات وإزالة الإشعارات: ${message}`);
    } catch (bridgeErr) {
      console.warn('Native bridge stop call failed:', bridgeErr);
    }
  }

  // 4. إرسال أمر إيقاف فوري للخادم المحلي لقطع معالجة الطلبات الخاصة بهذا الجهاز
  const targetId = deviceId || getVipDeviceId();
  try {
    fetch('/api/status/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': targetId,
      },
      body: JSON.stringify({ isRunning: false, deviceId: targetId, emergencyKill: true, reason }),
    }).catch(() => {});
  } catch {}

  // 5. مسح بيانات الجلسة النشطة والتواريخ والباقات بالكامل لمنع أي فتح صامت بعد الحذف
  try {
    localStorage.removeItem('vip_active_code');
    localStorage.removeItem('vip_expiry_date');
    localStorage.removeItem('vip_plan_name');
    localStorage.removeItem('vip_activated_at');
    localStorage.removeItem('vip_active_id');
    localStorage.removeItem('vip_admin_auth_v1');
    sessionStorage.clear();

    // حفظ إشعار الإنهاء ليظهر للمستخدم بوضوح على شاشة القفل VIP
    const notice: TerminationNotice = {
      reason,
      message,
      timestamp: Date.now(),
    };
    localStorage.setItem('vip_termination_notice', JSON.stringify(notice));
  } catch (storageErr) {
    console.error('Error clearing local session storage:', storageErr);
  }

  // 6. إطلاق حدث عام في نافذة المتصفح لإنهاء أي مهام فرعية
  try {
    window.dispatchEvent(
      new CustomEvent('locate_license_terminated', {
        detail: { reason, message, timestamp: Date.now() },
      })
    );
  } catch {}
}

/**
 * استرجاع إشعار الإنهاء المحفوظ إن وجد ومسحه بعد العرض
 */
export function consumeTerminationNotice(): TerminationNotice | null {
  try {
    const raw = localStorage.getItem('vip_termination_notice');
    if (raw) {
      const parsed = JSON.parse(raw);
      // صالح لمدة ساعتين من وقت الإنهاء
      if (Date.now() - parsed.timestamp < 2 * 60 * 60 * 1000) {
        return parsed;
      }
      localStorage.removeItem('vip_termination_notice');
    }
  } catch {}
  return null;
}
