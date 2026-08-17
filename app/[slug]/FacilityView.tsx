import {
  CREMATORIUM,
  SOURCE_NAME,
  feeMap,
  feeOf,
  formatDate,
  formatWon,
  groupByCode,
  isStale,
  listCremationFees,
  listFacilitiesByRegion,
  listPrices,
  ratio,
  ratioText,
  regionLabelOf,
  type Facility,
} from "@/lib/facilities";
import { REGION_HUB_SLUG } from "@/lib/regions";
import { OFFICIAL_LINKS } from "@/lib/menu";
import { breadcrumbJsonLd, placeJsonLd } from "@/lib/seo";
import { photoUrl } from "@/lib/facilities";
import StatTile from "@/components/place/StatTile";
import PlaceInfo from "@/components/place/PlaceInfo";
import FacilityCard from "@/components/place/FacilityCard";
import CremationFeeTable from "@/components/fee/CremationFeeTable";
import PriceTable from "@/components/fee/PriceTable";
import DataNotice from "@/components/fee/DataNotice";
import Adsense from "@/components/Adsense";
import { AD_SLOTS } from "@/lib/ads";

export default async function FacilityView({ facility }: { facility: Facility }) {
  const f = facility;
  const isCrem = f.group_cd === CREMATORIUM;
  const group = groupByCode(f.group_cd);

  const [fees, prices, neighbors] = await Promise.all([
    isCrem ? listCremationFees(f.facility_cd) : Promise.resolve([]),
    isCrem ? Promise.resolve([]) : listPrices(f.facility_cd),
    listFacilitiesByRegion(f.region_slug),
  ]);

  const map = feeMap(fees);
  const inner = feeOf(map, "대인", "관내");
  const outer = feeOf(map, "대인", "관외");
  const gap = ratio(outer, inner);
  const region = regionLabelOf(f);

  // 빈소 임대료 중 가장 싼 것 — 장례식장 첫 화면에서 궁금한 값이다
  const rentRows = prices.filter((p) => p.tier1 === "시설임대료" && p.amount > 0);
  const rentLow = rentRows.length ? Math.min(...rentRows.map((p) => p.amount)) : null;
  const rentHigh = rentRows.length ? Math.max(...rentRows.map((p) => p.amount)) : null;

  const others = neighbors.filter((n) => n.facility_cd !== f.facility_cd).slice(0, 8);

  const trail = [
    { name: "홈", path: "/" },
    ...(group ? [{ name: group.name, path: `/${group.slug}` }] : []),
    { name: region, path: `/${f.region_slug}` },
    { name: f.name, path: `/${f.slug}` },
  ];

  return (
    <div className="single-wrap">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(trail)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            placeJsonLd({
              name: f.name,
              path: `/${f.slug}`,
              description: `${region}에 있는 ${group?.name ?? "장사시설"}. 요금과 위치·교통·시설 정보.`,
              address: f.address,
              tel: f.tel,
              lat: f.lat,
              lng: f.lng,
              photos: f.photos.slice(0, 4).map((p) => photoUrl(p.url)),
            }),
          ),
        }}
      />

      <article className="single-article">
        <div className="single-article__inner">
          <header className="entry-header">
            <nav className="crumbs" aria-label="이동 경로">
              <a target="_self" href="/">
                홈
              </a>
              <span aria-hidden>›</span>
              {group && (
                <>
                  <a target="_self" href={`/${group.slug}`}>
                    {group.name}
                  </a>
                  <span aria-hidden>›</span>
                </>
              )}
              <a target="_self" href={`/${f.region_slug}`}>
                {region}
              </a>
            </nav>
            <h1 className="entry-title">{f.name}</h1>
            <div className="entry-header__bottom">
              <div className="entry-meta">
                <span>{group?.name ?? f.group_name}</span>
                <span className="entry-meta__sep" aria-hidden />
                <span>{f.is_public === null ? "확인 안 됨" : f.is_public ? "공설" : "사설"}</span>
                <span className="entry-meta__sep" aria-hidden />
                <span>요금 기준 {formatDate(f.price_date)}</span>
              </div>
            </div>
          </header>

          {isCrem ? (
            <p className="entry-lead">
              {region}의 화장시설입니다. 화장 요금은 고인이나 신고자가 그 지역
              주민인지(관내)에 따라 크게 달라집니다.
              {gap && gap >= 2 && (
                <>
                  {" "}
                  이 시설은 <strong>{ratioText(gap)} 차이</strong>입니다.
                </>
              )}
            </p>
          ) : (
            <p className="entry-lead">
              {region}의 장례식장입니다. 빈소 임대료와 용품·서비스 요금을
              시설이 등록한 그대로 옮겼습니다. 실제 청구액은 사용 일수와 조문객
              수에 따라 달라집니다.
            </p>
          )}

          <div className="ad-slot">
            <Adsense slotId={AD_SLOTS.top} format="fluid" />
          </div>

          <section className="stat-grid" style={{ marginTop: 22 }}>
            {isCrem ? (
              <>
                <StatTile label="관내 (대인)" value={formatWon(inner)} sub="그 지역 주민일 때" />
                <StatTile label="관외 (대인)" value={formatWon(outer)} sub="다른 지역 주민일 때" />
                <StatTile label="차이" value={ratioText(gap)} sub="관외 ÷ 관내" />
                <StatTile
                  label="요금 기준"
                  value={formatDate(f.price_date)}
                  sub={isStale(f.price_date) ? "3년 넘음 · 확인 필요" : "최근 갱신"}
                />
              </>
            ) : (
              <>
                <StatTile
                  label="빈소"
                  value={f.mortuary_cnt !== null ? `${f.mortuary_cnt}실` : "-"}
                />
                <StatTile
                  label="빈소 임대료"
                  value={rentLow !== null ? formatWon(rentLow) : "-"}
                  sub={rentHigh && rentHigh !== rentLow ? `최고 ${formatWon(rentHigh)}` : "가장 싼 빈소"}
                />
                <StatTile
                  label="안치 능력"
                  value={f.charnel_cnt !== null ? `${f.charnel_cnt}구` : "-"}
                />
                <StatTile
                  label="요금 기준"
                  value={formatDate(f.price_date)}
                  sub={isStale(f.price_date) ? "3년 넘음 · 확인 필요" : "최근 갱신"}
                />
              </>
            )}
          </section>

          {isCrem && (
            <section className="panel">
              <h2 className="panel__title">화장 요금</h2>
              <p className="panel__desc">
                같은 조합이 여러 값으로 등록된 경우 가장 낮은 금액을 적었습니다.
              </p>
              <CremationFeeTable fees={fees} facilityName={f.name} />
            </section>
          )}

          {!isCrem && (
            <>
              <PriceTable
                prices={prices}
                kind="시설사용료"
                title="빈소·시설 사용료"
                desc="빈소와 접객실 임대료입니다. 대개 1실 24시간 기준이라 3일장이면 그만큼 곱해집니다."
              />
              <PriceTable
                prices={prices}
                kind="서비스"
                title="서비스 요금"
                desc="염습·운구·청소 등 시설이 제공하는 서비스입니다."
              />
              <PriceTable
                prices={prices}
                kind="장사용품"
                title="장사용품"
                desc="관·수의·유골함 등입니다. 같은 이름이라도 규격과 재질이 다를 수 있습니다."
              />
            </>
          )}

          {isCrem && (
            <div className="notice">
              <p style={{ margin: 0 }}>
                <strong>화장 예약은 여기서 되지 않습니다.</strong> 전국 화장시설
                예약은{" "}
                <a
                  href={OFFICIAL_LINKS.reserve}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "underline" }}
                >
                  e하늘 통합예약
                </a>{" "}
                한 곳에서만 하실 수 있습니다. 상담 {OFFICIAL_LINKS.tel}.
              </p>
            </div>
          )}

          <PlaceInfo facility={f} />

          <div className="ad-slot">
            <Adsense slotId={AD_SLOTS.middle} format="fluid" />
          </div>

          {others.length > 0 && (
            <div className="related">
              <h2 className="related__title">{region}의 다른 시설</h2>
              <div className="fac-list">
                {others.map((n) => (
                  <FacilityCard key={n.facility_cd} facility={n} showRegion={false} />
                ))}
              </div>
              <p className="panel__desc" style={{ marginTop: 12 }}>
                <a target="_self" href={`/${f.region_slug}`}>
                  {region} 전체 보기
                </a>{" "}
                ·{" "}
                <a target="_self" href={`/${REGION_HUB_SLUG}`}>
                  다른 지역
                </a>
              </p>
            </div>
          )}

          <DataNotice priceDate={f.price_date} />

          <p className="entry-footer">
            자료 출처: {SOURCE_NAME}
            {f.price_date && <> · 이 시설 요금 기준일 {formatDate(f.price_date)}</>}
          </p>

          <div className="ad-slot">
            <Adsense slotId={AD_SLOTS.bottom} />
          </div>
        </div>
      </article>
    </div>
  );
}
