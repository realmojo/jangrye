import {
  CREMATORIUM,
  GROUPS,
  feeMap,
  feeOf,
  formatDate,
  formatWon,
  listAllCremationFees,
  listFacilitiesByRegion,
  listRegions,
  ratio,
  ratioText,
  type RegionStats,
} from "@/lib/facilities";
import { REGION_HUB_SLUG, regionLabel } from "@/lib/regions";
import { breadcrumbJsonLd, datasetJsonLd } from "@/lib/seo";
import StatTile from "@/components/place/StatTile";
import FacilityCard from "@/components/place/FacilityCard";
import DataNotice from "@/components/fee/DataNotice";
import Adsense from "@/components/Adsense";
import { AD_SLOTS } from "@/lib/ads";

export default async function RegionView({ region }: { region: RegionStats }) {
  const [facilities, allFees, regions] = await Promise.all([
    listFacilitiesByRegion(region.region_slug),
    listAllCremationFees(),
    listRegions(),
  ]);

  const name = regionLabel(region.sido_slug, region.sigungu_name);

  const byFacility = new Map<string, { inner: number | null; outer: number | null }>();
  const grouped = new Map<string, typeof allFees>();
  for (const fee of allFees) {
    const list = grouped.get(fee.facility_cd) ?? [];
    list.push(fee);
    grouped.set(fee.facility_cd, list);
  }
  for (const [cd, list] of grouped) {
    const m = feeMap(list);
    byFacility.set(cd, { inner: feeOf(m, "대인", "관내"), outer: feeOf(m, "대인", "관외") });
  }

  const gap = ratio(region.crem_outer_mid, region.crem_inner_mid);

  // 같은 시도의 이웃 시군구. 화장장이 없는 동네는 옆 동네로 가야 한다.
  const siblings = regions
    .filter((r) => r.sido_slug === region.sido_slug && r.region_slug !== region.region_slug)
    .sort((a, b) => b.crematorium_cnt - a.crematorium_cnt)
    .slice(0, 12);

  const trail = [
    { name: "홈", path: "/" },
    { name: "지역", path: `/${REGION_HUB_SLUG}` },
    { name: name, path: `/${region.region_slug}` },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(trail)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            datasetJsonLd({
              name: `${name} 장사시설`,
              path: `/${region.region_slug}`,
              description: `${name}의 화장시설·장례식장 ${region.facility_cnt}곳의 요금과 위치`,
            }),
          ),
        }}
      />

      <div className="page-head">
        <span className="cat-badge cat-badge--region">지역별</span>
        <h1>{name} 장례비용</h1>
        <p>
          {name}에 있는 화장시설과 장례식장입니다. 화장장이 없는 지역이라면 아래
          이웃 시군구를 함께 보세요 — 다른 지역 화장장을 쓰면 관외 요금이
          붙습니다.
        </p>
      </div>

      <section className="stat-grid">
        <StatTile label="화장시설" value={`${region.crematorium_cnt}곳`} />
        <StatTile label="장례식장" value={`${region.hall_cnt}곳`} />
        <StatTile
          label="관내 화장료"
          value={formatWon(region.crem_inner_mid)}
          sub={gap ? `관외는 ${ratioText(gap)}` : "대인 기준 중간값"}
        />
        <StatTile
          label="빈소 임대료"
          value={formatWon(region.hall_rent_mid)}
          sub="중간값 · 1실 24시간"
        />
      </section>

      <div className="ad-slot">
        <Adsense slotId={AD_SLOTS.home} />
      </div>

      {region.crematorium_cnt === 0 && (
        <div className="notice">
          <p style={{ margin: 0 }}>
            <strong>{name}에는 화장시설이 없습니다.</strong> 이웃 시군구의
            화장장을 쓰게 되고, 그 경우 대개 <strong>관외 요금</strong>이
            적용됩니다. 다만 인접 지자체와 협약이 있으면 &lsquo;준관내&rsquo;로
            할인되는 곳도 있어 시설에 직접 확인하는 편이 좋습니다.
          </p>
        </div>
      )}

      {GROUPS.map((g) => {
        const list = facilities
          .filter((f) => f.group_cd === g.code)
          .sort((a, b) => a.name.localeCompare(b.name, "ko"));
        if (list.length === 0) return null;
        return (
          <section key={g.code} style={{ marginBottom: 30 }}>
            <div className="sec-head">
              <h2 className="sec-title">
                {g.emoji} {g.name} {list.length}곳
              </h2>
              <a target="_self" href={`/${g.slug}`} className="sec-more">
                전국 보기
              </a>
            </div>
            <div className="fac-list">
              {list.map((f) => {
                const fee = byFacility.get(f.facility_cd);
                return (
                  <FacilityCard
                    key={f.facility_cd}
                    facility={f}
                    showRegion={false}
                    innerFee={f.group_cd === CREMATORIUM ? fee?.inner : undefined}
                    outerFee={f.group_cd === CREMATORIUM ? fee?.outer : undefined}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      {facilities.length === 0 && (
        <div className="empty-box">
          이 지역에는 등록된 화장시설·장례식장이 없습니다.
          <br />
          <a target="_self" href={`/${region.sido_slug}`}>
            {region.sido_slug} 전체 보기
          </a>
        </div>
      )}

      {siblings.length > 0 && (
        <section className="panel">
          <h2 className="panel__title">{region.sido_slug}의 이웃 시군구</h2>
          <p className="panel__desc">화장시설이 있는 곳을 앞에 두었습니다.</p>
          <div className="region-chips">
            {siblings.map((r) => (
              <a target="_self" key={r.region_slug} href={`/${r.region_slug}`}>
                {r.sigungu_name || r.sido_slug}
                {r.crematorium_cnt > 0 && (
                  <span style={{ color: "var(--c-primary-dark)", fontWeight: 700 }}>
                    화장장 {r.crematorium_cnt}
                  </span>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      <DataNotice />

      <p className="entry-footer">
        {region.latest_price_date && (
          <>이 지역에서 가장 최근에 갱신된 요금 기준일: {formatDate(region.latest_price_date)}</>
        )}
      </p>

      <div className="ad-slot">
        <Adsense slotId={AD_SLOTS.bottom} />
      </div>
    </>
  );
}
