#!/usr/bin/env node
/**
 * 전체 URL 을 naver-indexing 쪽으로 뽑는다.
 *
 * 네이버 서치어드바이저는 사이트맵과 별개로 URL 목록 제출을 받는다.
 * 인코딩 규칙은 lib/seo.ts 의 absoluteUrl 과 같아야 한다 — 한 조각씩
 * encodeURIComponent 를 걸고 슬래시로 다시 잇는다.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

import { GROUPS, SIDOS } from "./jangrye-codes.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
dotenv.config({ path: path.join(ROOT, ".env.local"), quiet: true });

const SITE = "https://jangrye.keywordegg.com";
const abs = (p) =>
  !p || p === "/"
    ? SITE
    : `${SITE}${(p.startsWith("/") ? p : `/${p}`)
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`;

/** lib/menu.ts · lib/facilities.ts 의 고정 경로와 같아야 한다 */
const STATIC = ["/", "/지역", "/about", "/contact", "/privacy", "/terms"];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(".env.local 확인");
    process.exit(1);
  }
  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const urls = [
    ...STATIC.map(abs),
    // 1단계로 올린 종류만 (화장시설·장례식장)
    ...GROUPS.filter((g) => ["TBC0700004", "TBC0700001"].includes(g.code)).map((g) =>
      abs(`/${g.slug}`),
    ),
    ...SIDOS.map((s) => abs(`/${s.slug}`)),
  ];

  const { data: regions, error: regErr } = await sb
    .from("jangrye_regions")
    .select("region_slug")
    .limit(1000);
  if (regErr) throw new Error(regErr.message);
  for (const r of regions ?? []) urls.push(abs(`/${r.region_slug}`));

  // 시설이 1,146곳이라 PostgREST 기본 상한(1,000행)을 넘는다. 나눠 받는다.
  const slugs = [];
  const PAGE = 900;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from("jangrye_facilities")
      .select("slug")
      .order("facility_cd")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    slugs.push(...(data ?? []).map((f) => f.slug));
    if ((data ?? []).length < PAGE) break;
  }
  for (const s of slugs) urls.push(abs(`/${s}`));

  const uniq = [...new Set(urls)];
  // URL 목록은 m/naver-indexing/data/<사이트>/ 한곳에서 관리한다.
  const out = path.resolve(ROOT, "../naver-indexing/data/jangrye/urls.txt");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${uniq.join("\n")}\n`, "utf8");

  console.log(
    `고정 ${STATIC.length} · 시도 ${SIDOS.length} · 지역 ${regions?.length ?? 0} · 시설 ${slugs.length}`,
  );
  console.log(`합계 ${uniq.length}\n${out}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
