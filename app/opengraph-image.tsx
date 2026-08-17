import { ImageResponse } from "next/og";

export const alt = "Vet Fee - Animal hospital prices in Korea";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * 대표 OG 이미지.
 *
 * 한글은 웹폰트를 함께 실어야 그려진다(안 실으면 네모로 나온다). 워커 번들이
 * 커지므로 여기서는 로마자만 쓰고 페이지별 한글 제목은 og:title 로 전달한다.
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1e2628",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 12,
            background: "linear-gradient(90deg, #3f8f8a, #9ccfca)",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 200,
            height: 200,
            borderRadius: 100,
            background: "rgba(156, 207, 202, 0.12)",
            border: "2px solid rgba(156, 207, 202, 0.3)",
            marginBottom: 44,
            fontSize: 96,
          }}
        >
          🐾
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: -2,
            marginBottom: 18,
          }}
        >
          VET FEE
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "#9ccfca",
            fontWeight: 500,
          }}
        >
          Animal Hospital Prices by District
        </div>
      </div>
    ),
    { ...size },
  );
}
