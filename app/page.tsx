import {
  CREMATORIUM,
  FUNERAL_HALL,
  GROUPS,
  feeMap,
  feeOf,
  formatWon,
  isStale,
  listAllCremationFees,
  listFacilitiesByGroup,
  listRegions,
  median,
  ratio,
  ratioText,
} from "@/lib/facilities";
import { REGION_HUB_SLUG, SIDOS } from "@/lib/regions";
import { OFFICIAL_LINKS } from "@/lib/menu";
import StatTile from "@/components/place/StatTile";
import FacilityCard from "@/components/place/FacilityCard";
import DataNotice from "@/components/fee/DataNotice";
import Adsense from "@/components/Adsense";
import { AD_SLOTS } from "@/lib/ads";

export const revalidate = 300;

export default async function HomePage() {
  const [crematoriums, halls, allFees, regions] = await Promise.all([
    listFacilitiesByGroup(CREMATORIUM),
    listFacilitiesByGroup(FUNERAL_HALL),
    listAllCremationFees(),
    listRegions(),
  ]);

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

  // 요금이 오래된 시설은 전국 시세 계산에서 뺀다
  const fresh = crematoriums.filter((f) => !isStale(f.price_date));
  const innerMid = median(
    fresh.map((f) => byFacility.get(f.facility_cd)?.inner).filter((v): v is number => v != null && v > 0),
  );
  const outerMid = median(
    fresh.map((f) => byFacility.get(f.facility_cd)?.outer).filter((v): v is number => v != null && v > 0),
  );
  const gapMid = ratio(outerMid, innerMid);

  const rentMid = median(
    regions.map((r) => r.hall_rent_mid).filter((v): v is number => v != null && v > 0),
  );

  const withCrem = regions.filter((r) => r.crematorium_cnt > 0).length;

  // 격차가 큰 화장시설 — 이 사이트가 가장 하고 싶은 말
  const widest = crematoriums
    .map((f) => {
      const fee = byFacility.get(f.facility_cd);
      return { f, inner: fee?.inner ?? null, outer: fee?.outer ?? null };
    })
    .map((x) => ({ ...x, gap: ratio(x.outer, x.inner) }))
    .filter((x) => x.gap !== null && !isStale(x.f.price_date))
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))
    .slice(0, 6);

  return (
    <>
      <div className="page-head">
        <h1>
          <span aria-hidden>🕯️</span>
          같은 화장장인데 관내 5만원, 관외 100만원
        </h1>
        <p>
          화장 요금은 고인이나 신고자가 그 지역 주민인지에 따라 갈립니다. 전국
          중간값으로 <strong>{ratioText(gapMid)} 차이</strong>입니다. 보건복지부
          e하늘에 공개된 자료로 화장시설 {crematoriums.length}곳과 장례식장{" "}
          {halls.length}곳의 요금, 그리고 위치·가는 길·시설 정보를 정리했습니다.
        </p>
      </div>

      <section className="stat-grid">
        <StatTile label="관내 화장료" value={formatWon(innerMid)} sub="대인 기준 전국 중간값" />
        <StatTile label="관외 화장료" value={formatWon(outerMid)} sub={`관내의 ${ratioText(gapMid)}`} />
        <StatTile label="빈소 임대료" value={formatWon(rentMid)} sub="1실 24시간 중간값" />
        <StatTile
          label="화장시설"
          value={`${crematoriums.length}곳`}
          sub={`시군구 ${withCrem}곳에만`}
        />
      </section>

      <div className="notice">
        <p style={{ margin: 0 }}>
          <strong>급하시면 여기부터 보세요.</strong>{" "}
          <a target="_self" href={`/${REGION_HUB_SLUG}`} style={{ textDecoration: "underline" }}>
            우리 동네 화장장 찾기
          </a>{" "}
          · 화장 예약은{" "}
          <a
            href={OFFICIAL_LINKS.reserve}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline" }}
          >
            e하늘 통합예약
          </a>{" "}
          에서만 되고, 상담 전화는 {OFFICIAL_LINKS.tel} 입니다.
        </p>
      </div>

      <div className="ad-slot">
        <Adsense slotId={AD_SLOTS.home} />
      </div>

      <section style={{ marginBottom: 36 }}>
        <div className="sec-head">
          <h2 className="sec-title">무엇부터 찾으시나요</h2>
        </div>
        <div className="bento-grid">
          {GROUPS.map((g) => (
            <a target="_self" key={g.slug} href={`/${g.slug}`} className="bento-card">
              <div className="bento-card__icon" aria-hidden>
                {g.emoji}
              </div>
              <h3 className="bento-card__title">
                {g.name} {g.code === CREMATORIUM ? crematoriums.length : halls.length}곳
              </h3>
              <p className="bento-card__desc">{g.note}</p>
            </a>
          ))}
        </div>
      </section>

      {widest.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div className="sec-head">
            <h2 className="sec-title">관내·관외 차이가 큰 화장장</h2>
            <a target="_self" href="/화장시설" className="sec-more">
              전국 보기
            </a>
          </div>
          <div className="panel">
            <p className="panel__desc">
              요금이 3년 넘게 갱신되지 않은 시설은 제외했습니다. 고인의 주민등록
              주소가 어디였는지에 따라 이만큼 달라집니다.
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

      <section style={{ marginBottom: 36 }}>
        <div className="sec-head">
          <h2 className="sec-title">공설 화장시설</h2>
          <a target="_self" href="/화장시설" className="sec-more">
            전국 62곳
          </a>
        </div>
        <div className="fac-list">
          {crematoriums
            .filter((f) => f.is_public && !isStale(f.price_date))
            .sort((a, b) => (byFacility.get(a.facility_cd)?.inner ?? 0) - (byFacility.get(b.facility_cd)?.inner ?? 0))
            .slice(0, 6)
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

      <section style={{ marginBottom: 36 }}>
        <div className="sec-head">
          <h2 className="sec-title">지역으로 찾기</h2>
          <a target="_self" href={`/${REGION_HUB_SLUG}`} className="sec-more">
            시군구까지 보기
          </a>
        </div>
        <div className="sido-block">
          <div className="region-chips">
            {SIDOS.map((s) => (
              <a target="_self" key={s.slug} href={`/${s.slug}`}>
                {s.slug}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel__title">관내와 관외가 왜 다른가</h2>
        <p className="panel__desc">
          화장시설은 대부분 <strong>지자체가 세운 공설</strong>입니다. 그 지역
          주민의 세금으로 지었으니 주민에게는 싸게, 다른 지역 주민에게는 원가에
          가깝게 받습니다. 그 차이가 조례로 정해지고, 지자체마다 폭이 다릅니다.
        </p>
        <p className="panel__desc">
          기준은 보통 <strong>고인의 주민등록 주소</strong>지만, 신고자(상주)
          주소를 보는 곳도 있고 사망 장소를 보는 곳도 있습니다. 인접 지자체와
          협약이 있으면 &lsquo;준관내&rsquo;로 중간 요금을 받습니다.
        </p>
        <p className="panel__desc" style={{ marginBottom: 0 }}>
          <strong>그래서 미리 확인할 값이 하나 더 있습니다.</strong> 우리 지역에
          화장장이 없으면 이웃 지역으로 가야 하고, 그때 관외 요금이 붙습니다.
          지역 화면에서 이웃 시군구까지 함께 볼 수 있게 해두었습니다.
        </p>
      </section>

      <DataNotice />

      <div className="ad-slot">
        <Adsense slotId={AD_SLOTS.bottom} />
      </div>
    </>
  );
}
