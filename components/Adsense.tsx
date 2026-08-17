"use client";
import { useEffect } from "react";
import { AD_CLIENT } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

type AdsenseProps = {
  slotId: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle" | "fluid";
  className?: string;
};

export default function Adsense({
  slotId,
  format = "auto",
  className = "",
}: AdsenseProps) {
  const isDev = process.env.NODE_ENV === "development";
  const hasSlot = slotId.trim().length > 0;

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!isDev && hasSlot) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error("Adsense load error", e);
      }
    }
  }, [slotId]);

  // 슬롯을 아직 만들지 않았으면 자리도 만들지 않는다 (lib/ads.ts 참고)
  if (!hasSlot) {
    if (!isDev) return null;
    return (
      <div className="notice notice--muted" style={{ marginBottom: 0 }}>
        광고 슬롯 미설정 — 애드센스에서 단위를 만든 뒤 <code>lib/ads.ts</code> 에
        채우세요.
      </div>
    );
  }

  if (isDev) {
    return (
      <div
        className={`adsense-dev ${className}`}
        style={{
          minHeight: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2b323d",
          color: "#c9d1da",
          border: "1px dashed #46505e",
          borderRadius: 10,
          fontSize: 13,
          fontFamily: "monospace",
        }}
      >
        [AdSense Dev] slot {slotId} ({format})
      </div>
    );
  }

  /* 인아티클(fluid) 은 컨테이너 폭에 그대로 맞춰 그려지므로 전체폭 확장을 쓰지
     않는다. 반대로 auto 는 구글이 화면 전체로 확장(ins 에 width/margin-left 를
     직접 삽입)하게 두고, 우리 쪽에서 크기를 건드리지 않는다. */
  const isFluid = format === "fluid";

  return (
    <ins
      className={`adsbygoogle ${className}`.trim()}
      style={{ display: "block", ...(isFluid ? { textAlign: "center" } : null) }}
      data-ad-client={AD_CLIENT}
      data-ad-slot={slotId}
      data-ad-format={format}
      {...(isFluid
        ? { "data-ad-layout": "in-article" }
        : { "data-full-width-responsive": "true" })}
    />
  );
}
