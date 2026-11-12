import fs from 'fs';
import path from 'path';

export type SubscriptionDuration =
  | 'trial_1_day'
  | 'trial_3_days'
  | '1_month'
  | '2_months'
  | '3_months'
  | '6_months'
  | '1_year'
  | 'custom';

export type SubscriptionStatus = 'active' | 'used' | 'expired' | 'revoked';

export interface SubscriptionCode {
  id: string;
  code: string;
  planName: string;
  duration: SubscriptionDuration;
  durationDays: number;
  targetDeviceId?: string | null;
  usedByDeviceId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  notes?: string | null;
  startMode: 'on_first_activation' | 'from_now';
  createdAt: string;
  activatedAt?: string | null;
  expiryDate: string;
  status: SubscriptionStatus;
  lastVerifiedAt?: string | null;
}

export interface SubscriptionDbSchema {
  version: number;
  updatedAt: string;
  codes: Record<string, SubscriptionCode>;
  deletedCodes?: Record<string, number>;
}

export interface CreateSubscriptionPayload {
  id?: string;
  code?: string;
  planName?: string;
  duration?: SubscriptionDuration;
  durationDays?: number;
  targetDeviceId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  notes?: string | null;
  startMode?: 'on_first_activation' | 'from_now';
}

function resolveFirebaseDbUrl(): string {
  if (process.env.FIREBASE_DB_URL && process.env.FIREBASE_DB_URL.trim()) {
    return process.env.FIREBASE_DB_URL.trim().replace(/\/+$/, '');
  }
  try {
    const cfgPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      if (cfg && typeof cfg.databaseURL === 'string' && cfg.databaseURL.trim()) {
        return cfg.databaseURL.trim().replace(/\/+$/, '');
      }
    }
  } catch {}
  return 'https://appprotector-79e9c-default-rtdb.firebaseio.com';
}

export const FIREBASE_DB_URL = resolveFirebaseDbUrl();

export function toFirebasePayload(record: SubscriptionCode) {
  return {
    id: record.id,
    code: record.code,
    status: record.status,
    expiry_date: record.expiryDate,
    expiryDate: record.expiryDate,
    used_by: record.usedByDeviceId || record.targetDeviceId || '',
    usedByDeviceId: record.usedByDeviceId || null,
    target_device_id: record.targetDeviceId || '',
    targetDeviceId: record.targetDeviceId || null,
    driver_name: record.driverName || '',
    driverName: record.driverName || null,
    driver_phone: record.driverPhone || '',
    driverPhone: record.driverPhone || null,
    plan_name: record.planName,
    planName: record.planName,
    duration: record.duration,
    duration_days: record.durationDays,
    durationDays: record.durationDays,
    max_uses: 1,
    used_count: record.usedByDeviceId ? 1 : 0,
    note: record.notes || '',
    notes: record.notes || null,
    start_mode: record.startMode,
    startMode: record.startMode,
    created_at: record.createdAt,
    createdAt: record.createdAt,
    activated_at: record.activatedAt || null,
    activatedAt: record.activatedAt || null,
    last_verified_at: record.lastVerifiedAt || null,
    lastVerifiedAt: record.lastVerifiedAt || null,
  };
}

export class SubscriptionDatabase {
  private dbFilePath: string;
  private dbData: SubscriptionDbSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.error('[SubscriptionDatabase] Error creating data directory:', err);
      }
    }

    this.dbFilePath = path.join(dataDir, 'subscriptions.json');
    this.dbData = this.loadDatabase();

    // مزامنة فورية مع قاعدة بيانات فايربيس السحابية https://appprotector-79e9c-default-rtdb.firebaseio.com
    setTimeout(() => {
      this.syncAllWithFirebase()
        .then((res) => {
          console.log(`[SubscriptionDatabase] ✅ Synced ${res.syncedCount} code(s) from ${FIREBASE_DB_URL}`);
        })
        .catch((err) => {
          console.warn('[SubscriptionDatabase] Initial Firebase RTDB sync notice:', err);
        });
    }, 1000);

    // مزامنة دورية كل 60 ثانية لضمان تحديث الأكواد سحابياً أولاً بأول
    setInterval(() => {
      this.syncAllWithFirebase().catch(() => {});
    }, 60 * 1000);
  }

  private loadDatabase(): SubscriptionDbSchema {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.codes === 'object') {
          parsed.deletedCodes = parsed.deletedCodes || {};
          console.log(
            `[SubscriptionDatabase] Loaded ${Object.keys(parsed.codes).length} subscription code(s), ${Object.keys(parsed.deletedCodes).length} permanent tombstone(s).`
          );
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[SubscriptionDatabase] Error reading subscriptions.json:', err);
    }

    // Initialize with default schema and sample codes
    const initialDb: SubscriptionDbSchema = {
      version: 1,
      updatedAt: new Date().toISOString(),
      codes: {},
      deletedCodes: {},
    };
    return initialDb;
  }

  private seedDefaultCodes(db: SubscriptionDbSchema) {
    const now = Date.now();
    
    // Sample 1: 3-day trial code
    const trialCode: SubscriptionCode = {
      id: `sub-trial-${now}`,
      code: 'VIP-FREE-TRIAL',
      planName: 'تجربة 3 أيام',
      duration: 'trial_3_days',
      durationDays: 3,
      targetDeviceId: null,
      usedByDeviceId: null,
      driverName: 'تجربة مجانية',
      driverPhone: null,
      notes: 'كود تجريبي عام لمدة 3 أيام',
      startMode: 'on_first_activation',
      createdAt: new Date().toISOString(),
      activatedAt: null,
      expiryDate: new Date(now + 3 * 86400 * 1000).toISOString(),
      status: 'active',
      lastVerifiedAt: null,
    };

    // Sample 2: 1-month VIP subscription
    const monthCode: SubscriptionCode = {
      id: `sub-month-${now}`,
      code: 'LOCATE-VIP-2026',
      planName: 'شهر',
      duration: '1_month',
      durationDays: 30,
      targetDeviceId: null,
      usedByDeviceId: null,
      driverName: 'اشتراك شهري',
      driverPhone: null,
      notes: 'كود VIP شهري مفتوح لجميع الأجهزة',
      startMode: 'on_first_activation',
      createdAt: new Date().toISOString(),
      activatedAt: null,
      expiryDate: new Date(now + 30 * 86400 * 1000).toISOString(),
      status: 'active',
      lastVerifiedAt: null,
    };

    db.codes[trialCode.code] = trialCode;
    db.codes[monthCode.code] = monthCode;
  }

  private saveDatabase() {
    this.dbData.updatedAt = new Date().toISOString();
    try {
      const tempPath = `${this.dbFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.dbData, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.dbFilePath);
    } catch (err) {
      console.error('[SubscriptionDatabase] Error saving subscriptions.json:', err);
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveDatabase();
      this.saveTimeout = null;
    }, 100);
  }

  public generateRandomCode(prefix = 'VIP'): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let part1 = '';
    let part2 = '';
    for (let i = 0; i < 4; i++) {
      part1 += chars.charAt(Math.floor(Math.random() * chars.length));
      part2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${part1}-${part2}`;
  }

  public normalizeCode(code: string): string {
    return (code || '').trim().toUpperCase();
  }

  public isDeviceMatch(devA?: string | null, devB?: string | null): boolean {
    if (!devA || !devB) return false;
    const cleanA = devA.toString().trim().replace(/[\u200B-\u200F\uFEFF\u202A-\u202E\s]/g, '').toUpperCase();
    const cleanB = devB.toString().trim().replace(/[\u200B-\u200F\uFEFF\u202A-\u202E\s]/g, '').toUpperCase();
    if (!cleanA || !cleanB) return false;
    if (cleanA === cleanB) return true;

    // Normalization: strip '=' padding from start and end, and normalize letter 'O' with digit '0' for visual equivalence
    const normA = cleanA.replace(/^=+|=+$/g, '').replace(/O/g, '0').replace(/[^A-Z0-9]/g, '');
    const normB = cleanB.replace(/^=+|=+$/g, '').replace(/O/g, '0').replace(/[^A-Z0-9]/g, '');
    if (normA && normB && (normA === normB || normA.includes(normB) || normB.includes(normA))) {
      return true;
    }
    return false;
  }

  public sanitizeDeviceId(deviceId?: string | null): string {
    if (!deviceId || typeof deviceId !== 'string') return '';
    return deviceId.trim().toUpperCase().replace(/[\u200B-\u200F\uFEFF\u202A-\u202E\s]/g, '').slice(0, 36);
  }

  public getAllCodes(): SubscriptionCode[] {
    return Object.values(this.dbData.codes).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  public getCode(rawCodeOrId: string): SubscriptionCode | null {
    const key = this.normalizeCode(rawCodeOrId);
    if (this.dbData.codes[key]) {
      return this.dbData.codes[key];
    }
    // Search by ID
    const found = Object.values(this.dbData.codes).find((c) => c.id === rawCodeOrId || c.code === key);
    return found || null;
  }

  public createCode(payload: CreateSubscriptionPayload): SubscriptionCode {
    const code = this.normalizeCode(payload.code || this.generateRandomCode('VIP'));
    const duration = payload.duration || '1_month';
    const durationDays = payload.durationDays || this.getDaysForDuration(duration);
    const planName = payload.planName || this.getPlanNameForDuration(duration);
    const startMode = payload.startMode || 'on_first_activation';
    const targetDeviceId = payload.targetDeviceId ? this.sanitizeDeviceId(payload.targetDeviceId) : null;

    const now = Date.now();
    const expiryDate =
      startMode === 'from_now'
        ? new Date(now + durationDays * 86400 * 1000).toISOString()
        : new Date(now + durationDays * 86400 * 1000).toISOString();

    const record: SubscriptionCode = {
      id: payload.id?.trim() || `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      code,
      planName,
      duration,
      durationDays,
      targetDeviceId: targetDeviceId || null,
      usedByDeviceId: targetDeviceId || null, // Pre-bind if explicitly targeted
      driverName: payload.driverName?.trim() || null,
      driverPhone: payload.driverPhone?.trim() || null,
      notes: payload.notes?.trim() || null,
      startMode,
      createdAt: new Date().toISOString(),
      activatedAt: startMode === 'from_now' ? new Date().toISOString() : null,
      expiryDate,
      status: 'active',
      lastVerifiedAt: null,
    };

    this.dbData.codes[code] = record;
    this.scheduleSave();
    this.syncCodeToFirebase(record).catch(() => {});
    console.log(`[SubscriptionDatabase] Created subscription code: ${code} (${planName}, Target: ${targetDeviceId || 'Any'})`);
    return record;
  }

  public updateCode(codeOrId: string, updates: Partial<SubscriptionCode>): SubscriptionCode | null {
    const existing = this.getCode(codeOrId);
    if (!existing) return null;

    if (updates.driverName !== undefined) existing.driverName = updates.driverName;
    if (updates.driverPhone !== undefined) existing.driverPhone = updates.driverPhone;
    if (updates.notes !== undefined) existing.notes = updates.notes;
    if (updates.status !== undefined) existing.status = updates.status;
    if (updates.targetDeviceId !== undefined) {
      existing.targetDeviceId = updates.targetDeviceId ? this.sanitizeDeviceId(updates.targetDeviceId) : null;
    }
    if (updates.expiryDate !== undefined) existing.expiryDate = updates.expiryDate;

    this.scheduleSave();
    this.syncCodeToFirebase(existing).catch(() => {});
    return existing;
  }

  public extendCode(codeOrId: string, extraDays: number): SubscriptionCode | null {
    const existing = this.getCode(codeOrId);
    if (!existing) return null;

    const currentExpiry = new Date(existing.expiryDate).getTime();
    const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
    const newExpiry = new Date(baseTime + extraDays * 86400 * 1000).toISOString();

    existing.expiryDate = newExpiry;
    existing.durationDays += extraDays;
    if (existing.status === 'expired') {
      existing.status = existing.usedByDeviceId ? 'used' : 'active';
    }

    this.scheduleSave();
    this.syncCodeToFirebase(existing).catch(() => {});
    console.log(`[SubscriptionDatabase] Extended code ${existing.code} by ${extraDays} days to ${newExpiry}`);
    return existing;
  }

  public revokeCode(codeOrId: string): SubscriptionCode | null {
    const existing = this.getCode(codeOrId);
    if (!existing) return null;
    existing.status = 'revoked';
    this.scheduleSave();
    this.syncCodeToFirebase(existing).catch(() => {});
    return existing;
  }

  public activateCode(codeOrId: string): SubscriptionCode | null {
    const existing = this.getCode(codeOrId);
    if (!existing) return null;
    existing.status = existing.usedByDeviceId ? 'used' : 'active';
    this.scheduleSave();
    this.syncCodeToFirebase(existing).catch(() => {});
    return existing;
  }

  public unbindDevice(codeOrId: string): SubscriptionCode | null {
    const existing = this.getCode(codeOrId);
    if (!existing) return null;
    existing.usedByDeviceId = null;
    existing.targetDeviceId = null;
    existing.status = 'active';
    this.scheduleSave();
    this.syncCodeToFirebase(existing).catch(() => {});
    console.log(`[SubscriptionDatabase] Unbound device from code ${existing.code}`);
    return existing;
  }

  public async deleteCode(codeOrId: string): Promise<boolean> {
    const existing = this.getCode(codeOrId);
    const targetKey = this.normalizeCode(codeOrId);
    
    // تسجيل الكود ومعرفه في قائمة شواهد الحذف النهائية الدائمة لمنع أي استعادة تلقائية
    this.dbData.deletedCodes = this.dbData.deletedCodes || {};
    this.dbData.deletedCodes[targetKey] = Date.now();
    
    let targetId = codeOrId;
    let targetCode = targetKey;

    if (existing) {
      targetId = existing.id;
      targetCode = existing.code;
      this.dbData.deletedCodes[existing.code] = Date.now();
      if (existing.id) this.dbData.deletedCodes[existing.id] = Date.now();
      delete this.dbData.codes[existing.code];
    } else {
      delete this.dbData.codes[targetKey];
      // مسح أي تطابق عبر ID
      for (const [k, v] of Object.entries(this.dbData.codes)) {
        if (v.id === codeOrId || v.code === targetKey) {
          targetId = v.id;
          targetCode = v.code;
          delete this.dbData.codes[k];
          this.dbData.deletedCodes[v.code] = Date.now();
          this.dbData.deletedCodes[v.id] = Date.now();
        }
      }
    }

    this.scheduleSave();
    console.log(`[SubscriptionDatabase] 🗑️ Permanent deletion initiated for code: ${targetCode} (ID: ${targetId})`);

    // الحذف الصريح من قاعدة بيانات فايربيس مع انتظار اكتمال العملية (await)
    const fbDeleted = await this.deleteCodeFromFirebase(targetId, targetCode);
    console.log(`[SubscriptionDatabase] Firebase delete status for ${targetCode}: ${fbDeleted ? 'SUCCESS' : 'COMPLETED/OFFLINE'}`);
    return true;
  }

  public async deleteAllCodes(): Promise<boolean> {
    this.dbData.deletedCodes = this.dbData.deletedCodes || {};
    const count = Object.keys(this.dbData.codes).length;
    for (const [code, item] of Object.entries(this.dbData.codes)) {
      this.dbData.deletedCodes[code] = Date.now();
      if (item.id) this.dbData.deletedCodes[item.id] = Date.now();
    }
    const currentList = Object.values(this.dbData.codes);
    this.dbData.codes = {};
    this.scheduleSave();
    console.log(`[SubscriptionDatabase] 🗑️ All codes deleted (${count} codes removed)`);

    try {
      const cleanBase = FIREBASE_DB_URL.replace(/\/+$/, '');

      // 0. بث أمر تعطيل فوري لكافة الأكواد قبل مسحها لكي تتعطل على أجهزة السائقين في <50ms
      try {
        const revokePayload = JSON.stringify({
          status: 'revoked',
          revoked_reason: 'bulk_deleted',
          last_status_change: Date.now(),
        });
        await Promise.allSettled(
          currentList.map((item) =>
            fetch(`${cleanBase}/activation_codes/${item.id || item.code}.json`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: revokePayload,
            })
          )
        );
      } catch {}

      const res = await fetch(`${cleanBase}/activation_codes.json`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (err) {
      console.warn('[SubscriptionDatabase] deleteAllCodes Firebase error:', err);
      return false;
    }
  }

  public async syncCodeToFirebase(record: SubscriptionCode): Promise<boolean> {
    // التحقق الصارم: إذا كان الكود أو المعرف مسجلاً كمحذوف، يُمنع منعاً باتاً رفعه أو حفظه في فايربيس!
    this.dbData.deletedCodes = this.dbData.deletedCodes || {};
    if (this.dbData.deletedCodes[record.code] || (record.id && this.dbData.deletedCodes[record.id])) {
      console.warn(`[SubscriptionDatabase] 🛑 Blocked auto-sync/recreation of deleted code: ${record.code}`);
      return false;
    }

    try {
      const payload = toFirebasePayload(record);
      const cleanBase = FIREBASE_DB_URL.replace(/\/+$/, '');
      const res = await fetch(`${cleanBase}/activation_codes/${record.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch (err) {
      console.warn(`[SubscriptionDatabase] Offline notice: Synced locally, Firebase sync deferred: ${record.code}`);
      return false;
    }
  }

  public async deleteCodeFromFirebase(id: string, code?: string): Promise<boolean> {
    try {
      const cleanBase = FIREBASE_DB_URL.replace(/\/+$/, '');
      let success = true;

      // 0. بث أمر تعطيل فوري للـ SSE قبل الحذف مباشرة لضمان إيقاف التطبيق على جوال السائق في أجزاء من الثانية (<50ms)
      try {
        const revokePayload = JSON.stringify({
          status: 'revoked',
          revoked_reason: 'deleted_by_admin',
          last_status_change: Date.now(),
        });
        await fetch(`${cleanBase}/activation_codes/${id}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: revokePayload,
        });
        if (code && code !== id) {
          await fetch(`${cleanBase}/activation_codes/${code}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: revokePayload,
          }).catch(() => {});
        }
      } catch (revErr) {
        console.warn('[SubscriptionDatabase] Fast revoke before delete warning:', revErr);
      }

      // 1. الحذف المباشر باستخدام المعرف كـ Key في فايربيس مع الانتظار (await)
      const resId = await fetch(`${cleanBase}/activation_codes/${id}.json`, {
        method: 'DELETE',
      });
      if (!resId.ok) success = false;

      // 2. إذا كان الكود يختلف عن المعرف، نرسل طلب حذف للمفتاح الإضافي لضمان عدم وجوده تحت كود الاشتراك
      if (code && code !== id) {
        await fetch(`${cleanBase}/activation_codes/${code}.json`, {
          method: 'DELETE',
        }).catch(() => {});
      }

      // 3. فحص إضافي وتنظيف أي سجلات في فايربيس تحمل نفس الـ id أو code
      try {
        const checkRes = await fetch(`${cleanBase}/activation_codes.json`);
        if (checkRes.ok) {
          const allRemote = await checkRes.json();
          if (allRemote && typeof allRemote === 'object') {
            for (const [key, val] of Object.entries(allRemote)) {
              if (val && typeof val === 'object') {
                const itemCode = (val as any).code?.toString().trim().toUpperCase();
                const itemId = (val as any).id;
                if (key === id || key === code || itemId === id || itemCode === this.normalizeCode(code || id)) {
                  await fetch(`${cleanBase}/activation_codes/${key}.json`, { method: 'DELETE' });
                }
              }
            }
          }
        }
      } catch {}

      return success;
    } catch (err) {
      console.warn('[SubscriptionDatabase] deleteCodeFromFirebase error:', err);
      return false;
    }
  }

  public async syncAllWithFirebase(): Promise<{ syncedCount: number; success: boolean }> {
    try {
      const cleanBase = FIREBASE_DB_URL.replace(/\/+$/, '');
      const res = await fetch(`${cleanBase}/activation_codes.json`);
      if (!res.ok) throw new Error(`Firebase status ${res.status}`);
      const data: Record<string, any> = (await res.json()) || {};
      const remoteCodes = Object.values(data);
      let count = 0;

      this.dbData.deletedCodes = this.dbData.deletedCodes || {};

      // 1. تنظيف أي كود موجود في فايربيس إذا كان المشرف قد حذفه محلياً وسُجل في الـ tombstones
      for (const [key, val] of Object.entries(data)) {
        if (!val || typeof val !== 'object') continue;
        const rCode = val.code ? this.normalizeCode(val.code) : '';
        const rId = val.id || key;
        if ((rCode && this.dbData.deletedCodes[rCode]) || (rId && this.dbData.deletedCodes[rId])) {
          console.log(`[SubscriptionDatabase] 🧹 Purging tombstoned deleted code from Firebase: ${rCode || rId}`);
          await fetch(`${cleanBase}/activation_codes/${key}.json`, { method: 'DELETE' }).catch(() => {});
          delete data[key];
        }
      }

      const activeRemoteCodes = Object.values(data);

      // 2. تحديث واستيراد الأكواد النشطة الحقيقية من فايربيس
      for (const item of activeRemoteCodes) {
        if (!item || !item.code) continue;
        const normCode = this.normalizeCode(item.code);
        
        // تجاوز الأكواد المحذوفة
        if (this.dbData.deletedCodes[normCode] || (item.id && this.dbData.deletedCodes[item.id])) {
          continue;
        }

        const existing = this.dbData.codes[normCode];
        if (!existing) {
          const imported: SubscriptionCode = {
            id: item.id || `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            code: normCode,
            planName: item.plan_name || item.planName || 'مخصص',
            duration: item.duration || 'custom',
            durationDays: Number(item.duration_days || item.durationDays || 30),
            targetDeviceId: item.target_device_id || item.targetDeviceId || null,
            usedByDeviceId: item.used_by || item.usedByDeviceId || null,
            driverName: item.driver_name || item.driverName || null,
            driverPhone: item.driver_phone || item.driverPhone || null,
            notes: item.note || item.notes || null,
            startMode: item.start_mode || item.startMode || 'on_first_activation',
            createdAt: item.created_at || item.createdAt || new Date().toISOString(),
            activatedAt: item.activated_at || item.activatedAt || null,
            expiryDate: item.expiry_date || item.expiryDate || new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
            status: item.status || 'active',
            lastVerifiedAt: item.last_verified_at || item.lastVerifiedAt || null,
          };
          this.dbData.codes[normCode] = imported;
          count++;
        } else {
          // تحديث الحالة وتاريخ الانتهاء والجهاز وبيانات الخطة إذا تم تعديلها في فايربيس (بما في ذلك فك الارتباط)
          let updated = false;
          if (item.status && item.status !== existing.status) {
            existing.status = item.status;
            updated = true;
          }
          const remoteUsedBy = item.used_by || item.usedByDeviceId || null;
          if (remoteUsedBy !== existing.usedByDeviceId) {
            existing.usedByDeviceId = remoteUsedBy;
            updated = true;
          }
          const remoteTarget = item.target_device_id || item.targetDeviceId || null;
          if (remoteTarget !== existing.targetDeviceId) {
            existing.targetDeviceId = remoteTarget;
            updated = true;
          }
          const remoteExpiry = item.expiry_date || item.expiryDate;
          if (remoteExpiry && remoteExpiry !== existing.expiryDate) {
            existing.expiryDate = remoteExpiry;
            updated = true;
          }
          const remoteActivated = item.activated_at || item.activatedAt || null;
          if (remoteActivated !== existing.activatedAt) {
            existing.activatedAt = remoteActivated;
            updated = true;
          }
          const remotePlan = item.plan_name || item.planName;
          if (remotePlan && remotePlan !== existing.planName) {
            existing.planName = remotePlan;
            updated = true;
          }
          if (updated) count++;
        }
      }

      // 3. الحذف العكسي الصارم (Reverse Purge):
      // إذا تم حذف الكود من فايربيس السحابية من قبل المشرف، يتم حذفه فوراً من الذاكرة المحلية والملف
      // ويُمنع منعاً باتاً إعادة رفعه أو استعادته!
      for (const localCode of Object.values(this.dbData.codes)) {
        const foundInRemote = activeRemoteCodes.some(
          (r) => r && (this.normalizeCode(r.code) === localCode.code || r.id === localCode.id)
        );
        if (!foundInRemote) {
          console.log(`[SubscriptionDatabase] 🗑️ Code deleted in Firebase, purging from server memory: ${localCode.code}`);
          delete this.dbData.codes[localCode.code];
          this.dbData.deletedCodes[localCode.code] = Date.now();
          if (localCode.id) this.dbData.deletedCodes[localCode.id] = Date.now();
          count++;
        }
      }

      if (count > 0) {
        this.scheduleSave();
      }
      return { syncedCount: count, success: true };
    } catch (err) {
      return { syncedCount: 0, success: false };
    }
  }

  /**
   * التحقق والتفعيل البرمجي الشامل من كود الاشتراك مع الربط الآلي بمعرف الجهاز
   */
  public verifyOrRedeem(rawCode: string, rawDeviceId: string, rawVipDeviceId?: string): {
    isValid: boolean;
    reason: 'active' | 'expired' | 'revoked' | 'not_found' | 'device_mismatch';
    message: string;
    code?: string;
    planName?: string;
    expiryDate?: string;
    remainingHours?: number;
    usedBy?: string;
  } {
    const code = this.normalizeCode(rawCode);
    const deviceId = this.sanitizeDeviceId(rawDeviceId);

    const record = this.dbData.codes[code];
    if (!record) {
      const isDeletedTombstone = Boolean(
        this.dbData.deletedCodes && (this.dbData.deletedCodes[code] || this.dbData.deletedCodes[rawCode])
      );
      return {
        isValid: false,
        reason: 'revoked',
        message: isDeletedTombstone
          ? '🚫 تم حذف وتعطيل كود الاشتراك من قبل الإدارة فوراً'
          : '🚫 تم تعطيل أو إلغاء صلاحية هذا الكود من قبل الإدارة (تم حذف الكود)',
      };
    }

    // 1. فحص الإلغاء أو التعطيل
    if (record.status === 'revoked') {
      return {
        isValid: false,
        reason: 'revoked',
        message: '🚫 تم تعطيل أو إلغاء صلاحية هذا الكود من قبل الإدارة',
      };
    }

    // 2. التحقق من تطابق معرف الجهاز (Device ID Binding) بمرونة وموثوقية عالية
    const devCandidates = [rawDeviceId, rawVipDeviceId, deviceId].filter((id): id is string => Boolean(id && id.trim()));

    // أ) إذا كان الكود مخصصاً لجهاز مستهدف محدد
    if (record.targetDeviceId && record.targetDeviceId.trim() !== '') {
      const isTargetMatched = devCandidates.some((c) => this.isDeviceMatch(record.targetDeviceId, c));
      if (!isTargetMatched) {
        return {
          isValid: false,
          reason: 'device_mismatch',
          message: `⚠️ كود الاشتراك مخصص لجهاز آخر (${record.targetDeviceId})`,
          usedBy: record.targetDeviceId,
        };
      }
    }

    // ب) إذا كان الكود قد استُخدم سابقاً من جهاز آخر
    if (record.usedByDeviceId && record.usedByDeviceId.trim() !== '') {
      const isUsedByMatched = devCandidates.some((c) => this.isDeviceMatch(record.usedByDeviceId, c));
      if (!isUsedByMatched) {
        return {
          isValid: false,
          reason: 'device_mismatch',
          message: `⚠️ كود الاشتراك مرتبط ومستخدم بجوال آخر (${record.usedByDeviceId})`,
          usedBy: record.usedByDeviceId,
        };
      }
    }

    // 3. التفعيل الأول للكود وربطه بهذا الجهاز وبدء حساب المدة
    const now = Date.now();
    if (!record.activatedAt) {
      record.activatedAt = new Date().toISOString();
      record.usedByDeviceId = record.targetDeviceId || deviceId;
      record.status = 'used';

      // إذا كان خيار التفعيل يبدأ عند أول استخدام: نبدأ حساب تاريخ الانتهاء من الآن
      if (record.startMode === 'on_first_activation') {
        record.expiryDate = new Date(now + record.durationDays * 86400 * 1000).toISOString();
      }
      this.scheduleSave();
      this.syncCodeToFirebase(record).catch(() => {});
      console.log(`[SubscriptionDatabase] First-time activation: Code ${code} bound to Device ${deviceId}`);
    } else if (!record.usedByDeviceId) {
      record.usedByDeviceId = deviceId;
      record.status = 'used';
      this.scheduleSave();
      this.syncCodeToFirebase(record).catch(() => {});
    }

    // 4. التحقق من تاريخ الصلاحية
    const expiryTime = new Date(record.expiryDate).getTime();
    if (!isNaN(expiryTime) && now > expiryTime + 5 * 60 * 1000) {
      record.status = 'expired';
      this.scheduleSave();
      return {
        isValid: false,
        reason: 'expired',
        message: `⏰ انتهت صلاحية اشتراكك في (${new Date(record.expiryDate).toLocaleDateString('ar-SA')})`,
        code: record.code,
        planName: record.planName,
        expiryDate: record.expiryDate,
        remainingHours: 0,
      };
    }

    // 5. حساب الساعات المتبقية
    const diffMs = expiryTime - now;
    const remainingHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));

    record.lastVerifiedAt = new Date().toISOString();
    this.scheduleSave();

    return {
      isValid: true,
      reason: 'active',
      message: '✅ كود الاشتراك نشط وصالح',
      code: record.code,
      planName: record.planName,
      expiryDate: record.expiryDate,
      remainingHours,
      usedBy: record.usedByDeviceId || record.targetDeviceId || deviceId,
    };
  }

  public getStats() {
    const list = Object.values(this.dbData.codes);
    const now = Date.now();

    const active = list.filter((c) => {
      const exp = new Date(c.expiryDate).getTime();
      return c.status !== 'revoked' && exp > now;
    }).length;

    const used = list.filter((c) => !!c.usedByDeviceId).length;
    const expired = list.filter((c) => {
      const exp = new Date(c.expiryDate).getTime();
      return c.status === 'expired' || exp <= now;
    }).length;
    const revoked = list.filter((c) => c.status === 'revoked').length;

    return {
      total: list.length,
      active,
      used,
      expired,
      revoked,
    };
  }

  private getDaysForDuration(duration: SubscriptionDuration): number {
    switch (duration) {
      case 'trial_1_day':
        return 1;
      case 'trial_3_days':
        return 3;
      case '1_month':
        return 30;
      case '2_months':
        return 60;
      case '3_months':
        return 90;
      case '6_months':
        return 180;
      case '1_year':
        return 365;
      case 'custom':
        return 30;
      default:
        return 30;
    }
  }

  private getPlanNameForDuration(duration: SubscriptionDuration): string {
    switch (duration) {
      case 'trial_1_day':
        return 'تجربة يوم';
      case 'trial_3_days':
        return 'تجربة 3 أيام';
      case '1_month':
        return 'شهر';
      case '2_months':
        return 'شهرين';
      case '3_months':
        return '3 أشهر';
      case '6_months':
        return '6 أشهر';
      case '1_year':
        return 'سنة';
      case 'custom':
        return 'مخصص';
      default:
        return 'شهر';
    }
  }
}

export const subscriptionDb = new SubscriptionDatabase();
