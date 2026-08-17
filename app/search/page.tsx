import type { Metadata } from "next";
import {
  CREMATORIUM,
  FUNERAL_HALL,
  formatWon,
  listFacilitiesByGroup,
  listRegions,
  regionLabelOf,
} from "@/lib/facilities";
import { regionLabel } from "@/lib/regions";
import { buildMetadata, SITE } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...buildMetadata({
    path: "/search",
    title: `검색 | ${SITE.name}`,
    description: "화장시설·장례식장과 지역을 검색합니다.",
  }),
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const keyword = (q ?? "").trim();
  const key = keyword.replace(/\s+/g, "");
  const strip = (v: string | null) => (v ?? "").replace(/\s+/g, "");

  const [crematoriums, halls, regions] = keyword
    ? await Promise.all([
        listFacilitiesByGroup(CREMATORIUM),
        listFacilitiesByGroup(FUNERAL_HALL),
        listRegions(),
      ])
    : [[], [], []];

  // 시설명·주소·지역 이름을 함께 훑는다. "성남 화장장" 처럼 지역+종류로 치는
  // 경우가 많아서 주소까지 봐야 잡힌다.
  const match = (f: (typeof crematoriums)[number]) =>
    strip(f.name).includes(key) ||
    strip(f.address).includes(key) ||
    strip(regionLabelOf(f)).includes(key);

  const foundCrem = keyword ? crematoriums.filter(match).slice(0, 40) : [];
  const foundHalls = keyword ? halls.filter(match).slice(0, 60) : [];
  const foundRegions = keyword
    ? regions
        .filter(
          (r) => strip(r.sigungu_name).includes(key) || strip(r.sido_slug).includes(key),
        )
        .slice(0, 60)
    : [];

  const total = foundCrem.length + foundHalls.length + foundRegions.length;

  return (
    <>
      <div className="page-head">
        <h1>
          <span aria-hidden>🔍</span>
          검색
        </h1>
        <p>
          {keyword
            ? `"${keyword}" 검색 결과 ${total}건`
            : "시설 이름이나 지역 이름을 입력해주세요."}
        </p>
      </div>

      {foundRegions.length > 0 && (
        <section className="sido-block">
          <h2 className="sido-block__title">
            지역
            <span className="sido-block__count">{foundRegions.length}곳</span>
          </h2>
          <div className="region-chips">
            {foundRegions.map((r) => (
              <a target="_self" key={r.region_slug} href={`/${r.region_slug}`}>
                {regionLabel(r.sido_slug, r.sigungu_name)}
                {r.crem_inner_mid !== null && (
                  <span style={{ fontSize: 11, color: "#8b9184" }}>
                    {formatWon(r.crem_inner_mid)}
                  </span>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {foundCrem.length > 0 && (
        <section className="sido-block">
          <h2 className="sido-block__title">
            🕯️ 화장시설
            <span className="sido-block__count">{foundCrem.length}곳</span>
          </h2>
          <div className="region-chips">
            {foundCrem.map((f) => (
              <a target="_self" key={f.facility_cd} href={`/${f.slug}`}>
                {f.name}
                <span style={{ fontSize: 11, color: "#8b9184" }}>{regionLabelOf(f)}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {foundHalls.length > 0 && (
        <section className="sido-block">
          <h2 className="sido-block__title">
            🏛️ 장례식장
            <span className="sido-block__count">{foundHalls.length}곳</span>
          </h2>
          <div className="region-chips">
            {foundHalls.map((f) => (
              <a target="_self" key={f.facility_cd} href={`/${f.slug}`}>
                {f.name}
                <span style={{ fontSize: 11, color: "#8b9184" }}>{regionLabelOf(f)}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {keyword && total === 0 && (
        <div className="empty-box">검색 결과가 없습니다.</div>
      )}
    </>
  );
}
