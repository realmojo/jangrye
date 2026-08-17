/**
 * 장사시설과 가격 조회.
 *
 * ────────────────────────────────────────────────────────────────────────
 *  원본
 * ────────────────────────────────────────────────────────────────────────
 * 보건복지부 「e하늘 장사정보시스템」(www.15774129.go.kr).
 * 전국 장사시설 2,625곳(장례식장 1,084 · 봉안 711 · 묘지 503 · 자연장지 265 ·
 * 화장시설 62)의 위치·시설정보·가격을 시설이 직접 등록한 것이다.
 * 적재는 scripts/import-facilities.mjs.
 *
 * 공공데이터포털에는 지자체 단위 장례식장 목록만 파편적으로 있고 **가격은
 * e하늘에만 있다.**
 *
 * ────────────────────────────────────────────────────────────────────────
 *  이 자료를 다룰 때 조심할 것
 * ────────────────────────────────────────────────────────────────────────
 * 1) **가격 기준일이 시설마다 다르다.** 장례식장은 68%가 2024년 이후지만
 *    묘지는 15%뿐이고 2015년에 멈춘 곳도 있다. 그래서 화면마다 `price_date`
 *    를 노출하고, 오래된 값은 순위·중간값 계산에서 뺀다.
 *
 * 2) **품목명은 시설이 직접 입력한다.** 같은 화장료가 "화장 이용료 / 화장이용료
 *    / 화장 사용료 / 화장장이용료" 로 흩어져 있고, 장례식장 품목은 138종 분류에
 *    최다가 "기타 › 기타류" 다. 그래서 비교는 **코드값인 tier1/tier2 수준까지만**
 *    하고 세부 품목명은 나열만 한다.
 *
 * 3) **화장료의 정형 컬럼은 쓰지 않는다.** 원본에 inneradultamt(관내 대인) 같은
 *    컬럼이 있지만 62곳 중 9곳(15%)만 채워져 있다. 실제 값은 자유 텍스트에
 *    있어서 적재 스크립트가 (대상 × 지역구분 × 자격) 으로 갈라 넣는다.
 */

import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

export const FACILITIES_TABLE = "jangrye_facilities";
export const CREM_FEES_TABLE = "jangrye_cremation_fees";
export const PRICES_TABLE = "jangrye_prices";
export const REGIONS_TABLE = "jangrye_regions";

/** 자료 출처와 성격. 화면에 반복해서 노출한다. */
export const SOURCE_NAME = "보건복지부 e하늘 장사정보시스템";
export const SOURCE_URL = "https://www.15774129.go.kr";
/** 시설이 직접 등록하는 자료라 등록 의무가 없다는 점을 밝혀야 한다 */
export const SOURCE_NOTE = "시설이 직접 등록한 값이며 등록이 법으로 강제되지 않습니다";

/** 이보다 오래된 가격은 순위·중간값에서 뺀다 */
export const STALE_BEFORE = "2023-01-01";

/* ------------------------------- 시설 종류 ------------------------------- */

export interface FacilityGroup {
  code: string;
  slug: string;
  name: string;
  emoji: string;
  /** 허브 화면 도입부 */
  note: string;
}

/**
 * 1단계는 화장시설·장례식장 둘이다. 검색 수요가 크고 가격 기준일이 가장 신선하다.
 * 봉안·묘지·자연장지는 기준일이 오래된 곳이 많아 신뢰 표시 설계를 먼저 해야 한다.
 */
export const GROUPS: FacilityGroup[] = [
  {
    code: "TBC0700004",
    slug: "화장시설",
    name: "화장시설",
    emoji: "🕯️",
    note: "전국 화장장 62곳입니다. 같은 화장로인데도 관내와 관외 요금이 중간값 기준 10배 차이 납니다.",
  },
  {
    code: "TBC0700001",
    slug: "장례식장",
    name: "장례식장",
    emoji: "🏛️",
    note: "전국 장례식장입니다. 빈소 임대료는 규모와 지역에 따라 크게 갈립니다.",
  },
];

const GROUP_BY_SLUG = new Map(GROUPS.map((g) => [g.slug, g]));
const GROUP_BY_CODE = new Map(GROUPS.map((g) => [g.code, g]));

export function groupBySlug(slug: string): FacilityGroup | undefined {
  return GROUP_BY_SLUG.get(slug);
}
export function groupByCode(code: string): FacilityGroup | undefined {
  return GROUP_BY_CODE.get(code);
}

export const CREMATORIUM = "TBC0700004";
export const FUNERAL_HALL = "TBC0700001";

/* --------------------------------- 형 --------------------------------- */

export interface Photo {
  url: string;
  title: string | null;
  order: number;
}

export interface Facility {
  facility_cd: string;
  group_cd: string;
  group_name: string | null;
  name: string;
  slug: string;
  sido_slug: string;
  sido_name: string | null;
  sigungu_name: string | null;
  region_slug: string;
  address: string | null;
  zipcode: string | null;
  lat: number | null;
  lng: number | null;
  tel: string | null;
  fax: string | null;
  homepage: string | null;
  /**
   * 홈페이지가 실제로 열리는가. `false` 면 화면에 링크를 그리지 않는다.
   * `null` 은 아직 확인 안 했다는 뜻이라 일단 보여준다.
   * scripts/check-homepages.mjs 가 채운다 — 476곳 중 115곳이 죽어 있었다.
   */
  homepage_ok: boolean | null;
  homepage_status: string | null;
  homepage_checked_at: string | null;
  is_public: boolean | null;
  manage_class: string | null;
  hall_type: string | null;
  mortuary_cnt: number | null;
  charnel_cnt: number | null;
  park_cnt: number | null;
  has_meal: boolean | null;
  has_store: boolean | null;
  has_waitroom: boolean | null;
  has_barrier_free: boolean | null;
  has_park: boolean | null;
  intro: string | null;
  traffic_public: string | null;
  traffic_car: string | null;
  month_dead: number | null;
  year_dead: number | null;
  price_date: string | null;
  opened_on: string | null;
  photos: Photo[];
}

export type Subject = "대인" | "소인" | "태아" | "개장유골" | "무연고";
export type Scope = "관내" | "준관내" | "관외";
export type Grade = "일반" | "수급자" | "국가유공자" | "장애인" | "기타";

export interface CremationFee {
  facility_cd: string;
  subject: Subject;
  scope: Scope;
  grade: Grade;
  amount: number | null;
  item_raw: string | null;
  content_raw: string | null;
}

export interface Price {
  facility_cd: string;
  kind: string;
  tier1: string | null;
  tier2: string | null;
  item: string | null;
  content: string | null;
  amount: number;
  avg_in: number | null;
  avg_all: number | null;
  days: number | null;
}

export interface RegionStats {
  region_slug: string;
  sido_slug: string;
  sido_name: string | null;
  sigungu_name: string | null;
  facility_cnt: number;
  crematorium_cnt: number;
  hall_cnt: number;
  crem_inner_mid: number | null;
  crem_outer_mid: number | null;
  hall_rent_mid: number | null;
  latest_price_date: string | null;
}

/** 화면에 늘어놓는 순서 */
export const SUBJECTS: Subject[] = ["대인", "소인", "태아", "개장유골", "무연고"];
export const SCOPES: Scope[] = ["관내", "준관내", "관외"];
export const GRADES: Grade[] = ["일반", "수급자", "국가유공자", "장애인", "기타"];

/** 무엇을 화장하는지 말로 풀어 준다. 용어가 낯설고 무거워 설명이 필요하다. */
export const SUBJECT_NOTE: Record<Subject, string> = {
  대인: "만 14세 이상 (시설에 따라 15세)",
  소인: "만 14세 미만",
  태아: "사산아·유산아",
  개장유골: "묘를 파묘해 나온 유골을 화장할 때",
  무연고: "연고자가 없는 경우 (지자체가 처리)",
};

export const SCOPE_NOTE: Record<Scope, string> = {
  관내: "고인 또는 신고자가 그 지역 주민일 때",
  준관내: "인접 지자체와 협약이 있을 때",
  관외: "그 밖의 지역 주민일 때",
};

/* -------------------------------- 조회 -------------------------------- */

const FACILITY_COLUMNS = "*";
const CACHE_SECONDS = 3600;
/** 조회 결과의 모양이 바뀌면 반드시 올린다 */
const CACHE_VERSION = "jangrye-v2";

async function fetchFacilitiesByGroup(groupCd: string): Promise<Facility[]> {
  if (!supabaseAdmin) return [];
  try {
    // 장례식장이 1,084곳이라 PostgREST 기본 상한 1,000행에 닿는다. 나눠 받는다.
    const out: Facility[] = [];
    const PAGE = 900;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabaseAdmin
        .from(FACILITIES_TABLE)
        .select(FACILITY_COLUMNS)
        .eq("group_cd", groupCd)
        .order("sido_slug")
        .order("name")
        .range(from, from + PAGE - 1);
      if (error) {
        console.error("fetchFacilitiesByGroup", error.message);
        return out;
      }
      const rows = (data ?? []) as unknown as Facility[];
      out.push(...rows);
      if (rows.length < PAGE) return out;
    }
  } catch {
    return [];
  }
}

async function fetchFacilityByCode(code: string): Promise<Facility | null> {
  if (!supabaseAdmin) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from(FACILITIES_TABLE)
      .select(FACILITY_COLUMNS)
      .eq("facility_cd", code)
      .maybeSingle();
    if (error) {
      console.error("fetchFacilityByCode", error.message);
      return null;
    }
    return (data as unknown as Facility) ?? null;
  } catch {
    return null;
  }
}

async function fetchFacilitiesByRegion(regionSlug: string): Promise<Facility[]> {
  if (!supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from(FACILITIES_TABLE)
      .select(FACILITY_COLUMNS)
      .eq("region_slug", regionSlug)
      .order("group_cd")
      .order("name")
      .limit(500);
    if (error) {
      console.error("fetchFacilitiesByRegion", error.message);
      return [];
    }
    return (data ?? []) as unknown as Facility[];
  } catch {
    return [];
  }
}

async function fetchCremationFees(facilityCd: string): Promise<CremationFee[]> {
  if (!supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from(CREM_FEES_TABLE)
      .select("facility_cd, subject, scope, grade, amount, item_raw, content_raw")
      .eq("facility_cd", facilityCd)
      .order("amount", { ascending: true, nullsFirst: false })
      .limit(500);
    if (error) {
      console.error("fetchCremationFees", error.message);
      return [];
    }
    return (data ?? []) as unknown as CremationFee[];
  } catch {
    return [];
  }
}

/** 전국 화장료 (62곳뿐이라 통째로 받아 화면에서 계산한다) */
async function fetchAllCremationFees(): Promise<CremationFee[]> {
  if (!supabaseAdmin) return [];
  try {
    const out: CremationFee[] = [];
    const PAGE = 900;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabaseAdmin
        .from(CREM_FEES_TABLE)
        .select("facility_cd, subject, scope, grade, amount, item_raw, content_raw")
        .range(from, from + PAGE - 1);
      if (error) {
        console.error("fetchAllCremationFees", error.message);
        return out;
      }
      const rows = (data ?? []) as unknown as CremationFee[];
      out.push(...rows);
      if (rows.length < PAGE) return out;
    }
  } catch {
    return [];
  }
}

async function fetchPrices(facilityCd: string): Promise<Price[]> {
  if (!supabaseAdmin) return [];
  try {
    // 장례식장 한 곳이 최대 300행 가까이 된다
    const { data, error } = await supabaseAdmin
      .from(PRICES_TABLE)
      .select("facility_cd, kind, tier1, tier2, item, content, amount, avg_in, avg_all, days")
      .eq("facility_cd", facilityCd)
      .order("amount", { ascending: false })
      .limit(900);
    if (error) {
      console.error("fetchPrices", error.message);
      return [];
    }
    return (data ?? []) as unknown as Price[];
  } catch {
    return [];
  }
}

async function fetchRegions(): Promise<RegionStats[]> {
  if (!supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from(REGIONS_TABLE)
      .select("*")
      .order("sido_slug")
      .order("sigungu_name")
      .limit(1000);
    if (error) {
      console.error("fetchRegions", error.message);
      return [];
    }
    return (data ?? []) as RegionStats[];
  } catch {
    return [];
  }
}

/* --------------------------- 캐시를 씌운 조회 --------------------------- */

const cachedByGroup = unstable_cache(fetchFacilitiesByGroup, [CACHE_VERSION, "group"], {
  revalidate: CACHE_SECONDS,
  tags: ["jangrye"],
});
const cachedByCode = unstable_cache(fetchFacilityByCode, [CACHE_VERSION, "code"], {
  revalidate: CACHE_SECONDS,
  tags: ["jangrye"],
});
const cachedByRegion = unstable_cache(fetchFacilitiesByRegion, [CACHE_VERSION, "region"], {
  revalidate: CACHE_SECONDS,
  tags: ["jangrye"],
});
const cachedCremFees = unstable_cache(fetchCremationFees, [CACHE_VERSION, "crem"], {
  revalidate: CACHE_SECONDS,
  tags: ["jangrye"],
});
const cachedAllCremFees = unstable_cache(fetchAllCremationFees, [CACHE_VERSION, "crem-all"], {
  revalidate: CACHE_SECONDS,
  tags: ["jangrye"],
});
const cachedPrices = unstable_cache(fetchPrices, [CACHE_VERSION, "prices"], {
  revalidate: CACHE_SECONDS,
  tags: ["jangrye"],
});
const cachedRegions = unstable_cache(fetchRegions, [CACHE_VERSION, "regions"], {
  revalidate: CACHE_SECONDS,
  tags: ["jangrye"],
});

export const listFacilitiesByGroup = (groupCd: string) => cachedByGroup(groupCd);
export const getFacility = (code: string) => cachedByCode(code);
export const listFacilitiesByRegion = (regionSlug: string) => cachedByRegion(regionSlug);
export const listCremationFees = (facilityCd: string) => cachedCremFees(facilityCd);
export const listAllCremationFees = () => cachedAllCremFees();
export const listPrices = (facilityCd: string) => cachedPrices(facilityCd);
export const listRegions = () => cachedRegions();

export async function getRegion(regionSlug: string): Promise<RegionStats | null> {
  const all = await cachedRegions();
  return all.find((r) => r.region_slug === regionSlug) ?? null;
}

export async function regionsMap(): Promise<Map<string, RegionStats>> {
  const all = await cachedRegions();
  return new Map(all.map((r) => [r.region_slug, r]));
}

/* ------------------------------ 화면용 계산 ------------------------------ */

/** 원 단위 금액. 만 원 이상은 "12만 5,000원" 처럼 끊어 읽기 좋게 쓴다. */
export function formatWon(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (value === 0) return "무료";
  if (value < 10000) return `${Math.round(value).toLocaleString("ko-KR")}원`;
  const man = Math.floor(value / 10000);
  const rest = Math.round(value % 10000);
  if (rest === 0) return `${man.toLocaleString("ko-KR")}만원`;
  return `${man.toLocaleString("ko-KR")}만 ${rest.toLocaleString("ko-KR")}원`;
}

/** 표 안에서 자리를 아껴야 할 때 */
export function formatWonShort(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (value === 0) return "무료";
  if (value < 10000) return `${Math.round(value).toLocaleString("ko-KR")}원`;
  const man = value / 10000;
  const rounded = man >= 10 ? Math.round(man) : Math.round(man * 10) / 10;
  return `${rounded.toLocaleString("ko-KR")}만원`;
}

/** `2026-05-13` → `2026년 5월 13일` */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "확인 안 됨";
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return value;
  return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일`;
}

/** 가격이 오래됐는가. 화면에 표시해 사용자가 판단하게 한다 */
export function isStale(priceDate: string | null | undefined): boolean {
  return !priceDate || priceDate < STALE_BEFORE;
}

/** 배수. 관외 ÷ 관내 처럼 쓴다 */
export function ratio(hi: number | null, lo: number | null): number | null {
  if (!hi || !lo || lo <= 0) return null;
  const r = hi / lo;
  if (!Number.isFinite(r) || r < 1) return null;
  return r >= 10 ? Math.round(r) : Math.round(r * 10) / 10;
}

export function ratioText(r: number | null): string {
  return r ? `${r.toLocaleString("ko-KR")}배` : "-";
}

/** 값 목록의 중간값. 짝수면 아래쪽을 고른다(percentile_disc 와 같게) */
export function median(values: number[]): number | null {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  return xs[Math.floor((xs.length - 1) / 2)];
}

/**
 * 같은 (대상 × 지역구분 × 자격) 조합이 원본에 여러 행으로 오는 경우가 있다.
 * 화면에서는 **최저값을 대표로** 쓴다 — 사용자가 실제로 낼 수 있는 가장 낮은
 * 금액이기 때문이다.
 *
 * 다만 **0원은 뒤로 민다.** 원본에 감면 대상이나 행려병자 요금이 0원으로
 * 섞여 들어오는 일이 있어서, 그대로 최저값을 고르면 "관내 무료" 라고 잘못
 * 말하게 된다. 그래서 0보다 큰 값이 하나라도 있으면 그중 최저값을 쓰고,
 * 0원만 있을 때만 0(무료)으로 둔다 — 실제로 관내를 무료로 하는 지자체도 있다.
 */
export function feeMap(fees: CremationFee[]): Map<string, number> {
  const positive = new Map<string, number>();
  const zeroOnly = new Set<string>();

  for (const f of fees) {
    if (f.amount === null) continue;
    const key = `${f.subject}|${f.scope}|${f.grade}`;
    if (f.amount > 0) {
      const cur = positive.get(key);
      if (cur === undefined || f.amount < cur) positive.set(key, f.amount);
    } else {
      zeroOnly.add(key);
    }
  }

  const m = new Map(positive);
  for (const key of zeroOnly) if (!m.has(key)) m.set(key, 0);
  return m;
}

export function feeOf(
  map: Map<string, number>,
  subject: Subject,
  scope: Scope,
  grade: Grade = "일반",
): number | null {
  return map.get(`${subject}|${scope}|${grade}`) ?? null;
}

/** 편의시설을 화면용 목록으로 */
export function amenities(f: Facility): Array<{ label: string; has: boolean | null }> {
  return [
    { label: "주차장", has: f.has_park },
    { label: "식당", has: f.has_meal },
    { label: "매점", has: f.has_store },
    { label: "유족 대기실", has: f.has_waitroom },
    { label: "장애인 편의시설", has: f.has_barrier_free },
  ];
}

/** e하늘 서버의 사진 절대 주소. 우리 쪽으로 복사하지 않는다 */
export function photoUrl(path: string): string {
  return `${SOURCE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** 카카오맵 길찾기 링크. 좌표가 없으면 null */
export function mapUrl(f: Facility): string | null {
  if (f.lat === null || f.lng === null) return null;
  return `https://map.kakao.com/link/map/${encodeURIComponent(f.name)},${f.lat},${f.lng}`;
}

export function directionsUrl(f: Facility): string | null {
  if (f.lat === null || f.lng === null) return null;
  return `https://map.kakao.com/link/to/${encodeURIComponent(f.name)},${f.lat},${f.lng}`;
}

/**
 * 홈페이지 링크를 그려도 되는가.
 *
 * e하늘에 등록된 주소가 갱신되지 않아 도메인이 만료된 곳이 있다. 죽은 링크를
 * 내보내면 유족이 급할 때 막힌 곳으로 가게 되므로 확인된 사망은 감춘다.
 * 아직 확인하지 않은 것(null)은 보여준다 — 멀쩡한 링크를 숨기는 쪽이 더 손해다.
 */
export function showHomepage(f: Pick<Facility, "homepage" | "homepage_ok">): boolean {
  return Boolean(f.homepage) && f.homepage_ok !== false;
}

/** 시설의 지역 이름. `서울 서초구` / 시군구가 없으면 `세종` */
export function regionLabelOf(f: Pick<Facility, "sido_slug" | "sigungu_name">): string {
  return f.sigungu_name ? `${f.sido_slug} ${f.sigungu_name}` : f.sido_slug;
}

/** 원문 안내문에 줄바꿈이 섞여 있어 문단으로 쪼갠다 */
export function splitLines(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter(Boolean);
}
