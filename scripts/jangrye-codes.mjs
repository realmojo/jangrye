/**
 * e하늘 장사정보시스템의 코드 목록과 화장료 파싱 규칙.
 *
 * 조회 화면(`/portal/esky/fnlfac/fac_list.do`)과 `js/portal/fnlfac/fac_list.js`
 * 에서 뽑았다. 2026-08-18 기준.
 */

/**
 * 시설 종류.
 *
 * **코드와 이름을 절대 헷갈리지 말 것.** 화면 순서와 코드 순서가 어긋나 있어서
 * TBC0700004 를 자연장지로 착각했다가 "화장시설에 수목장 요금이 있다"는
 * 엉뚱한 결론에 도달한 적이 있다. 응답의 `type` 필드로 대조해 확정한 값이다.
 */
export const GROUPS = [
  { code: "TBC0700001", type: "FuneralHallDet", slug: "장례식장", name: "장례식장", count: 1084 },
  { code: "TBC0700004", type: "CrematoriumDet", slug: "화장시설", name: "화장시설", count: 62 },
  { code: "TBC0700003", type: "CharnelDet", slug: "봉안시설", name: "봉안시설", count: 711 },
  { code: "TBC0700002", type: "CemeteryDet", slug: "묘지", name: "묘지", count: 503 },
  { code: "TBC0700005", type: "NaturalBurialDet", slug: "자연장지", name: "자연장지", count: 265 },
];

/** 1단계로 모으는 종류. 검색 수요가 크고 가격 기준일이 가장 신선하다. */
export const PHASE1 = ["TBC0700004", "TBC0700001"];

/** 공설/사설 */
export const PUBLIC_CODE = {
  TCM0100001: "공설",
  TCM0100002: "사설",
};

/** 편의시설 유무 (Y/N 대신 코드로 온다) */
export const YN_CODE = {
  TBC1300001: true,
  TBC1300002: false,
};

/** 시도. 법정동코드 앞 2자리가 아니라 e하늘 자체 코드(govcd)를 쓴다 */
export const SIDOS = [
  { code: "6110000", name: "서울특별시", slug: "서울" },
  { code: "6260000", name: "부산광역시", slug: "부산" },
  { code: "6270000", name: "대구광역시", slug: "대구" },
  { code: "6280000", name: "인천광역시", slug: "인천" },
  { code: "6290000", name: "광주광역시", slug: "광주" },
  { code: "5690000", name: "대전광역시", slug: "대전" },
  { code: "6310000", name: "울산광역시", slug: "울산" },
  { code: "5710000", name: "세종특별자치시", slug: "세종" },
  { code: "6410000", name: "경기도", slug: "경기" },
  { code: "6420000", name: "강원특별자치도", slug: "강원" },
  { code: "6430000", name: "충청북도", slug: "충북" },
  { code: "6440000", name: "충청남도", slug: "충남" },
  { code: "6450000", name: "전북특별자치도", slug: "전북" },
  { code: "6460000", name: "전라남도", slug: "전남" },
  { code: "6470000", name: "경상북도", slug: "경북" },
  { code: "6480000", name: "경상남도", slug: "경남" },
  { code: "6500000", name: "제주특별자치도", slug: "제주" },
];

/**
 * 시도 이름을 짧은 이름으로. `orgidnm` 이 "서울특별시 구로구" 처럼 오므로
 * 앞부분을 잘라 쓴다.
 */
export const SIDO_ALIAS = {
  강원도: "강원",
  전라북도: "전북",
  전라남도: "전남",
};

/**
 * 원본은 전남과 광주를 **"전남광주통합특별시" 하나로** 쓴다 (157건 / 28개 시군구).
 *
 * 그대로 두면 순천시가 `/광주-순천시` 가 되어 사람들이 검색하는 말과 어긋난다.
 * "순천 화장장" 으로 찾는 사람에게 광주는 다른 지역이다. 그래서 옛 광주광역시
 * 자치구 5곳만 `광주` 로 보내고 나머지는 `전남` 으로 가른다.
 *
 * 시군구가 비어 있는 행(시도 본청 직속 시설, 광주영락공원)은 `광주` 로 둔다.
 */
export const MERGED_SIDO = "전남광주통합특별시";
export const GWANGJU_GU = ["광산구", "동구", "서구", "북구", "남구"];

export function splitMergedSido(sigungu) {
  const s = (sigungu ?? "").trim();
  if (!s) return { slug: "광주", name: "광주광역시" };
  if (GWANGJU_GU.includes(s)) return { slug: "광주", name: "광주광역시" };
  return { slug: "전남", name: "전라남도" };
}

/* ─────────────────────── 화장료 파싱 ───────────────────────
 *
 * 화장시설 요금은 정형 컬럼(inneradultamt 등)에도 있지만 **62곳 중 9곳(15%)만
 * 채워져 있어 쓸 수 없다.** 실제 값은 hallRent 행에 있고, 관내/관외 구분이
 * `rentcontent` 자유 텍스트에 들어 있다.
 *
 *   일반(대인)-일반(관내)
 *   일반(소인)-국민기초생활보장수급자(관외)
 *   개장유골-일반(인접/준관내)
 *   일반(대인)-일반(봉화)          ← 지역명을 직접 쓴 것
 *
 * 386종이지만 구조는 `{대상}-{자격}({지역구분})` 로 일정하다.
 * 이 규칙으로 1,096행 중 1,046행(95%)을 갈랐고, 실패분은 대부분
 * 지역명 직접 표기였다. 그래서 시설의 시군구 이름도 함께 대조한다.
 */

/** 항목명 표기가 흔들린다 — 화장 이용료 / 화장이용료 / 화장 사용료 / 화장장이용료 */
export function isCremationFee(item) {
  const t = (item ?? "").replace(/\s+/g, "");
  if (!t.includes("화장")) return false;
  // 봉안·자연장 쪽 항목이 섞여 들어오는 것을 막는다
  return !/봉안|유골함|위패|추모|수목|잔디|화장품/.test(t);
}

/** 관내 / 준관내 / 관외. 못 가리면 null */
export function scopeOf(text, sigunguName) {
  const t = text ?? "";
  if (/준\s*관내|인접/.test(t)) return "준관내";
  if (/관내/.test(t)) return "관내";
  if (/관외/.test(t)) return "관외";

  // "일반(봉화)" 처럼 지역명을 직접 쓴 경우. 시설이 있는 시군구면 관내다.
  const bare = (sigunguName ?? "").replace(/(특별자치)?(시|도|군|구)$/g, "");
  if (bare.length >= 2 && t.includes(bare)) return "관내";
  return null;
}

/**
 * 누구를 화장하는가.
 *
 * **순서가 중요하다.** 원본에 `행려(대인)-일반(관내)` 같은 값이 있어서
 * "대인" 이나 "일반" 을 먼저 보면 행려병자 요금(0원)이 일반 대인 요금으로
 * 잡힌다. 그러면 화면에 "관내 무료" 라고 나온다 — 실제로 겪은 오류다.
 * 특수 대상을 먼저 걸러낸 뒤에 대인/소인을 본다.
 */
export function subjectOf(tier1, text) {
  const t = `${text ?? ""} ${tier1 ?? ""}`;
  if (/태아|사산|유산/.test(t)) return "태아";
  if (/개장\s*유골/.test(t)) return "개장유골";
  // 행려병자·무연고는 지자체가 처리하는 것이라 일반 요금이 아니다
  if (/무연고|행려|연고자\s*없/.test(t)) return "무연고";
  if (/소인|아동|어린이/.test(t)) return "소인";
  if (/대인|성인|일반/.test(t)) return "대인";
  if (tier1 === "시신") return "대인";
  return null;
}

/**
 * 감면 자격.
 *
 * **표기가 여러 가지다.** 국가유공자를 "보훈대상자" 로 쓰는 시설이 있어서
 * 그것까지 잡아야 한다. 안 잡으면 0원인 감면 요금이 일반 요금으로 분류되고,
 * 화면에 "관내 무료" 라고 나온다 — 실제로 겪은 오류다.
 */
export function gradeOf(text) {
  const t = text ?? "";
  if (/기초생활|수급/.test(t)) return "수급자";
  if (/국가유공|유공자|보훈/.test(t)) return "국가유공자";
  if (/장애/.test(t)) return "장애인";
  if (/기타/.test(t)) return "기타";
  return "일반";
}

/** 화면에 늘어놓는 순서 */
export const SUBJECTS = ["대인", "소인", "태아", "개장유골", "무연고"];
export const SCOPES = ["관내", "준관내", "관외"];
export const GRADES = ["일반", "수급자", "국가유공자", "장애인", "기타"];
