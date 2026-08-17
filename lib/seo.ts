import type { Metadata } from "next";

export const SITE = {
  name: "장례비용",
  nameEn: "Jangrye",
  url: "https://jangrye.keywordegg.com",
  locale: "ko_KR",
  ogImage: "/opengraph-image",
  description:
    "화장장 관내 요금과 관외 요금은 중간값 기준 10배 차이 납니다. 보건복지부 e하늘 자료로 전국 화장시설·장례식장의 요금과 위치·교통·시설 정보를 정리했습니다.",
} as const;

export function absoluteUrl(path: string): string {
  if (!path || path === "/") return SITE.url;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE.url}${p.split("/").map(encodeURIComponent).join("/")}`;
}

export interface BuildMetadataInput {
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  type?: "website" | "article";
  image?: string;
}

export function buildMetadata({
  path,
  title,
  description,
  keywords,
  type = "website",
  image,
}: BuildMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const socialImage = image ?? SITE.ogImage;
  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      locale: SITE.locale,
      type,
      images: [
        { url: socialImage, width: 1200, height: 630, alt: `${SITE.name} - ${title}` },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export function breadcrumbJsonLd(trail: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "ko-KR",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

/**
 * 시설 상세는 실제 장소이므로 Place 로 적는다.
 *
 * 가격은 `priceRange` 하나로 뭉뚱그리지 않는다 — 관내/관외가 10배 차이라
 * 한 범위로 적으면 오해를 부른다. 요금은 본문 표로만 보여준다.
 */
export function placeJsonLd({
  name,
  path,
  description,
  address,
  tel,
  lat,
  lng,
  photos,
}: {
  name: string;
  path: string;
  description: string;
  address: string | null;
  tel: string | null;
  lat: number | null;
  lng: number | null;
  photos: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name,
    description,
    url: absoluteUrl(path),
    ...(address
      ? { address: { "@type": "PostalAddress", streetAddress: address, addressCountry: "KR" } }
      : {}),
    ...(tel ? { telephone: tel } : {}),
    ...(lat !== null && lng !== null
      ? { geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng } }
      : {}),
    ...(photos.length ? { photo: photos } : {}),
  };
}

/** 지역·허브 화면은 공개 자료를 집계한 것이라 Dataset 으로 적는다 */
export function datasetJsonLd({
  name,
  path,
  description,
}: {
  name: string;
  path: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name,
    description,
    url: absoluteUrl(path),
    inLanguage: "ko-KR",
    creator: { "@type": "Organization", name: "보건복지부" },
    isBasedOn: "https://www.15774129.go.kr",
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
  };
}
