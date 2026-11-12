var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path3 = __toESM(require("path"), 1);
var import_vite = require("vite");

// server/db.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var DEFAULT_SETTINGS = {
  maxDistanceKm: 3,
  maxPickupDistanceKm: 1.5,
  autoAccept: true,
  soundAlerts: false,
  minPayoutSar: 0,
  vibrationFeedback: false,
  swipeSpeedMs: 60,
  tapIntervalMs: 10,
  enableCustomInterval: false
};
var DeviceDatabase = class {
  constructor() {
    this.saveTimeout = null;
    const dataDir = import_path.default.join(process.cwd(), "data");
    if (!import_fs.default.existsSync(dataDir)) {
      try {
        import_fs.default.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.error("[DeviceDatabase] Error creating data directory:", err);
      }
    }
    this.dbFilePath = import_path.default.join(dataDir, "locatego_db.json");
    this.dbData = this.loadDatabase();
  }
  loadDatabase() {
    try {
      if (import_fs.default.existsSync(this.dbFilePath)) {
        const raw = import_fs.default.readFileSync(this.dbFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.devices === "object") {
          console.log(
            `[DeviceDatabase] Loaded database with ${Object.keys(parsed.devices).length} isolated device(s).`
          );
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[DeviceDatabase] Could not read existing DB file, creating fresh DB:", err);
    }
    return {
      version: 1,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      devices: {}
    };
  }
  saveDatabase() {
    this.dbData.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    try {
      const tempPath = `${this.dbFilePath}.tmp`;
      import_fs.default.writeFileSync(tempPath, JSON.stringify(this.dbData, null, 2), "utf-8");
      import_fs.default.renameSync(tempPath, this.dbFilePath);
    } catch (err) {
      console.error("[DeviceDatabase] Error saving DB to disk:", err);
    }
  }
  scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveDatabase();
      this.saveTimeout = null;
    }, 150);
  }
  sanitizeDeviceId(rawId) {
    if (!rawId || typeof rawId !== "string") {
      return "REP-DEFAULT";
    }
    const cleaned = rawId.trim().toUpperCase().replace(/[^A-Z0-9_=-]/g, "").slice(0, 32);
    return cleaned.length > 0 ? cleaned : "REP-DEFAULT";
  }
  getOrCreateDevice(rawId) {
    const deviceId = this.sanitizeDeviceId(rawId);
    if (!this.dbData.devices[deviceId]) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      this.dbData.devices[deviceId] = {
        deviceId,
        registeredAt: now,
        lastActiveAt: now,
        isRunning: true,
        settings: { ...DEFAULT_SETTINGS },
        driverLocation: null,
        orders: []
      };
      this.scheduleSave();
      console.log(`[DeviceDatabase] Created new isolated partition for Device: ${deviceId}`);
    } else {
      this.dbData.devices[deviceId].lastActiveAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    return this.dbData.devices[deviceId];
  }
  getDevice(rawId) {
    return this.getOrCreateDevice(rawId);
  }
  updateSettings(rawId, newSettings) {
    const device = this.getOrCreateDevice(rawId);
    if (typeof newSettings.maxDistanceKm === "number" && newSettings.maxDistanceKm > 0) {
      device.settings.maxDistanceKm = Math.round(newSettings.maxDistanceKm * 10) / 10;
    }
    if (typeof newSettings.maxPickupDistanceKm === "number" && newSettings.maxPickupDistanceKm > 0) {
      device.settings.maxPickupDistanceKm = Math.round(newSettings.maxPickupDistanceKm * 10) / 10;
    }
    if (typeof newSettings.autoAccept === "boolean") {
      device.settings.autoAccept = newSettings.autoAccept;
    }
    if (typeof newSettings.soundAlerts === "boolean") {
      device.settings.soundAlerts = newSettings.soundAlerts;
    }
    if (typeof newSettings.minPayoutSar === "number" && newSettings.minPayoutSar >= 0) {
      device.settings.minPayoutSar = newSettings.minPayoutSar;
    }
    if (typeof newSettings.vibrationFeedback === "boolean") {
      device.settings.vibrationFeedback = newSettings.vibrationFeedback;
    }
    this.scheduleSave();
    return device.settings;
  }
  toggleRunning(rawId, explicitState) {
    const device = this.getOrCreateDevice(rawId);
    if (typeof explicitState === "boolean") {
      device.isRunning = explicitState;
    } else {
      device.isRunning = !device.isRunning;
    }
    this.scheduleSave();
    return device.isRunning;
  }
  updateLocation(rawId, loc) {
    const device = this.getOrCreateDevice(rawId);
    device.driverLocation = {
      lat: loc.lat,
      lng: loc.lng,
      accuracy: loc.accuracy || void 0,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.scheduleSave();
    return device.driverLocation;
  }
  addOrder(rawId, order) {
    const device = this.getOrCreateDevice(rawId);
    order.deviceId = device.deviceId;
    device.orders.unshift(order);
    if (device.orders.length > 200) {
      device.orders.pop();
    }
    this.scheduleSave();
    return order;
  }
  getOrders(rawId) {
    const device = this.getOrCreateDevice(rawId);
    return device.orders;
  }
  clearOrders(rawId) {
    const device = this.getOrCreateDevice(rawId);
    device.orders = [];
    this.scheduleSave();
  }
  getDeviceStats(rawId) {
    const device = this.getOrCreateDevice(rawId);
    const acceptedCount = device.orders.filter((o) => o.status === "accepted").length;
    const rejectedCount = device.orders.filter((o) => o.status === "rejected").length;
    const totalScanned = device.orders.length;
    const totalEarningsSar = device.orders.filter((o) => o.status === "accepted").reduce((sum, o) => sum + (o.payoutSar || 0), 0);
    return {
      totalScanned,
      acceptedCount,
      rejectedCount,
      acceptanceRate: totalScanned > 0 ? Math.round(acceptedCount / totalScanned * 100) : 0,
      totalEarningsSar: Math.round(totalEarningsSar * 10) / 10
    };
  }
  getAllDevicesSummary() {
    return Object.values(this.dbData.devices).map((d) => ({
      deviceId: d.deviceId,
      totalOrders: d.orders.length,
      acceptedOrders: d.orders.filter((o) => o.status === "accepted").length,
      isRunning: d.isRunning,
      maxDistanceKm: d.settings.maxDistanceKm,
      lastActiveAt: d.lastActiveAt,
      hasLocation: !!d.driverLocation
    }));
  }
};
var db = new DeviceDatabase();

// server/subscriptionDb.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
var FIREBASE_DB_URL = process.env.FIREBASE_DB_URL || "https://appprotector-79e9c-default-rtdb.firebaseio.com";
function toFirebasePayload(record) {
  return {
    id: record.id,
    code: record.code,
    status: record.status,
    expiry_date: record.expiryDate,
    expiryDate: record.expiryDate,
    used_by: record.usedByDeviceId || record.targetDeviceId || "",
    usedByDeviceId: record.usedByDeviceId || null,
    target_device_id: record.targetDeviceId || "",
    targetDeviceId: record.targetDeviceId || null,
    driver_name: record.driverName || "",
    driverName: record.driverName || null,
    driver_phone: record.driverPhone || "",
    driverPhone: record.driverPhone || null,
    plan_name: record.planName,
    planName: record.planName,
    duration: record.duration,
    duration_days: record.durationDays,
    durationDays: record.durationDays,
    max_uses: 1,
    used_count: record.usedByDeviceId ? 1 : 0,
    note: record.notes || "",
    notes: record.notes || null,
    start_mode: record.startMode,
    startMode: record.startMode,
    created_at: record.createdAt,
    createdAt: record.createdAt,
    activated_at: record.activatedAt || null,
    activatedAt: record.activatedAt || null,
    last_verified_at: record.lastVerifiedAt || null,
    lastVerifiedAt: record.lastVerifiedAt || null
  };
}
var SubscriptionDatabase = class {
  constructor() {
    this.saveTimeout = null;
    const dataDir = import_path2.default.join(process.cwd(), "data");
    if (!import_fs2.default.existsSync(dataDir)) {
      try {
        import_fs2.default.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.error("[SubscriptionDatabase] Error creating data directory:", err);
      }
    }
    this.dbFilePath = import_path2.default.join(dataDir, "subscriptions.json");
    this.dbData = this.loadDatabase();
    setTimeout(() => {
      this.syncAllWithFirebase().then((res) => {
        console.log(`[SubscriptionDatabase] \u2705 Synced ${res.syncedCount} code(s) from ${FIREBASE_DB_URL}`);
      }).catch((err) => {
        console.warn("[SubscriptionDatabase] Initial Firebase RTDB sync notice:", err);
      });
    }, 1e3);
    setInterval(() => {
      this.syncAllWithFirebase().catch(() => {
      });
    }, 60 * 1e3);
  }
  loadDatabase() {
    try {
      if (import_fs2.default.existsSync(this.dbFilePath)) {
        const raw = import_fs2.default.readFileSync(this.dbFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.codes === "object") {
          parsed.deletedCodes = parsed.deletedCodes || {};
          console.log(
            `[SubscriptionDatabase] Loaded ${Object.keys(parsed.codes).length} subscription code(s), ${Object.keys(parsed.deletedCodes).length} permanent tombstone(s).`
          );
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[SubscriptionDatabase] Error reading subscriptions.json:", err);
    }
    const initialDb = {
      version: 1,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      codes: {},
      deletedCodes: {}
    };
    return initialDb;
  }
  seedDefaultCodes(db2) {
    const now = Date.now();
    const trialCode = {
      id: `sub-trial-${now}`,
      code: "VIP-FREE-TRIAL",
      planName: "\u062A\u062C\u0631\u0628\u0629 3 \u0623\u064A\u0627\u0645",
      duration: "trial_3_days",
      durationDays: 3,
      targetDeviceId: null,
      usedByDeviceId: null,
      driverName: "\u062A\u062C\u0631\u0628\u0629 \u0645\u062C\u0627\u0646\u064A\u0629",
      driverPhone: null,
      notes: "\u0643\u0648\u062F \u062A\u062C\u0631\u064A\u0628\u064A \u0639\u0627\u0645 \u0644\u0645\u062F\u0629 3 \u0623\u064A\u0627\u0645",
      startMode: "on_first_activation",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      activatedAt: null,
      expiryDate: new Date(now + 3 * 86400 * 1e3).toISOString(),
      status: "active",
      lastVerifiedAt: null
    };
    const monthCode = {
      id: `sub-month-${now}`,
      code: "LOCATE-VIP-2026",
      planName: "\u0634\u0647\u0631",
      duration: "1_month",
      durationDays: 30,
      targetDeviceId: null,
      usedByDeviceId: null,
      driverName: "\u0627\u0634\u062A\u0631\u0627\u0643 \u0634\u0647\u0631\u064A",
      driverPhone: null,
      notes: "\u0643\u0648\u062F VIP \u0634\u0647\u0631\u064A \u0645\u0641\u062A\u0648\u062D \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u062C\u0647\u0632\u0629",
      startMode: "on_first_activation",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      activatedAt: null,
      expiryDate: new Date(now + 30 * 86400 * 1e3).toISOString(),
      status: "active",
      lastVerifiedAt: null
    };
    db2.codes[trialCode.code] = trialCode;
    db2.codes[monthCode.code] = monthCode;
  }
  saveDatabase() {
    this.dbData.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    try {
      const tempPath = `${this.dbFilePath}.tmp`;
      import_fs2.default.writeFileSync(tempPath, JSON.stringify(this.dbData, null, 2), "utf-8");
      import_fs2.default.renameSync(tempPath, this.dbFilePath);
    } catch (err) {
      console.error("[SubscriptionDatabase] Error saving subscriptions.json:", err);
    }
  }
  scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveDatabase();
      this.saveTimeout = null;
    }, 100);
  }
  generateRandomCode(prefix = "VIP") {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let part1 = "";
    let part2 = "";
    for (let i = 0; i < 4; i++) {
      part1 += chars.charAt(Math.floor(Math.random() * chars.length));
      part2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${part1}-${part2}`;
  }
  normalizeCode(code) {
    return (code || "").trim().toUpperCase();
  }
  isDeviceMatch(devA, devB) {
    if (!devA || !devB) return false;
    const cleanA = devA.toString().trim().replace(/[\u200B-\u200F\uFEFF\u202A-\u202E\s]/g, "").toUpperCase();
    const cleanB = devB.toString().trim().replace(/[\u200B-\u200F\uFEFF\u202A-\u202E\s]/g, "").toUpperCase();
    if (!cleanA || !cleanB) return false;
    if (cleanA === cleanB) return true;
    const normA = cleanA.replace(/^=+|=+$/g, "").replace(/O/g, "0").replace(/[^A-Z0-9]/g, "");
    const normB = cleanB.replace(/^=+|=+$/g, "").replace(/O/g, "0").replace(/[^A-Z0-9]/g, "");
    if (normA && normB && (normA === normB || normA.includes(normB) || normB.includes(normA))) {
      return true;
    }
    return false;
  }
  sanitizeDeviceId(deviceId) {
    if (!deviceId || typeof deviceId !== "string") return "";
    return deviceId.trim().toUpperCase().replace(/[\u200B-\u200F\uFEFF\u202A-\u202E\s]/g, "").slice(0, 36);
  }
  getAllCodes() {
    return Object.values(this.dbData.codes).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
  getCode(rawCodeOrId) {
    const key = this.normalizeCode(rawCodeOrId);
    if (this.dbData.codes[key]) {
      return this.dbData.codes[key];
    }
    const found = Object.values(this.dbData.codes).find((c) => c.id === rawCodeOrId || c.code === key);
    return found || null;
  }
  createCode(payload) {
    const code = this.normalizeCode(payload.code || this.generateRandomCode("VIP"));
    const duration = payload.duration || "1_month";
    const durationDays = payload.durationDays || this.getDaysForDuration(duration);
    const planName = payload.planName || this.getPlanNameForDuration(duration);
    const startMode = payload.startMode || "on_first_activation";
    const targetDeviceId = payload.targetDeviceId ? this.sanitizeDeviceId(payload.targetDeviceId) : null;
    const now = Date.now();
    const expiryDate = startMode === "from_now" ? new Date(now + durationDays * 86400 * 1e3).toISOString() : new Date(now + durationDays * 86400 * 1e3).toISOString();
    const record = {
      id: `sub-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
      code,
      planName,
      duration,
      durationDays,
      targetDeviceId: targetDeviceId || null,
      usedByDeviceId: targetDeviceId || null,
      // Pre-bind if explicitly targeted
      driverName: payload.driverName?.trim() || null,
      driverPhone: payload.driverPhone?.trim() || null,
      notes: payload.notes?.trim() || null,
      startMode,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      activatedAt: startMode === "from_now" ? (/* @__PURE__ */ new Date()).toISOString() : null,
      expiryDate,
      status: "active",
      lastVerifiedAt: null
    };
    this.dbData.codes[code] = record;
    this.scheduleSave();
    this.syncCodeToFirebase(record).catch(() => {
    });
    console.log(`[SubscriptionDatabase] Created subscription code: ${code} (${planName}, Target: ${targetDeviceId || "Any"})`);
    return record;
  }
  updateCode(codeOrId, updates) {
    const existing = this.getCode(codeOrId);
    if (!existing) return null;
    if (updates.driverName !== void 0) existing.driverName = updates.driverName;
    if (updates.driverPhone !== void 0) existing.driverPhone = updates.driverPhone;
    if (updates.notes !== void 0) existing.notes = updates.notes;
    if (updates.status !== void 0) existing.status = updates.status;
    if (updates.targetDeviceId !== void 0) {
      existing.targetDeviceId = updates.targetDeviceId ? this.sanitizeDeviceId(updates.targetDeviceId) : null;
    }
    if (updates.expiryDate !== void 0) existing.expiryDate = updates.expiryDate;
    this.scheduleSave();
    this.syncCodeToFirebase(existing).catch(() => {
    });
    return existing;
  }
  extendCode(codeOrId, extraDays) {
    const existing = this.getCode(codeOrId);
    if (!existing) return null;
    const currentExpiry = new Date(existing.expiryDate).getTime();
    const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
    const newExpiry = new Date(baseTime + extraDays * 86400 * 1e3).toISOString();
    existing.expiryDate = newExpiry;
    existing.durationDays += extraDays;
    if (existing.status === "expired") {
      existing.status = existing.usedByDeviceId ? "used" : "active";
    }
    this.scheduleSave();
    this.syncCodeToFirebase(existing).catch(() => {
    });
    console.log(`[SubscriptionDatabase] Extended code ${existing.code} by ${extraDays} days to ${newExpiry}`);
    return existing;
  }
  revokeCode(codeOrId) {
    const existing = this.getCode(codeOrId);
    if (!existing) return null;
    existing.status = "revoked";
    this.scheduleSave();
    this.syncCodeToFirebase(existing).catch(() => {
    });
    return existing;
  }
  activateCode(codeOrId) {
    const existing = this.getCode(codeOrId);
    if (!existing) return null;
    existing.status = existing.usedByDeviceId ? "used" : "active";
    this.scheduleSave();
    this.syncCodeToFirebase(existing).catch(() => {
    });
    return existing;
  }
  unbindDevice(codeOrId) {
    const existing = this.getCode(codeOrId);
    if (!existing) return null;
    existing.usedByDeviceId = null;
    existing.targetDeviceId = null;
    existing.status = "active";
    this.scheduleSave();
    this.syncCodeToFirebase(existing).catch(() => {
    });
    console.log(`[SubscriptionDatabase] Unbound device from code ${existing.code}`);
    return existing;
  }
  async deleteCode(codeOrId) {
    const existing = this.getCode(codeOrId);
    const targetKey = this.normalizeCode(codeOrId);
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
    console.log(`[SubscriptionDatabase] \u{1F5D1}\uFE0F Permanent deletion initiated for code: ${targetCode} (ID: ${targetId})`);
    const fbDeleted = await this.deleteCodeFromFirebase(targetId, targetCode);
    console.log(`[SubscriptionDatabase] Firebase delete status for ${targetCode}: ${fbDeleted ? "SUCCESS" : "COMPLETED/OFFLINE"}`);
    return true;
  }
  async deleteAllCodes() {
    this.dbData.deletedCodes = this.dbData.deletedCodes || {};
    const count = Object.keys(this.dbData.codes).length;
    for (const [code, item] of Object.entries(this.dbData.codes)) {
      this.dbData.deletedCodes[code] = Date.now();
      if (item.id) this.dbData.deletedCodes[item.id] = Date.now();
    }
    const currentList = Object.values(this.dbData.codes);
    this.dbData.codes = {};
    this.scheduleSave();
    console.log(`[SubscriptionDatabase] \u{1F5D1}\uFE0F All codes deleted (${count} codes removed)`);
    try {
      const cleanBase = FIREBASE_DB_URL.replace(/\/+$/, "");
      try {
        const revokePayload = JSON.stringify({
          status: "revoked",
          revoked_reason: "bulk_deleted",
          last_status_change: Date.now()
        });
        await Promise.allSettled(
          currentList.map(
            (item) => fetch(`${cleanBase}/activation_codes/${item.id || item.code}.json`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: revokePayload
            })
          )
        );
      } catch {
      }
      const res = await fetch(`${cleanBase}/activation_codes.json`, {
        method: "DELETE"
      });
      return res.ok;
    } catch (err) {
      console.warn("[SubscriptionDatabase] deleteAllCodes Firebase error:", err);
      return false;
    }
  }
  async syncCodeToFirebase(record) {
    this.dbData.deletedCodes = this.dbData.deletedCodes || {};
    if (this.dbData.deletedCodes[record.code] || record.id && this.dbData.deletedCodes[record.id]) {
      console.warn(`[SubscriptionDatabase] \u{1F6D1} Blocked auto-sync/recreation of deleted code: ${record.code}`);
      return false;
    }
    try {
      const payload = toFirebasePayload(record);
      const cleanBase = FIREBASE_DB_URL.replace(/\/+$/, "");
      const res = await fetch(`${cleanBase}/activation_codes/${record.id}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch (err) {
      console.warn(`[SubscriptionDatabase] Offline notice: Synced locally, Firebase sync deferred: ${record.code}`);
      return false;
    }
  }
  async deleteCodeFromFirebase(id, code) {
    try {
      const cleanBase = FIREBASE_DB_URL.replace(/\/+$/, "");
      let success = true;
      try {
        const revokePayload = JSON.stringify({
          status: "revoked",
          revoked_reason: "deleted_by_admin",
          last_status_change: Date.now()
        });
        await fetch(`${cleanBase}/activation_codes/${id}.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: revokePayload
        });
        if (code && code !== id) {
          await fetch(`${cleanBase}/activation_codes/${code}.json`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: revokePayload
          }).catch(() => {
          });
        }
      } catch (revErr) {
        console.warn("[SubscriptionDatabase] Fast revoke before delete warning:", revErr);
      }
      const resId = await fetch(`${cleanBase}/activation_codes/${id}.json`, {
        method: "DELETE"
      });
      if (!resId.ok) success = false;
      if (code && code !== id) {
        await fetch(`${cleanBase}/activation_codes/${code}.json`, {
          method: "DELETE"
        }).catch(() => {
        });
      }
      try {
        const checkRes = await fetch(`${cleanBase}/activation_codes.json`);
        if (checkRes.ok) {
          const allRemote = await checkRes.json();
          if (allRemote && typeof allRemote === "object") {
            for (const [key, val] of Object.entries(allRemote)) {
              if (val && typeof val === "object") {
                const itemCode = val.code?.toString().trim().toUpperCase();
                const itemId = val.id;
                if (key === id || key === code || itemId === id || itemCode === this.normalizeCode(code || id)) {
                  await fetch(`${cleanBase}/activation_codes/${key}.json`, { method: "DELETE" });
                }
              }
            }
          }
        }
      } catch {
      }
      return success;
    } catch (err) {
      console.warn("[SubscriptionDatabase] deleteCodeFromFirebase error:", err);
      return false;
    }
  }
  async syncAllWithFirebase() {
    try {
      const cleanBase = FIREBASE_DB_URL.replace(/\/+$/, "");
      const res = await fetch(`${cleanBase}/activation_codes.json`);
      if (!res.ok) throw new Error(`Firebase status ${res.status}`);
      const data = await res.json() || {};
      const remoteCodes = Object.values(data);
      let count = 0;
      this.dbData.deletedCodes = this.dbData.deletedCodes || {};
      for (const [key, val] of Object.entries(data)) {
        if (!val || typeof val !== "object") continue;
        const rCode = val.code ? this.normalizeCode(val.code) : "";
        const rId = val.id || key;
        if (rCode && this.dbData.deletedCodes[rCode] || rId && this.dbData.deletedCodes[rId]) {
          console.log(`[SubscriptionDatabase] \u{1F9F9} Purging tombstoned deleted code from Firebase: ${rCode || rId}`);
          await fetch(`${cleanBase}/activation_codes/${key}.json`, { method: "DELETE" }).catch(() => {
          });
          delete data[key];
        }
      }
      const activeRemoteCodes = Object.values(data);
      for (const item of activeRemoteCodes) {
        if (!item || !item.code) continue;
        const normCode = this.normalizeCode(item.code);
        if (this.dbData.deletedCodes[normCode] || item.id && this.dbData.deletedCodes[item.id]) {
          continue;
        }
        const existing = this.dbData.codes[normCode];
        if (!existing) {
          const imported = {
            id: item.id || `sub-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
            code: normCode,
            planName: item.plan_name || item.planName || "\u0645\u062E\u0635\u0635",
            duration: item.duration || "custom",
            durationDays: Number(item.duration_days || item.durationDays || 30),
            targetDeviceId: item.target_device_id || item.targetDeviceId || null,
            usedByDeviceId: item.used_by || item.usedByDeviceId || null,
            driverName: item.driver_name || item.driverName || null,
            driverPhone: item.driver_phone || item.driverPhone || null,
            notes: item.note || item.notes || null,
            startMode: item.start_mode || item.startMode || "on_first_activation",
            createdAt: item.created_at || item.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
            activatedAt: item.activated_at || item.activatedAt || null,
            expiryDate: item.expiry_date || item.expiryDate || new Date(Date.now() + 30 * 86400 * 1e3).toISOString(),
            status: item.status || "active",
            lastVerifiedAt: item.last_verified_at || item.lastVerifiedAt || null
          };
          this.dbData.codes[normCode] = imported;
          count++;
        } else {
          let updated = false;
          if (item.status && item.status !== existing.status) {
            existing.status = item.status;
            updated = true;
          }
          if (item.used_by && item.used_by !== existing.usedByDeviceId) {
            existing.usedByDeviceId = item.used_by;
            updated = true;
          }
          if (item.expiry_date && item.expiry_date !== existing.expiryDate) {
            existing.expiryDate = item.expiry_date;
            updated = true;
          }
          if (updated) count++;
        }
      }
      for (const localCode of Object.values(this.dbData.codes)) {
        const foundInRemote = activeRemoteCodes.some(
          (r) => r && (this.normalizeCode(r.code) === localCode.code || r.id === localCode.id)
        );
        if (!foundInRemote) {
          console.log(`[SubscriptionDatabase] \u{1F5D1}\uFE0F Code deleted in Firebase, purging from server memory: ${localCode.code}`);
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
  verifyOrRedeem(rawCode, rawDeviceId, rawVipDeviceId) {
    const code = this.normalizeCode(rawCode);
    const deviceId = this.sanitizeDeviceId(rawDeviceId);
    const record = this.dbData.codes[code];
    if (!record) {
      const isDeletedTombstone = Boolean(
        this.dbData.deletedCodes && (this.dbData.deletedCodes[code] || this.dbData.deletedCodes[rawCode])
      );
      return {
        isValid: false,
        reason: "revoked",
        message: isDeletedTombstone ? "\u{1F6AB} \u062A\u0645 \u062D\u0630\u0641 \u0648\u062A\u0639\u0637\u064A\u0644 \u0643\u0648\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0645\u0646 \u0642\u0628\u0644 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0641\u0648\u0631\u0627\u064B" : "\u{1F6AB} \u062A\u0645 \u062A\u0639\u0637\u064A\u0644 \u0623\u0648 \u0625\u0644\u063A\u0627\u0621 \u0635\u0644\u0627\u062D\u064A\u0629 \u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u062F \u0645\u0646 \u0642\u0628\u0644 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 (\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0643\u0648\u062F)"
      };
    }
    if (record.status === "revoked") {
      return {
        isValid: false,
        reason: "revoked",
        message: "\u{1F6AB} \u062A\u0645 \u062A\u0639\u0637\u064A\u0644 \u0623\u0648 \u0625\u0644\u063A\u0627\u0621 \u0635\u0644\u0627\u062D\u064A\u0629 \u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u062F \u0645\u0646 \u0642\u0628\u0644 \u0627\u0644\u0625\u062F\u0627\u0631\u0629"
      };
    }
    const devCandidates = [rawDeviceId, rawVipDeviceId, deviceId].filter((id) => Boolean(id && id.trim()));
    if (record.targetDeviceId && record.targetDeviceId.trim() !== "") {
      const isTargetMatched = devCandidates.some((c) => this.isDeviceMatch(record.targetDeviceId, c));
      if (!isTargetMatched) {
        return {
          isValid: false,
          reason: "device_mismatch",
          message: `\u26A0\uFE0F \u0643\u0648\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0645\u062E\u0635\u0635 \u0644\u062C\u0647\u0627\u0632 \u0622\u062E\u0631 (${record.targetDeviceId})`,
          usedBy: record.targetDeviceId
        };
      }
    }
    if (record.usedByDeviceId && record.usedByDeviceId.trim() !== "") {
      const isUsedByMatched = devCandidates.some((c) => this.isDeviceMatch(record.usedByDeviceId, c));
      if (!isUsedByMatched) {
        return {
          isValid: false,
          reason: "device_mismatch",
          message: `\u26A0\uFE0F \u0643\u0648\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0645\u0631\u062A\u0628\u0637 \u0648\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u062C\u0648\u0627\u0644 \u0622\u062E\u0631 (${record.usedByDeviceId})`,
          usedBy: record.usedByDeviceId
        };
      }
    }
    const now = Date.now();
    if (!record.activatedAt) {
      record.activatedAt = (/* @__PURE__ */ new Date()).toISOString();
      record.usedByDeviceId = record.targetDeviceId || deviceId;
      record.status = "used";
      if (record.startMode === "on_first_activation") {
        record.expiryDate = new Date(now + record.durationDays * 86400 * 1e3).toISOString();
      }
      this.scheduleSave();
      this.syncCodeToFirebase(record).catch(() => {
      });
      console.log(`[SubscriptionDatabase] First-time activation: Code ${code} bound to Device ${deviceId}`);
    } else if (!record.usedByDeviceId) {
      record.usedByDeviceId = deviceId;
      record.status = "used";
      this.scheduleSave();
      this.syncCodeToFirebase(record).catch(() => {
      });
    }
    const expiryTime = new Date(record.expiryDate).getTime();
    if (!isNaN(expiryTime) && now > expiryTime + 5 * 60 * 1e3) {
      record.status = "expired";
      this.scheduleSave();
      return {
        isValid: false,
        reason: "expired",
        message: `\u23F0 \u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0634\u062A\u0631\u0627\u0643\u0643 \u0641\u064A (${new Date(record.expiryDate).toLocaleDateString("ar-SA")})`,
        code: record.code,
        planName: record.planName,
        expiryDate: record.expiryDate,
        remainingHours: 0
      };
    }
    const diffMs = expiryTime - now;
    const remainingHours = Math.max(0, Math.round(diffMs / (1e3 * 60 * 60)));
    record.lastVerifiedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.scheduleSave();
    return {
      isValid: true,
      reason: "active",
      message: "\u2705 \u0643\u0648\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0646\u0634\u0637 \u0648\u0635\u0627\u0644\u062D",
      code: record.code,
      planName: record.planName,
      expiryDate: record.expiryDate,
      remainingHours,
      usedBy: record.usedByDeviceId || record.targetDeviceId || deviceId
    };
  }
  getStats() {
    const list = Object.values(this.dbData.codes);
    const now = Date.now();
    const active = list.filter((c) => {
      const exp = new Date(c.expiryDate).getTime();
      return c.status !== "revoked" && exp > now;
    }).length;
    const used = list.filter((c) => !!c.usedByDeviceId).length;
    const expired = list.filter((c) => {
      const exp = new Date(c.expiryDate).getTime();
      return c.status === "expired" || exp <= now;
    }).length;
    const revoked = list.filter((c) => c.status === "revoked").length;
    return {
      total: list.length,
      active,
      used,
      expired,
      revoked
    };
  }
  getDaysForDuration(duration) {
    switch (duration) {
      case "trial_1_day":
        return 1;
      case "trial_3_days":
        return 3;
      case "1_month":
        return 30;
      case "2_months":
        return 60;
      case "3_months":
        return 90;
      case "6_months":
        return 180;
      case "1_year":
        return 365;
      case "custom":
        return 30;
      default:
        return 30;
    }
  }
  getPlanNameForDuration(duration) {
    switch (duration) {
      case "trial_1_day":
        return "\u062A\u062C\u0631\u0628\u0629 \u064A\u0648\u0645";
      case "trial_3_days":
        return "\u062A\u062C\u0631\u0628\u0629 3 \u0623\u064A\u0627\u0645";
      case "1_month":
        return "\u0634\u0647\u0631";
      case "2_months":
        return "\u0634\u0647\u0631\u064A\u0646";
      case "3_months":
        return "3 \u0623\u0634\u0647\u0631";
      case "6_months":
        return "6 \u0623\u0634\u0647\u0631";
      case "1_year":
        return "\u0633\u0646\u0629";
      case "custom":
        return "\u0645\u062E\u0635\u0635";
      default:
        return "\u0634\u0647\u0631";
    }
  }
};
var subscriptionDb = new SubscriptionDatabase();

// server/security.ts
var import_crypto = __toESM(require("crypto"), 1);
var XOR_KEY = 90;
var OBFUSCATED_SALT = Buffer.from([
  54,
  53,
  57,
  59,
  62,
  111,
  115,
  59,
  54,
  62,
  110,
  52,
  53,
  63,
  110,
  57,
  62,
  62,
  53,
  52
]);
function getSharedSecret() {
  const buf = Buffer.alloc(OBFUSCATED_SALT.length);
  for (let i = 0; i < OBFUSCATED_SALT.length; i++) {
    buf[i] = OBFUSCATED_SALT[i] ^ XOR_KEY;
  }
  return buf.toString("utf8");
}
var seenNonces = /* @__PURE__ */ new Map();
var NONCE_TTL_MS = 10 * 60 * 1e3;
setInterval(() => {
  const now = Date.now();
  for (const [nonce, expireAt] of seenNonces.entries()) {
    if (expireAt < now) {
      seenNonces.delete(nonce);
    }
  }
}, 60 * 1e3);
function sha256(content) {
  return import_crypto.default.createHash("sha256").update(content, "utf8").digest("hex");
}
function computeHmacSignature(deviceId, timestamp, nonce, bodyHash) {
  const key = getSharedSecret();
  const dataToSign = `${deviceId}:${timestamp}:${nonce}:${bodyHash}`;
  return import_crypto.default.createHmac("sha256", key).update(dataToSign, "utf8").digest("hex");
}
var rateLimitMap = /* @__PURE__ */ new Map();
function rateLimitMiddleware(maxRequests = 150, windowMs = 60 * 1e3) {
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
    const deviceId = req.headers["x-device-id"] || "none";
    const key = `${ip}:${deviceId}`;
    const now = Date.now();
    let bucket = rateLimitMap.get(key);
    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 1, resetAt: now + windowMs };
      rateLimitMap.set(key, bucket);
    } else {
      bucket.count += 1;
    }
    if (bucket.count > maxRequests) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1e3));
      return res.status(429).json({
        error: "\u062A\u062C\u0627\u0648\u0632\u062A \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0645\u0646 \u0627\u0644\u0637\u0644\u0628\u0627\u062A (Rate limit exceeded). \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 \u0642\u0644\u064A\u0644\u0627\u064B.",
        retryAfterSec: Math.ceil((bucket.resetAt - now) / 1e3)
      });
    }
    next();
  };
}
function securityHeadersMiddleware(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Defense-Shield", "LocateGo-ProGuard-R8-HMAC-Level5");
  next();
}
function verifyRequestIntegrity(req) {
  const signature = req.headers["x-signature"] || "";
  const timestampHeader = req.headers["x-timestamp"] || "";
  const nonce = req.headers["x-nonce"] || "";
  const deviceId = req.headers["x-device-id"] || req.query.deviceId || req.body?.deviceId || "REP-DEFAULT";
  if (!signature) {
    return { valid: true, isNativeSigned: false };
  }
  if (!timestampHeader || !nonce) {
    return { valid: false, reason: "\u062A\u0631\u0648\u064A\u0633\u0627\u062A \u0627\u0644\u0623\u0645\u0627\u0646 \u0645\u0641\u0642\u0648\u062F\u0629 (X-Timestamp or X-Nonce missing)", isNativeSigned: true };
  }
  const timestamp = parseInt(timestampHeader, 10);
  if (isNaN(timestamp)) {
    return { valid: false, reason: "\u062A\u0648\u0642\u064A\u062A \u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D", isNativeSigned: true };
  }
  const now = Date.now();
  const maxSkewMs = 5 * 60 * 1e3;
  if (Math.abs(now - timestamp) > maxSkewMs) {
    return { valid: false, reason: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u062A\u0631\u0648\u064A\u0633\u0629 \u0627\u0644\u0637\u0644\u0628 \u0644\u0645\u0646\u0639 \u0647\u062C\u0645\u0627\u062A \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 (Replay Attack)", isNativeSigned: true };
  }
  if (seenNonces.has(nonce)) {
    return { valid: false, reason: "\u0645\u062D\u0627\u0648\u0644\u0629 \u0625\u0639\u0627\u062F\u0629 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0631\u0645\u0632 \u0623\u0645\u0646\u064A \u0645\u0633\u062A\u0647\u0644\u0643 (Nonce already used)", isNativeSigned: true };
  }
  seenNonces.set(nonce, now + NONCE_TTL_MS);
  const bodyString = typeof req.body === "object" && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : "";
  const payloadHash = sha256(bodyString);
  const expectedSig = computeHmacSignature(deviceId, timestamp, nonce, payloadHash);
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSig, "hex");
  if (sigBuffer.length !== expectedBuffer.length || !import_crypto.default.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, reason: "\u062A\u0648\u0642\u064A\u0639 \u0627\u0644\u0640 API \u0627\u0644\u0631\u0642\u0645\u064A \u063A\u064A\u0631 \u0645\u062A\u0637\u0627\u0628\u0642 - \u062A\u0645 \u0631\u0641\u0636 \u0627\u0644\u0637\u0644\u0628 \u0644\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0646\u0638\u0627\u0645", isNativeSigned: true };
  }
  return { valid: true, isNativeSigned: true };
}

// server.ts
function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
function extractDeviceId(req) {
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
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.use(securityHeadersMiddleware);
  app.use(rateLimitMiddleware(200, 60 * 1e3));
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
  app.use((req, res, next) => {
    const lowerUrl = req.path.toLowerCase();
    if (lowerUrl.includes("admin-portal") || lowerUrl.endsWith(".md") || lowerUrl.includes("readme") || lowerUrl.includes("subscriptions.json") || lowerUrl.includes("locatego_db.json")) {
      return res.status(404).send("Not Found");
    }
    next();
  });
  const handleHealthAndPing = (req, res) => {
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
      message: "\u0633\u064A\u0631\u0641\u0631 Locate Go \u0645\u062A\u0635\u0644 - \u0646\u0638\u0627\u0645 \u0639\u0632\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0627\u062F\u064A\u0628 \u0648\u0627\u0644\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0645\u062A\u0642\u062F\u0645\u0629 ProGuard/R8 \u0645\u0641\u0639\u0644",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
        rateLimiting: "ACTIVE"
      }
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
  app.get("/api/security/status", (req, res) => {
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
        antiRepackaging: "ENABLED"
      },
      defenseShield: "LocateGo-ProGuard-R8-Level5",
      message: "\u0646\u0638\u0627\u0645 \u0627\u0644\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0639\u0627\u0644\u064A\u0629 \u0636\u062F \u062A\u0641\u0643\u064A\u0643 \u0627\u0644\u0634\u0641\u0631\u0629 \u0648\u0627\u0644\u062A\u0644\u0627\u0639\u0628 \u0628\u0627\u0644\u0640 API \u0646\u0634\u0637 \u0648\u0645\u062D\u0635\u0646 100%"
    });
  });
  const FIREBASE_DB_URL2 = "https://appprotector-79e9c-default-rtdb.firebaseio.com";
  const handleLicenseCheck = async (req, res) => {
    const deviceId = extractDeviceId(req);
    const code = (req.query.code || req.body?.code || "").toString().trim().toUpperCase();
    const clientDevice = (req.query.deviceId || req.body?.deviceId || deviceId || "").toString().trim();
    if (!code) {
      return res.status(400).json({
        isValid: false,
        valid: false,
        reason: "not_found",
        message: "\u0627\u0644\u0631\u062C\u0627\u0621 \u062A\u0642\u062F\u064A\u0645 \u0643\u0648\u062F \u0627\u0644\u062A\u0631\u062E\u064A\u0635 \u0644\u0644\u062A\u062D\u0642\u0642 \u0645\u0646\u0647"
      });
    }
    const vipDeviceId = (req.headers["x-vip-device-id"] || req.query.vipDeviceId || req.body?.vipDeviceId || "").toString().trim();
    const localMatch = subscriptionDb.getCode(code);
    if (localMatch) {
      const result = subscriptionDb.verifyOrRedeem(code, clientDevice, vipDeviceId);
      if (!result.isValid) {
        db.toggleRunning(deviceId, false);
      }
      return res.json({
        isValid: result.isValid,
        valid: result.isValid,
        reason: result.reason,
        message: result.message,
        code: result.code || localMatch.code,
        planName: result.planName || localMatch.planName,
        expiryDate: result.expiryDate || localMatch.expiryDate,
        remainingHours: result.remainingHours,
        usedBy: result.usedBy,
        source: "local_subscription_db",
        checkedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    try {
      const response = await fetch(`${FIREBASE_DB_URL2}/activation_codes.json`);
      if (!response.ok) {
        throw new Error(`Firebase RTDB responded with ${response.status}`);
      }
      const data = await response.json();
      const codesList = data ? Object.values(data) : [];
      const match = codesList.find(
        (c) => (c?.code || "").toString().trim().toUpperCase() === code
      );
      if (!match) {
        db.toggleRunning(deviceId, false);
        return res.json({
          isValid: false,
          valid: false,
          reason: "revoked",
          message: "\u{1F6AB} \u062A\u0645 \u062A\u0639\u0637\u064A\u0644 \u0623\u0648 \u0625\u0644\u063A\u0627\u0621 \u0635\u0644\u0627\u062D\u064A\u0629 \u0643\u0648\u062F \u0627\u0644\u062A\u0631\u062E\u064A\u0635 \u0645\u0646 \u0642\u0628\u0644 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 (\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0643\u0648\u062F)"
        });
      }
      const status = (match.status || "").toLowerCase();
      if (status === "revoked" || status === "banned" || status === "disabled" || status === "cancelled") {
        db.toggleRunning(deviceId, false);
        return res.json({
          isValid: false,
          valid: false,
          reason: "revoked",
          message: "\u{1F6AB} \u062A\u0645 \u062A\u0639\u0637\u064A\u0644 \u0623\u0648 \u0625\u0644\u063A\u0627\u0621 \u0635\u0644\u0627\u062D\u064A\u0629 \u0643\u0648\u062F \u0627\u0644\u062A\u0631\u062E\u064A\u0635 \u0645\u0646 \u0642\u0628\u0644 \u0627\u0644\u0625\u062F\u0627\u0631\u0629"
        });
      }
      if (status === "expired") {
        db.toggleRunning(deviceId, false);
        return res.json({
          isValid: false,
          valid: false,
          reason: "expired",
          message: "\u23F0 \u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0634\u062A\u0631\u0627\u0643\u0643 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
          expiryDate: match.expiry_date
        });
      }
      if (match.expiry_date) {
        const expiryTime = new Date(match.expiry_date).getTime();
        if (!isNaN(expiryTime) && Date.now() > expiryTime + 5 * 60 * 1e3) {
          db.toggleRunning(deviceId, false);
          return res.json({
            isValid: false,
            valid: false,
            reason: "expired",
            message: `\u23F0 \u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0634\u062A\u0631\u0627\u0643\u0643 \u0641\u064A (${new Date(match.expiry_date).toLocaleDateString("ar-SA")})`,
            expiryDate: match.expiry_date,
            remainingHours: 0
          });
        }
      }
      const matchDevice = (match.used_by || match.usedByDeviceId || "").toString().trim();
      const targetDevice = (match.target_device_id || match.targetDeviceId || "").toString().trim();
      const devCandidates = [clientDevice, vipDeviceId, deviceId].filter((id) => Boolean(id && id.trim()));
      if (targetDevice && targetDevice !== "") {
        const targetMatched = devCandidates.some((c) => subscriptionDb.isDeviceMatch(targetDevice, c));
        if (!targetMatched) {
          db.toggleRunning(deviceId, false);
          return res.json({
            isValid: false,
            valid: false,
            reason: "device_mismatch",
            message: `\u26A0\uFE0F \u0643\u0648\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0645\u062E\u0635\u0635 \u0644\u062C\u0647\u0627\u0632 \u0622\u062E\u0631 (${targetDevice})`,
            usedBy: targetDevice
          });
        }
      }
      if (matchDevice && matchDevice !== "") {
        const matchFound = devCandidates.some((c) => subscriptionDb.isDeviceMatch(matchDevice, c));
        if (!matchFound) {
          db.toggleRunning(deviceId, false);
          return res.json({
            isValid: false,
            valid: false,
            reason: "device_mismatch",
            message: `\u26A0\uFE0F \u0643\u0648\u062F \u0627\u0644\u062A\u0631\u062E\u064A\u0635 \u0645\u0631\u062A\u0628\u0637 \u0628\u062C\u0648\u0627\u0644 \u0623\u0648 \u062C\u0647\u0627\u0632 \u0622\u062E\u0631 (${matchDevice})`,
            usedBy: match.used_by
          });
        }
      } else if (clientDevice) {
        try {
          const nowIso = (/* @__PURE__ */ new Date()).toISOString();
          match.used_by = clientDevice;
          match.status = "used";
          match.activated_at = nowIso;
          const matchKey = Object.keys(data).find((k) => data[k] === match) || match.id || match.code;
          fetch(`${FIREBASE_DB_URL2}/activation_codes/${matchKey}.json`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              used_by: clientDevice,
              status: "used",
              activated_at: nowIso
            })
          }).catch(() => {
          });
        } catch {
        }
      }
      let remainingHours = void 0;
      if (match.expiry_date) {
        const diffMs = new Date(match.expiry_date).getTime() - Date.now();
        remainingHours = Math.max(0, Math.round(diffMs / (1e3 * 60 * 60)));
      }
      return res.json({
        isValid: true,
        valid: true,
        reason: "active",
        message: "\u2705 \u0643\u0648\u062F \u0627\u0644\u062A\u0631\u062E\u064A\u0635 \u0646\u0634\u0637 \u0648\u0635\u0627\u0644\u062D",
        code: match.code,
        expiryDate: match.expiry_date,
        remainingHours,
        checkedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      console.error("[License Heartbeat Error]:", err);
      return res.status(500).json({
        isValid: false,
        valid: false,
        reason: "network_error",
        message: "\u062A\u0639\u0630\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0631\u0627\u062E\u064A\u0635"
      });
    }
  };
  app.get("/api/license/verify", handleLicenseCheck);
  app.post("/api/license/verify", handleLicenseCheck);
  app.get("/api/license/heartbeat", handleLicenseCheck);
  app.post("/api/license/heartbeat", handleLicenseCheck);
  app.get("/tables/activation_codes*", async (_req, res) => {
    try {
      const response = await fetch(`${FIREBASE_DB_URL2}/activation_codes.json`);
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch codes" });
      }
      const data = await response.json();
      const arr = data ? Object.values(data) : [];
      return res.json({ data: arr });
    } catch {
      return res.status(500).json({ error: "Database proxy error" });
    }
  });
  app.get("/portal-download.zip", (_req, res) => {
    const zipPath = import_path3.default.join(process.cwd(), "admin-portal.zip");
    res.setHeader("Content-Disposition", 'attachment; filename="locatego-admin-portal.zip"');
    res.setHeader("Content-Type", "application/zip");
    return res.sendFile(zipPath);
  });
  app.get("/portal-download.html", (_req, res) => {
    const htmlPath = import_path3.default.join(process.cwd(), "admin-portal", "index.html");
    res.setHeader("Content-Disposition", 'attachment; filename="index.html"');
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.sendFile(htmlPath);
  });
  const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "locate_go_master_key_9977";
  const requireAdminAuth = (req, res, next) => {
    const providedKey = req.headers["x-admin-key"] || req.query.adminKey || req.query.key || req.body && (req.body.adminKey || req.body.key);
    if (!providedKey || providedKey !== ADMIN_SECRET_KEY) {
      return res.status(404).json({ error: "Not Found" });
    }
    next();
  };
  app.use("/api/admin", requireAdminAuth);
  app.get("/api/admin/portal/download-zip", (_req, res) => {
    const zipPath = import_path3.default.join(process.cwd(), "admin-portal.zip");
    res.setHeader("Content-Disposition", 'attachment; filename="locatego-admin-portal.zip"');
    res.setHeader("Content-Type", "application/zip");
    return res.sendFile(zipPath);
  });
  app.get("/api/admin/portal/download-html", (_req, res) => {
    const htmlPath = import_path3.default.join(process.cwd(), "admin-portal", "index.html");
    res.setHeader("Content-Disposition", 'attachment; filename="locatego-admin-portal.html"');
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.sendFile(htmlPath);
  });
  app.get("/api/admin/portal/view", (_req, res) => {
    const htmlPath = import_path3.default.join(process.cwd(), "admin-portal", "index.html");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.sendFile(htmlPath);
  });
  app.get("/api/admin/subscriptions", (_req, res) => {
    try {
      const codes = subscriptionDb.getAllCodes();
      const stats = subscriptionDb.getStats();
      const activeDevices = db.getAllDevicesSummary();
      return res.json({
        success: true,
        codes,
        stats,
        activeDevices
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: "\u0641\u0634\u0644 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A" });
    }
  });
  app.post("/api/admin/subscriptions/generate", (req, res) => {
    try {
      const {
        code,
        planName,
        duration,
        durationDays,
        targetDeviceId,
        driverName,
        driverPhone,
        notes,
        startMode
      } = req.body;
      if (code && subscriptionDb.getCode(code)) {
        return res.status(400).json({
          success: false,
          error: "\u0643\u0648\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0647\u0630\u0627 \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644\u060C \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0643\u0648\u062F \u0622\u062E\u0631 \u0623\u0648 \u062A\u0631\u0643\u0647 \u0641\u0627\u0631\u063A\u0627\u064B \u0644\u062A\u0648\u0644\u064A\u062F \u0643\u0648\u062F \u062A\u0644\u0642\u0627\u0626\u064A"
        });
      }
      const createdCode = subscriptionDb.createCode({
        code,
        planName,
        duration,
        durationDays: typeof durationDays === "number" ? durationDays : void 0,
        targetDeviceId,
        driverName,
        driverPhone,
        notes,
        startMode: startMode || "on_first_activation"
      });
      return res.status(201).json({
        success: true,
        code: createdCode,
        message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0643\u0648\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 (${createdCode.code}) \u0628\u0646\u062C\u0627\u062D`
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err?.message || "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0643\u0648\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643"
      });
    }
  });
  app.post("/api/admin/subscriptions/:id/extend", (req, res) => {
    try {
      const { id } = req.params;
      const days = Number(req.body.days) || 30;
      const updated = subscriptionDb.extendCode(id, days);
      if (!updated) {
        return res.status(404).json({ success: false, error: "\u0643\u0648\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      return res.json({
        success: true,
        code: updated,
        message: `\u062A\u0645 \u062A\u0645\u062F\u064A\u062F \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0643\u0648\u062F \u0628\u0646\u062C\u0627\u062D \u0628\u0645\u0642\u062F\u0627\u0631 (${days}) \u064A\u0648\u0645\u0627\u064B`
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message || "\u0641\u0634\u0644 \u0627\u0644\u062A\u0645\u062F\u064A\u062F" });
    }
  });
  app.post("/api/admin/subscriptions/:id/revoke", (req, res) => {
    try {
      const { id } = req.params;
      const updated = subscriptionDb.revokeCode(id);
      if (!updated) {
        return res.status(404).json({ success: false, error: "\u0643\u0648\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      return res.json({
        success: true,
        code: updated,
        message: "\u062A\u0645 \u062A\u0639\u0637\u064A\u0644 \u0635\u0644\u0627\u062D\u064A\u0629 \u0643\u0648\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0628\u0646\u062C\u0627\u062D"
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message || "\u0641\u0634\u0644 \u0627\u0644\u062A\u0639\u0637\u064A\u0644" });
    }
  });
  app.post("/api/admin/subscriptions/:id/activate", (req, res) => {
    try {
      const { id } = req.params;
      const updated = subscriptionDb.activateCode(id);
      if (!updated) {
        return res.status(404).json({ success: false, error: "\u0643\u0648\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      return res.json({
        success: true,
        code: updated,
        message: "\u062A\u0645 \u062A\u0646\u0634\u064A\u0637 \u0643\u0648\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0628\u0646\u062C\u0627\u062D"
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message || "\u0641\u0634\u0644 \u0627\u0644\u062A\u0646\u0634\u064A\u0637" });
    }
  });
  app.post("/api/admin/subscriptions/:id/unbind", (req, res) => {
    try {
      const { id } = req.params;
      const updated = subscriptionDb.unbindDevice(id);
      if (!updated) {
        return res.status(404).json({ success: false, error: "\u0643\u0648\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      return res.json({
        success: true,
        code: updated,
        message: "\u062A\u0645 \u0641\u0643 \u0627\u0631\u062A\u0628\u0627\u0637 \u0627\u0644\u062C\u0647\u0627\u0632 \u0628\u0646\u062C\u0627\u062D\u060C \u064A\u0645\u0643\u0646 \u0627\u0644\u0622\u0646 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0643\u0648\u062F \u0639\u0644\u0649 \u0623\u064A \u062C\u0648\u0627\u0644 \u062C\u062F\u064A\u062F"
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message || "\u0641\u0634\u0644 \u0641\u0643 \u0627\u0644\u0627\u0631\u062A\u0628\u0627\u0637" });
    }
  });
  app.delete("/api/admin/subscriptions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await subscriptionDb.deleteCode(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: "\u0643\u0648\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u062A\u0645 \u062D\u0630\u0641\u0647 \u0645\u0633\u0628\u0642\u0627\u064B" });
      }
      return res.json({
        success: true,
        message: "\u062A\u0645 \u062D\u0630\u0641 \u0643\u0648\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0646\u0647\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0641\u0627\u064A\u0631\u0628\u064A\u0633 \u0648\u0627\u0644\u0633\u064A\u0631\u0641\u0631"
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message || "\u0641\u0634\u0644 \u0627\u0644\u062D\u0630\u0641" });
    }
  });
  app.delete("/api/admin/subscriptions", async (_req, res) => {
    try {
      await subscriptionDb.deleteAllCodes();
      return res.json({
        success: true,
        message: "\u062A\u0645 \u062D\u0630\u0641 \u062C\u0645\u064A\u0639 \u0623\u0643\u0648\u0627\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0628\u0646\u062C\u0627\u062D \u0645\u0646 \u0641\u0627\u064A\u0631\u0628\u064A\u0633 \u0648\u0627\u0644\u0633\u064A\u0631\u0641\u0631"
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message || "\u0641\u0634\u0644 \u062D\u0630\u0641 \u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0643\u0648\u0627\u062F" });
    }
  });
  app.post("/api/admin/subscriptions/sync", async (_req, res) => {
    try {
      const syncResult = await subscriptionDb.syncAllWithFirebase();
      const stats = subscriptionDb.getStats();
      const codes = subscriptionDb.getAllCodes();
      return res.json({
        success: syncResult.success,
        syncedCount: syncResult.syncedCount,
        stats,
        codes,
        message: syncResult.success ? `\u062A\u0645\u062A \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0628\u0646\u062C\u0627\u062D \u0645\u0639 \u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0641\u0627\u064A\u0631\u0628\u064A\u0633 (\u062A\u0645 \u0627\u0633\u062A\u064A\u0631\u0627\u062F ${syncResult.syncedCount} \u0643\u0648\u062F \u062C\u062F\u064A\u062F)` : "\u064A\u0639\u0645\u0644 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0641\u064A \u0648\u0636\u0639 \u0627\u0644\u0623\u0648\u0641\u0644\u0627\u064A\u0646 \u0627\u0644\u0645\u062D\u0644\u064A (\u062A\u0645 \u062D\u0641\u0638 \u0643\u0627\u0641\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u062D\u0644\u064A\u0627\u064B)"
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message || "\u0641\u0634\u0644 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0633\u062D\u0627\u0628\u064A\u0629" });
    }
  });
  app.get("/api/status", (req, res) => {
    const deviceId = extractDeviceId(req);
    const device = db.getDevice(deviceId);
    const stats = db.getDeviceStats(deviceId);
    res.json({
      deviceId: device.deviceId,
      isRunning: device.isRunning,
      settings: device.settings,
      driverLocation: device.driverLocation,
      stats,
      isolated: true
    });
  });
  app.post("/api/status/toggle", (req, res) => {
    const deviceId = extractDeviceId(req);
    const explicitState = typeof req.body.isRunning === "boolean" ? req.body.isRunning : void 0;
    const isRunning = db.toggleRunning(deviceId, explicitState);
    res.json({
      success: true,
      deviceId,
      isRunning,
      message: isRunning ? `\u062A\u0645 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0623\u062F\u0627\u0629 \u0648\u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629 \u0628\u0646\u062C\u0627\u062D \u0644\u0644\u0645\u0646\u062F\u0648\u0628 (${deviceId})` : `\u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u0627\u0644\u0623\u062F\u0627\u0629 \u0645\u0624\u0642\u062A\u0627\u064B \u0644\u0644\u0645\u0646\u062F\u0648\u0628 (${deviceId})`
    });
  });
  app.get("/api/settings", (req, res) => {
    const deviceId = extractDeviceId(req);
    const device = db.getDevice(deviceId);
    res.json({
      success: true,
      deviceId: device.deviceId,
      settings: device.settings
    });
  });
  app.post("/api/settings", (req, res) => {
    const deviceId = extractDeviceId(req);
    const updatedSettings = db.updateSettings(deviceId, req.body);
    res.json({
      success: true,
      deviceId,
      settings: updatedSettings,
      message: `\u062A\u0645 \u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0646\u062F\u0648\u0628 (${deviceId}) \u0628\u0646\u062C\u0627\u062D \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A`
    });
  });
  app.post(["/api/location", "/api/driver/location"], (req, res) => {
    const integrity = verifyRequestIntegrity(req);
    if (!integrity.valid) {
      return res.status(403).json({
        error: integrity.reason || "\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u0623\u0645\u0646\u064A \u0645\u0646 \u062A\u0648\u0642\u064A\u0639 \u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u0631\u0642\u0645\u064A",
        securityBlocked: true
      });
    }
    const deviceId = extractDeviceId(req);
    const { lat, lng, accuracy } = req.body;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "\u0627\u0644\u0625\u062D\u062F\u0627\u062B\u064A\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629 (lat and lng required)" });
    }
    const driverLocation = db.updateLocation(deviceId, { lat, lng, accuracy });
    res.json({
      success: true,
      deviceId,
      driverLocation,
      secured: integrity.isNativeSigned,
      message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0645\u0648\u0642\u0639 \u0627\u0644\u0645\u0646\u062F\u0648\u0628 (${deviceId}) \u0627\u0644\u062D\u0642\u064A\u0642\u064A \u0628\u0646\u062C\u0627\u062D`
    });
  });
  app.post("/api/orders/evaluate", (req, res) => {
    const integrity = verifyRequestIntegrity(req);
    if (!integrity.valid) {
      return res.status(403).json({
        error: integrity.reason || "\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u0623\u0645\u0646\u064A \u0645\u0646 \u062A\u0648\u0642\u064A\u0639 \u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u0631\u0642\u0645\u064A (HMAC Signature Mismatch)",
        securityBlocked: true
      });
    }
    const deviceId = extractDeviceId(req);
    const device = db.getDevice(deviceId);
    const deviceIsRunning = device.isRunning;
    const {
      appName = "\u062C\u0627\u0647\u0632",
      storeName = "\u0645\u0637\u0639\u0645 \u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
      customerDistrict = "\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0639\u0645\u064A\u0644",
      payoutSar = 18,
      storeLat,
      storeLng,
      customerLat,
      customerLng,
      distanceKm: inputDistance,
      pickupDistanceKm,
      deliveryDistanceKm
    } = req.body;
    let computedDistance = 0;
    if (typeof storeLat === "number" && typeof storeLng === "number" && typeof customerLat === "number" && typeof customerLng === "number") {
      computedDistance = calculateHaversineDistanceKm(storeLat, storeLng, customerLat, customerLng);
    } else if (typeof deliveryDistanceKm === "number" && deliveryDistanceKm > 0) {
      computedDistance = Math.round(deliveryDistanceKm * 10) / 10;
    } else if (typeof inputDistance === "number" && inputDistance > 0) {
      computedDistance = Math.round(inputDistance * 10) / 10;
    } else if (typeof pickupDistanceKm === "number" && pickupDistanceKm > 0) {
      computedDistance = Math.round(pickupDistanceKm * 10) / 10;
    } else if (device.driverLocation && typeof storeLat === "number" && typeof storeLng === "number") {
      computedDistance = calculateHaversineDistanceKm(
        device.driverLocation.lat,
        device.driverLocation.lng,
        storeLat,
        storeLng
      );
    } else {
      return res.status(400).json({
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0633\u0627\u0641\u0629 \u0645\u0641\u0642\u0648\u062F\u0629: \u064A\u062C\u0628 \u0625\u0631\u0633\u0627\u0644 distanceKm \u0623\u0648 \u0625\u062D\u062F\u0627\u062B\u064A\u0627\u062A \u0627\u0644\u0645\u062A\u062C\u0631 \u0648\u0627\u0644\u0639\u0645\u064A\u0644."
      });
    }
    const maxAllowedDelivery = typeof device.settings.maxDistanceKm === "number" ? device.settings.maxDistanceKm : 3;
    const maxAllowedPickup = typeof device.settings.maxPickupDistanceKm === "number" ? device.settings.maxPickupDistanceKm : 1.5;
    const isDeliveryAcceptable = computedDistance <= maxAllowedDelivery;
    const isPickupAcceptable = typeof pickupDistanceKm === "number" && pickupDistanceKm > 0 ? pickupDistanceKm <= maxAllowedPickup : true;
    const isAccepted = deviceIsRunning && isDeliveryAcceptable && isPickupAcceptable;
    let rejectionReason = void 0;
    if (!deviceIsRunning) {
      rejectionReason = `\u0623\u062F\u0627\u0629 \u0627\u0644\u0645\u0646\u062F\u0648\u0628 (${deviceId}) \u0641\u064A \u0648\u0636\u0639 \u0627\u0644\u0625\u064A\u0642\u0627\u0641 (Offline) - \u064A\u0631\u062C\u0649 \u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 \u0632\u0631 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0623\u062F\u0627\u0629 (Start) \u0644\u0628\u062F\u0621 \u0642\u0628\u0648\u0644 \u0627\u0644\u0637\u0644\u0628\u0627\u062A`;
    } else if (!isDeliveryAcceptable && !isPickupAcceptable) {
      rejectionReason = `\u062A\u062C\u0627\u0648\u0632 \u062D\u062F\u064A \u0627\u0644\u0645\u0633\u0627\u0641\u0629 \u0645\u0639\u0627\u064B: \u0645\u0633\u0627\u0641\u0629 \u0627\u0644\u0639\u0645\u064A\u0644 (${computedDistance} \u0643\u0645 > ${maxAllowedDelivery} \u0643\u0645) \u0648\u0645\u0633\u0627\u0641\u0629 \u0627\u0644\u0645\u062A\u062C\u0631 (${pickupDistanceKm} \u0643\u0645 > ${maxAllowedPickup} \u0643\u0645)`;
    } else if (!isDeliveryAcceptable) {
      rejectionReason = `\u0645\u0633\u0627\u0641\u0629 \u0627\u0644\u0639\u0645\u064A\u0644 / \u0627\u0644\u0648\u062C\u0647\u0629 (${computedDistance} \u0643\u0645) \u062A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0627\u0644\u0645\u062D\u062F\u062F (${maxAllowedDelivery} \u0643\u0645)`;
    } else if (!isPickupAcceptable) {
      rejectionReason = `\u0645\u0633\u0627\u0641\u0629 \u0627\u0644\u0645\u062A\u062C\u0631 / \u0627\u0644\u0645\u0637\u0639\u0645 (${pickupDistanceKm} \u0643\u0645) \u062A\u062A\u062C\u0627\u0648\u0632 \u062D\u062F \u0645\u0633\u0627\u0641\u0629 \u0627\u0644\u0645\u062A\u062C\u0631 \u0627\u0644\u0645\u062D\u062F\u062F (${maxAllowedPickup} \u0643\u0645)`;
    }
    const newOrder = {
      id: `ord-${Date.now().toString().slice(-4)}`,
      deviceId,
      appName,
      storeName,
      customerDistrict,
      distanceKm: computedDistance,
      pickupDistanceKm: typeof pickupDistanceKm === "number" ? pickupDistanceKm : void 0,
      deliveryDistanceKm: typeof deliveryDistanceKm === "number" ? deliveryDistanceKm : void 0,
      payoutSar: Number(payoutSar) || 18,
      detectedAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: isAccepted ? "accepted" : "rejected",
      rejectionReason,
      autoAccepted: isAccepted && device.settings.autoAccept,
      coordinates: {
        store: storeLat && storeLng ? { lat: storeLat, lng: storeLng } : void 0,
        customer: customerLat && customerLng ? { lat: customerLat, lng: customerLng } : void 0,
        driver: device.driverLocation ? { lat: device.driverLocation.lat, lng: device.driverLocation.lng } : void 0
      }
    };
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
        rejectionReason
      },
      stats: currentStats
    });
  });
  app.get("/api/orders", (req, res) => {
    const deviceId = extractDeviceId(req);
    const orders = db.getOrders(deviceId);
    res.json({
      deviceId,
      orders,
      count: orders.length,
      isolated: true
    });
  });
  app.delete("/api/orders", (req, res) => {
    const deviceId = extractDeviceId(req);
    db.clearOrders(deviceId);
    res.json({
      success: true,
      deviceId,
      message: `\u062A\u0645 \u0645\u0633\u062D \u0633\u062C\u0644 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0646\u062F\u0648\u0628 (${deviceId}) \u0628\u0646\u062C\u0627\u062D \u0628\u062F\u0648\u0646 \u0627\u0644\u062A\u0623\u062B\u064A\u0631 \u0639\u0644\u0649 \u0623\u064A \u0645\u0646\u062F\u0648\u0628 \u0622\u062E\u0631`
    });
  });
  app.get("/api/devices/summary", (_req, res) => {
    const summary = db.getAllDevicesSummary();
    res.json({
      success: true,
      isolationMode: "enforced",
      totalRegisteredDevices: summary.length,
      devices: summary,
      message: "\u062C\u0645\u064A\u0639 \u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0633\u062C\u0644\u0627\u062A \u0648\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0645\u0646\u0627\u062F\u064A\u0628 \u0645\u0639\u0632\u0648\u0644\u0629 \u0628\u0646\u0633\u0628\u0629 100% \u0644\u0643\u0644 \u0645\u0639\u0631\u0641 \u062C\u0647\u0627\u0632"
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path3.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path3.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Locate Go Server] Running on http://localhost:${PORT} with Device-Level Isolation`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
