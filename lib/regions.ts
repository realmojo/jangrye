/**
 * 지역 이름과 URL 슬러그.
 *
 * e하늘은 지역을 `orgidnm`("서울특별시 서초구") 한 문자열로 준다. 적재
 * 스크립트가 이걸 시도/시군구로 갈라 `region_slug`("서울-서초구")를 만든다.
 *
 * 이 파일의 규칙은 `scripts/jangrye-codes.mjs` 의 SIDOS·SIDO_ALIAS 와 짝이
 * 맞아야 한다. 한쪽만 고치면 적재된 슬러그와 화면이 찾는 슬러그가 어긋나
 * 404 가 된다.
 */

export interface Sido {
  /** 화면에 쓰는 짧은 이름이자 URL 슬러그 */
  slug: string;
  /** 원문 이름 */
  name: string;
}

export const SIDOS: Sido[] = [
  { slug: "서울", name: "서울특별시" },
  { slug: "부산", name: "부산광역시" },
  { slug: "대구", name: "대구광역시" },
  { slug: "인천", name: "인천광역시" },
  { slug: "광주", name: "광주광역시" },
  { slug: "대전", name: "대전광역시" },
  { slug: "울산", name: "울산광역시" },
  { slug: "세종", name: "세종특별자치시" },
  { slug: "경기", name: "경기도" },
  { slug: "강원", name: "강원특별자치도" },
  { slug: "충북", name: "충청북도" },
  { slug: "충남", name: "충청남도" },
  { slug: "전북", name: "전북특별자치도" },
  { slug: "전남", name: "전라남도" },
  { slug: "경북", name: "경상북도" },
  { slug: "경남", name: "경상남도" },
  { slug: "제주", name: "제주특별자치도" },
];

const BY_SLUG = new Map(SIDOS.map((s) => [s.slug, s]));

export function sidoBySlug(slug: string): Sido | undefined {
  return BY_SLUG.get(slug.trim());
}

/** 지역 허브 경로 */
export const REGION_HUB_SLUG = "지역";

/** 화면에 쓰는 지역 이름. `서울 서초구` / 시군구가 없으면 `세종` */
export function regionLabel(sidoSlug: string, sigungu: string | null): string {
  return sigungu ? `${sidoSlug} ${sigungu}` : sidoSlug;
}

/**
 * 시설 슬러그에서 시설코드만 뽑는다.
 *
 * 슬러그는 `{정리한 이름}-{시설코드}` 형태다. 조회를 이름이 아니라 코드로
 * 하기 때문에, 다음 갱신에서 시설명이 바뀌어도 예전 URL 이 그대로 열리고
 * canonical 만 새 주소를 가리킨다.
 *
 * 지역 슬러그(`서울-서초구`)와 구분하는 기준이 이것이다 — 시설 슬러그는
 * **끝이 6자리 이상 숫자**다.
 */
export function codeFromSlug(slug: string): string | null {
  const m = slug.match(/-(\d{6,})$/);
  return m ? m[1] : null;
}
