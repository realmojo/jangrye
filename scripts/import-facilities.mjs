/**
 * e하늘 장사정보시스템에서 장사시설과 가격을 받아 Supabase 에 적재한다.
 *
 *   node scripts/import-facilities.mjs --probe      시설 하나만 받아 모양 확인
 *   node scripts/import-facilities.mjs --dry-run    전량 수집 후 파일로만 저장
 *   node scripts/import-facilities.mjs              전량 수집 + 적재
 *   node scripts/import-facilities.mjs --load-only  받아 둔 원본만 적재
 *   node scripts/import-facilities.mjs --all        5종 전부 (기본은 1단계 2종)
 *
 * 출처: 보건복지부 e하늘 장사정보시스템 https://www.15774129.go.kr
 *       조회 화면이 쓰는 내부 JSON 두 개를 읽는다.
 *
 *   POST /portal/fnlfac/fac_list.ajax    시설 목록
 *   POST /portal/fnlfac/price_info.ajax  시설 하나의 가격 전부
 *
 * **공개 API 가 아니다.** robots.txt 는 없지만(404) 규격이 예고 없이 바뀔 수
 * 있어 응답을 검증하고, 요청 사이에 간격을 둔다.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
  GROUPS,
  PHASE1,
  PUBLIC_CODE,
  YN_CODE,
  SIDO_ALIAS,
  MERGED_SIDO,
  splitMergedSido,
  SIDOS,
  isCremationFee,
  scopeOf,
  subjectOf,
  gradeOf,
} from "./jangrye-codes.mjs";

config({ path: ".env.local", quiet: true });

const BASE = "https://www.15774129.go.kr";
const RAW_PATH = "data/raw/facilities.json";
const GAP_MS = 250;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const args = new Set(process.argv.slice(2));
const PROBE = args.has("--probe");
const DRY_RUN = args.has("--dry-run");
const LOAD_ONLY = args.has("--load-only");
const ALL = args.has("--all");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${BASE}/portal/esky/fnlfac/fac_list.do`,
      "User-Agent": UA,
    },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
  return res.json();
}

/** 한 종류의 시설 목록을 전부 받는다 */
async function listFacilities(groupCode) {
  const out = [];
  let page = 1;
  for (;;) {
    const res = await post("/portal/fnlfac/fac_list.ajax", {
      pageInqCnt: 200,
      curPageNo: page,
      facilitygroupcd: groupCode,
      sidocd: "",
      gungucd: "",
      companyname: "",
      publiccode: "",
    });
    const rows = res?.list;
    if (!Array.isArray(rows)) {
      throw new Error(`목록이 배열이 아니다 (${groupCode}): ${JSON.stringify(res).slice(0, 200)}`);
    }
    out.push(...rows);
    const total = res.cnt ?? 0;
    if (out.length >= total || rows.length === 0) return { rows: out, total };
    page += 1;
    await sleep(GAP_MS);
  }
}

async function fetchPrice(fac) {
  return post("/portal/fnlfac/price_info.ajax", {
    facilitycd: fac.facilitycd,
    sanbundiv: fac.sanbundiv || "N",
  });
}

/* ------------------------------ 정규화 ------------------------------ */

const GROUP_BY_CODE = new Map(GROUPS.map((g) => [g.code, g]));
const SIDO_BY_NAME = new Map(SIDOS.map((s) => [s.name, s]));

/**
 * `orgidnm` 은 "서울특별시 구로구", "경상북도 포항시", "전남광주통합특별시" 처럼 온다.
 * 앞이 시도, 뒤가 시군구다. 시군구가 없는 곳(광주·세종 등)은 빈 값이 된다.
 */
function splitRegion(orgidnm, address) {
  let t = (orgidnm ?? "").trim();

  // `orgidnm` 이 빈 시설이 있다(양주소망장례식장 등). 주소 앞부분으로 되찾는다 —
  // 지역이 비면 그 시설은 어느 지역 화면에도 나오지 않고 사이트에서 사라진다.
  if (!t) {
    const a = (address ?? "").trim();
    const m = a.match(/^(\S+(?:특별자치[시도]|특별시|광역시|도))\s+(\S+[시군구])/);
    if (m) t = `${m[1]} ${m[2]}`;
    else return { sidoSlug: "", sidoName: "", sigungu: "" };
  }

  const parts = t.split(/\s+/);
  const head = parts[0];
  const sigungu = parts.slice(1).join("");

  // 전남·광주가 한 이름으로 오는 것을 갈라 준다 (jangrye-codes.mjs 주석 참고)
  if (head === MERGED_SIDO) {
    const { slug, name } = splitMergedSido(sigungu);
    return { sidoSlug: slug, sidoName: name, sigungu };
  }

  const sido = SIDO_BY_NAME.get(head);
  const sidoSlug = sido?.slug ?? SIDO_ALIAS[head] ?? head.replace(/(특별자치)?(시|도)$/, "");
  const sidoName = sido?.name ?? head;
  return { sidoSlug, sidoName, sigungu };
}

/** `서울-서초구`. 시군구가 없으면 시도 하나로 끝낸다 (세종·광주 본청) */
function regionSlug(sidoSlug, sigungu) {
  return sigungu ? `${sidoSlug}-${sigungu}` : sidoSlug;
}

/**
 * 시설 URL 슬러그. `{정리한 이름}-{시설코드}`.
 *
 * 코드를 **항상** 붙인다. 이름이 겹치는 시설이 있고("포항시우현화장장" 계열),
 * 겹칠 때만 붙이는 방식은 나중에 같은 이름이 하나 더 생기면 이미 색인된
 * URL 이 바뀐다. 조회는 이름이 아니라 슬러그 끝의 코드로 한다.
 */
function facilitySlug(name, code) {
  const clean = (name ?? "")
    .replace(/[()[\]{}<>「」『』"'`]/g, " ")
    .replace(/[·・/\\,.]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${clean || "시설"}-${code}`;
}

/** 슬러그 끝의 숫자만 뽑는다. 이름이 바뀌어도 예전 URL 이 열리게 하려고 쓴다 */
export function codeFromSlug(slug) {
  const m = String(slug).match(/(\d{6,})$/);
  return m ? m[1] : null;
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v) => {
  const t = typeof v === "string" ? v.trim() : v == null ? "" : String(v);
  return t === "" ? null : t;
};
/**
 * `2026/05/13` → `2026-05-13`. 형식이 다르거나 없는 날짜면 null.
 *
 * **실제로 있는 날인지까지 본다.** 원본에 `2014/05/00`(일자 0)처럼 달만 아는
 * 값이 섞여 있어서, 형식만 맞추면 Postgres 가 date 변환에서 통째로 멈춘다.
 */
const ymd = (v) => {
  const m = String(v ?? "").match(/(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return null; // 2월 30일 같은 값
  }
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

function toFacility(fac, price) {
  const d = price.detail ?? {};
  const group = GROUP_BY_CODE.get(fac.facilitygroupcd);
  const { sidoSlug, sidoName, sigungu } = splitRegion(
    d.orgidnm ?? fac.orgidnm,
    d.fulladdress ?? fac.fulladdress,
  );

  return {
    facility_cd: String(fac.facilitycd),
    group_cd: fac.facilitygroupcd,
    group_name: group?.name ?? null,
    name: str(d.companyname ?? fac.companyname) ?? "이름 없음",
    slug: facilitySlug(d.companyname ?? fac.companyname, fac.facilitycd),

    sido_slug: sidoSlug,
    sido_name: sidoName,
    sigungu_name: sigungu,
    region_slug: regionSlug(sidoSlug, sigungu),

    address: str(d.fulladdress ?? fac.fulladdress),
    zipcode: str(d.zipcd ?? fac.zipcd),
    lat: d.latitude ? Number(d.latitude) : null,
    lng: d.longitude ? Number(d.longitude) : null,

    tel: str(d.telephone ?? fac.telephone),
    fax: str(d.faxnum),
    homepage: str(d.homepage),

    is_public: (PUBLIC_CODE[d.publiccode ?? fac.publiccode] ?? null) === "공설",
    manage_class: str(d.manageclassdiv),
    hall_type: str(d.funeraltypecd),

    mortuary_cnt: num(d.mortuaycnt),
    charnel_cnt: num(d.charnelabilitycnt),
    park_cnt: num(d.parkcnt),

    has_meal: YN_CODE[d.mealroomyn] ?? null,
    has_store: YN_CODE[d.superyn] ?? null,
    has_waitroom: YN_CODE[d.waitroomyn] ?? null,
    has_barrier_free: YN_CODE[d.imparyn] ?? null,
    has_park: YN_CODE[d.parkyn] ?? null,

    intro: str(d.etcinfw),
    traffic_public: str(d.traffpublic),
    traffic_car: str(d.traffowner),

    month_dead: num(d.mDeadCnt),
    year_dead: num(d.yDeadCnt),

    price_date: ymd(d.priceitemdate),
    opened_on: ymd(d.businessdateS),

    // 사진은 e하늘 서버 경로다. 우리 쪽으로 복사하지 않고 그대로 참조한다.
    photos: (price.filelist ?? [])
      .filter((f) => f.picyn === "Y" && f.fileurl)
      .map((f) => ({ url: f.fileurl, title: str(f.filetitle), order: f.fileorder ?? 0 })),
  };
}

/** 화장시설 요금을 (대상 × 지역구분 × 자격) 으로 정규화한다 */
function toCremationFees(facility, price) {
  const out = [];
  const skipped = [];
  for (const r of price.hallRent ?? []) {
    if (!isCremationFee(r.item)) continue;
    const raw = r.rentcontent ?? "";
    const scope = scopeOf(raw, facility.sigungu_name) ?? scopeOf(r.item, facility.sigungu_name);
    const subject = subjectOf(r.tier1Nm, raw);
    if (!scope || !subject) {
      skipped.push({ facility: facility.name, item: r.item, content: raw });
      continue;
    }
    out.push({
      facility_cd: facility.facility_cd,
      subject,
      scope,
      grade: gradeOf(raw),
      amount: num(r.facilityamt),
      item_raw: str(r.item),
      content_raw: str(raw),
    });
  }
  return { rows: out, skipped };
}

/** 장례식장 등의 자유 항목 가격 */
const PRICE_LISTS = [
  ["hallRent", "시설사용료"],
  ["commission", "서비스"],
  ["funeralItem", "장사용품"],
];

function toPrices(facility, price) {
  const out = [];
  for (const [key, kind] of PRICE_LISTS) {
    for (const r of price[key] ?? []) {
      const amount = num(r.facilityamt ?? r.commamt);
      if (amount === null) continue;
      out.push({
        facility_cd: facility.facility_cd,
        kind,
        tier1: str(r.tier1Nm),
        tier2: str(r.tier2Nm),
        item: str(r.item ?? r.commodity),
        content: str(r.rentcontent ?? r.servcontent ?? r.etcinfo),
        amount,
        // 원본이 이미 계산해 둔 비교값. 장례식장에만 절반쯤 채워져 있다.
        avg_in: num(r.avgPriceIn),
        avg_all: num(r.avgPriceAll),
        days: num(r.rentdays),
      });
    }
  }
  return out;
}

/* ------------------------------ 수집 ------------------------------ */

async function collect() {
  const targets = (ALL ? GROUPS.map((g) => g.code) : PHASE1)
    .map((c) => GROUP_BY_CODE.get(c))
    .filter(Boolean);

  const facilities = [];
  const cremFees = [];
  const prices = [];
  const failures = [];
  const skippedFees = [];

  for (const group of targets) {
    const { rows, total } = await listFacilities(group.code);
    console.log(`\n[${group.name}] 목록 ${rows.length}건 (신고 총계 ${total})`);
    if (rows.length !== total) {
      console.warn(`  ! 목록 수와 총계가 다르다 — 페이지 처리를 확인할 것`);
    }

    const list = PROBE ? rows.slice(0, 1) : rows;
    let done = 0;
    for (const fac of list) {
      try {
        const price = await fetchPrice(fac);
        if (price?.isSuccess === false) throw new Error("isSuccess=false");
        if (!price?.detail) throw new Error("detail 없음");

        const facility = toFacility(fac, price);
        facilities.push(facility);

        if (group.code === "TBC0700004") {
          const { rows: fees, skipped } = toCremationFees(facility, price);
          cremFees.push(...fees);
          skippedFees.push(...skipped);
        }
        prices.push(...toPrices(facility, price));

        if (PROBE) {
          console.log("\n시설:", JSON.stringify(facility, null, 1).slice(0, 2000));
          console.log("\n화장료 첫 3건:", JSON.stringify(cremFees.slice(0, 3), null, 1));
          console.log("\n가격 첫 3건:", JSON.stringify(prices.slice(0, 3), null, 1));
          return { facilities, cremFees, prices, failures, skippedFees };
        }
      } catch (err) {
        failures.push({ name: fac.companyname, code: fac.facilitycd, message: err.message });
        console.warn(`  ! 실패 ${fac.companyname} — ${err.message}`);
      }
      done += 1;
      if (done % 100 === 0) console.log(`  ${done}/${list.length}`);
      await sleep(GAP_MS);
    }
  }

  return { facilities, cremFees, prices, failures, skippedFees };
}

/* ------------------------------ 적재 ------------------------------ */

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function insertChunks(client, table, rows, label) {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await client.from(table).insert(rows.slice(i, i + CHUNK));
    if (error) throw new Error(`${table} 적재 실패 (${i}~): ${error.message}`);
    if ((i / CHUNK) % 10 === 0 || i + CHUNK >= rows.length) {
      console.log(`  ${label} ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
    }
  }
}

async function load({ facilities, cremFees, prices }) {
  const client = db();

  // 전량 교체. 이번에 안 온 시설이 예전 값으로 남으면 폐업한 곳이 계속 보인다.
  // 이 프로젝트는 pg_safeupdate 가 켜져 있어 WHERE 없는 DELETE 가 막힌다.
  const groups = [...new Set(facilities.map((f) => f.group_cd))];
  const codes = facilities.map((f) => f.facility_cd);

  for (const [table, col] of [
    ["jangrye_cremation_fees", "facility_cd"],
    ["jangrye_prices", "facility_cd"],
  ]) {
    const { error } = await client.from(table).delete().in(col, codes);
    if (error) throw new Error(`${table} 정리 실패: ${error.message}`);
  }
  {
    const { error } = await client.from("jangrye_facilities").delete().in("group_cd", groups);
    if (error) throw new Error(`jangrye_facilities 정리 실패: ${error.message}`);
  }

  await insertChunks(client, "jangrye_facilities", facilities, "시설");
  await insertChunks(client, "jangrye_cremation_fees", cremFees, "화장료");
  await insertChunks(client, "jangrye_prices", prices, "가격");

  const { error } = await client.rpc("refresh_jangrye_aggregates");
  if (error) throw new Error(`집계 갱신 실패: ${error.message}`);
  console.log("  집계 갱신 완료 (jangrye_regions)");
}

/* ------------------------------ 요약 ------------------------------ */

function summarize({ facilities, cremFees, prices, failures, skippedFees }) {
  const byGroup = facilities.reduce((a, f) => ((a[f.group_name] = (a[f.group_name] ?? 0) + 1), a), {});
  const regions = new Set(facilities.map((f) => f.region_slug));
  const withPhoto = facilities.filter((f) => f.photos.length > 0).length;
  const withTraffic = facilities.filter((f) => f.traffic_public || f.traffic_car).length;
  const recent = facilities.filter((f) => (f.price_date ?? "") >= "2024-01-01").length;

  console.log(`\n─ 요약 ─`);
  console.log(`시설 ${facilities.length}건 ${JSON.stringify(byGroup)}`);
  console.log(`지역 ${regions.size}곳 · 사진 있음 ${withPhoto} · 교통안내 있음 ${withTraffic}`);
  console.log(`가격 기준 2024년 이후 ${recent}/${facilities.length} (${((recent / facilities.length) * 100).toFixed(0)}%)`);
  console.log(`화장료 ${cremFees.length}행 · 그 밖의 가격 ${prices.length}행`);

  // 화장시설 대표 지표가 몇 곳에서 나오는지 — 이게 사이트의 뼈대다
  const crem = facilities.filter((f) => f.group_cd === "TBC0700004");
  const key = (r) => `${r.facility_cd}|${r.subject}|${r.scope}`;
  const general = new Set(cremFees.filter((r) => r.grade === "일반").map(key));
  for (const [subject, scope] of [
    ["대인", "관내"],
    ["대인", "관외"],
    ["소인", "관내"],
    ["개장유골", "관내"],
  ]) {
    const n = crem.filter((f) => general.has(`${f.facility_cd}|${subject}|${scope}`)).length;
    console.log(`  ${subject} ${scope}: ${n}/${crem.length} (${crem.length ? ((n / crem.length) * 100).toFixed(0) : 0}%)`);
  }

  if (skippedFees.length) console.log(`\n화장료 파싱 실패 ${skippedFees.length}행 (지역구분 미표기)`);
  if (failures.length) {
    console.log(`\n실패 ${failures.length}건:`);
    for (const f of failures.slice(0, 20)) console.log(`  ${f.name} (${f.code}) — ${f.message}`);
  }
}

async function main() {
  if (LOAD_ONLY) {
    const raw = JSON.parse(readFileSync(RAW_PATH, "utf8"));
    // 저장해 둔 원본이 예전 규칙으로 만들어졌을 수 있어 지역과 날짜를 다시 만든다.
    //  - 날짜: `2014-05-00` 같은 값 하나가 적재를 통째로 멈춘다
    //  - 지역: 전남·광주가 한 이름으로 오는 것을 갈라야 한다
    for (const f of raw.facilities) {
      f.price_date = ymd(f.price_date);
      f.opened_on = ymd(f.opened_on);
      if (!f.sido_slug) {
        const r = splitRegion(null, f.address);
        f.sido_slug = r.sidoSlug;
        f.sido_name = r.sidoName;
        f.sigungu_name = r.sigungu;
        f.region_slug = regionSlug(r.sidoSlug, r.sigungu);
      } else if (f.sido_name === MERGED_SIDO) {
        const { slug, name } = splitMergedSido(f.sigungu_name);
        f.sido_slug = slug;
        f.sido_name = name;
        f.region_slug = regionSlug(slug, f.sigungu_name);
      }
    }
    // 화장료도 다시 가른다. content_raw 를 남겨 두었기 때문에 다시 긁지 않아도
    // 규칙만 고쳐 재분류할 수 있다 — `행려(대인)` 을 대인으로 잘못 넣었던 것을
    // 이렇게 바로잡았다.
    const sigunguOf = new Map(raw.facilities.map((f) => [f.facility_cd, f.sigungu_name]));
    let moved = 0;
    for (const r of raw.cremFees) {
      const subject = subjectOf(null, r.content_raw) ?? r.subject;
      const scope =
        scopeOf(r.content_raw, sigunguOf.get(r.facility_cd)) ??
        scopeOf(r.item_raw, sigunguOf.get(r.facility_cd)) ??
        r.scope;
      const grade = gradeOf(r.content_raw);
      if (subject !== r.subject || scope !== r.scope || grade !== r.grade) moved += 1;
      r.subject = subject;
      r.scope = scope;
      r.grade = grade;
    }
    if (moved) console.log(`화장료 ${moved}행을 새 규칙으로 다시 분류했습니다.`);

    summarize(raw);
    await load(raw);
    console.log("완료 (--load-only)");
    return;
  }

  const result = await collect();
  if (PROBE) return;

  summarize(result);

  mkdirSync("data/raw", { recursive: true });
  writeFileSync(RAW_PATH, JSON.stringify(result));
  console.log(`\n원본 저장: ${RAW_PATH}`);

  if (DRY_RUN) {
    console.log("--dry-run 이라 적재는 건너뜁니다.");
    return;
  }
  await load(result);
  console.log("완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
