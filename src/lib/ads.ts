// Provider-agnostic advertising module (AdSense for Web / AdMob for Native)
// Compliant with Turn OFF monetization architecture (safe, non-intrusive)

export const ADS_ENABLED = import.meta.env.VITE_ENABLE_ADS === "true";

export type AdPlatform = "native" | "web";

export function getAdPlatform(): AdPlatform {
  if (typeof window === "undefined") return "web";
  // Detect Capacitor, Cordova or native webview bridge
  const hasCapacitor = Boolean((window as any).Capacitor?.isNativePlatform?.());
  const hasAndroidBridge = Boolean((window as any).AndroidBridge);
  if (hasCapacitor || hasAndroidBridge) {
    return "native";
  }
  return "web";
}

export const ADS_CONFIG = {
  adsenseClientId: import.meta.env.VITE_ADSENSE_CLIENT_ID || "",
  admobAppId: import.meta.env.VITE_ADMOB_APP_ID || "",
  admobBannerUnitId: import.meta.env.VITE_ADMOB_BANNER_UNIT_ID || "",
};
