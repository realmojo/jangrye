import {
  formatWonShort,
  isStale,
  regionLabelOf,
  type Facility,
} from "@/lib/facilities";

/**
 * 목록에 쓰는 시설 카드.
 *
 * 화장시설은 관내·관외 요금을 카드에 바로 얹는다 — 목록에서 바로 견주는 것이
 * 이 사이트의 쓸모다. 요금이 오래됐으면 카드에서 표시한다.
 */
export default function FacilityCard({
  facility,
  innerFee,
  outerFee,
  showRegion = true,
}: {
  facility: Facility;
  innerFee?: number | null;
  outerFee?: number | null;
  showRegion?: boolean;
}) {
  const f = facility;
  const stale = isStale(f.price_date);
  const hasFee = innerFee != null || outerFee != null;

  return (
    <a target="_self" href={`/${f.slug}`} className="fac-card">
      <span className="fac-card__head">
        <span className="fac-card__name">{f.name}</span>
        {f.is_public !== null && (
          <span
            className={`fac-card__tag ${f.is_public ? "fac-card__tag--public" : "fac-card__tag--private"}`}
          >
            {f.is_public ? "공설" : "사설"}
          </span>
        )}
        {stale && <span className="fac-card__tag fac-card__tag--stale">요금 오래됨</span>}
      </span>

      <span className="fac-card__addr">
        {showRegion && <>{regionLabelOf(f)} · </>}
        {f.address ?? "주소 확인 안 됨"}
      </span>

      {hasFee && (
        <span className="fac-card__fees">
          <span className="fac-card__fee fac-card__fee--in">
            <span>관내</span>
            <b>{formatWonShort(innerFee)}</b>
          </span>
          <span className="fac-card__fee fac-card__fee--out">
            <span>관외</span>
            <b>{formatWonShort(outerFee)}</b>
          </span>
        </span>
      )}
    </a>
  );
}
