import { SITE } from "@/lib/seo";

/**
 * robots.txt 를 직접 생성한다.
 *
 * Next.js 의 MetadataRoute.Robots 로는 주석 줄을 넣을 수 없는데,
 * 다음(Daum) 웹마스터도구는 robots.txt 안의 주석으로 사이트 소유를 확인한다.
 * 그래서 metadata 파일 대신 라우트 핸들러로 전체 내용을 직접 만든다.
 *
 * 다음 웹마스터도구에 jangrye.keywordegg.com 을 등록하면 받는 확인 문자열을
 * DAUM_VERIFICATION 환경변수에 넣는다. 비어 있으면 그 줄이 빠진다.
 */
const DAUM_VERIFICATION = process.env.DAUM_VERIFICATION ?? "";

/** 색인 가치가 없는 경로 */
const DISALLOW = ["/api/", "/search"];

/** 국내 검색엔진 로봇은 규칙을 명시해 두는 편이 안전하다 (네이버 Yeti, 다음 Daumoa) */
const USER_AGENTS = ["*", "Yeti", "Daumoa"];

function buildRobotsTxt(): string {
  const blocks = USER_AGENTS.map((agent) =>
    [
      `User-agent: ${agent}`,
      "Allow: /",
      ...DISALLOW.map((path) => `Disallow: ${path}`),
    ].join("\n"),
  );

  return [
    ...(DAUM_VERIFICATION ? [DAUM_VERIFICATION, ""] : []),
    ...blocks.flatMap((block) => [block, ""]),
    `Host: ${SITE.url}`,
    `Sitemap: ${SITE.url}/sitemap.xml`,
    "",
  ].join("\n");
}

export function GET() {
  return new Response(buildRobotsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
