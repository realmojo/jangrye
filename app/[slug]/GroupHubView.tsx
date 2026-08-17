import {
  CREMATORIUM,
  STALE_BEFORE,
  feeMap,
  feeOf,
  formatWon,
  isStale,
  listAllCremationFees,
  listFacilitiesByGroup,
  median,
  ratio,
  ratioText,
  type FacilityGroup,
  type Facility,
} from "@/lib/facilities";
import { REGION_HUB_SLUG, SIDOS } from "@/lib/regions";
import { breadcrumbJsonLd, datasetJsonLd } from "@/lib/seo";
import StatTile from "@/components/place/StatTile";
import FacilityCard from "@/components/place/FacilityCard";
import DataNotice from "@/components/fee/DataNotice";
import Adsense from "@/components/Adsense";
import { AD_SLOTS } from "@/lib/ads";

/** 시도마다 목록에 바로 펼칠 시설 수. 나머지는 시도 화면으로 넘긴다 */
const PER_SIDO = 12;

export default async function GroupHubView({ group }: { group: FacilityGroup }) {
  const isCrem = group.code === CREMATORIUM;
  const [facilities, allFees] = await Promise.all([
    listFacilitiesByGroup(group.code),
    isCrem ? listAllCremationFees() : Promise.resolve([]),
  ]);

  // 시설별 관내·관외 대인 요금
  const byFacility = new Map<string, { inner: number | null; outer: number | null }>();
  if (isCrem) {
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
  }

  const feeOfFac = (f: Facility) => byFacility.get(f.facility_cd) ?? { inner: null, outer: null };

  // 요금이 오래된 시설은 중간값 계산에서 뺀다. 2015년 값이 섞이면 전국 시세가 흐려진다.
  const fresh = facilities.filter((f) => !isStale(f.price_date));
  const innerMid = median(
    fresh.map((f) => feeOfFac(f).inner).filter((v): v is number => v != null && v > 0),
  );
  const outerMid = median(
    fresh.map((f) => feeOfFac(f).outer).filter((v): v is number => v != null && v > 0),
  );
  const gapMid = ratio(outerMid, innerMid);

  const publicCnt = facilities.filter((f) => f.is_public).length;
  const regions = new Set(facilities.map((f) => f.region_slug));

  // 격차가 큰 시설 — 이 사이트가 말하고 싶은 것
  const widest = facilities
    .map((f) => ({ f, ...feeOfFac(f), gap: ratio(feeOfFac(f).outer, feeOfFac(f).inner) }))
    .filter((x) => x.gap !== null && !isStale(x.f.price_date))
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))
    .slice(0, 8);

  const bySido = SIDOS.map((s) => ({
    sido: s,
    list: facilities
      .filter((f) => f.sido_slug === s.slug)
      .sort((a, b) => a.name.localeCompare(b.name, "ko")),
  })).filter((g) => g.list.length > 0);

  const trail = [
    { name: "홈", path: "/" },
    { name: group.name, path: `/${group.slug}` },
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
              name: `전국 ${group.name} 요금과 위치`,
              path: `/${group.slug}`,
              description: `전국 ${group.name} ${facilities.length}곳의 요금·위치·교통 정보`,
            }),
          ),
        }}
      />

      <div className="page-head">
        <h1>
          <span aria-hidden>{group.emoji}</span> 전국 {group.name}
        </h1>
        <p>{group.note}</p>
      </div>

      <section className="stat-grid">
        <StatTile label={group.name} value={`${facilities.length}곳`} sub={`공설 ${publicCnt}곳`} />
        {isCrem ? (
          <>
            <StatTile label="관내 중간값" value={formatWon(innerMid)} sub="대인 기준" />
            <StatTile label="관외 중간값" value={formatWon(outerMid)} sub="대인 기준" />
            <StatTile label="차이" value={ratioText(gapMid)} sub="관외 ÷ 관내" />
          </>
        ) : (
          <>
            <StatTile label="지역" value={`${regions.size}곳`} />
            <StatTile
              label="요금 최근 갱신"
              value={`${fresh.length}곳`}
              sub={`${STALE_BEFORE.slice(0, 4)}년 이후`}
            />
            <StatTile
              label="사진 있음"
              value={`${facilities.filter((f) => f.photos.length > 0).length}곳`}
            />
          </>
        )}
      </section>

      <div className="ad-slot">
        <Adsense slotId={AD_SLOTS.home} />
      </div>

      {isCrem && widest.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <div className="sec-head">
            <h2 className="sec-title">관내·관외 차이가 큰 곳</h2>
          </div>
          <div className="panel">
            <p className="panel__desc">
              같은 화장로인데도 어디 주민이냐에 따라 이만큼 벌어집니다. 요금이
              3년 넘게 갱신되지 않은 시설은 제외했습니다.
            </p>
            <div className="table-scroll">
              <table className="pr-table">
                <thead>
                  <tr>
                    <th scope="col">화장시설</th>
                    <th scope="col" className="is-num">
                      관내
                    </th>
                    <th scope="col" className="is-num">
                      관외
                    </th>
                    <th scope="col" className="is-num">
                      차이
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {widest.map(({ f, inner, outer, gap }) => (
                    <tr key={f.facility_cd}>
                      <td>
                        <a
                          target="_self"
                          href={`/${f.slug}`}
                          className="pr-table__name pr-table__link"
                        >
                          {f.name}
                        </a>
                        <span className="pr-table__meta">
                          {f.sigungu_name ? `${f.sido_slug} ${f.sigungu_name}` : f.sido_slug}
                        </span>
                      </td>
                      <td className="is-num">{formatWon(inner)}</td>
                      <td className="is-num">{formatWon(outer)}</td>
                      <td className="is-num">
                        <strong>{ratioText(gap)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="sec-head">
          <h2 className="sec-title">지역으로 찾기</h2>
          <a target="_self" href={`/${REGION_HUB_SLUG}`} className="sec-more">
            시군구까지 보기
          </a>
        </div>
        {bySido.map(({ sido, list }) => (
          <div className="sido-block" key={sido.slug}>
            <h3 className="sido-block__title">
              <a target="_self" href={`/${sido.slug}`}>
                {sido.name}
              </a>
              <span className="sido-block__count">{list.length}곳</span>
            </h3>
            <div className="fac-list">
              {list.slice(0, PER_SIDO).map((f) => {
                const { inner, outer } = feeOfFac(f);
                return (
                  <FacilityCard
                    key={f.facility_cd}
                    facility={f}
                    innerFee={isCrem ? inner : undefined}
                    outerFee={isCrem ? outer : undefined}
                  />
                );
              })}
            </div>
            {list.length > PER_SIDO && (
              <p className="panel__desc" style={{ margin: "10px 0 0" }}>
                <a target="_self" href={`/${sido.slug}`}>
                  {sido.slug} {list.length}곳 전체 보기
                </a>
              </p>
            )}
          </div>
        ))}
      </section>

      <DataNotice />

      <div className="ad-slot">
        <Adsense slotId={AD_SLOTS.bottom} />
      </div>
    </>
  );
}
