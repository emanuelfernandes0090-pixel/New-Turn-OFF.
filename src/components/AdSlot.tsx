import React, { useEffect } from "react";
import { ADS_ENABLED, ADS_CONFIG, getAdPlatform } from "../lib/ads";

interface AdSlotProps {
  placement: string;
  className?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({
  placement,
  className = "",
}) => {
  if (!ADS_ENABLED) {
    return null;
  }

  const platform = getAdPlatform();

  useEffect(() => {
    if (platform === "web" && ADS_CONFIG.adsenseClientId) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push(
          {},
        );
      } catch (err) {
        // Silently ignore ads blockers or script load issues
      }
    } else if (platform === "native") {
      // TODO: integrar plugin de AdMob quando a camada nativa existir (ex: @capacitor-community/admob)
      // Exemplo futuro: AdMob.showBanner({ adId: ADS_CONFIG.admobBannerUnitId, position: BannerAdPosition.BOTTOM_CENTER });
    }
  }, [platform]);

  if (platform === "web") {
    if (!ADS_CONFIG.adsenseClientId) {
      return null;
    }
    return (
      <aside
        aria-label="Espaço de publicidade"
        className={`my-6 text-center overflow-hidden max-w-full no-print ${className}`}
      >
        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
          Publicidade
        </span>
        <ins
          className="adsbygoogle"
          style={{ display: "block", minHeight: "90px" }}
          data-ad-client={ADS_CONFIG.adsenseClientId}
          data-ad-slot={placement}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </aside>
    );
  }

  // Native platform stub
  return null;
};
