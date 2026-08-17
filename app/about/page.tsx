import type { Metadata } from "next";
import { buildMetadata, SITE } from "@/lib/seo";
import { OFFICIAL_LINKS } from "@/lib/menu";
import { GROUPS, SOURCE_NAME, SOURCE_URL, STALE_BEFORE } from "@/lib/facilities";
import { REGION_HUB_SLUG } from "@/lib/regions";

export const metadata: Metadata = buildMetadata({
  path: "/about",
  title: `사이트 소개 | ${SITE.name}`,
  description:
    "장례비용은 보건복지부 e하늘에 공개된 화장시설·장례식장 요금과 위치 정보를 정리하는 사이트입니다. 자료의 기준 시점과 한계를 분명히 밝힙니다.",
});

export default function AboutPage() {
  return (
    <>
      <div className="page-head">
        <h1>
          <span aria-hidden>🕯️</span>
          사이트 소개
        </h1>
        <p>
          급한 상황에서 &ldquo;얼마인지, 어디로 가야 하는지&rdquo;를 빨리 알 수
          있게 만들었습니다.
        </p>
      </div>

      <section className="panel">
        <h2 className="panel__title">무엇을 보여주나</h2>
        <p className="panel__desc">
          화장 요금은 고인이나 신고자가 그 지역 주민인지에 따라 갈립니다. 화장
          시설은 대부분 지자체가 세운 공설이라, 주민에게는 싸게 다른 지역
          주민에게는 원가에 가깝게 받기 때문입니다.{" "}
          <strong>전국 중간값으로 10배 차이</strong>이고, 어떤 시설은 20배까지
          벌어집니다.
        </p>
        <p className="panel__desc" style={{ marginBottom: 0 }}>
          이 사이트는 {GROUPS.map((g) => g.name).join("·")}의{" "}
          <strong>요금과 함께 위치·전화·가는 길·주차·편의시설</strong>을 한 화면에
          둡니다. 값만 알아도 어디로 가야 할지 모르면 소용이 없기 때문입니다.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel__title">이 자료의 한계</h2>
        <p className="panel__desc">먼저 밝혀야 할 것들입니다.</p>
        <ul className="panel__desc" style={{ paddingLeft: 18, marginBottom: 0 }}>
          <li>
            <strong>시설이 직접 등록한 값입니다.</strong> 등록이 법으로 강제되지
            않아 빠진 항목이 있을 수 있습니다.
          </li>
          <li>
            <strong>등록 시점이 시설마다 다릅니다.</strong> 2015년에 멈춘 곳도
            있습니다. 그래서 화면마다 기준일을 적고,{" "}
            {STALE_BEFORE.slice(0, 4)}년보다 오래된 값은 &lsquo;요금 오래됨&rsquo;
            으로 표시하고 순위·중간값 계산에서 뺍니다.
          </li>
          <li>
            <strong>여기 적힌 것이 장례비 전부가 아닙니다.</strong> 화장료 외에
            빈소 임대료·식사·용품·운구가 더해집니다.
          </li>
          <li>
            <strong>품목 이름은 시설이 직접 입력합니다.</strong> 같은 관이 다른
            이름으로 등록돼 있어서, 시설끼리 품목 단위로 견주지 않고 큰 분류까지만
            묶어 보여줍니다.
          </li>
          <li>
            화장 요금의 <strong>관내/관외 구분도 원본이 자유 텍스트</strong>로
            줍니다. 규칙을 만들어 갈랐고 화장시설 62곳 중 54곳(87%)에서 관내
            요금을 뽑아냈습니다. 나머지는 표기 방식이 달라 비어 있습니다.
          </li>
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel__title">데이터 출처</h2>
        <p className="panel__desc">
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline" }}
          >
            {SOURCE_NAME}
          </a>
          에 공개된 값을 그대로 옮겼습니다. 원본에 없는 값을 추정해서 채우지
          않습니다. 사진도 e하늘 서버의 것을 그대로 참조합니다.
        </p>
        <ul className="panel__desc" style={{ paddingLeft: 18, marginBottom: 0 }}>
          <li>제공 기관: 보건복지부 · 한국장례문화진흥원</li>
          <li>범위: 화장시설 62곳 · 장례식장 1,084곳 (봉안·묘지·자연장지는 준비 중)</li>
          <li>공공데이터포털에는 전국 장사시설 요금 데이터셋이 없습니다</li>
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel__title">하지 않는 것</h2>
        <ul className="panel__desc" style={{ paddingLeft: 18, marginBottom: 0 }}>
          <li>
            <strong>예약을 받지 않습니다.</strong> 전국 화장 예약은{" "}
            <a
              href={OFFICIAL_LINKS.reserve}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "underline" }}
            >
              e하늘 통합예약
            </a>{" "}
            한 곳에서만 됩니다. 상담 {OFFICIAL_LINKS.tel}.
          </li>
          <li>
            <strong>상조 상품을 팔거나 중개하지 않습니다.</strong>
          </li>
          <li>
            <strong>시설을 추천하거나 순위를 매기지 않습니다.</strong> 요금이
            싸다고 좋은 곳도, 비싸다고 나쁜 곳도 아닙니다.
          </li>
        </ul>
      </section>

      <div className="empty-box">
        <a
          target="_self"
          href={`/${REGION_HUB_SLUG}`}
          style={{ textDecoration: "underline" }}
        >
          우리 동네 화장장 찾아보기
        </a>
      </div>
    </>
  );
}
