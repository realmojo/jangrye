import { SITE_LINKS, OFFICIAL_LINKS } from "@/lib/menu";
import { REGION_HUB_SLUG, SIDOS } from "@/lib/regions";
import { GROUPS, SOURCE_NAME, SOURCE_NOTE } from "@/lib/facilities";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <div className="site-footer__logo">
              <span aria-hidden>🕯️</span> 장례비용
            </div>
            <p className="site-footer__desc">
              전국 화장시설과 장례식장의 요금, 그리고 위치·교통·시설 정보를
              한 화면에 정리했습니다. 같은 화장로도 관내와 관외 요금이 크게
              다릅니다.
            </p>
          </div>

          <div className="site-footer__col">
            <h3>시설 찾기</h3>
            <ul>
              {GROUPS.map((g) => (
                <li key={g.slug}>
                  <a target="_self" href={`/${g.slug}`}>
                    {g.name}
                  </a>
                </li>
              ))}
              <li>
                <a target="_self" href={`/${REGION_HUB_SLUG}`}>
                  지역으로 찾기
                </a>
              </li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h3>지역별</h3>
            <ul>
              {SIDOS.slice(0, 5).map((s) => (
                <li key={s.slug}>
                  <a target="_self" href={`/${s.slug}`}>
                    {s.slug}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="site-footer__col">
            <h3>공식 창구</h3>
            <ul>
              <li>
                <a href={OFFICIAL_LINKS.reserve} target="_blank" rel="noopener noreferrer">
                  화장 통합예약
                </a>
              </li>
              <li>
                <a href={OFFICIAL_LINKS.dataset} target="_blank" rel="noopener noreferrer">
                  e하늘 장사정보
                </a>
              </li>
              <li>
                <a href={`tel:${OFFICIAL_LINKS.tel}`}>상담 {OFFICIAL_LINKS.tel}</a>
              </li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h3>사이트</h3>
            <ul>
              {SITE_LINKS.map((item) => (
                <li key={item.href}>
                  <a target="_self" href={item.href}>
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="site-footer__bottom">
          <p>© {new Date().getFullYear()} 장례비용. All rights reserved.</p>
          <p className="site-footer__note">
            요금은 <strong>{SOURCE_NAME}</strong>에 공개된 값을 옮긴 것입니다.{" "}
            {SOURCE_NOTE} — 시설마다 마지막 등록 시점이 달라 화면에 기준일을
            함께 적었습니다. <strong>이 사이트는 예약을 받지 않습니다.</strong>{" "}
            화장 예약은 e하늘에서만 되고, 실제 부담액은 해당 시설에 직접
            확인하셔야 합니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
