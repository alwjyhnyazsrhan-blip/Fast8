/**
 * LocateGoNativeBridge TypeScript Interface & Helpers
 * يتيح لواجهة React التفاعل مباشرة وبشكل سلس مع طبقة نظام أندرويد الأصيلة.
 */

export interface LocateGoNativeInterface {
  getSettingsJson(): string;
  saveSettings(settingsJsonStr: string): boolean;
  setTrackingActive(active: boolean): void;
  getAndroidStatusJson(): string;
  openAccessibilitySettings(): void;
  isAccessibilityEnabled?(): boolean;
  toggleFloatingOverlay(): void;
  requestBatteryOptimization(): void;
  showToast(message: string): void;
  getDeviceId?(): string;
  setDeviceId?(newId: string): boolean;
  getSecurityStatusJson?(): string;
  killAllServices?(): boolean;
  stopAllServices?(): boolean;
  isVipLicensed?(): boolean;
  setVipLicensed?(licensed: boolean): boolean;
}

declare global {
  interface Window {
    LocateGoNative?: LocateGoNativeInterface;
    onLocateGoNativeSync?: (state: {
      isNativeApp: boolean;
      isVipLicensed?: boolean;
      isTrackingRunning: boolean;
      isOverlayShowing: boolean;
      isAccessibilityEnabled?: boolean;
      lat: number;
      lng: number;
    }) => void;
  }
}

export const isRunningInAndroidApp = (): boolean => {
  return typeof window !== 'undefined' && !!window.LocateGoNative;
};

export const getNativeBridge = (): LocateGoNativeInterface | null => {
  if (typeof window !== 'undefined' && window.LocateGoNative) {
    return window.LocateGoNative;
  }
  return null;
};
