import type { Metadata } from "next";
import { buildMetadata, SITE } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  path: "/privacy",
  title: `개인정보처리방침 | ${SITE.name}`,
  description:
    "동물병원비가 수집하는 정보와 이용 목적, 쿠키와 광고 게재 방식, 이용자의 권리를 안내합니다.",
});

export default function PrivacyPage() {
  return (
    <>
      <div className="page-head">
        <h1>
          <span aria-hidden>🔒</span>
          개인정보처리방침
        </h1>
        <p>
          {SITE.name}(<code>{SITE.url.replace("https://", "")}</code>)는
          이용자의 개인정보를 소중히 다룹니다.
        </p>
      </div>

      <section className="panel">
        <h2 className="panel__title">1. 수집하는 정보</h2>
        <p className="panel__desc" style={{ marginBottom: 0 }}>
          이 사이트는 회원가입 기능이 없으며, 이름·연락처 같은 개인정보를 직접
          입력받지 않습니다. 다만 서비스 운영과 통계 분석을 위해 접속 과정에서
          아래 정보가 자동으로 기록될 수 있습니다.
        </p>
        <ul className="panel__desc" style={{ paddingLeft: 18, marginBottom: 0 }}>
          <li>IP 주소, 브라우저 종류와 버전, 운영체제</li>
          <li>방문 일시, 방문한 페이지 경로, 유입 경로</li>
          <li>쿠키에 저장되는 익명 식별자</li>
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel__title">2. 이용 목적</h2>
        <p className="panel__desc" style={{ marginBottom: 0 }}>
          수집된 정보는 서비스 이용 현황 파악, 오류 확인과 개선, 광고 게재 및
          성과 측정 목적으로만 사용합니다. 이 목적을 벗어나 이용하거나 제3자에게
          판매하지 않습니다.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel__title">3. 쿠키와 광고</h2>
        <p className="panel__desc">
          이 사이트는 Google AdSense 를 통해 광고를 게재합니다. Google 을 포함한
          제3자 광고 공급업체는 쿠키를 사용하여 이용자의 이전 방문 기록을 바탕으로
          광고를 게재할 수 있습니다.
        </p>
        <p className="panel__desc" style={{ marginBottom: 0 }}>
          이용자는{" "}
          <a
            href="https://www.google.com/settings/ads"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline" }}
          >
            Google 광고 설정
          </a>
          에서 맞춤 광고를 해제할 수 있고,{" "}
          <a
            href="https://www.aboutads.info/choices/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline" }}
          >
            aboutads.info
          </a>
          에서 제3자 공급업체의 맞춤 광고 사용을 차단할 수 있습니다. 브라우저
          설정에서 쿠키 저장을 거부할 수도 있으나, 이 경우 일부 기능이 정상적으로
          동작하지 않을 수 있습니다.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel__title">4. 방문 분석 도구</h2>
        <p className="panel__desc" style={{ marginBottom: 0 }}>
          이용 현황 분석을 위해 Google Analytics 를 사용할 수 있습니다. 이 도구는
          개인을 식별할 수 있는 정보를 수집하지 않으며, 수집된 자료는 통계 목적으로만
          이용됩니다.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel__title">5. 보유 기간과 파기</h2>
        <p className="panel__desc" style={{ marginBottom: 0 }}>
          자동 수집된 접속 기록은 수집 목적을 달성한 뒤 지체 없이 파기합니다.
          법령에서 일정 기간 보관을 요구하는 경우에는 해당 기간 동안 보관한 후
          파기합니다.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel__title">6. 이용자의 권리</h2>
        <p className="panel__desc" style={{ marginBottom: 0 }}>
          이용자는 자신의 정보에 대한 열람·정정·삭제를 요청할 수 있습니다.
          요청은 아래 연락처로 보내주시면 확인 후 처리하겠습니다.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel__title">7. 문의</h2>
        <p className="panel__desc" style={{ marginBottom: 0 }}>
          개인정보 관련 문의: <strong>privacy@keywordegg.com</strong>
          <br />
          이 방침은 내용 변경이 있을 경우 이 페이지를 통해 안내합니다.
        </p>
      </section>
    </>
  );
}
