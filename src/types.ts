export type AppSource =
  | 'jahez'
  | 'hungerstation'
  | 'marsool'
  | 'toyou'
  | 'ninja'
  | 'chefz'
  | 'locatego'
  | 'locatecc'
  | 'locatei'
  | 'locatem'
  | 'locateg'
  | 'locatef';

export interface OrderItem {
  id: string;
  deviceId?: string;
  appSource: AppSource;
  appName: string;
  storeName: string;
  customerDistrict: string;
  distanceKm: number;
  pickupDistanceKm?: number;
  deliveryDistanceKm?: number;
  payoutSar: number;
  detectedAt: Date;
  status: 'accepted' | 'rejected';
  rejectionReason?: string;
  autoAccepted: boolean;
  coordinates?: {
    store?: { lat: number; lng: number };
    customer?: { lat: number; lng: number };
    driver?: { lat: number; lng: number };
  };
}

export interface LocateGoSettings {
  maxDistanceKm: number;
  maxPickupDistanceKm: number;
  autoAccept: boolean;
  soundAlerts: boolean;
  minPayoutSar: number;
  vibrationFeedback: boolean;
  swipeSpeedMs?: number;
  tapIntervalMs?: number;
  enableCustomInterval?: boolean;
  orderCardLanguage?: 'ar' | 'en';
}

export interface DriverLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  updatedAt: string;
}

export interface LocateGoStatus {
  deviceId: string;
  isRunning: boolean;
  isOverlayActive: boolean;
  isMonitoringScreen: boolean;
  fps: number;
  latencyMs: number;
  lastScanTimestamp: number;
  totalScanned: number;
  acceptedCount: number;
  rejectedCount: number;
  acceptanceRate?: number;
  totalEarningsSar?: number;
  serverConnected: boolean;
  driverLocation?: DriverLocation | null;
}
