import {
  formatWon,
  listRegions,
  median,
  ratio,
  ratioText,
} from "@/lib/facilities";
import { REGION_HUB_SLUG, SIDOS } from "@/lib/regions";
import { breadcrumbJsonLd, datasetJsonLd } from "@/lib/seo";
import StatTile from "@/components/place/StatTile";
import DataNotice from "@/components/fee/DataNotice";
import Adsense from "@/components/Adsense";
import { AD_SLOTS } from "@/lib/ads";

export default async function RegionHubView() {
  const regions = await listRegions();

  const bySido = SIDOS.map((s) => ({
    sido: s,
    list: regions
      .filter((r) => r.sido_slug === s.slug)
      .sort((a, b) => (a.sigungu_name ?? "").localeCompare(b.sigungu_name ?? "", "ko")),
  })).filter((g) => g.list.length > 0);

  const withCrem = regions.filter((r) => r.crematorium_cnt > 0);
  const innerMid = median(
    regions.map((r) => r.crem_inner_mid).filter((v): v is number => v != null && v > 0),
  );
  const outerMid = median(
    regions.map((r) => r.crem_outer_mid).filter((v): v is number => v != null && v > 0),
  );
  const gap = ratio(outerMid, innerMid);

  // 관내가 싼 곳 / 비싼 곳. 화장시설이 있는 지역만 견준다
  const ranked = withCrem
    .filter((r) => r.crem_inner_mid != null && r.crem_inner_mid > 0)
    .sort((a, b) => (b.crem_inner_mid ?? 0) - (a.crem_inner_mid ?? 0));

  const trail = [
    { name: "홈", path: "/" },
    { name: "지역", path: `/${REGION_HUB_SLUG}` },
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
              name: "지역별 장례비용",
              path: `/${REGION_HUB_SLUG}`,
              description: `전국 시군구 ${regions.length}곳의 화장시설·장례식장 요금과 위치`,
            }),
          ),
        }}
      />

      <div className="page-head">
        <h1>
          <span aria-hidden>📍</span> 지역별 장례비용
        </h1>
        <p>
          전국 시군구 {regions.length}곳입니다. 화장시설이 있는 지역은{" "}
          {withCrem.length}곳뿐이라, 나머지 지역은 이웃 시군구의 화장장을 쓰면서
          관외 요금을 내게 됩니다.
        </p>
      </div>

      <section className="stat-grid">
        <StatTile label="시군구" value={`${regions.length}곳`} />
        <StatTile
          label="화장시설 있는 곳"
          value={`${withCrem.length}곳`}
          sub={`전체의 ${Math.round((withCrem.length / Math.max(regions.length, 1)) * 100)}%`}
        />
        <StatTile label="관내 화장료" value={formatWon(innerMid)} sub="전국 중간값" />
        <StatTile
          label="관외 화장료"
          value={formatWon(outerMid)}
          sub={gap ? `관내의 ${ratioText(gap)}` : "전국 중간값"}
        />
      </section>

      <div className="ad-slot">
        <Adsense slotId={AD_SLOTS.home} />
      </div>

      {ranked.length > 4 && (
        <section style={{ marginBottom: 32 }}>
          <div className="sec-head">
            <h2 className="sec-title">관내 화장료가 비싼 곳 · 싼 곳</h2>
          </div>
          <div className="panel">
            <p className="panel__desc">
              화장시설이 있는 {ranked.length}개 시군구를 관내 요금(대인 중간값)
              으로 줄 세웠습니다. 공설이 많아 대체로 낮지만 지자체 조례에 따라
              차이가 납니다.
            </p>
            <div className="table-scroll">
              <table className="pr-table">
                <thead>
                  <tr>
                    <th scope="col">비싼 곳</th>
                    <th scope="col" className="is-num">
                      관내
                    </th>
                    <th scope="col">싼 곳</th>
                    <th scope="col" className="is-num">
                      관내
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.min(6, Math.floor(ranked.length / 2)) }).map(
                    (_, i) => {
                      const hi = ranked[i];
                      const lo = ranked[ranked.length - 1 - i];
                      return (
                        <tr key={hi.region_slug}>
                          <td>
                            <a
                              target="_self"
                              href={`/${hi.region_slug}`}
                              className="pr-table__name pr-table__link"
                            >
                              {hi.sido_slug} {hi.sigungu_name}
                            </a>
                          </td>
                          <td className="is-num">{formatWon(hi.crem_inner_mid)}</td>
                          <td>
                            <a
                              target="_self"
                              href={`/${lo.region_slug}`}
                              className="pr-table__name pr-table__link"
                            >
                              {lo.sido_slug} {lo.sigungu_name}
                            </a>
                          </td>
                          <td className="is-num">{formatWon(lo.crem_inner_mid)}</td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="sec-head">
          <h2 className="sec-title">우리 동네 찾기</h2>
        </div>
        {bySido.map(({ sido, list }) => (
          <div className="sido-block" key={sido.slug}>
            <h3 className="sido-block__title">
              <a target="_self" href={`/${sido.slug}`}>
                {sido.name}
              </a>
              <span className="sido-block__count">{list.length}곳</span>
            </h3>
            <div className="region-chips">
              {list.map((r) => (
                <a
                  target="_self"
                  key={r.region_slug}
                  href={`/${r.region_slug}`}
                  title={
                    r.crem_inner_mid
                      ? `관내 화장료 ${formatWon(r.crem_inner_mid)}`
                      : `장례식장 ${r.hall_cnt}곳`
                  }
                >
                  {r.sigungu_name || r.sido_slug}
                  {r.crematorium_cnt > 0 && (
                    <span
                      aria-label="화장시설 있음"
                      style={{ color: "var(--c-primary-dark)", fontWeight: 700 }}
                    >
                      🕯️
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        ))}
        <p className="panel__desc" style={{ marginTop: 10 }}>
          🕯️ 표시가 있는 곳은 화장시설이 있는 시군구입니다.
        </p>
      </section>

      <DataNotice />

      <div className="ad-slot">
        <Adsense slotId={AD_SLOTS.bottom} />
      </div>
    </>
  );
}
