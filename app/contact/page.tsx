import type { Metadata } from "next";
import { buildMetadata, SITE } from "@/lib/seo";
import { SOURCE_NAME } from "@/lib/facilities";

export const metadata: Metadata = buildMetadata({
  path: "/contact",
  title: `문의하기 | ${SITE.name}`,
  description:
    "데이터 오류 제보, 가격 정정 요청, 제휴 문의를 받습니다. 시설 이용·예약 문의는 해당 시설이나 e하늘로 해주세요.",
});

export default function ContactPage() {
  return (
    <>
      <div className="page-head">
        <h1>
          <span aria-hidden>✉️</span>
          문의하기
        </h1>
        <p>잘못된 정보를 발견하셨다면 알려주세요. 확인 후 바로잡겠습니다.</p>
      </div>

      <section className="panel">
        <h2 className="panel__title">이메일</h2>
        <p className="panel__desc" style={{ marginBottom: 0 }}>
          <strong>support@keywordegg.com</strong>
          <br />
          평일 기준 2~3일 안에 답변드립니다.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel__title">이런 문의를 받습니다</h2>
        <ul className="panel__desc" style={{ paddingLeft: 18, marginBottom: 0 }}>
          <li>
            <strong>가격 정정 요청</strong> — 동물시설에서 현재 가격이 표시된 값과
            다르다고 알려주시는 경우. 저희 데이터는{" "}
            {SOURCE_NAME}에 시설이 등록한 값을 옮긴 것이라 실제 청구액과 차이가 있을 수 있습니다.
          </li>
          <li>
            <strong>데이터 오류 제보</strong> — 이름·주소·전화번호가 실제와 다른
            경우. 어느 페이지의 어떤 항목인지 알려주시면 빠릅니다.
          </li>
          <li>
            <strong>폐업·명칭 변경 제보</strong>
          </li>
          <li>
            <strong>제휴·광고 문의</strong>
          </li>
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel__title">이런 문의는 답변드리기 어렵습니다</h2>
        <p className="panel__desc">
          이 사이트는 공개 데이터를 정리해 보여줄 뿐, 이용를 안내하거나 중개하지
          않습니다.
        </p>
        <ul className="panel__desc" style={{ paddingLeft: 18, marginBottom: 0 }}>
          <li>이용 예약·상담 문의</li>
          <li>특정 시설의 이용 내용이나 의학적 판단</li>
          <li>실손보험 청구·보장 여부 (가입 보험사로 문의하세요)</li>
        </ul>
      </section>
    </>
  );
}
