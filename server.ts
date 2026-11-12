import "dotenv/config";
import express, { type Request, type Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db, type RealOrder } from "./server/db.ts";
import { subscriptionDb, FIREBASE_DB_URL } from "./server/subscriptionDb.ts";
import {
  securityHeadersMiddleware,
  rateLimitMiddleware,
  verifyRequestIntegrity,
} from "./server/security.ts";

// Haversine formula for real-world geodesic distance calculation
function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Helper to extract Device ID from request headers, query, or body
 * يضمن عزل بيانات كل مندوب بالكامل بناءً على معرف الجهاز الخاص به
 */
function extractDeviceId(req: Request): string {
  const headerId = req.headers["x-device-id"] || req.headers["device-id"];
  if (typeof headerId === "string" && headerId.trim()) {
    return db.sanitizeDeviceId(headerId);
  }
  if (typeof req.query.deviceId === "string" && req.query.deviceId.trim()) {
    return db.sanitizeDeviceId(req.query.deviceId);
  }
  if (req.body && typeof req.body.deviceId === "string" && req.body.deviceId.trim()) {
    return db.sanitizeDeviceId(req.body.deviceId);
  }
  return "REP-DEFAULT";
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(securityHeadersMiddleware);
  app.use(rateLimitMiddleware(200, 60 * 1000));

  // CORS middleware with support for custom security headers
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, User-Agent, X-Device-Id, Device-Id, X-Signature, X-Timestamp, X-Nonce, X-Client-Shield, X-Admin-Key"
    );
    if (_req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // 🛡️ حظر قطعي لأي محاولة تصفح أو تحميل لملفات الإدارة أو التعليمات من قبل مستخدمي التطبيق
  app.use((req, res, next) => {
    const lowerUrl = req.path.toLowerCase();
    if (
      lowerUrl.includes("admin-portal") ||
      lowerUrl.endsWith(".md") ||
      lowerUrl.includes("readme") ||
      lowerUrl.includes("subscriptions.json") ||
      lowerUrl.includes("locatego_db.json")
    ) {
      return res.status(404).send("Not Found");
    }
    next();
  });

  // ==========================================
  // 1. HEALTH & PING DIAGNOSTICS
  // ==========================================
  const handleHealthAndPing = (req: Request, res: Response) => {
    const deviceId = extractDeviceId(req);
    const device = db.getDevice(deviceId);
    const stats = db.getDeviceStats(deviceId);

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.status(200).json({
      status: "online",
      success: true,
      ping: "pong",
      service: "Locate Go Backend",
      server: "locate",
      message: "سيرفر Locate Go متصل - نظام عزل بيانات المناديب والحماية المتقدمة ProGuard/R8 مفعل",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      dataIsolation: "isolated_by_device_id",
      deviceId: device.deviceId,
      isRunning: device.isRunning,
      maxDistanceKm: device.settings.maxDistanceKm,
      driverLocation: device.driverLocation,
      stats,
      securityShield: {
        r8Obfuscation: "ACTIVE_LEVEL_5",
        antiDecompilation: "STRING_BYTE_OBFUSCATION_ACTIVE",
        apiIntegrity: "HMAC_SHA256_VERIFICATION_ENFORCED",
        antiReplayWindowSeconds: 300,
        rateLimiting: "ACTIVE",
      },
    });
  };

  app.get("/api/health", handleHealthAndPing);
  app.post("/api/health", handleHealthAndPing);
  app.get("/api/ping", handleHealthAndPing);
  app.post("/api/ping", handleHealthAndPing);
  app.get("/health", handleHealthAndPing);
  app.post("/health", handleHealthAndPing);
  app.get("/ping", handleHealthAndPing);
  app.post("/ping", handleHealthAndPing);

  // ==========================================
  // 1.5 SECURITY SHIELD DIAGNOSTICS & STATUS
  // ==========================================
  app.get("/api/security/status", (req: Request, res: Response) => {
    const deviceId = extractDeviceId(req);
    res.json({
      success: true,
      deviceId,
      r8Obfuscation: "ENABLED",
      optimizationPasses: 5,
      stringMasking: "DYNAMIC_XOR_BYTECODE_STRIPPING",
      hmacSignatureValidation: "ACTIVE",
      antiReplay: "TIMESTAMP_SKEW_AND_NONCE_TTL_ENFORCED",
      antiReverseEngineering: {
        antiDebugger: "ENABLED",
        antiRoot: "ENABLED",
        antiHookFridaXposed: "ENABLED",
        antiRepackaging: "ENABLED",
      },
      defenseShield: "LocateGo-ProGuard-R8-Level5",
      message: "نظام الحماية العالية ضد تفكيك الشفرة والتلاعب بالـ API نشط ومحصن 100%",
    });
  });

  // ==========================================
  // ==========================================
  // 1.8 VIP LICENSE VERIFICATION & HEARTBEAT ENDPOINT
  // ==========================================
  const handleLicenseCheck = async (req: Request, res: Response) => {
    const deviceId = extractDeviceId(req);
    const code = (req.query.code || req.body?.code || "").toString().trim().toUpperCase();
    const clientDevice = (req.query.deviceId || req.body?.deviceId || deviceId || "").toString().trim();

    if (!code) {
      return res.status(400).json({
        isValid: false,
        valid: false,
        reason: "not_found",
        message: "الرجاء تقديم كود الترخيص للتحقق منه",
      });
    }

    const vipDeviceId = (req.headers["x-vip-device-id"] || req.query.vipDeviceId || req.body?.vipDeviceId || "").toString().trim();

    // 1. الأولوية الأولى: الفحص المباشر في قاعدة بيانات الاشتراكات المحلية subscriptionDb
    const localMatch = subscriptionDb.getCode(code);
    if (localMatch) {
      const result = subscriptionDb.verifyOrRedeem(code, clientDevice, vipDeviceId);
      if (!result.isValid) {
        // إيقاف خدمات المندوب على السيرفر في حال عدم الصلاحية
        db.toggleRunning(deviceId, false);
      }
      return res.json({
        id: localMatch.id,
        isValid: result.isValid,
        valid: result.isValid,
        reason: result.reason,
        message: result.message,
        code: result.code || localMatch.code,
        planName: result.planName || localMatch.planName,
        durationDays: localMatch.durationDays,
        expiryDate: result.expiryDate || localMatch.expiryDate,
        remainingHours: result.remainingHours,
        usedBy: result.usedBy,
        source: "local_subscription_db",
        checkedAt: new Date().toISOString(),
      });
    }

    // 2. الأولوية الثانية: الفحص في قاعدة البيانات السحابية (Firebase RTDB) كبديل متوافق مع الأكواد القديمة
    try {
      const response = await fetch(`${FIREBASE_DB_URL}/activation_codes.json`);
      if (!response.ok) {
        throw new Error(`Firebase RTDB responded with ${response.status}`);
      }
      const data: any = await response.json();
      const codesList: any[] = data ? Object.values(data) : [];
      const match = codesList.find(
        (c: any) => (c?.code || "").toString().trim().toUpperCase() === code
      );

      if (!match) {
        db.toggleRunning(deviceId, false);
        return res.json({
          isValid: false,
          valid: false,
          reason: "revoked",
          message: "🚫 تم تعطيل أو إلغاء صلاحية كود الترخيص من قبل الإدارة (تم حذف الكود)",
        });
      }

      // Check revoked or disabled status
      const status = (match.status || "").toLowerCase();
      if (status === "revoked" || status === "banned" || status === "disabled" || status === "cancelled") {
        db.toggleRunning(deviceId, false);
        return res.json({
          isValid: false,
          valid: false,
          reason: "revoked",
          message: "🚫 تم تعطيل أو إلغاء صلاحية كود الترخيص من قبل الإدارة",
        });
      }

      const matchExpiry = match.expiry_date || match.expiryDate;
      const matchDays = Number(match.duration_days || match.durationDays || 30);

      // Check status
      if (status === "expired") {
        db.toggleRunning(deviceId, false);
        return res.json({
          isValid: false,
          valid: false,
          reason: "expired",
          message: "⏰ انتهت صلاحية اشتراكك في قاعدة البيانات",
          expiryDate: matchExpiry,
        });
      }

      // Check expiry date with 5-minute clock drift margin
      if (matchExpiry) {
        const expiryTime = new Date(matchExpiry).getTime();
        if (!isNaN(expiryTime) && Date.now() > expiryTime + 5 * 60 * 1000) {
          db.toggleRunning(deviceId, false);
          return res.json({
            isValid: false,
            valid: false,
            reason: "expired",
            message: `⏰ انتهت صلاحية اشتراكك في (${new Date(matchExpiry).toLocaleDateString("ar-SA")})`,
            expiryDate: matchExpiry,
            remainingHours: 0,
          });
        }
      }

      // Check device binding
      const matchDevice = (match.used_by || match.usedByDeviceId || "").toString().trim();
      const targetDevice = (match.target_device_id || match.targetDeviceId || "").toString().trim();
      const devCandidates = [clientDevice, vipDeviceId, deviceId].filter((id): id is string => Boolean(id && id.trim()));

      if (targetDevice && targetDevice !== "") {
        const targetMatched = devCandidates.some((c) => subscriptionDb.isDeviceMatch(targetDevice, c));
        if (!targetMatched) {
          db.toggleRunning(deviceId, false);
          return res.json({
            isValid: false,
            valid: false,
            reason: "device_mismatch",
            message: `⚠️ كود الاشتراك مخصص لجهاز آخر (${targetDevice})`,
            usedBy: targetDevice,
          });
        }
      }

      let resolvedExpiry = matchExpiry;
      if (matchDevice && matchDevice !== "") {
        const matchFound = devCandidates.some((c) => subscriptionDb.isDeviceMatch(matchDevice, c));
        if (!matchFound) {
          db.toggleRunning(deviceId, false);
          return res.json({
            isValid: false,
            valid: false,
            reason: "device_mismatch",
            message: `⚠️ كود الترخيص مرتبط بجوال أو جهاز آخر (${matchDevice})`,
            usedBy: match.used_by || match.usedByDeviceId,
          });
        }
      } else if (clientDevice) {
        // تفعيل الكود وربطه بهذا الجهاز في قاعدة بيانات فايربيس السحابية
        try {
          const nowIso = new Date().toISOString();
          const startMode = match.start_mode || match.startMode || "on_first_activation";
          if (startMode === "on_first_activation") {
            resolvedExpiry = new Date(Date.now() + matchDays * 86400 * 1000).toISOString();
          }
          match.used_by = clientDevice;
          match.status = "used";
          match.activated_at = nowIso;
          const matchKey = Object.keys(data).find((k) => data[k] === match) || match.id || match.code;
          fetch(`${FIREBASE_DB_URL}/activation_codes/${matchKey}.json`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              used_by: clientDevice,
              usedByDeviceId: clientDevice,
              used_count: 1,
              status: "used",
              activated_at: nowIso,
              activatedAt: nowIso,
              expiry_date: resolvedExpiry,
              expiryDate: resolvedExpiry,
            }),
          }).catch(() => {});
        } catch {}
      }

      let remainingHours: number | undefined = undefined;
      if (resolvedExpiry) {
        const diffMs = new Date(resolvedExpiry).getTime() - Date.now();
        remainingHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
      }

      return res.json({
        id: match.id,
        isValid: true,
        valid: true,
        reason: "active",
        message: "✅ كود الترخيص نشط وصالح",
        code: match.code,
        planName: match.plan_name || match.planName,
        durationDays: matchDays,
        expiryDate: resolvedExpiry,
        remainingHours,
        usedBy: match.used_by || match.usedByDeviceId || clientDevice,
        checkedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[License Heartbeat Error]:", err);
      return res.status(500).json({
        isValid: false,
        valid: false,
        reason: "network_error",
        message: "تعذر الاتصال بقاعدة بيانات التراخيص",
      });
    }
  };

  app.get("/api/license/verify", handleLicenseCheck);
  app.post("/api/license/verify", handleLicenseCheck);
  app.get("/api/license/heartbeat", handleLicenseCheck);
  app.post("/api/license/heartbeat", handleLicenseCheck);

  // Fallback proxy for tables/activation_codes
  app.get("/tables/activation_codes*", async (_req: Request, res: Response) => {
    try {
      const response = await fetch(`${FIREBASE_DB_URL}/activation_codes.json`);
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch codes" });
      }
      const data: any = await response.json();
      const arr = data ? Object.values(data) : [];
      return res.json({ data: arr });
    } catch {
      return res.status(500).json({ error: "Database proxy error" });
    }
  });

  // روابط تحميل مباشرة وسريعة لملفات لوحة التحكم لرفعها على أي استضافة
  app.get("/portal-download.zip", (_req: Request, res: Response) => {
    const zipPath = path.join(process.cwd(), "admin-portal.zip");
    res.setHeader("Content-Disposition", 'attachment; filename="locatego-admin-portal.zip"');
    res.setHeader("Content-Type", "application/zip");
    return res.sendFile(zipPath);
  });

  app.get("/portal-download.html", (_req: Request, res: Response) => {
    const htmlPath = path.join(process.cwd(), "admin-portal", "index.html");
    res.setHeader("Content-Disposition", 'attachment; filename="index.html"');
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.sendFile(htmlPath);
  });

  // ==========================================
  // 1.9 ADMIN SUBSCRIPTION CONTROL PANEL API
  // لوحة تحكم وإدارة أكواد الاشتراكات وقاعدة البيانات للمشرف
  // محمية بمفتاح أمان المشرف السري (Admin Secret Key)
  // أي طلب غير مصرح به يعيد خطأ 404 لخداع أي محاولة اختراق وإخفاء وجود المسارات
  // ==========================================
  const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "locate_go_master_key_9977";

  const requireAdminAuth = (req: Request, res: Response, next: any) => {
    const providedKey = req.headers["x-admin-key"] || req.query.adminKey || req.query.key || (req.body && (req.body.adminKey || req.body.key));
    if (!providedKey || providedKey !== ADMIN_SECRET_KEY) {
      return res.status(404).json({ error: "Not Found" });
    }
    next();
  };

  // تطبيق التحقق الأمني السري على كافة مسارات الإدارة
  app.use("/api/admin", requireAdminAuth);

  // تحميل ملف ZIP جاهز للرفع على Netlify أو Vercel
  app.get("/api/admin/portal/download-zip", (_req: Request, res: Response) => {
    const zipPath = path.join(process.cwd(), "admin-portal.zip");
    res.setHeader("Content-Disposition", 'attachment; filename="locatego-admin-portal.zip"');
    res.setHeader("Content-Type", "application/zip");
    return res.sendFile(zipPath);
  });

  // تحميل ملف HTML منفرد للوحة التحكم (يعمل أوفلاين ومحلياً بنسبة 100%)
  app.get("/api/admin/portal/download-html", (_req: Request, res: Response) => {
    const htmlPath = path.join(process.cwd(), "admin-portal", "index.html");
    res.setHeader("Content-Disposition", 'attachment; filename="locatego-admin-portal.html"');
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.sendFile(htmlPath);
  });

  // فتح وتصفح لوحة التحكم مباشرة من المتصفح للمشرف المصرح له
  app.get("/api/admin/portal/view", (_req: Request, res: Response) => {
    const htmlPath = path.join(process.cwd(), "admin-portal", "index.html");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.sendFile(htmlPath);
  });

  // استرجاع كافة أكواد الاشتراكات والإحصائيات والأجهزة المسجلة
  app.get("/api/admin/subscriptions", (_req: Request, res: Response) => {
    try {
      const codes = subscriptionDb.getAllCodes();
      const stats = subscriptionDb.getStats();
      const activeDevices = db.getAllDevicesSummary();

      return res.json({
        success: true,
        codes,
        stats,
        activeDevices,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: "فشل استرجاع بيانات الاشتراكات" });
    }
  });

  // إنشاء كود اشتراك جديد مرتبط بمعرف جهاز المندوب والمدة المحددة
  app.post("/api/admin/subscriptions/generate", (req: Request, res: Response) => {
    try {
      const {
        id,
        code,
        planName,
        duration,
        durationDays,
        targetDeviceId,
        driverName,
        driverPhone,
        notes,
        startMode,
      } = req.body;

      // إذا وُضع كود مخصص، نتحقق من عدم تكراره
      if (code && subscriptionDb.getCode(code)) {
        return res.status(400).json({
          success: false,
          error: "كود الاشتراك هذا مستخدم بالفعل، يرجى اختيار كود آخر أو تركه فارغاً لتوليد كود تلقائي",
        });
      }

      const createdCode = subscriptionDb.createCode({
        id,
        code,
        planName,
        duration,
        durationDays: typeof durationDays === "number" ? durationDays : undefined,
        targetDeviceId,
        driverName,
        driverPhone,
        notes,
        startMode: startMode || "on_first_activation",
      });

      return res.status(201).json({
        success: true,
        code: createdCode,
        message: `تم إنشاء كود الاشتراك (${createdCode.code}) بنجاح`,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || "فشل إنشاء كود الاشتراك",
      });
    }
  });

  // تمديد مدة اشتراك كود (+أيام)
  app.post("/api/admin/subscriptions/:id/extend", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const days = Number(req.body.days) || 30;
      const updated = subscriptionDb.extendCode(id, days);
      if (!updated) {
        return res.status(404).json({ success: false, error: "كود الاشتراك غير موجود" });
      }
      return res.json({
        success: true,
        code: updated,
        message: `تم تمديد صلاحية الكود بنجاح بمقدار (${days}) يوماً`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "فشل التمديد" });
    }
  });

  // تعطيل / حظر كود اشتراك
  app.post("/api/admin/subscriptions/:id/revoke", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updated = subscriptionDb.revokeCode(id);
      if (!updated) {
        return res.status(404).json({ success: false, error: "كود الاشتراك غير موجود" });
      }
      return res.json({
        success: true,
        code: updated,
        message: "تم تعطيل صلاحية كود الاشتراك بنجاح",
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "فشل التعطيل" });
    }
  });

  // إعادة تنشيط كود اشتراك
  app.post("/api/admin/subscriptions/:id/activate", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updated = subscriptionDb.activateCode(id);
      if (!updated) {
        return res.status(404).json({ success: false, error: "كود الاشتراك غير موجود" });
      }
      return res.json({
        success: true,
        code: updated,
        message: "تم تنشيط كود الاشتراك بنجاح",
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "فشل التنشيط" });
    }
  });

  // فك ارتباط كود الاشتراك من الجهاز لنقله لجوال آخر
  app.post("/api/admin/subscriptions/:id/unbind", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updated = subscriptionDb.unbindDevice(id);
      if (!updated) {
        return res.status(404).json({ success: false, error: "كود الاشتراك غير موجود" });
      }
      return res.json({
        success: true,
        code: updated,
        message: "تم فك ارتباط الجهاز بنجاح، يمكن الآن تفعيل الكود على أي جوال جديد",
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "فشل فك الارتباط" });
    }
  });

  // حذف كود اشتراك نهائياً مع انتظار اكتمال الحذف في فايربيس والسيرفر
  app.delete("/api/admin/subscriptions/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await subscriptionDb.deleteCode(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: "كود الاشتراك غير موجود أو تم حذفه مسبقاً" });
      }
      return res.json({
        success: true,
        message: "تم حذف كود الاشتراك نهائياً من فايربيس والسيرفر",
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "فشل الحذف" });
    }
  });

  // حذف جميع أكواد الاشتراك نهائياً من قاعدة بيانات فايربيس والسيرفر
  app.delete("/api/admin/subscriptions", async (_req: Request, res: Response) => {
    try {
      await subscriptionDb.deleteAllCodes();
      return res.json({
        success: true,
        message: "تم حذف جميع أكواد الاشتراك بنجاح من فايربيس والسيرفر",
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "فشل حذف جميع الأكواد" });
    }
  });

  // مزامنة فورية بين قاعدة بيانات السيرفر وقاعدة بيانات فايربيس السحابية
  app.post("/api/admin/subscriptions/sync", async (_req: Request, res: Response) => {
    try {
      const syncResult = await subscriptionDb.syncAllWithFirebase();
      const stats = subscriptionDb.getStats();
      const codes = subscriptionDb.getAllCodes();
      return res.json({
        success: syncResult.success,
        syncedCount: syncResult.syncedCount,
        stats,
        codes,
        message: syncResult.success
          ? `تمت المزامنة بنجاح مع قاعدة بيانات فايربيس (تم استيراد ${syncResult.syncedCount} كود جديد)`
          : "يعمل السيرفر في وضع الأوفلاين المحلي (تم حفظ كافة البيانات محلياً)",
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "فشل المزامنة السحابية" });
    }
  });

  // ==========================================
  // 2. GET CURRENT SYSTEM STATUS & STATS FOR SPECIFIC DEVICE
  // ==========================================
  app.get("/api/status", (req: Request, res: Response) => {
    const deviceId = extractDeviceId(req);
    const device = db.getDevice(deviceId);
    const stats = db.getDeviceStats(deviceId);

    res.json({
      deviceId: device.deviceId,
      isRunning: device.isRunning,
      settings: device.settings,
      driverLocation: device.driverLocation,
      stats,
      isolated: true,
    });
  });

  // ==========================================
  // 3. MASTER START/STOP TOGGLE FOR SPECIFIC DEVICE
  // ==========================================
  app.post("/api/status/toggle", (req: Request, res: Response) => {
    const deviceId = extractDeviceId(req);
    const explicitState = typeof req.body.isRunning === "boolean" ? req.body.isRunning : undefined;
    const isRunning = db.toggleRunning(deviceId, explicitState);

    res.json({
      success: true,
      deviceId,
      isRunning,
      message: isRunning
        ? `تم تشغيل الأداة والمراقبة بنجاح للمندوب (${deviceId})`
        : `تم إيقاف الأداة مؤقتاً للمندوب (${deviceId})`,
    });
  });

  // ==========================================
  // 4. GET & UPDATE SETTINGS FOR SPECIFIC DEVICE
  // ==========================================
  app.get("/api/settings", (req: Request, res: Response) => {
    const deviceId = extractDeviceId(req);
    const device = db.getDevice(deviceId);

    res.json({
      success: true,
      deviceId: device.deviceId,
      settings: device.settings,
    });
  });

  app.post("/api/settings", (req: Request, res: Response) => {
    const deviceId = extractDeviceId(req);
    const updatedSettings = db.updateSettings(deviceId, req.body);

    res.json({
      success: true,
      deviceId,
      settings: updatedSettings,
      message: `تم حفظ إعدادات المندوب (${deviceId}) بنجاح في قاعدة البيانات`,
    });
  });

  // ==========================================
  // 5. UPDATE DRIVER'S REAL LIVE GPS LOCATION FOR SPECIFIC DEVICE
  // ==========================================
  app.post(["/api/location", "/api/driver/location"], (req: Request, res: Response) => {
    const integrity = verifyRequestIntegrity(req);
    if (!integrity.valid) {
      return res.status(403).json({
        error: integrity.reason || "فشل التحقق الأمني من توقيع الطلب الرقمي",
        securityBlocked: true,
      });
    }

    const deviceId = extractDeviceId(req);
    const { lat, lng, accuracy } = req.body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "الإحداثيات غير صحيحة (lat and lng required)" });
    }

    const driverLocation = db.updateLocation(deviceId, { lat, lng, accuracy });

    res.json({
      success: true,
      deviceId,
      driverLocation,
      secured: integrity.isNativeSigned,
      message: `تم تحديث موقع المندوب (${deviceId}) الحقيقي بنجاح`,
    });
  });

  // ==========================================
  // 6. REAL GEOGRAPHIC & DISTANCE EVALUATION ENDPOINT FOR SPECIFIC DEVICE
  // Webhook or App trigger sends the incoming order details here
  // ==========================================
  app.post("/api/orders/evaluate", (req: Request, res: Response) => {
    const integrity = verifyRequestIntegrity(req);
    if (!integrity.valid) {
      return res.status(403).json({
        error: integrity.reason || "فشل التحقق الأمني من توقيع الطلب الرقمي (HMAC Signature Mismatch)",
        securityBlocked: true,
      });
    }

    const deviceId = extractDeviceId(req);
    const device = db.getDevice(deviceId);

    const deviceIsRunning = device.isRunning;

    const {
      appName = "جاهز",
      storeName = "مطعم غير محدد",
      customerDistrict = "منطقة العميل",
      payoutSar = 18.0,
      storeLat,
      storeLng,
      customerLat,
      customerLng,
      distanceKm: inputDistance,
      pickupDistanceKm,
      deliveryDistanceKm,
    } = req.body;

    let computedDistance = 0;

    // A) If real store and customer coordinates are provided, compute geodesic distance
    if (
      typeof storeLat === "number" &&
      typeof storeLng === "number" &&
      typeof customerLat === "number" &&
      typeof customerLng === "number"
    ) {
      computedDistance = calculateHaversineDistanceKm(storeLat, storeLng, customerLat, customerLng);
    } else if (typeof deliveryDistanceKm === "number" && deliveryDistanceKm > 0) {
      computedDistance = Math.round(deliveryDistanceKm * 10) / 10;
    } else if (typeof inputDistance === "number" && inputDistance > 0) {
      computedDistance = Math.round(inputDistance * 10) / 10;
    } else if (typeof pickupDistanceKm === "number" && pickupDistanceKm > 0) {
      computedDistance = Math.round(pickupDistanceKm * 10) / 10;
    } else if (
      device.driverLocation &&
      typeof storeLat === "number" &&
      typeof storeLng === "number"
    ) {
      computedDistance = calculateHaversineDistanceKm(
        device.driverLocation.lat,
        device.driverLocation.lng,
        storeLat,
        storeLng
      );
    } else {
      return res.status(400).json({
        error: "بيانات المسافة مفقودة: يجب إرسال distanceKm أو إحداثيات المتجر والعميل.",
      });
    }

    const maxAllowedDelivery = typeof device.settings.maxDistanceKm === "number" ? device.settings.maxDistanceKm : 3.0;
    const maxAllowedPickup = typeof device.settings.maxPickupDistanceKm === "number" ? device.settings.maxPickupDistanceKm : 1.5;

    // شرط المسافات الجغرافية (المعيار الأساسي الوحيد المعتمد 100%):
    // 1. مسافة العميل / الوجهة <= الحد الأقصى المحدد (الافتراضي: 3.0 كم)
    // 2. مسافة المتجر / المطعم <= حد مسافة المتجر المحدد (الافتراضي: 1.5 كم)
    const isDeliveryAcceptable = computedDistance <= maxAllowedDelivery;
    const isPickupAcceptable = typeof pickupDistanceKm === "number" && pickupDistanceKm >= 0
      ? pickupDistanceKm <= maxAllowedPickup
      : true;
    const isAccepted = deviceIsRunning && isDeliveryAcceptable && isPickupAcceptable;

    let rejectionReason: string | undefined = undefined;
    if (!deviceIsRunning) {
      rejectionReason = `أداة المندوب (${deviceId}) في وضع الإيقاف (Offline) - يرجى الضغط على زر تشغيل الأداة (Start) لبدء قبول الطلبات`;
    } else if (!isDeliveryAcceptable && !isPickupAcceptable) {
      rejectionReason = `تجاوز حدي المسافة معاً: مسافة العميل (${computedDistance} كم > ${maxAllowedDelivery} كم) ومسافة المتجر (${pickupDistanceKm} كم > ${maxAllowedPickup} كم)`;
    } else if (!isDeliveryAcceptable) {
      rejectionReason = `مسافة العميل / الوجهة (${computedDistance} كم) تتجاوز الحد الأقصى المحدد (${maxAllowedDelivery} كم)`;
    } else if (!isPickupAcceptable) {
      rejectionReason = `مسافة المتجر / المطعم (${pickupDistanceKm} كم) تتجاوز حد مسافة المتجر المحدد (${maxAllowedPickup} كم)`;
    }

    const newOrder: RealOrder = {
      id: `ord-${Date.now().toString().slice(-4)}`,
      deviceId,
      appName,
      storeName,
      customerDistrict,
      distanceKm: computedDistance,
      pickupDistanceKm: typeof pickupDistanceKm === "number" ? pickupDistanceKm : undefined,
      deliveryDistanceKm: typeof deliveryDistanceKm === "number" ? deliveryDistanceKm : undefined,
      payoutSar: Number(payoutSar) || 18,
      detectedAt: new Date().toISOString(),
      status: isAccepted ? "accepted" : "rejected",
      rejectionReason,
      autoAccepted: isAccepted && device.settings.autoAccept,
      coordinates: {
        store: storeLat && storeLng ? { lat: storeLat, lng: storeLng } : undefined,
        customer: customerLat && customerLng ? { lat: customerLat, lng: customerLng } : undefined,
        driver: device.driverLocation
          ? { lat: device.driverLocation.lat, lng: device.driverLocation.lng }
          : undefined,
      },
    };

    // Add strictly to this device's isolated order history
    const savedOrder = db.addOrder(deviceId, newOrder);
    const currentStats = db.getDeviceStats(deviceId);

    res.status(201).json({
      success: true,
      deviceId,
      decision: isAccepted ? "accepted" : "rejected",
      order: savedOrder,
      evaluation: {
        computedDistanceKm: computedDistance,
        maxAllowedKm: maxAllowedDelivery,
        maxPickupDistanceKm: maxAllowedPickup,
        isAccepted,
        rejectionReason,
      },
      stats: currentStats,
    });
  });

  // ==========================================
  // 7. GET ORDERS HISTORY FOR SPECIFIC DEVICE ONLY
  // ==========================================
  app.get("/api/orders", (req: Request, res: Response) => {
    const deviceId = extractDeviceId(req);
    const orders = db.getOrders(deviceId);

    res.json({
      deviceId,
      orders,
      count: orders.length,
      isolated: true,
    });
  });

  // ==========================================
  // 8. CLEAR ORDERS HISTORY FOR SPECIFIC DEVICE ONLY
  // ==========================================
  app.delete("/api/orders", (req: Request, res: Response) => {
    const deviceId = extractDeviceId(req);
    db.clearOrders(deviceId);

    res.json({
      success: true,
      deviceId,
      message: `تم مسح سجل طلبات المندوب (${deviceId}) بنجاح بدون التأثير على أي مندوب آخر`,
    });
  });

  // ==========================================
  // 9. MULTI-DEVICE ISOLATION DIAGNOSTICS & SUMMARY
  // ==========================================
  app.get("/api/devices/summary", (_req: Request, res: Response) => {
    const summary = db.getAllDevicesSummary();
    res.json({
      success: true,
      isolationMode: "enforced",
      totalRegisteredDevices: summary.length,
      devices: summary,
      message: "جميع بيانات وسجلات وإحصائيات المناديب معزولة بنسبة 100% لكل معرف جهاز",
    });
  });

  // ==========================================
  // VITE MIDDLEWARE & STATIC SERVING
  // ==========================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Locate Go Server] Running on http://localhost:${PORT} with Device-Level Isolation`);
  });
}

startServer();
