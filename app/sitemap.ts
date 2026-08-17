import { MetadataRoute } from "next";
import { SITE_LINKS } from "@/lib/menu";
import { REGION_HUB_SLUG, SIDOS } from "@/lib/regions";
import {
  CREMATORIUM,
  FUNERAL_HALL,
  GROUPS,
  isStale,
  listFacilitiesByGroup,
  listRegions,
} from "@/lib/facilities";
import { absoluteUrl } from "@/lib/seo";

/**
 * 전체 URL 이 1,400개쯤(시설 1,146 + 시군구 247 + 시도 17 + 고정)이라 한 파일로
 * 충분하다. 봉안·묘지·자연장지(1,479곳)를 붙이면 3,000개 근처가 되므로 그때
 * yoyang 처럼 사이트맵 인덱스로 쪼개는 것을 검토할 것.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [crematoriums, halls, regions] = await Promise.all([
    listFacilitiesByGroup(CREMATORIUM),
    listFacilitiesByGroup(FUNERAL_HALL),
    listRegions(),
  ]);

  const statics = [
    "/",
    ...GROUPS.map((g) => `/${g.slug}`),
    `/${REGION_HUB_SLUG}`,
    ...SITE_LINKS.map((l) => l.href),
  ].map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: (path === "/" ? "daily" : "monthly") as "daily" | "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));

  const facilities = [...crematoriums, ...halls].map((f) => ({
    url: absoluteUrl(`/${f.slug}`),
    lastModified: f.price_date ? new Date(f.price_date) : now,
    changeFrequency: "monthly" as const,
    // 화장시설 62곳이 이 사이트에서 가장 강한 페이지다. 요금이 오래된 곳은 낮춘다.
    priority:
      f.group_cd === CREMATORIUM
        ? isStale(f.price_date)
          ? 0.7
          : 0.9
        : isStale(f.price_date)
          ? 0.4
          : 0.6,
  }));

  const all = [
    ...statics,
    ...SIDOS.map((s) => ({
      url: absoluteUrl(`/${s.slug}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // 화장시설이 있는 시군구를 앞세운다 — 그쪽이 검색 의도에 정확히 답한다
    ...regions.map((r) => ({
      url: absoluteUrl(`/${r.region_slug}`),
      lastModified: r.latest_price_date ? new Date(r.latest_price_date) : now,
      changeFrequency: "monthly" as const,
      priority: r.crematorium_cnt > 0 ? 0.8 : 0.5,
    })),
    ...facilities,
  ];

  // **주소가 겹치는 것을 걷어낸다.** 시군구 없이 시도 본청에 등록된 시설이
  // 있는 곳(서울·세종·인천 등 8곳)은 region_slug 가 시도 슬러그와 같아서
  // 같은 URL 이 두 번 들어간다. 먼저 온 항목(시도)을 남긴다.
  const seen = new Set<string>();
  return all.filter((e) => (seen.has(e.url) ? false : (seen.add(e.url), true)));
}
