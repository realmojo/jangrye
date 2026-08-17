import { SOURCE_NAME, SOURCE_URL, formatDate, isStale } from "@/lib/facilities";
import { OFFICIAL_LINKS } from "@/lib/menu";

/**
 * 요금 화면 하단 공통 안내.
 *
 * 이 자료의 가장 큰 약점은 **시설마다 가격 등록 시점이 다르다**는 것이다.
 * 2015년에 멈춘 곳도 있다. 그래서 기준일을 화면마다 반복해 적고, 오래된
 * 값은 눈에 보이게 표시한다.
 *
 * 그리고 **예약을 여기서 받지 않는다**는 것도 반드시 밝힌다. 유족이 급할 때
 * 이 사이트를 예약 창구로 오해하면 시간을 잃는다.
 */
export default function DataNotice({ priceDate }: { priceDate?: string | null }) {
  const stale = priceDate !== undefined && isStale(priceDate);

  return (
    <>
      {priceDate !== undefined && (
        <div className={stale ? "notice" : "notice notice--muted"}>
          <p style={{ margin: 0 }}>
            이 시설의 요금 기준일은 <strong>{formatDate(priceDate)}</strong>
            입니다.
            {stale && (
              <>
                {" "}
                <strong>3년이 넘었습니다.</strong> 그동안 조례나 요금표가 바뀌었을
                수 있으니 전화로 확인하시는 편이 안전합니다.
              </>
            )}
          </p>
        </div>
      )}

      <div className="notice">
        <p style={{ margin: "0 0 8px" }}>
          <strong>이 금액을 어떻게 읽어야 하나</strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            <strong>{SOURCE_NAME}</strong>에 공개된 값을 옮긴 것입니다. 시설이
            직접 등록하며 <strong>등록이 법으로 강제되지 않습니다.</strong>
          </li>
          <li>
            <strong>여기 적힌 것이 전부가 아닙니다.</strong> 실제 장례비는 화장료
            외에 빈소 임대료·식사·용품·운구가 더해집니다. 항목마다 시설이 따로
            받습니다.
          </li>
          <li>
            <strong>화장 예약은 이 사이트에서 되지 않습니다.</strong>{" "}
            <a
              href={OFFICIAL_LINKS.reserve}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "underline" }}
            >
              e하늘 통합예약
            </a>
            에서만 하실 수 있고, 상담은 {OFFICIAL_LINKS.tel} 입니다.
          </li>
          <li>
            원본은{" "}
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "underline" }}
            >
              e하늘 장사정보시스템
            </a>
            에서 볼 수 있습니다.
          </li>
        </ul>
      </div>
    </>
  );
}
