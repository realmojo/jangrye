/**
 * 시설 홈페이지 링크가 실제로 열리는지 검사한다.
 *
 *   node scripts/check-homepages.mjs --dry-run   결과만 보고 DB 는 건드리지 않음
 *   node scripts/check-homepages.mjs             검사 후 jangrye_facilities 갱신
 *   node scripts/check-homepages.mjs --recheck   이미 판정된 것까지 다시 봄
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  왜 필요한가
 *
 *  e하늘에 등록된 홈페이지 주소가 갱신되지 않아 도메인이 만료된 곳이 섞여
 *  있다(춘천안식원의 ccansikwon.co.kr 등). 죽은 링크를 그대로 내보내면 유족이
 *  급할 때 막힌 곳으로 가게 된다. 그래서 판정을 DB 에 적어 두고 화면은
 *  `homepage_ok !== false` 일 때만 링크를 그린다.
 *
 *  **적재를 다시 하면 판정이 날아간다.** import-facilities.mjs 가 이 값을
 *  이어받게 해 두었지만, 새로 들어온 주소는 판정이 없으니 적재 뒤에 이 스크립트를
 *  한 번 돌리는 것이 맞다.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 판정 기준
 *  - 연결이 안 되면(DNS·타임아웃·거절) 죽은 것으로 본다
 *  - 404·410·5xx 도 죽은 것으로 본다
 *  - **401·403·405 는 살아 있는 것으로 둔다.** 봇을 막는 것일 뿐 사람은 열 수 있다
 *  - 도메인 만료 주차 페이지를 흔한 문구로 한 번 더 걸러낸다
 */

import https from "node:https";
import http from "node:http";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const RECHECK = args.has("--recheck");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const TIMEOUT_MS = 15000;
const CONCURRENCY = 12;

/** 봇 차단으로 보는 상태코드. 서버는 살아 있다 */
const BLOCKED = new Set([401, 403, 405, 406, 429]);

/**
 * 도메인이 만료돼 주차 페이지로 넘어간 경우. 상태코드는 200 이라 내용으로 본다.
 * 짧은 낱말(예: "판매")만 쓰면 장례용품 판매 안내에 걸리므로 문구로 잡는다.
 */
const PARKED = [
  /이 도메인은?\s*(판매|매매)/,
  /도메인\s*(판매|매매|분양)\s*(중|안내)/,
  /this domain (is|may be) for sale/i,
  /buy this domain/i,
  /domain( name)? (is )?(for sale|expired|parking)/i,
  /등록\s*대행자?\s*정보/,
  /호스팅\s*서비스가?\s*(만료|중지)/,
  /서비스\s*(만료|해지|중지)되었/,
];

function normalize(raw) {
  const t = (raw ?? "").trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

async function probe(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });

    if (BLOCKED.has(res.status)) {
      return { ok: true, status: `${res.status} 봇차단` };
    }
    if (res.status >= 400) {
      return { ok: false, status: String(res.status) };
    }

    // 만료 주차 페이지 걸러내기. 앞부분만 읽는다
    let head = "";
    try {
      head = (await res.text()).slice(0, 4000);
    } catch {
      /* 본문을 못 읽어도 응답은 살아 있는 것으로 본다 */
    }
    const parked = PARKED.find((re) => re.test(head));
    if (parked) return { ok: false, status: `${res.status} 도메인 주차` };

    return { ok: true, status: String(res.status) };
  } catch (err) {
    const name = err?.name === "AbortError" ? "타임아웃" : (err?.cause?.code ?? err?.name ?? "오류");
    return { ok: false, status: String(name) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 인증서 문제로 실패한 것들. **사이트는 살아 있다.**
 *
 * 지자체·병원 홈페이지는 인증서 체인이 빠졌거나 만료됐거나 DH 키가 짧은 곳이
 * 흔하다. 브라우저는 경고를 띄우고도 열리는데 Node 의 fetch 는 통째로 거절한다.
 * 이걸 죽은 링크로 세면 www.inje.go.kr(인제군청)처럼 멀쩡한 정부 사이트가
 * 사라진다 — 실제로 그렇게 오판했다.
 */
const CERT_ERRORS = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "CERT_HAS_EXPIRED",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "ERR_SSL_DH_KEY_TOO_SMALL",
  "ERR_SSL_WRONG_VERSION_NUMBER",
  "EPROTO",
  "UNSPECIFIED",
  "ERR_SSL_PACKET_LENGTH_TOO_LONG",
]);

/**
 * 인증서 검증을 끄고 다시 두드린다. 연결 자체가 되는지만 본다.
 * node:https 를 직접 쓴다 — fetch 로는 인증서 검증을 끌 방법이 마땅치 않다.
 */
function probeInsecure(url) {
  return new Promise((resolve) => {
    let target;
    try {
      target = new URL(url);
    } catch {
      resolve({ ok: false, status: "주소 형식 오류" });
      return;
    }
    const mod = target.protocol === "http:" ? http : https;
    const req = mod.request(
      target,
      {
        method: "GET",
        timeout: TIMEOUT_MS,
        headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.8" },
        ...(target.protocol === "https:"
          ? { rejectUnauthorized: false, ciphers: "DEFAULT@SECLEVEL=0" }
          : {}),
      },
      (res) => {
        res.resume(); // 본문은 버린다. 연결이 되는지만 본다
        const code = res.statusCode ?? 0;
        if (BLOCKED.has(code) || (code >= 200 && code < 400)) {
          resolve({ ok: true, status: `${code} 인증서 낡음` });
        } else {
          resolve({ ok: false, status: String(code) });
        }
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, status: "타임아웃" });
    });
    req.on("error", (e) => resolve({ ok: false, status: String(e?.code ?? e?.name ?? "오류") }));
    req.end();
  });
}

/** https → (인증서 문제면) 검증 끄고 → http 순으로 본다 */
async function probeBoth(raw) {
  const url = normalize(raw);
  if (!url) return { ok: false, status: "주소 없음" };

  const first = await probe(url);
  if (first.ok) return first;

  if (CERT_ERRORS.has(first.status)) {
    const lenient = await probeInsecure(url);
    if (lenient.ok) return lenient;
    // 인증서를 무시하고도 안 열리면 그 사유가 진짜 사유다. TLS 코드를 그대로
    // 남기면 "인증서 문제" 처럼 보이는데 실제로는 404 인 경우가 많다.
    if (lenient.status !== "타임아웃") return lenient;
  }

  // 낡은 사이트는 https 를 아예 안 여는 곳이 있다
  if (/^https:\/\//i.test(url)) {
    const plain = await probe(url.replace(/^https:/i, "http:"));
    if (plain.ok) return { ok: true, status: `${plain.status} (http)` };
  }
  return first;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function main() {
  const client = db();

  // 시설이 1,146곳이라 PostgREST 기본 상한(1,000행)을 넘는다. 나눠 받는다.
  const rows = [];
  const PAGE = 900;
  for (let from = 0; ; from += PAGE) {
    let q = client
      .from("jangrye_facilities")
      .select("facility_cd, name, region_slug, homepage, homepage_ok")
      .not("homepage", "is", null)
      .order("facility_cd")
      .range(from, from + PAGE - 1);
    const { data, error } = await q;
    if (error) throw new Error(`조회 실패: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE) break;
  }

  const targets = RECHECK ? rows : rows.filter((r) => r.homepage_ok === null);
  console.log(
    `홈페이지 있는 시설 ${rows.length}곳 · 이번에 검사할 곳 ${targets.length}곳` +
      (RECHECK ? " (--recheck)" : ""),
  );
  if (targets.length === 0) return;

  let done = 0;
  const results = await mapLimit(targets, CONCURRENCY, async (r) => {
    const verdict = await probeBoth(r.homepage);
    done += 1;
    if (done % 50 === 0) console.log(`  ${done}/${targets.length}`);
    return { ...r, ...verdict };
  });

  const dead = results.filter((r) => !r.ok);
  const alive = results.length - dead.length;
  console.log(`\n살아 있음 ${alive} · 죽었음 ${dead.length}`);

  if (dead.length) {
    console.log("\n[열리지 않는 홈페이지]");
    for (const d of dead) {
      console.log(`  ${d.status.padEnd(16)} ${d.name.slice(0, 22).padEnd(24)} ${d.homepage}`);
    }
  }

  if (DRY_RUN) {
    console.log("\n--dry-run 이라 DB 는 건드리지 않았습니다.");
    return;
  }

  const now = new Date().toISOString();
  let n = 0;
  for (const r of results) {
    const { error } = await client
      .from("jangrye_facilities")
      .update({ homepage_ok: r.ok, homepage_status: r.status, homepage_checked_at: now })
      .eq("facility_cd", r.facility_cd);
    if (error) throw new Error(`갱신 실패 (${r.facility_cd}): ${error.message}`);
    n += 1;
    if (n % 100 === 0) console.log(`  갱신 ${n}/${results.length}`);
  }
  console.log(`\n갱신 완료 ${n}곳 — 죽은 링크 ${dead.length}개는 화면에서 감춰집니다.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
