import {
  CREMATORIUM,
  GROUPS,
  feeMap,
  feeOf,
  formatWon,
  listAllCremationFees,
  listFacilitiesByGroup,
  listRegions,
  median,
  ratio,
  ratioText,
} from "@/lib/facilities";
import { REGION_HUB_SLUG, SIDOS, type Sido } from "@/lib/regions";
import { breadcrumbJsonLd } from "@/lib/seo";
import StatTile from "@/components/place/StatTile";
import FacilityCard from "@/components/place/FacilityCard";
import DataNotice from "@/components/fee/DataNotice";
import Adsense from "@/components/Adsense";
import { AD_SLOTS } from "@/lib/ads";

export default async function SidoView({ sido }: { sido: Sido }) {
  const [crematoriums, halls, allFees, regions] = await Promise.all([
    listFacilitiesByGroup(CREMATORIUM),
    listFacilitiesByGroup(GROUPS.find((g) => g.code !== CREMATORIUM)!.code),
    listAllCremationFees(),
    listRegions(),
  ]);

  const mine = {
    crem: crematoriums.filter((f) => f.sido_slug === sido.slug),
    hall: halls.filter((f) => f.sido_slug === sido.slug),
  };

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

  const innerMid = median(
    mine.crem
      .map((f) => byFacility.get(f.facility_cd)?.inner)
      .filter((v): v is number => v != null && v > 0),
  );
  const outerMid = median(
    mine.crem
      .map((f) => byFacility.get(f.facility_cd)?.outer)
      .filter((v): v is number => v != null && v > 0),
  );
  const gap = ratio(outerMid, innerMid);

  const mineRegions = regions
    .filter((r) => r.sido_slug === sido.slug)
    .sort((a, b) => b.crematorium_cnt - a.crematorium_cnt || b.hall_cnt - a.hall_cnt);

  const withCrem = mineRegions.filter((r) => r.crematorium_cnt > 0).length;
  const others = SIDOS.filter((s) => s.slug !== sido.slug);

  const trail = [
    { name: "홈", path: "/" },
    { name: "지역", path: `/${REGION_HUB_SLUG}` },
    { name: sido.slug, path: `/${sido.slug}` },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(trail)) }}
      />

      <div className="page-head">
        <span className="cat-badge cat-badge--region">지역별</span>
        <h1>{sido.name} 장례비용</h1>
        <p>
          {sido.name}의 화장시설 {mine.crem.length}곳과 장례식장 {mine.hall.length}곳입니다.
          시군구를 눌러 우리 동네부터 보세요.
        </p>
      </div>

      <section className="stat-grid">
        <StatTile label="화장시설" value={`${mine.crem.length}곳`} sub={`${withCrem}개 시군구에`} />
        <StatTile label="장례식장" value={`${mine.hall.length}곳`} />
        <StatTile label="관내 화장료" value={formatWon(innerMid)} sub="대인 기준 중간값" />
        <StatTile
          label="관외 화장료"
          value={formatWon(outerMid)}
          sub={gap ? `관내의 ${ratioText(gap)}` : "대인 기준 중간값"}
        />
      </section>

      <div className="ad-slot">
        <Adsense slotId={AD_SLOTS.home} />
      </div>

      {mine.crem.length > 0 && (
        <section style={{ marginBottom: 30 }}>
          <div className="sec-head">
            <h2 className="sec-title">🕯️ {sido.slug}의 화장시설</h2>
            <a target="_self" href="/화장시설" className="sec-more">
              전국 보기
            </a>
          </div>
          <div className="fac-list">
            {mine.crem
              .sort((a, b) => a.name.localeCompare(b.name, "ko"))
              .map((f) => {
                const fee = byFacility.get(f.facility_cd);
                return (
                  <FacilityCard
                    key={f.facility_cd}
                    facility={f}
                    innerFee={fee?.inner}
                    outerFee={fee?.outer}
                  />
                );
              })}
          </div>
        </section>
      )}

      {mineRegions.length > 0 && (
        <section style={{ marginBottom: 30 }}>
          <div className="sec-head">
            <h2 className="sec-title">시군구별</h2>
          </div>
          <div className="panel">
            <p className="panel__desc">
              화장시설이 있는 곳을 앞에 두었습니다. 화장장이 없는 지역은 이웃
              시군구를 쓰게 되고 그때는 관외 요금이 붙습니다.
            </p>
            <div className="table-scroll">
              <table className="pr-table">
                <thead>
                  <tr>
                    <th scope="col">시군구</th>
                    <th scope="col" className="is-num">
                      화장시설
                    </th>
                    <th scope="col" className="is-num">
                      장례식장
                    </th>
                    <th scope="col" className="is-num">
                      관내 화장료
                    </th>
                    <th scope="col" className="is-num">
                      빈소 임대료
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mineRegions.map((r) => (
                    <tr key={r.region_slug}>
                      <td>
                        <a
                          target="_self"
                          href={`/${r.region_slug}`}
                          className="pr-table__name pr-table__link"
                        >
                          {r.sigungu_name || r.sido_slug}
                        </a>
                      </td>
                      <td className="is-num">{r.crematorium_cnt || "-"}</td>
                      <td className="is-num">{r.hall_cnt || "-"}</td>
                      <td className="is-num">{formatWon(r.crem_inner_mid)}</td>
                      <td className="is-num">{formatWon(r.hall_rent_mid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section style={{ marginBottom: 30 }}>
        <div className="sec-head">
          <h2 className="sec-title">다른 지역</h2>
          <a target="_self" href={`/${REGION_HUB_SLUG}`} className="sec-more">
            전체 지역 보기
          </a>
        </div>
        <div className="sido-block">
          <div className="region-chips">
            {others.map((s) => (
              <a target="_self" key={s.slug} href={`/${s.slug}`}>
                {s.slug}
              </a>
            ))}
          </div>
        </div>
      </section>

      <DataNotice />

      <div className="ad-slot">
        <Adsense slotId={AD_SLOTS.bottom} />
      </div>
    </>
  );
}
