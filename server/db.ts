import fs from 'fs';
import path from 'path';

export interface RealOrder {
  id: string;
  deviceId?: string;
  appName: string;
  storeName: string;
  customerDistrict: string;
  distanceKm: number;
  pickupDistanceKm?: number;
  deliveryDistanceKm?: number;
  payoutSar: number;
  detectedAt: string;
  status: 'accepted' | 'rejected';
  rejectionReason?: string;
  autoAccepted: boolean;
  coordinates?: {
    store?: { lat: number; lng: number };
    customer?: { lat: number; lng: number };
    driver?: { lat: number; lng: number };
  };
}

export interface DeviceSettings {
  maxDistanceKm: number;
  maxPickupDistanceKm: number;
  autoAccept: boolean;
  soundAlerts: boolean;
  minPayoutSar: number;
  vibrationFeedback: boolean;
  swipeSpeedMs: number;
  tapIntervalMs: number;
  enableCustomInterval: boolean;
}

export interface DriverLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  updatedAt: string;
}

export interface DeviceRecord {
  deviceId: string;
  registeredAt: string;
  lastActiveAt: string;
  isRunning: boolean;
  settings: DeviceSettings;
  driverLocation: DriverLocation | null;
  orders: RealOrder[];
}

export interface DatabaseSchema {
  version: number;
  updatedAt: string;
  devices: Record<string, DeviceRecord>;
}

const DEFAULT_SETTINGS: DeviceSettings = {
  maxDistanceKm: 3.0,
  maxPickupDistanceKm: 1.5,
  autoAccept: true,
  soundAlerts: false,
  minPayoutSar: 0.0,
  vibrationFeedback: false,
  swipeSpeedMs: 60,
  tapIntervalMs: 10,
  enableCustomInterval: false,
};

class DeviceDatabase {
  private dbFilePath: string;
  private dbData: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.error('[DeviceDatabase] Error creating data directory:', err);
      }
    }

    this.dbFilePath = path.join(dataDir, 'locatego_db.json');
    this.dbData = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.devices === 'object') {
          console.log(
            `[DeviceDatabase] Loaded database with ${Object.keys(parsed.devices).length} isolated device(s).`
          );
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[DeviceDatabase] Could not read existing DB file, creating fresh DB:', err);
    }

    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      devices: {},
    };
  }

  private saveDatabase() {
    this.dbData.updatedAt = new Date().toISOString();
    try {
      const tempPath = `${this.dbFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.dbData, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.dbFilePath);
    } catch (err) {
      console.error('[DeviceDatabase] Error saving DB to disk:', err);
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveDatabase();
      this.saveTimeout = null;
    }, 150);
  }

  public sanitizeDeviceId(rawId?: string | null): string {
    if (!rawId || typeof rawId !== 'string') {
      return 'REP-DEFAULT';
    }
    const cleaned = rawId.trim().toUpperCase().replace(/[^A-Z0-9_=-]/g, '').slice(0, 32);
    return cleaned.length > 0 ? cleaned : 'REP-DEFAULT';
  }

  public getOrCreateDevice(rawId?: string | null): DeviceRecord {
    const deviceId = this.sanitizeDeviceId(rawId);

    if (!this.dbData.devices[deviceId]) {
      const now = new Date().toISOString();
      this.dbData.devices[deviceId] = {
        deviceId,
        registeredAt: now,
        lastActiveAt: now,
        isRunning: true,
        settings: { ...DEFAULT_SETTINGS },
        driverLocation: null,
        orders: [],
      };
      this.scheduleSave();
      console.log(`[DeviceDatabase] Created new isolated partition for Device: ${deviceId}`);
    } else {
      // Update last active
      this.dbData.devices[deviceId].lastActiveAt = new Date().toISOString();
    }

    return this.dbData.devices[deviceId];
  }

  public getDevice(rawId?: string | null): DeviceRecord {
    return this.getOrCreateDevice(rawId);
  }

  public updateSettings(rawId: string | null | undefined, newSettings: Partial<DeviceSettings>): DeviceSettings {
    const device = this.getOrCreateDevice(rawId);

    if (typeof newSettings.maxDistanceKm === 'number' && newSettings.maxDistanceKm > 0) {
      device.settings.maxDistanceKm = Math.round(newSettings.maxDistanceKm * 10) / 10;
    }
    if (typeof newSettings.maxPickupDistanceKm === 'number' && newSettings.maxPickupDistanceKm > 0) {
      device.settings.maxPickupDistanceKm = Math.round(newSettings.maxPickupDistanceKm * 10) / 10;
    }
    if (typeof newSettings.autoAccept === 'boolean') {
      device.settings.autoAccept = newSettings.autoAccept;
    }
    if (typeof newSettings.soundAlerts === 'boolean') {
      device.settings.soundAlerts = newSettings.soundAlerts;
    }
    if (typeof newSettings.minPayoutSar === 'number' && newSettings.minPayoutSar >= 0) {
      device.settings.minPayoutSar = newSettings.minPayoutSar;
    }
    if (typeof newSettings.vibrationFeedback === 'boolean') {
      device.settings.vibrationFeedback = newSettings.vibrationFeedback;
    }

    this.scheduleSave();
    return device.settings;
  }

  public toggleRunning(rawId: string | null | undefined, explicitState?: boolean): boolean {
    const device = this.getOrCreateDevice(rawId);
    if (typeof explicitState === 'boolean') {
      device.isRunning = explicitState;
    } else {
      device.isRunning = !device.isRunning;
    }
    this.scheduleSave();
    return device.isRunning;
  }

  public updateLocation(
    rawId: string | null | undefined,
    loc: { lat: number; lng: number; accuracy?: number }
  ): DriverLocation {
    const device = this.getOrCreateDevice(rawId);
    device.driverLocation = {
      lat: loc.lat,
      lng: loc.lng,
      accuracy: loc.accuracy || undefined,
      updatedAt: new Date().toISOString(),
    };
    this.scheduleSave();
    return device.driverLocation;
  }

  public addOrder(rawId: string | null | undefined, order: RealOrder): RealOrder {
    const device = this.getOrCreateDevice(rawId);
    order.deviceId = device.deviceId;

    device.orders.unshift(order);
    // Keep up to 200 orders per device to balance memory and history
    if (device.orders.length > 200) {
      device.orders.pop();
    }

    this.scheduleSave();
    return order;
  }

  public getOrders(rawId: string | null | undefined): RealOrder[] {
    const device = this.getOrCreateDevice(rawId);
    return device.orders;
  }

  public clearOrders(rawId: string | null | undefined): void {
    const device = this.getOrCreateDevice(rawId);
    device.orders = [];
    this.scheduleSave();
  }

  public getDeviceStats(rawId: string | null | undefined) {
    const device = this.getOrCreateDevice(rawId);
    const acceptedCount = device.orders.filter((o) => o.status === 'accepted').length;
    const rejectedCount = device.orders.filter((o) => o.status === 'rejected').length;
    const totalScanned = device.orders.length;
    const totalEarningsSar = device.orders
      .filter((o) => o.status === 'accepted')
      .reduce((sum, o) => sum + (o.payoutSar || 0), 0);

    return {
      totalScanned,
      acceptedCount,
      rejectedCount,
      acceptanceRate: totalScanned > 0 ? Math.round((acceptedCount / totalScanned) * 100) : 0,
      totalEarningsSar: Math.round(totalEarningsSar * 10) / 10,
    };
  }

  public getAllDevicesSummary() {
    return Object.values(this.dbData.devices).map((d) => ({
      deviceId: d.deviceId,
      totalOrders: d.orders.length,
      acceptedOrders: d.orders.filter((o) => o.status === 'accepted').length,
      isRunning: d.isRunning,
      maxDistanceKm: d.settings.maxDistanceKm,
      lastActiveAt: d.lastActiveAt,
      hasLocation: !!d.driverLocation,
    }));
  }
}

export const db = new DeviceDatabase();
