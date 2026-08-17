import {
  amenities,
  directionsUrl,
  formatDate,
  mapUrl,
  photoUrl,
  showHomepage,
  splitLines,
  type Facility,
} from "@/lib/facilities";

/**
 * 시설의 장소 정보.
 *
 * 가격만 있는 화면은 반쪽이다. 유족이 실제로 필요한 것은 "어디이고, 어떻게
 * 가고, 주차가 되는가" 다. e하늘 원문에 대중교통·자차 안내가 문단으로 들어
 * 있어 그대로 살려 쓴다 — 요약하면 버스 번호나 IC 이름이 날아간다.
 */
export default function PlaceInfo({ facility }: { facility: Facility }) {
  const f = facility;
  const map = mapUrl(f);
  const directions = directionsUrl(f);
  const photos = [...f.photos].sort((a, b) => a.order - b.order).slice(0, 8);
  const items = amenities(f);
  const known = items.filter((i) => i.has !== null);

  return (
    <>
      {photos.length > 0 && (
        <section className="panel" id="photo">
          <h2 className="panel__title">{f.name} 사진</h2>
          <p className="panel__desc">
            시설이 e하늘에 등록한 사진입니다. 촬영 시점은 표시되지 않습니다.
          </p>
          <div className="photo-strip">
            {photos.map((p) => (
              <figure key={p.url} className="photo-strip__item">
                {/* e하늘 서버 이미지를 그대로 참조한다. 우리 쪽으로 복사하지 않는다.
                    next/image 최적화를 걸면 워커에서 원격 도메인 설정이 필요하고
                    이미지가 끊길 때 빈 칸이 남는다. 평범한 img 로 둔다. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(p.url)}
                  alt={p.title ? `${f.name} ${p.title}` : f.name}
                  loading="lazy"
                  decoding="async"
                />
                {p.title && <figcaption>{p.title}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="panel" id="place">
        <h2 className="panel__title">위치와 전화번호</h2>
        <dl className="kv">
          {f.address && (
            <>
              <dt>주소</dt>
              <dd>
                {f.address}
                {f.zipcode && <span className="kv__sub"> ({f.zipcode})</span>}
              </dd>
            </>
          )}
          {f.tel && (
            <>
              <dt>전화</dt>
              <dd>
                <a href={`tel:${f.tel.replace(/[^0-9+]/g, "")}`}>{f.tel}</a>
              </dd>
            </>
          )}
          {showHomepage(f) && f.homepage && (
            <>
              <dt>홈페이지</dt>
              <dd>
                <a
                  href={f.homepage.startsWith("http") ? f.homepage : `https://${f.homepage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {f.homepage.replace(/^https?:\/\//, "")}
                </a>
              </dd>
            </>
          )}
          <>
            <dt>운영</dt>
            <dd>
              {f.is_public === null ? "확인 안 됨" : f.is_public ? "공설" : "사설"}
              {f.manage_class && <span className="kv__sub"> · {f.manage_class}</span>}
              {f.hall_type && <span className="kv__sub"> · {f.hall_type}</span>}
            </dd>
          </>
        </dl>

        {(map || directions) && (
          <div className="cta-row">
            {directions && (
              <a href={directions} target="_blank" rel="noopener noreferrer" className="cta-btn">
                길찾기
              </a>
            )}
            {map && (
              <a
                href={map}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-btn cta-btn--ghost"
              >
                지도에서 보기
              </a>
            )}
          </div>
        )}
      </section>

      {(f.traffic_public || f.traffic_car) && (
        <section className="panel" id="route">
          <h2 className="panel__title">가는 길 — 대중교통·자가용</h2>
          {f.traffic_public && (
            <div className="route">
              <h3 className="route__title">대중교통</h3>
              {splitLines(f.traffic_public).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
          {f.traffic_car && (
            <div className="route">
              <h3 className="route__title">자가용</h3>
              {splitLines(f.traffic_car).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
          <p className="panel__desc" style={{ margin: "14px 0 0" }}>
            시설이 등록한 안내를 그대로 옮긴 것입니다. 노선은 바뀔 수 있으니
            출발 전에 한 번 더 확인하세요.
          </p>
        </section>
      )}

      {(known.length > 0 || f.park_cnt || f.mortuary_cnt || f.charnel_cnt) && (
        <section className="panel" id="facility">
          <h2 className="panel__title">주차·편의시설과 규모</h2>
          <dl className="kv">
            {f.mortuary_cnt !== null && (
              <>
                <dt>빈소</dt>
                <dd>{f.mortuary_cnt.toLocaleString("ko-KR")}실</dd>
              </>
            )}
            {f.charnel_cnt !== null && (
              <>
                <dt>안치 능력</dt>
                <dd>{f.charnel_cnt.toLocaleString("ko-KR")}구</dd>
              </>
            )}
            {f.park_cnt !== null && (
              <>
                <dt>주차</dt>
                <dd>{f.park_cnt.toLocaleString("ko-KR")}대</dd>
              </>
            )}
            {f.year_dead !== null && (
              <>
                <dt>연간 처리</dt>
                <dd>
                  {f.year_dead.toLocaleString("ko-KR")}건
                  <span className="kv__sub"> · 규모를 가늠하는 값입니다</span>
                </dd>
              </>
            )}
            {f.opened_on && (
              <>
                <dt>영업 시작</dt>
                <dd>{formatDate(f.opened_on)}</dd>
              </>
            )}
          </dl>

          {known.length > 0 && (
            <ul className="amenity-list">
              {known.map((a) => (
                <li key={a.label} data-has={a.has ? "true" : "false"}>
                  <span aria-hidden>{a.has ? "○" : "×"}</span>
                  {a.label}
                  <span className="sr-only">{a.has ? " 있음" : " 없음"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {f.intro && (
        <section className="panel">
          <h2 className="panel__title">시설 소개</h2>
          <div className="intro-text">
            {splitLines(f.intro).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          <p className="panel__desc" style={{ margin: "14px 0 0" }}>
            시설이 직접 쓴 소개문입니다.
          </p>
        </section>
      )}
    </>
  );
}
