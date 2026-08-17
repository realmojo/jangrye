/**
 * 라우트 파라미터를 사람이 읽는 문자열로 되돌린다.
 *
 * 한글 슬러그를 쓰기 때문에 브라우저는 `/서울-강남구` 를
 * `/%EC%84%9C%EC%9A%B8-%EA%B0%95%EB%82%A8%EA%B5%AC` 로 보낸다.
 * Next 16 은 params 를 자동으로 디코딩해 주지 않고 인코딩된 문자열을 그대로
 * 넘기므로, 목록·DB 조회 전에 반드시 이 함수를 거쳐야 한다.
 * (거치지 않으면 모든 한글 경로가 404 가 된다)
 */
export function decodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    // 인코딩이 깨진 요청은 원문 그대로 두고 뒤에서 404 로 흘려보낸다
    return raw;
  }
}
